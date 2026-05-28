'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    doc, getDoc, updateDoc, increment,
    collection, addDoc, onSnapshot,
    orderBy, query, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { Party } from '@/types/party'

interface ChatMessage {
    id: string
    uid: string
    name: string
    text: string
    createdAt?: any
}

const DUMMY_PARTY_INFO = [
    { hostName: '메롱포켓몬', attendees: 15, maxAttendees: 30 },
    { hostName: '하늘고래', attendees: 8, maxAttendees: 20 },
    { hostName: 'Sora', attendees: 22, maxAttendees: 30 },
    { hostName: 'Leo', attendees: 3, maxAttendees: 10 },
    { hostName: '메하소레', attendees: 5, maxAttendees: 10 },
]

const SAMPLE_CHAT: ChatMessage[] = [
    { id: 's1', uid: 'dummy1', name: '메롱포켓몬', text: '오늘 이 애니 진짜 기대했는데 ㅠㅠ' },
    { id: 's2', uid: 'dummy2', name: '하늘고래', text: '저도요!! 같이 보니까 더 좋네요 ㅋㅋ' },
    { id: 's3', uid: 'dummy3', name: 'Sora', text: '이 장면 소름 돋지 않아요..?' },
    { id: 's4', uid: 'dummy1', name: '메롱포켓몬', text: '진짜 연출 미쳤다 ㄹㅇ' },
    { id: 's5', uid: 'dummy4', name: 'Leo', text: '다음화 언제 나오는지 아는 분?' },
]

export default function PartyRoomPage() {
    const { partyId } = useParams() as { partyId: string }
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuthStore()
    const { aniDetails, aniVideos, onFetchDetail, onFetchVideo } = useAniStore()

    // dummy-[tmdbId] 형태면 더미 파티
    const isDummy = partyId.startsWith('dummy-')
    const tmdbId = isDummy ? Number(partyId.replace('dummy-', '')) : null

    // 미래 편성 여부 (scheduledAt 쿼리 파라미터)
    const scheduledAtParam = searchParams.get('scheduledAt')
    const isDummyUpcoming = scheduledAtParam ? new Date(scheduledAtParam) > new Date() : false

    const [party, setParty] = useState<Party | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>(isDummy ? SAMPLE_CHAT : [])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(!isDummy)
    const chatEndRef = useRef<HTMLDivElement>(null)

    // 더미용: aniDetails에서 tmdbId로 애니 찾기
    const dummyDetail = (isDummy && tmdbId) ? aniDetails[tmdbId] : null
    const dummyInfo = (isDummy && tmdbId) ? DUMMY_PARTY_INFO[tmdbId % DUMMY_PARTY_INFO.length] : null

    // 더미: tmdbId로 상세 정보 & 영상 fetch
    useEffect(() => {
        if (!isDummy || !tmdbId) return
        onFetchDetail(tmdbId)
    }, [isDummy, tmdbId])

    useEffect(() => {
        if (!isDummy || !tmdbId || !dummyDetail) return
        onFetchVideo(tmdbId, dummyDetail.name ?? dummyDetail.title ?? '')
    }, [isDummy, tmdbId, dummyDetail])

    // 실제 파티: Firestore fetch
    useEffect(() => {
        if (isDummy) return
        const fetchParty = async () => {
            try {
                const docRef = doc(db, 'parties', partyId)
                const docSnap = await getDoc(docRef)
                if (!docSnap.exists()) { router.push('/live'); return }
                const data = { id: docSnap.id, ...docSnap.data() } as Party
                setParty(data)
                await onFetchVideo(data.animeId, data.animeName)
                await updateDoc(docRef, { attendees: increment(1) })
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchParty()
        return () => {
            const docRef = doc(db, 'parties', partyId)
            updateDoc(docRef, { attendees: increment(-1) })
        }
    }, [partyId, isDummy])

    // 실제 파티: 채팅 구독
    useEffect(() => {
        if (isDummy) return
        const q = query(collection(db, 'parties', partyId, 'messages'), orderBy('createdAt', 'asc'))
        const unsub = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ChatMessage[])
        })
        return () => unsub()
    }, [partyId, isDummy])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const handleSend = async () => {
        if (!user || !inputText.trim()) return
        const text = inputText.trim()
        setInputText('')
        if (isDummy) {
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                uid: user.uid ?? '익명',
                name: user.name || '익명',
                text,
            }])
        } else {
            await addDoc(collection(db, 'parties', partyId, 'messages'), {
                uid: user.uid,
                name: user.name || '익명',
                text,
                createdAt: serverTimestamp(),
            })
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-white/40 text-sm">파티 불러오는 중...</p>
        </div>
    )

    // 더미 - 미래 편성 대기 화면
    if (isDummy && isDummyUpcoming) {
        const name = dummyDetail?.name ?? dummyDetail?.title ?? ''
        const poster = dummyDetail?.poster_path ?? ''
        return (
            <div className="min-h-screen flex flex-col">
                <div className="flex items-center px-6 py-4 border-b border-white/10 gap-3 mt-10">
                    <button onClick={() => router.push('/live')} className="text-white/40 hover:text-white transition-colors text-sm cursor-pointer">← 돌아가기</button>
                    <div className="w-px h-4 bg-white/10" />
                    <div>
                        <h1 className="text-white font-bold text-sm">{name} 파티</h1>
                        <p className="text-white/40 text-xs">개설자 : {dummyInfo?.hostName}</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    {poster && (
                        <img src={`https://image.tmdb.org/t/p/w185${poster}`} alt={name} className="w-24 rounded-xl opacity-60" />
                    )}
                    <div className="text-center flex flex-col gap-2">
                        <p className="text-white text-lg font-bold">{name}</p>
                        <p className="text-white/50 text-sm">아직 방송 시간이 되지 않았어요</p>
                        <p className="text-white/80 text-sm font-medium">
                            🗓 {new Date(scheduledAtParam!).toLocaleString('ko-KR', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                            })} 방송 예정
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // 실제 파티 - 예약됨 대기 화면
    const isUpcoming = !isDummy && party?.status === 'upcoming' && new Date(party.scheduledAt) > new Date()
    if (isUpcoming && party) return (
        <div className="min-h-screen flex flex-col">
            <div className="flex items-center px-6 py-4 border-b border-white/10 gap-3">
                <button onClick={() => router.push('/live')} className="text-white/40 hover:text-white transition-colors text-sm cursor-pointer">← 돌아가기</button>
                <div className="w-px h-4 bg-white/10" />
                <div>
                    <h1 className="text-white font-bold text-sm">{party.title}</h1>
                    <p className="text-white/40 text-xs">{party.animeName} · 개설자 {party.hostName}</p>
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {party.animePoster && (
                    <img src={`https://image.tmdb.org/t/p/w185${party.animePoster}`} alt={party.animeName} className="w-24 rounded-xl opacity-60" />
                )}
                <div className="text-center flex flex-col gap-2">
                    <p className="text-white text-lg font-bold">{party.animeName}</p>
                    <p className="text-white/50 text-sm">아직 파티가 시작되지 않았어요</p>
                    <p className="text-white/80 text-sm font-medium">
                        🗓 {new Date(party.scheduledAt).toLocaleString('ko-KR', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        })} 시작 예정
                    </p>
                </div>
            </div>
        </div>
    )

    if (!isDummy && !party) return null

    // 데이터 통합
    const animeName = isDummy ? (dummyDetail?.name ?? dummyDetail?.title ?? '') : party?.animeName ?? ''
    const animePoster = isDummy ? (dummyDetail?.poster_path ?? '') : party?.animePoster ?? ''
    const hostName = isDummy ? dummyInfo?.hostName ?? '' : party?.hostName ?? ''
    const attendees = isDummy ? dummyInfo?.attendees ?? 0 : party?.attendees ?? 0
    const maxAttendees = isDummy ? dummyInfo?.maxAttendees ?? 0 : party?.maxAttendees ?? 0
    const scheduledAt = isDummy ? null : party?.scheduledAt
    const video = isDummy ? (tmdbId ? aniVideos[tmdbId] : null) : (party ? aniVideos[party.animeId] : null)
    const title = isDummy ? `${animeName} 파티` : party?.title ?? ''

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 mt-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/live')} className="text-white/40 hover:text-white transition-colors text-sm cursor-pointer">← 돌아가기</button>
                    <div className="w-px h-4 bg-white/10" />
                    <div>
                        <h1 className="text-white font-bold text-sm">{title}</h1>
                        <p className="text-white/40 text-xs">{animeName} · 개설자 {hostName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                    </span>
                    <span className="text-white/40 text-xs">👥 {attendees} / {maxAttendees}명</span>
                    <button
                        onClick={() => router.push('/live')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 rounded-lg text-xs text-white/50 hover:text-red-400 transition-all cursor-pointer"
                    >
                        파티 나가기
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col bg-black">
                    {video ? (
                        <iframe
                            src={`https://www.youtube.com/embed/${video.key}?autoplay=1&rel=0`}
                            className="w-full aspect-video"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        />
                    ) : (
                        <div className="w-full aspect-video flex items-center justify-center bg-[#111]">
                            <p className="text-white/30 text-sm">영상을 불러오는 중...</p>
                        </div>
                    )}
                    <div className="flex items-center gap-4 px-6 py-4 border-t border-white/10">
                        {animePoster && (
                            <img src={`https://image.tmdb.org/t/p/w92${animePoster}`} alt={animeName} className="w-10 h-14 object-cover rounded" />
                        )}
                        <div>
                            <p className="text-white font-bold">{animeName}</p>
                            {scheduledAt && (
                                <p className="text-white/40 text-xs mt-0.5">
                                    시작 시간 : {new Date(scheduledAt).toLocaleString('ko-KR', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-80 flex flex-col border-l border-white/10">
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-white/60 text-sm font-medium">실시간 채팅</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                        {messages.length === 0 && (
                            <p className="text-white/20 text-xs text-center mt-4">첫 번째 메시지를 남겨보세요!</p>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.uid === user?.uid ? 'items-end' : 'items-start'}`}>
                                <span className="text-white/40 text-[10px]">{msg.name}</span>
                                <div className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] ${
                                    msg.uid === user?.uid ? 'bg-white text-black rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="px-4 py-3 border-t border-white/10">
                        {user ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="메시지 입력..."
                                    maxLength={100}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim()}
                                    className="px-3 py-2 bg-white text-black rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-white/90 transition-colors"
                                >
                                    전송
                                </button>
                            </div>
                        ) : (
                            <p className="text-white/30 text-xs text-center py-2">채팅하려면 로그인이 필요해요</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}