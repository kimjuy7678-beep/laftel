"use client"
import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { db } from '@/firebase/firebase'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'
import channels from '@/data/channels.json'
import Link from 'next/link'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

export default function LiveChannelPage() {
    const { channel } = useParams()
    const { user } = useAuthStore()
    const { aniDetails, onFetchDetail, aniVideos, onFetchVideo } = useAniStore()
    const ch = channels.find(c => c.slug === channel)
    const otherChannels = channels.filter(c => c.slug !== channel)

    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [tab, setTab] = useState<'chat' | 'schedule'>('chat')
    const iframeRef = useRef<HTMLDivElement>(null)
    const [playerHeight, setPlayerHeight] = useState(0)
    const [nowMin, setNowMin] = useState(nowInMinutes)

    // scheduleUtils 기반 편성표
    const allChannels = useMemo(() => buildChannels(getTodaySeed()), [])
    const chSchedule = useMemo(() =>
        allChannels.find(c => c.id === ch?.id),
        [allChannels, ch?.id]
    )
    const currentIdx = useMemo(() =>
        chSchedule ? getCurrentIdx(chSchedule.items, nowMin) : -1,
        [chSchedule, nowMin]
    )
    const currentItem = chSchedule?.items[currentIdx]

    // 현재 방영 중 애니 detail + video fetch
    useEffect(() => {
        if (!currentItem?.tmdbId) return
        onFetchDetail(currentItem.tmdbId)
        onFetchVideo(currentItem.tmdbId, currentItem.koTitle)
    }, [currentItem?.tmdbId])

    // 다른 채널 현재 방영 중도 fetch
    useEffect(() => {
        allChannels.forEach(sch => {
            const idx = getCurrentIdx(sch.items, nowMin)
            const item = sch.items[idx]
            if (item?.tmdbId) onFetchDetail(item.tmdbId)
        })
    }, [])

    // 1분마다 nowMin 갱신
    useEffect(() => {
        const timer = setInterval(() => setNowMin(nowInMinutes()), 60_000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const updateHeight = () => {
            if (iframeRef.current) setPlayerHeight(iframeRef.current.offsetHeight)
        }
        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => window.removeEventListener('resize', updateHeight)
    }, [])

    useEffect(() => {
        if (!ch) return
        const q = query(collection(db, `live_chat_${ch.id}`), orderBy('createdAt', 'asc'))
        const unsub = onSnapshot(q, snap => {
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

    // 영상 소스 결정: 현재 방영 애니 유튜브 키 → 없으면 채널 기본 videoId
    const currentDetail = currentItem?.tmdbId ? aniDetails[currentItem.tmdbId] : null
    const currentVideo = currentItem?.tmdbId ? aniVideos[currentItem.tmdbId] : null
    const videoKey = currentVideo?.key || (ch as any).videoId

    // 현재 방영 backdrop
    const backdropUrl = currentDetail?.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${currentDetail.backdrop_path}`
        : `https://img.youtube.com/vi/${(ch as any).videoId}/maxresdefault.jpg`

    return (
        <div className="min-h-screen">
            <div style={{ width: '90%', margin: '0 auto', padding: '24px 0' }}>

                <Link href="/live" className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-4 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    라이브 목록
                </Link>

                <div className="flex gap-6 items-start">
                    {/* 왼쪽: 플레이어 */}
                    <div className="flex-1 min-w-0">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black" ref={iframeRef}>
                            <iframe
                                src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`}
                                className="w-full h-full"
                                allow="autoplay; fullscreen"
                                allowFullScreen
                            />
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <img src={ch.logo} alt={ch.name} className="h-10 w-auto object-contain shrink-0" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-white font-bold text-lg">{ch.name}</h2>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded text-xs text-white font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                        LIVE
                                    </span>
                                </div>
                                {currentItem && (
                                    <p className="text-white/60 text-sm mt-0.5">
                                        현재 방영중: <span className="text-white/80">{currentItem.koTitle}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 다른 채널 */}
                        <div className="mt-8">
                            <h3 className="text-white font-bold text-base mb-4">다른 채널</h3>
                            <div className="flex gap-4">
                                {otherChannels.map(oc => {
                                    const ocSch = allChannels.find(s => s.id === oc.id)
                                    const ocIdx = ocSch ? getCurrentIdx(ocSch.items, nowMin) : -1
                                    const ocItem = ocSch?.items[ocIdx]
                                    const ocDetail = ocItem?.tmdbId ? aniDetails[ocItem.tmdbId] : null
                                    const ocBackdrop = ocDetail?.backdrop_path
                                        ? `https://image.tmdb.org/t/p/w780${ocDetail.backdrop_path}`
                                        : `https://img.youtube.com/vi/${(oc as any).videoId}/maxresdefault.jpg`

                                    return (
                                        <Link
                                            key={oc.id}
                                            href={`/live/${oc.slug}`}
                                            className="flex-1 bg-[#1a1a1a] hover:bg-[#242424] border border-white/5 hover:border-white/15 rounded-xl p-4 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={oc.logo} alt={oc.name} className="h-7 w-auto object-contain shrink-0" />
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white text-sm font-medium">{oc.name}</span>
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] text-white font-bold">
                                                            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                                            LIVE
                                                        </span>
                                                    </div>
                                                    {ocItem && (
                                                        <p className="text-white/40 text-xs mt-0.5 truncate">{ocItem.koTitle}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/50 relative">
                                                <img
                                                    src={ocBackdrop}
                                                    alt={oc.name}
                                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                                            <polygon points="5,3 19,12 5,21" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 관련 작품 — 현재 채널 편성표 기반 */}
                        <div className="mt-8">
                            <h3 className="text-white font-bold text-base mb-4">오늘 편성 작품</h3>
                            <div className="grid grid-cols-6 gap-3">
                                {(chSchedule?.items || []).slice(0, 6).map((item, i) => {
                                    const detail = aniDetails[item.tmdbId]
                                    const posterUrl = detail?.poster_path
                                        ? `https://image.tmdb.org/t/p/w300${detail.poster_path}`
                                        : null
                                    const isCur = i === currentIdx

                                    return (
                                        <div key={item.tmdbId} className="group cursor-pointer" onClick={() => { }}>
                                            <div className={`aspect-[3/4] rounded-lg overflow-hidden relative ${isCur ? 'ring-2 ring-[#6c63ff]' : ''}`}>
                                                {posterUrl
                                                    ? <img src={posterUrl} alt={item.koTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    : <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-xs text-center p-2">{item.koTitle}</div>
                                                }
                                                {isCur && (
                                                    <div className="absolute inset-0 bg-[#6c63ff]/20 flex items-end justify-center pb-2">
                                                        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">ON AIR</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white/80 text-xs font-medium mt-2 truncate">{item.koTitle}</p>
                                            <p className="text-white/40 text-xs">{item.time}</p>
                                        </div>
                                    )
                                })}
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
                                    {messages.map(msg => (
                                        <div key={msg.id} className="flex items-start gap-2">
                                            <div className="w-7 h-7 rounded-full bg-[#6c63ff] flex items-center justify-center shrink-0 overflow-hidden">
                                                {msg.photoURL
                                                    ? <img src={msg.photoURL} alt={msg.name} className="w-full h-full object-cover" />
                                                    : <span className="text-white text-xs font-bold">{msg.name?.[0]?.toUpperCase() || '?'}</span>
                                                }
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
                                                onChange={e => setInput(e.target.value)}
                                                onKeyUp={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                                                placeholder="채팅 입력..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#6c63ff]"
                                            />
                                            <button onClick={sendMessage} className="px-3 py-2 bg-[#6c63ff] rounded-lg text-white text-sm hover:bg-[#5a52e0] transition-colors">
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
                            <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-0">
                                <ul className="flex flex-col">
                                    {(chSchedule?.items || []).map((item, i) => {
                                        const isCur = i === currentIdx
                                        const isPast = i < currentIdx
                                        const detail = aniDetails[item.tmdbId]
                                        const posterPath = detail?.poster_path

                                        return (
                                            <li
                                                key={item.tmdbId}
                                                className={[
                                                    'relative flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] transition-colors',
                                                    isCur ? 'bg-[#6c63ff]/10 cursor-pointer' : '',
                                                    isPast ? 'opacity-40 cursor-default' : 'hover:bg-white/[0.03] cursor-pointer',
                                                ].join(' ')}
                                            >
                                                {isCur && <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#6c63ff] rounded-r" />}

                                                <span className={`text-xs font-mono shrink-0 min-w-[40px] ${isCur ? 'text-[#6c63ff] font-bold' : 'text-white/35'}`}>
                                                    {item.time}
                                                </span>

                                                <div className={`shrink-0 rounded-md overflow-hidden bg-white/[0.06] ${isCur ? 'w-[48px] h-[66px]' : 'w-[38px] h-[52px]'}`}>
                                                    {posterPath
                                                        ? <img src={`https://image.tmdb.org/t/p/w92${posterPath}`} alt={item.koTitle} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-white/15">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                                            </svg>
                                                        </div>
                                                    }
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${isCur ? 'text-white' : isPast ? 'text-white/30' : 'text-white/70'}`}>
                                                        {item.koTitle}
                                                    </p>
                                                    {isCur && (
                                                        <span className="inline-flex items-center gap-1 mt-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                                            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                                            ON AIR
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}