"use client"
import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { db } from '@/firebase/firebase'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'
import channels from '@/data/channels.json'
import Link from 'next/link'
import LoginModal from '@/components/LoginModal'
import MembershipRequiredModal from '@/components/MembershipRequiredModal'
import GradeBadge from '@/components/GradeBadge'

export default function LiveChannelPage() {
    const { channel } = useParams()
    const router = useRouter()
    const { user } = useAuthStore()
    const { aniDetails, aniVideos, onFetchDetail, onFetchVideo } = useAniStore()
    const ch = channels.find(c => c.slug === channel)
    const otherChannels = channels.filter(c => c.slug !== channel)
    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [tab, setTab] = useState<'chat' | 'schedule'>('chat')
    const iframeRef = useRef<HTMLDivElement>(null)
    const [playerHeight, setPlayerHeight] = useState(0)
    const [nowMin, setNowMin] = useState(nowInMinutes)
    const [relatedAnime, setRelatedAnime] = useState<any[]>([])
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showMembershipModal, setShowMembershipModal] = useState(false)
    const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null)
    const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)
    const canWatch = user && (user.membership === 'anime' || user.membership === 'allinone')

    const allChannels = useMemo(() => buildChannels(getTodaySeed()), [])
    const chSchedule = allChannels.find(c => c.id === ch?.id)
    const currentIdx = chSchedule ? getCurrentIdx(chSchedule.items, nowMin) : -1
    const currentProgram = chSchedule?.items[currentIdx]

    const myWatched = (() => {
        try {
            const s = typeof window !== 'undefined' ? localStorage.getItem('watch-progress-storage') : null
            return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0
        } catch { return 0 }
    })()

    useEffect(() => {
        const timer = setInterval(() => setNowMin(nowInMinutes()), 60_000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (!currentProgram) return
        onFetchVideo(currentProgram.tmdbId, currentProgram.koTitle)
    }, [currentProgram?.tmdbId])

    useEffect(() => {
        if (!chSchedule) return
        chSchedule.items.forEach(item => onFetchDetail(item.tmdbId))
    }, [chSchedule])

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

    useEffect(() => {
        if (!currentProgram) return
        const tmdbId = currentProgram.tmdbId
        const fetchRelated = async () => {
            const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
            const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=ko-KR`)
            const detail = await detailRes.json()
            const genreIds = detail.genres?.map((g: any) => g.id).join(',') ?? '16'
            const res = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=${genreIds}&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=1`)
            const data = await res.json()
            setRelatedAnime((data.results || []).filter((a: any) => a.id !== tmdbId && a.poster_path).slice(0, 6))
        }
        fetchRelated()
    }, [currentProgram?.tmdbId])

    const handleScheduleClick = (item: { tmdbId: number; koTitle: string; time: string; minutesFromStart: number }, i: number) => {
        const isPast = i < currentIdx
        const isCurrent = i === currentIdx
        if (isPast) return
        if (isCurrent) {
            router.push(`/live/party/dummy-${item.tmdbId}`)
        } else {
            const today = new Date()
            const h = Math.floor(item.minutesFromStart / 60) % 24
            const m = item.minutesFromStart % 60
            today.setHours(h, m, 0, 0)
            if (item.minutesFromStart >= 24 * 60) today.setDate(today.getDate() + 1)
            router.push(`/live/party/dummy-${item.tmdbId}?scheduledAt=${today.toISOString()}`)
        }
    }

    const handlePlayerClick = () => {
        if (!user) { setShowLoginModal(true); return }
        if (!canWatch) { setShowMembershipModal(true) }
    }

    const sendMessage = async () => {
        if (!input.trim() || !user || !ch) return
        const text = input.trim()
        setInput('')
        await addDoc(collection(db, `live_chat_${ch.id}`), {
            text,
            name: user.name || '익명',
            photoURL: user.photoURL || null,
            watched: myWatched,
            createdAt: serverTimestamp(),
        })
    }

    const expandedMsg = messages.find(m => m.id === expandedMsgId)

    if (!ch) return (
        <div className="min-h-screen flex items-center justify-center text-[var(--text-subtle)]">
            채널을 찾을 수 없어요.
        </div>
    )

    return (
        <div className="min-h-screen" onClick={() => { setExpandedMsgId(null); setPopupPos(null) }}>
            <style>{`
                @keyframes popIn {
                    from { opacity:0; transform: translateX(-50%) scale(0.4) translateY(8px); }
                    to   { opacity:1; transform: translateX(-50%) scale(1) translateY(0); }
                }
                .avatar-popup {
                    animation: popIn .2s cubic-bezier(.34,1.56,.64,1);
                    transform-origin: bottom center;
                }
            `}</style>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => {
                    const u = useAuthStore.getState().user
                    if (u?.membership !== 'anime' && u?.membership !== 'allinone') {
                        setShowMembershipModal(true)
                    }
                }}
            />
            <MembershipRequiredModal
                isOpen={showMembershipModal}
                onClose={() => setShowMembershipModal(false)}
                type="anime"
            />

            {/* fixed 팝업 - 채팅창 밖으로 튀어나옴 */}
            {expandedMsgId && popupPos && expandedMsg && (
                <div
                    className="avatar-popup fixed z-[9999] pointer-events-none"
                    style={{
                        left: popupPos.x,
                        top: popupPos.y - 124,
                        transform: 'translateX(-50%)',
                        filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))',
                    }}
                >
                    <div className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-white">
                        {expandedMsg.photoURL
                            ? <img src={expandedMsg.photoURL} alt={expandedMsg.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-[var(--main)] flex items-center justify-center text-white font-bold text-2xl">
                                {expandedMsg.name?.[0]?.toUpperCase() || '?'}
                            </div>
                        }
                    </div>
                    <svg width="20" height="10" viewBox="0 0 20 10" className="absolute -bottom-[9px] left-1/2 -translate-x-1/2">
                        <path d="M0 0 L10 10 L20 0 Z" fill="white" />
                    </svg>
                </div>
            )}

            <div className="inner px-4 py-5 sm:px-6 sm:py-6">
                {/* 상단 바 */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-4 mb-4 border-b border-[var(--border)]">
                    <div className="flex min-w-0 items-center gap-3 mt-8 sm:mt-10">
                        <Link href="/live" className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                            돌아가기
                        </Link>
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <div>
                            <p className="text-[var(--text-primary)] font-bold text-sm">{ch.name}</p>
                            {currentProgram && <p className="text-[var(--text-subtle)] text-xs">{currentProgram.koTitle}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-red-500 rounded-full text-xs text-white font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            LIVE
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-6 items-stretch lg:flex-row lg:items-start">
                    {/* 왼쪽: 플레이어 */}
                    <div className="flex-1 min-w-0">
                        <div className="aspect-video rounded-xl overflow-hidden bg-black relative" ref={iframeRef}>
                            {!user ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer bg-black/80 relative"
                                    onClick={handlePlayerClick}>
                                    {currentProgram && aniDetails[currentProgram.tmdbId]?.backdrop_path && (
                                        <img src={`https://image.tmdb.org/t/p/w780${aniDetails[currentProgram.tmdbId].backdrop_path}`}
                                            className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60" />
                                    <div className="relative flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}>
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="1.5">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-bold text-lg">로그인 후 시청할 수 있어요</p>
                                        <p className="text-white/40 text-sm">클릭해서 로그인하기</p>
                                    </div>
                                </div>
                            ) : !canWatch ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer relative"
                                    onClick={handlePlayerClick}>
                                    {currentProgram && aniDetails[currentProgram.tmdbId]?.backdrop_path && (
                                        <img src={`https://image.tmdb.org/t/p/w780${aniDetails[currentProgram.tmdbId].backdrop_path}`}
                                            className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60" />
                                    <div className="relative flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                                            style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}>
                                            🎬
                                        </div>
                                        <p className="text-white font-bold text-lg">멤버십이 필요해요</p>
                                        <p className="text-white/40 text-sm">클릭해서 멤버십 시작하기</p>
                                    </div>
                                </div>
                            ) : currentProgram && aniVideos[currentProgram.tmdbId] ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${aniVideos[currentProgram.tmdbId]?.key}?autoplay=1&rel=0`}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                />
                            ) : (
                                <iframe
                                    src={`https://www.youtube.com/embed/${(ch as any).videoId}?autoplay=1`}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-4 sm:gap-4">
                            <img src={ch.logo} alt={ch.name} className="w-12 h-12 object-contain shrink-0" />
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[var(--text-primary)] font-bold text-base sm:text-lg">{ch.name}</h2>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded text-xs text-white font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                        LIVE
                                    </span>
                                </div>
                                {currentProgram && <p className="text-[var(--text-muted)] text-xs mt-0.5 sm:text-sm">현재 방영중: {currentProgram.koTitle}</p>}
                            </div>
                        </div>

                        {/* 다른 채널 */}
                        <div className="mt-8">
                            <h3 className="text-[var(--text-primary)] font-bold text-base mb-4">다른 채널</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {otherChannels.map((oc) => {
                                    const ocSchedule = allChannels.find(c => c.id === oc.id)
                                    const ocCurrentIdx = ocSchedule ? getCurrentIdx(ocSchedule.items, nowMin) : -1
                                    const ocCurrent = ocSchedule?.items[ocCurrentIdx]
                                    return (
                                        <Link key={oc.id} href={`/live/${oc.slug}`}
                                            className="bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-faint)] hover:border-[var(--border)] rounded-xl p-4 transition-all group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={oc.logo} alt={oc.name} className="w-10 h-10 object-contain shrink-0" />
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[var(--text-primary)] text-sm font-medium">{oc.name}</span>
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] text-white font-bold">
                                                            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                                            LIVE
                                                        </span>
                                                    </div>
                                                    {ocCurrent && <p className="text-[var(--text-subtle)] text-xs mt-0.5 truncate">{ocCurrent.koTitle}</p>}
                                                </div>
                                            </div>
                                            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/50 relative">
                                                {(() => {
                                                    const ocSchedule2 = allChannels.find(c => c.id === oc.id)
                                                    const ocIdx2 = ocSchedule2 ? getCurrentIdx(ocSchedule2.items, nowMin) : -1
                                                    const ocItem = ocSchedule2?.items[ocIdx2]
                                                    const ocDetail = ocItem ? aniDetails[ocItem.tmdbId] : null
                                                    const imgSrc = ocDetail?.backdrop_path
                                                        ? `https://image.tmdb.org/t/p/w780${ocDetail.backdrop_path}`
                                                        : ocDetail?.poster_path
                                                            ? `https://image.tmdb.org/t/p/w780${ocDetail.poster_path}`
                                                            : `https://img.youtube.com/vi/${(oc as any).videoId}/maxresdefault.jpg`
                                                    return <img src={imgSrc} alt={oc.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                                                })()}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const ocSchedule3 = allChannels.find(c => c.id === oc.id)
                                                    const ocIdx3 = ocSchedule3 ? getCurrentIdx(ocSchedule3.items, nowMin) : -1
                                                    const ocItem3 = ocSchedule3?.items[ocIdx3]
                                                    return ocItem3 ? (
                                                        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                                                            <p className="text-white text-xs font-medium truncate">{ocItem3.koTitle}</p>
                                                        </div>
                                                    ) : null
                                                })()}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 관련 작품 */}
                        {relatedAnime.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-[var(--text-primary)] font-bold text-base mb-4">관련 작품</h3>
                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                                    {relatedAnime.map((ani) => (
                                        <div key={ani.id} className="group cursor-pointer" onClick={() => router.push(`/anime/${ani.id}`)}>
                                            <div className="aspect-[3/4] rounded-lg overflow-hidden relative">
                                                <img src={`https://image.tmdb.org/t/p/w300${ani.poster_path}`} alt={ani.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[var(--text-muted)] text-xs font-medium mt-2 truncate">{ani.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 채팅 + 편성표 */}
                    <div className="w-full shrink-0 flex flex-col bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border-subtle)] lg:w-[380px]"
                        style={{ height: playerHeight > 0 ? `min(${playerHeight}px, 62vh)` : 'min(500px, 62vh)' }}>
                        <div className="flex border-b border-[var(--border)] shrink-0">
                            <button onClick={() => setTab('chat')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'chat' ? 'text-[var(--text-primary)] border-b-2 border-[var(--main)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'}`}>
                                채팅
                            </button>
                            <button onClick={() => setTab('schedule')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'schedule' ? 'text-[var(--text-primary)] border-b-2 border-[var(--main)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'}`}>
                                편성표
                            </button>
                        </div>

                        {tab === 'chat' ? (
                            <>
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
                                    {messages.length === 0 && <p className="text-[var(--text-faint)] text-xs text-center mt-4">첫 채팅을 남겨보세요!</p>}
                                    {messages.map((msg) => (
                                        <div key={msg.id} className="flex items-start gap-2">
                                            <div className="shrink-0">
                                                <div
                                                    className="w-7 h-7 rounded-full bg-[var(--main)] flex items-center justify-center overflow-hidden cursor-pointer transition-transform hover:scale-110"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (expandedMsgId === msg.id) {
                                                            setExpandedMsgId(null)
                                                            setPopupPos(null)
                                                        } else {
                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                                            setPopupPos({ x: rect.left + rect.width / 2, y: rect.top })
                                                            setExpandedMsgId(msg.id)
                                                        }
                                                    }}
                                                >
                                                    {msg.photoURL
                                                        ? <img src={msg.photoURL} alt={msg.name} className="w-full h-full object-cover" />
                                                        : <span className="text-white text-xs font-bold">{msg.name?.[0]?.toUpperCase() || '?'}</span>
                                                    }
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="text-[var(--main)] text-xs font-medium">{msg.name}</span>
                                                    <GradeBadge watched={msg.watched ?? 0} size="sm" showName={true} />
                                                </div>
                                                <span className="text-[var(--text-muted)] text-sm break-words">{msg.text}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 border-t border-[var(--border)] shrink-0">
                                    {user ? (
                                        <div className="flex gap-2">
                                            <input value={input} onChange={(e) => setInput(e.target.value)}
                                                onKeyUp={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                                                placeholder="채팅 입력..."
                                                className="flex-1 bg-[var(--border-faint)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--main)]" />
                                            <button onClick={sendMessage} className="px-3 py-2 bg-[var(--main)] rounded-lg text-white text-sm hover:opacity-90 transition-opacity">전송</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowLoginModal(true)}
                                            className="w-full text-center text-sm text-[var(--text-subtle)] hover:text-[var(--text-muted)] py-2 transition-colors">
                                            로그인 후 채팅 가능
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-0">
                                <ul className="flex flex-col">
                                    {chSchedule?.items.map((item, i) => {
                                        const isCurrent = i === currentIdx
                                        const isPast = i < currentIdx
                                        const detail = aniDetails[item.tmdbId]
                                        return (
                                            <li key={item.tmdbId} onClick={() => handleScheduleClick(item, i)}
                                                className={['relative flex items-center gap-3 px-4 py-3 transition-colors border-b border-[var(--border-faint)]',
                                                    isCurrent ? 'bg-[var(--main)]/15 cursor-pointer' : '',
                                                    isPast ? 'opacity-30 cursor-default' : '',
                                                    !isCurrent && !isPast ? 'hover:bg-[var(--border-faint)] cursor-pointer' : '',
                                                ].join(' ')}>
                                                {isCurrent && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[var(--main)] rounded-r" />}
                                                <div className="w-8 h-11 rounded overflow-hidden bg-[var(--border-faint)] shrink-0">
                                                    {detail?.poster_path
                                                        ? <img src={`https://image.tmdb.org/t/p/w92${detail.poster_path}`} alt={item.koTitle} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-[var(--text-faint)]">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2" /></svg>
                                                        </div>
                                                    }
                                                </div>
                                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                    <span className={`text-[11px] font-mono ${isCurrent ? 'text-[var(--main)]' : 'text-[var(--text-faint)]'}`}>{item.time}</span>
                                                    <span className={`text-sm truncate leading-tight ${isCurrent ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>{item.koTitle}</span>
                                                </div>
                                                {isCurrent && <span className="shrink-0 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">ON</span>}
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
