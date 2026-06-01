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

    const isDummy = partyId.startsWith('dummy-')       // 편성표/마퀴
    const isPartySection = partyId.startsWith('party-') // PartySection 더미
    const isDummyAny = isDummy || isPartySection         // 둘 다 더미
    const tmdbId = isDummy
        ? Number(partyId.replace('dummy-', ''))
        : isPartySection
        ? Number(partyId.replace('party-', ''))
        : null
    const scheduledAtParam = searchParams.get('scheduledAt')
    const isDummyUpcoming = scheduledAtParam ? new Date(scheduledAtParam) > new Date() : false

    const [party, setParty] = useState<Party | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>(isDummyAny ? SAMPLE_CHAT : [])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(!isDummyAny)
    const [relatedAnime, setRelatedAnime] = useState<any[]>([])
    const [playerHeight, setPlayerHeight] = useState(0)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<HTMLDivElement>(null)

    const dummyDetail = (isDummyAny && tmdbId) ? aniDetails[tmdbId] : null
    const dummyInfo = (isDummyAny && tmdbId) ? DUMMY_PARTY_INFO[tmdbId % DUMMY_PARTY_INFO.length] : null

    // 플레이어 높이 측정
    useEffect(() => {
        const update = () => {
            if (playerRef.current) setPlayerHeight(playerRef.current.offsetHeight)
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    // 더미: 상세 정보 & 영상 fetch
    useEffect(() => {
        if (!isDummyAny || !tmdbId) return
        onFetchDetail(tmdbId)
    }, [isDummy, tmdbId])

    useEffect(() => {
        if (!isDummyAny || !tmdbId || !dummyDetail) return
        onFetchVideo(tmdbId, dummyDetail.name ?? dummyDetail.title ?? '')
    }, [isDummy, tmdbId, dummyDetail])

    // 실제 파티: Firestore fetch
    useEffect(() => {
        if (isDummyAny) return
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
        if (isDummyAny) return
        const q = query(collection(db, 'parties', partyId, 'messages'), orderBy('createdAt', 'asc'))
        const unsub = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ChatMessage[])
        })
        return () => unsub()
    }, [partyId, isDummy])

    // 관련 작품 fetch
    useEffect(() => {
        const fetchRelated = async () => {
            const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
            const id = isDummy ? tmdbId : party?.animeId
            if (!id) return
            const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`)
            const detail = await detailRes.json()
            const genreIds = detail.genres?.map((g: any) => g.id).join(',') ?? '16'
            const res = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=${genreIds}&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=1`)
            const data = await res.json()
            setRelatedAnime((data.results || []).filter((a: any) => a.id !== id && a.poster_path).slice(0, 6))
        }
        if (isDummyAny && tmdbId) fetchRelated()
        else if (!isDummy && party) fetchRelated()
    }, [isDummy, tmdbId, party?.animeId])

    useEffect(() => {
        if (messages.length > 0 && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => { window.scrollTo(0, 0) }, [])

    const handleSend = async () => {
        if (!user || !inputText.trim()) return
        const text = inputText.trim()
        setInputText('')
        if (isDummyAny) {
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

    // 더미 미래 편성 대기 화면
    if (isDummyAny && isDummyUpcoming) {
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
                    {poster && <img src={`https://image.tmdb.org/t/p/w185${poster}`} alt={name} className="w-24 rounded-xl opacity-60" />}
                    <div className="text-center flex flex-col gap-2">
                        <p className="text-white text-lg font-bold">{name}</p>
                        <p className="text-white/50 text-sm">아직 방송 시간이 되지 않았어요</p>
                        <p className="text-white/80 text-sm font-medium">
                            🗓 {new Date(scheduledAtParam!).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} 방송 예정
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // 실제 파티 예약됨 대기 화면
    const isUpcoming = !isDummyAny && party?.status === 'upcoming' && new Date(party.scheduledAt) > new Date()
    if (isUpcoming && party) return (
        <div className="min-h-screen flex flex-col">
            <div className="flex items-center px-6 py-4 border-b border-white/10 gap-3 mt-10">
                <button onClick={() => router.push('/live')} className="text-white/40 hover:text-white transition-colors text-sm cursor-pointer">← 돌아가기</button>
                <div className="w-px h-4 bg-white/10" />
                <div>
                    <h1 className="text-white font-bold text-sm">{party.title}</h1>
                    <p className="text-white/40 text-xs">{party.animeName} · 개설자 {party.hostName}</p>
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {party.animePoster && <img src={`https://image.tmdb.org/t/p/w185${party.animePoster}`} alt={party.animeName} className="w-24 rounded-xl opacity-60" />}
                <div className="text-center flex flex-col gap-2">
                    <p className="text-white text-lg font-bold">{party.animeName}</p>
                    <p className="text-white/50 text-sm">아직 파티가 시작되지 않았어요</p>
                    <p className="text-white/80 text-sm font-medium">
                        🗓 {new Date(party.scheduledAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} 시작 예정
                    </p>
                </div>
            </div>
        </div>
    )

    if (!isDummyAny && !party) return null

    const animeName = isDummyAny ? (dummyDetail?.name ?? dummyDetail?.title ?? '') : party?.animeName ?? ''
    const animePoster = isDummyAny ? (dummyDetail?.poster_path ?? '') : party?.animePoster ?? ''
    const hostName = isDummyAny ? dummyInfo?.hostName ?? '' : party?.hostName ?? ''
    const attendees = isDummyAny ? dummyInfo?.attendees ?? 0 : party?.attendees ?? 0
    const maxAttendees = isDummyAny ? dummyInfo?.maxAttendees ?? 0 : party?.maxAttendees ?? 0
    const scheduledAt = isDummyAny ? null : party?.scheduledAt
    const video = isDummyAny ? (tmdbId ? aniVideos[tmdbId] : null) : (party ? aniVideos[party.animeId] : null)
    const title = isDummyAny ? `${animeName} 파티` : party?.title ?? ''

    return (
        <div className="min-h-screen">
            <div className="inner px-6 py-6">

                {/* 상단 바 */}
                <div className="flex items-center justify-between py-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-3 mt-10">
                        <button
                            onClick={() => router.push('/live')}
                            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 18-6-6 6-6"/>
                            </svg>
                            돌아가기
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                        <div>
                            <p className="text-white font-bold text-sm">{title}</p>
                            {(isPartySection || !isDummyAny) ? (
                                <p className="text-white/40 text-xs">{animeName} · 개설자 {hostName}</p>
                            ) : (
                                <p className="text-white/40 text-xs">{animeName}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            LIVE
                        </span>
                        {(isPartySection || !isDummyAny) && (
                            <>
                                <span className="text-white/40 text-xs">👥 {attendees}/{maxAttendees}명</span>
                                <button
                                    onClick={() => router.push('/live')}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 rounded-lg text-xs text-white/50 hover:text-red-400 transition-all cursor-pointer"
                                >
                                    파티 나가기
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex gap-6 items-start">
                    {/* 왼쪽: 플레이어 + 정보 */}
                    <div className="flex-1 min-w-0">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black" ref={playerRef}>
                            {video ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${video.key}?autoplay=1&rel=0`}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#111]">
                                    <p className="text-white/30 text-sm">영상을 불러오는 중...</p>
                                </div>
                            )}
                        </div>

                        {/* 파티 정보 */}
                        <div className="flex items-center gap-3 mt-4">
                            {animePoster && (
                                <img src={`https://image.tmdb.org/t/p/w92${animePoster}`} alt={animeName} className="w-10 h-14 object-cover rounded-lg shrink-0" />
                            )}
                            <div>
                                <h2 className="text-white font-bold text-lg">{animeName}</h2>
                                <p className="text-white/50 text-sm mt-0.5">{title}</p>
                                {scheduledAt && (
                                    <p className="text-white/30 text-xs mt-0.5">
                                        시작 : {new Date(scheduledAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 관련 작품 */}
                        {relatedAnime.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-white font-bold text-base mb-4">관련 작품</h3>
                                <div className="grid grid-cols-6 gap-3">
                                    {relatedAnime.map((ani) => (
                                        <div key={ani.id} className="group cursor-pointer">
                                            <div className="aspect-[3/4] rounded-lg overflow-hidden relative">
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w300${ani.poster_path}`}
                                                    alt={ani.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                                            <polygon points="5,3 19,12 5,21"/>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-white/80 text-xs font-medium mt-2 truncate">{ani.name}</p>
                                            <p className="text-white/40 text-xs truncate">{ani.first_air_date?.slice(0, 4)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 채팅 */}
                    <div
                        className="w-[380px] shrink-0 flex flex-col bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5"
                        style={{ height: playerHeight > 0 ? `${playerHeight}px` : '500px' }}
                    >
                        <div className="px-4 py-3 border-b border-white/10 shrink-0">
                            <p className="text-white font-medium text-sm">실시간 채팅</p>
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 [&::-webkit-scrollbar]:w-0">
                            {messages.length === 0 && (
                                <p className="text-white/20 text-xs text-center mt-4">첫 번째 메시지를 남겨보세요!</p>
                            )}
                            {messages.map(msg => (
                                <div key={msg.id} className="flex items-start gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#6c63ff] flex items-center justify-center shrink-0">
                                        <span className="text-white text-xs font-bold">{msg.name?.[0]?.toUpperCase() || '?'}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[#6c63ff] text-xs font-medium">{msg.name}</span>
                                        <span className="text-white/80 text-sm">{msg.text}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 border-t border-white/10 shrink-0">
                            {user ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="메시지 입력..."
                                        maxLength={100}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#6c63ff]"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputText.trim()}
                                        className="px-3 py-2 bg-[#6c63ff] rounded-lg text-white text-sm hover:bg-[#5a52e0] transition-colors disabled:opacity-30"
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
        </div>
    )
}