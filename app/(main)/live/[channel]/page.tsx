"use client"
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import channels from '@/data/channels.json'
import Link from 'next/link'

const schedule: Record<string, { time: string; title: string; current?: boolean }[]> = {
    aniplus: [
        { time: "00:00", title: "심야 애니 타임 - 무직전생" },
        { time: "01:30", title: "이세계 식당 2기" },
        { time: "03:00", title: "재방송 - 귀멸의 칼날 1기" },
        { time: "05:00", title: "재방송 - 스파이 패밀리 1기" },
        { time: "07:00", title: "아침 애니 - 포켓몬스터" },
        { time: "08:30", title: "디지몬 고스트 게임" },
        { time: "10:00", title: "재방송 - 주술회전 1기" },
        { time: "12:00", title: "점심 특선 - 원피스 극장판" },
        { time: "14:00", title: "재방송 - 나 혼자만 레벨업" },
        { time: "16:00", title: "재방송 - 던전밥" },
        { time: "18:00", title: "귀멸의 칼날 - 도공 마을 편" },
        { time: "19:00", title: "주술회전 2기" },
        { time: "20:00", title: "나 혼자만 레벨업", current: true },
        { time: "21:00", title: "던전밥" },
        { time: "22:00", title: "프리렌 - 장송의 여정" },
        { time: "23:00", title: "스파이 패밀리 시즌2" },
    ],
    animax: [
        { time: "00:00", title: "심야 특선 - 카우보이 비밥" },
        { time: "01:30", title: "블리치 천년혈전 재방송" },
        { time: "03:00", title: "재방송 - 드래곤볼 Z" },
        { time: "05:00", title: "재방송 - 원피스" },
        { time: "07:00", title: "아침 특선 - 명탐정 코난" },
        { time: "09:00", title: "도라에몽" },
        { time: "10:30", title: "재방송 - 나루토 질풍전" },
        { time: "12:00", title: "점심 특선 - 드래곤볼 슈퍼 극장판" },
        { time: "14:00", title: "재방송 - 체인소맨" },
        { time: "16:00", title: "재방송 - 블리치 천년혈전" },
        { time: "18:00", title: "원피스" },
        { time: "19:30", title: "명탐정 코난" },
        { time: "21:00", title: "드래곤볼 슈퍼", current: true },
        { time: "22:30", title: "체인소맨" },
        { time: "23:30", title: "블리치 천년혈전" },
    ],
    anione: [
        { time: "00:00", title: "심야 특선 - 에반게리온 극장판" },
        { time: "02:00", title: "재방송 - 코드기어스 R2" },
        { time: "04:00", title: "재방송 - 카우보이 비밥" },
        { time: "06:00", title: "아침 특선 - 건담 시리즈" },
        { time: "08:00", title: "재방송 - 하이큐 1기" },
        { time: "10:00", title: "재방송 - 강철의 연금술사" },
        { time: "12:00", title: "점심 특선 - 귀멸의 칼날 극장판" },
        { time: "14:00", title: "재방송 - 진격의 거인 파이널" },
        { time: "16:00", title: "재방송 - 코드기어스 1기" },
        { time: "18:30", title: "하이큐 파이널" },
        { time: "20:00", title: "신세기 에반게리온", current: true },
        { time: "21:30", title: "코드기어스" },
        { time: "23:00", title: "카우보이 비밥" },
    ],
}

const relatedAnime = [
    { title: "귀멸의 칼날", genre: "액션 · 판타지", img: "https://image.tmdb.org/t/p/w300/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg" },
    { title: "주술회전", genre: "액션 · 호러", img: "https://image.tmdb.org/t/p/w300/7yx1K8bfRqTmKz5OoIlRtAaJzV4.jpg" },
    { title: "나 혼자만 레벨업", genre: "액션 · 판타지", img: "https://image.tmdb.org/t/p/w300/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg" },
    { title: "프리렌", genre: "판타지 · 모험", img: "https://image.tmdb.org/t/p/w300/dY5e2VXDHPkMoxEPAfPUBiKxVVH.jpg" },
    { title: "던전밥", genre: "판타지 · 코미디", img: "https://image.tmdb.org/t/p/w300/76PTRdCUnNEQAZiNkjKRZFHQKFD.jpg" },
    { title: "스파이 패밀리", genre: "코미디 · 액션", img: "https://image.tmdb.org/t/p/w300/7B5sHRRyvF0QKNO7FpBBkfcJFTU.jpg" },
]

export default function LiveChannelPage() {
    const { channel } = useParams()
    const { user } = useAuthStore()
    const ch = channels.find(c => c.slug === channel)
    const otherChannels = channels.filter(c => c.slug !== channel)
    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [tab, setTab] = useState<'chat' | 'schedule'>('chat')
    const iframeRef = useRef<HTMLDivElement>(null)
    const [playerHeight, setPlayerHeight] = useState(0)

    useEffect(() => {
        const updateHeight = () => {
            if (iframeRef.current) {
                setPlayerHeight(iframeRef.current.offsetHeight)
            }
        }
        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => window.removeEventListener('resize', updateHeight)
    }, [])

    useEffect(() => {
        if (!ch) return
        const q = query(
            collection(db, `live_chat_${ch.id}`),
            orderBy('createdAt', 'asc')
        )
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        return () => unsub()
    }, [ch])

    useEffect(() => {
        if (messages.length > 0 && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || !user || !ch) return
        const text = input.trim()
        setInput('')
        await addDoc(collection(db, `live_chat_${ch.id}`), {
            text,
            name: user.name || '익명',
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
        })
    }

    if (!ch) return (
        <div className="min-h-screen flex items-center justify-center text-white/50">
            채널을 찾을 수 없어요.
        </div>
    )

    const chSchedule = schedule[ch.id] || []
    const currentProgram = chSchedule.find(s => s.current)

    return (
        <div className="min-h-screen">
            <div className="inner px-6 py-6">

                <Link href="/live" className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-4 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </Link>

                <div className="flex gap-6 items-start">
                    {/* 왼쪽: 플레이어 */}
                    <div className="flex-1 min-w-0">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black" ref={iframeRef}>
                            <iframe
                                src={`https://www.youtube.com/embed/${(ch as any).videoId}?autoplay=1`}
                                className="w-full h-full"
                                allow="autoplay; fullscreen"
                                allowFullScreen
                            />
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <img src={ch.logo} alt={ch.name} className="w-12 h-12 object-contain shrink-0" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-white font-bold text-lg">{ch.name}</h2>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded text-xs text-white font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                        LIVE
                                    </span>
                                </div>
                                {currentProgram && (
                                    <p className="text-white/60 text-sm mt-0.5">현재 방영중: {currentProgram.title}</p>
                                )}
                            </div>
                        </div>

                        {/* 다른 채널 */}
                        <div className="mt-8">
                            <h3 className="text-white font-bold text-base mb-4">다른 채널</h3>
                            <div className="flex gap-4">
                                {otherChannels.map((oc) => {
                                    const ocSchedule = schedule[oc.id] || []
                                    const ocCurrent = ocSchedule.find(s => s.current)
                                    return (
                                        <Link
                                            key={oc.id}
                                            href={`/live/${oc.slug}`}
                                            className="flex-1 bg-[#1a1a1a] hover:bg-[#242424] border border-white/5 hover:border-white/15 rounded-xl p-4 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={oc.logo} alt={oc.name} className="w-10 h-10 object-contain shrink-0" />
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white text-sm font-medium">{oc.name}</span>
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] text-white font-bold">
                                                            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                                            LIVE
                                                        </span>
                                                    </div>
                                                    {ocCurrent && (
                                                        <p className="text-white/40 text-xs mt-0.5 truncate">{ocCurrent.title}</p>
                                                    )}
                                                </div>
                                            </div>
<div className="w-full aspect-video rounded-lg overflow-hidden bg-black/50 relative">
    <img
        src={`https://img.youtube.com/vi/${(oc as any).videoId}/maxresdefault.jpg`}
        alt={oc.name}
        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
    />
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"/>
            </svg>
        </div>
    </div>
</div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 관련 작품 */}
                        <div className="mt-8">
                            <h3 className="text-white font-bold text-base mb-4">관련 작품</h3>
                            <div className="grid grid-cols-6 gap-3">
                                {relatedAnime.map((ani) => (
                                    <div key={ani.title} className="group cursor-pointer">
                                        <div className="aspect-[3/4] rounded-lg overflow-hidden relative">
                                            <img
                                                src={ani.img}
                                                alt={ani.title}
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
                                        <p className="text-white/80 text-xs font-medium mt-2 truncate">{ani.title}</p>
                                        <p className="text-white/40 text-xs truncate">{ani.genre}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽: 채팅 + 편성표 */}
                    <div
                        className="w-[320px] shrink-0 flex flex-col bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5"
                        style={{ height: playerHeight > 0 ? `${playerHeight}px` : '500px' }}
                    >
                        <div className="flex border-b border-white/10 shrink-0">
                            <button
                                onClick={() => setTab('chat')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'chat' ? 'text-white border-b-2 border-[#6c63ff]' : 'text-white/40 hover:text-white/70'}`}
                            >
                                채팅
                            </button>
                            <button
                                onClick={() => setTab('schedule')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'schedule' ? 'text-white border-b-2 border-[#6c63ff]' : 'text-white/40 hover:text-white/70'}`}
                            >
                                편성표
                            </button>
                        </div>

                        {tab === 'chat' ? (
                            <>
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
                                    {messages.length === 0 && (
                                        <p className="text-white/20 text-xs text-center mt-4">첫 채팅을 남겨보세요!</p>
                                    )}
                                    {messages.map((msg) => (
                                        <div key={msg.id} className="flex items-start gap-2">
                                            <div className="w-7 h-7 rounded-full bg-[#6c63ff] flex items-center justify-center shrink-0 overflow-hidden">
                                                {msg.photoURL ? (
                                                    <img src={msg.photoURL} alt={msg.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white text-xs font-bold">{msg.name?.[0]?.toUpperCase() || '?'}</span>
                                                )}
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
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyUp={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        sendMessage()
                                                    }
                                                }}
                                                placeholder="채팅 입력..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#6c63ff]"
                                            />
                                            <button
                                                onClick={sendMessage}
                                                className="px-3 py-2 bg-[#6c63ff] rounded-lg text-white text-sm hover:bg-[#5a52e0] transition-colors"
                                            >
                                                전송
                                            </button>
                                        </div>
                                    ) : (
                                        <Link href="/login" className="block text-center text-sm text-white/40 hover:text-white/70 py-2 transition-colors">
                                            로그인 후 채팅 가능
                                        </Link>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                <ul className="flex flex-col gap-1">
                                    {chSchedule.map((item, i) => (
                                        <li
                                            key={i}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${item.current ? 'bg-[#6c63ff]/20 border border-[#6c63ff]/30' : 'hover:bg-white/5'}`}
                                        >
                                            <span className={`text-xs font-mono shrink-0 ${item.current ? 'text-[#6c63ff]' : 'text-white/40'}`}>
                                                {item.time}
                                            </span>
                                            <span className={`text-sm ${item.current ? 'text-white font-medium' : 'text-white/70'}`}>
                                                {item.title}
                                            </span>
                                            {item.current && (
                                                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold shrink-0">ON</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}