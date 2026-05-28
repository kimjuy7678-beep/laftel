'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
    createdAt: any
}

export default function PartyRoomPage() {
    const { partyId } = useParams() as { partyId: string }
    const router = useRouter()
    const { user } = useAuthStore()
    const { aniVideos, onFetchVideo } = useAniStore()

    const [party, setParty] = useState<Party | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(true)
    const chatEndRef = useRef<HTMLDivElement>(null)

    // 파티 데이터 fetch
    useEffect(() => {
        const fetchParty = async () => {
            try {
                const docRef = doc(db, 'parties', partyId)
                const docSnap = await getDoc(docRef)
                if (!docSnap.exists()) {
                    router.push('/live')
                    return
                }
                const data = { id: docSnap.id, ...docSnap.data() } as Party
                setParty(data)

                // 영상 fetch
                await onFetchVideo(data.animeId, data.animeName)

                // 참여 인원 +1
                await updateDoc(docRef, { attendees: increment(1) })
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchParty()

        // 퇴장 시 참여 인원 -1
        return () => {
            const docRef = doc(db, 'parties', partyId)
            updateDoc(docRef, { attendees: increment(-1) })
        }
    }, [partyId])

    // 실시간 채팅 구독
    useEffect(() => {
        const q = query(
            collection(db, 'parties', partyId, 'messages'),
            orderBy('createdAt', 'asc')
        )
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[]
            setMessages(msgs)
        })
        return () => unsub()
    }, [partyId])

    // 새 메시지 오면 스크롤 아래로
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!user || !inputText.trim()) return
        try {
            await addDoc(collection(db, 'parties', partyId, 'messages'), {
                uid: user.uid,
                name: user.name || '익명',
                text: inputText.trim(),
                createdAt: serverTimestamp(),
            })
            setInputText('')
        } catch (err) {
            console.error(err)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-white/40 text-sm">파티 불러오는 중...</p>
        </div>
    )

    if (!party) return null

    const video = aniVideos[party.animeId]

    return (
        <div className="min-h-screen flex flex-col">

            {/* 상단 파티 정보 바 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/live')}
                        className="text-white/40 hover:text-white transition-colors text-sm"
                    >
                        ← 돌아가기
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <div>
                        <h1 className="text-white font-bold text-sm">{party.title}</h1>
                        <p className="text-white/40 text-xs">{party.animeName} · 개설자 {party.hostName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* 상태 배지 */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        party.status === 'live'
                            ? 'bg-red-500 text-white'
                            : party.status === 'upcoming'
                            ? 'bg-white/10 text-white/60'
                            : 'bg-white/5 text-white/30'
                    }`}>
                        {party.status === 'live' ? '🔴 진행중'
                            : party.status === 'upcoming' ? '⏳ 예약됨'
                            : '종료'}
                    </span>
                    <span className="text-white/40 text-xs">
                        👥 {party.attendees} / {party.maxAttendees}명
                    </span>
                    <button
                        onClick={() => router.push('/live')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 rounded-lg text-xs text-white/50 hover:text-red-400 transition-all"
                    >
                        파티 나가기
                    </button>
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex flex-1 overflow-hidden">

                {/* 왼쪽: 영상 */}
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

                    {/* 애니 정보 */}
                    <div className="flex items-center gap-4 px-6 py-4 border-t border-white/10">
                        <img
                            src={`https://image.tmdb.org/t/p/w92${party.animePoster}`}
                            alt={party.animeName}
                            className="w-10 h-14 object-cover rounded"
                        />
                        <div>
                            <p className="text-white font-bold">{party.animeName}</p>
                            <p className="text-white/40 text-xs mt-0.5">
                                시작 시간 : {new Date(party.scheduledAt).toLocaleString('ko-KR')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 채팅 */}
                <div className="w-80 flex flex-col border-l border-white/10">

                    {/* 채팅 헤더 */}
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-white/60 text-sm font-medium">실시간 채팅</p>
                    </div>

                    {/* 메시지 목록 */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                        {messages.length === 0 && (
                            <p className="text-white/20 text-xs text-center mt-4">
                                첫 번째 메시지를 남겨보세요!
                            </p>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.uid === user?.uid ? 'items-end' : 'items-start'}`}>
                                <span className="text-white/40 text-[10px]">{msg.name}</span>
                                <div className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] ${
                                    msg.uid === user?.uid
                                        ? 'bg-white text-black rounded-tr-sm'
                                        : 'bg-white/10 text-white rounded-tl-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* 입력창 */}
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
                            <p className="text-white/30 text-xs text-center py-2">
                                채팅하려면 로그인이 필요해요
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}