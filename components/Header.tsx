"use client"
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GradeModal from './GradeModal'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const MenuList = [
    { id: 1, title: "태그검색", path: "/tag-search" },
    { id: 2, title: "요일별 신작", path: "/day-new" },
    { id: 3, title: "라이브", path: "/live", live: true },
    { id: 4, title: "OST", path: "/ost" },
    { id: 5, title: "스토어", path: "/store", badge: "N" },
    { id: 6, title: "이벤트", path: "/event" },
]

const membershipConfig: Record<string, { label: string; color: string | null }> = {
    none: { label: '라프텔 멤버십', color: null },
    basic: { label: 'BASIC 회원', color: '#3b82f6' },
    premium: { label: 'PREMIUM 회원', color: '#f59e0b' },
    anime: { label: '애니 멤버십', color: '#6c63ff' },
    ost: { label: 'OST 멤버십', color: '#ec4899' },
    allinone: { label: '올인원 멤버십', color: '#f59e0b' },
}

const typeIcon: Record<string, string> = {
    point: '💰', coupon: '🎟️', membership: '⭐', event: '🎉', live: '📺',
}

const formatTime = (ts: any) => {
    if (!ts) return ''
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
}

function EventNotifications() {
    const [events, setEvents] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        fetch('https://api.laftel.net/api/events/v2/list/?offset=0&limit=5')
            .then(r => r.json())
            .then(d => setEvents(d.results?.filter((e: any) => e.status === 'ongoing').slice(0, 3) || []))
            .catch(() => { })
    }, [])

    if (events.length === 0) return null

    return (
        <div className="border-t border-white/10">
            <p className="text-[10px] text-white/30 px-4 py-2 font-medium">진행중인 이벤트</p>
            {events.map((e: any) => (
                <div key={e.id} onClick={() => router.push(`/event/${e.id}`)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0">
                    <img src={e.img} alt={e.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs text-white/70 truncate">{e.name}</p>
                        <p className="text-[10px] text-[#6c63ff]">진행중</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        inputRef.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); return }
        setLoading(true)
        try {
            const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ko-KR&page=1`)
            const data = await res.json()
            const filtered = (data.results || []).filter((r: any) => r.origin_country?.includes('JP') || r.original_language === 'ja').slice(0, 8)
            setResults(filtered)
        } catch { setResults([]) }
        finally { setLoading(false) }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        setQuery(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => search(v), 320)
    }

    const handleSubmit = () => {
        if (!query.trim()) return
        onClose()
        router.push(`/anime/search?q=${encodeURIComponent(query)}`)
    }

    return (
        <>
            <style>{`
                .srch-overlay{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);animation:srch-in .18s ease}
                @keyframes srch-in{from{opacity:0}to{opacity:1}}
                .srch-box{position:absolute;top:0;left:0;right:0;background:rgba(14,14,14,0.98);border-bottom:1px solid rgba(255,255,255,0.08);padding:20px 40px 0;animation:srch-slide .2s ease}
                @keyframes srch-slide{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
                .srch-row{display:flex;align-items:center;gap:14px;max-width:860px;margin:0 auto;height:64px}
                .srch-input{flex:1;background:none;border:none;outline:none;color:#fff;font-size:22px;font-weight:500;caret-color:#6c63ff}
                .srch-input::placeholder{color:rgba(255,255,255,0.2)}
                .srch-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:#6c63ff;border:none;color:#fff;cursor:pointer;transition:background .2s;flex-shrink:0}
                .srch-btn:hover{background:#5a52e0}
                .srch-close{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;transition:color .2s;flex-shrink:0}
                .srch-close:hover{color:#fff}
                .srch-results{max-width:860px;margin:0 auto;padding:12px 0 20px}
                .srch-hint{font-size:12px;color:rgba(255,255,255,0.2);padding:6px 0 14px;text-align:center}
                .srch-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
                .srch-card{display:flex;align-items:center;gap:11px;padding:10px;border-radius:10px;cursor:pointer;transition:background .15s;border:1px solid transparent}
                .srch-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.08)}
                .srch-card-thumb{width:44px;height:62px;border-radius:6px;overflow:hidden;background:#1e1e1e;flex-shrink:0}
                .srch-card-thumb img{width:100%;height:100%;object-fit:cover}
                .srch-card-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:rgba(255,255,255,0.1)}
                .srch-card-info{flex:1;min-width:0}
                .srch-card-name{font-size:13px;font-weight:600;color:rgba(255,255,255,0.88);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:0 0 4px}
                .srch-card-meta{font-size:11px;color:rgba(255,255,255,0.3);margin:0}
                .srch-loading{display:flex;align-items:center;justify-content:center;padding:28px 0;gap:8px;color:rgba(255,255,255,0.25);font-size:13px}
                .srch-spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,0.1);border-top-color:#6c63ff;border-radius:50%;animation:spin .7s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                .srch-empty{text-align:center;padding:28px 0;font-size:13px;color:rgba(255,255,255,0.22)}
            `}</style>
            <div className="srch-overlay" onClick={onClose}>
                <div className="srch-box" onClick={e => e.stopPropagation()}>
                    <div className="srch-row">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input ref={inputRef} className="srch-input" value={query} onChange={handleChange}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} placeholder="애니 제목, 장르, 태그로 검색" />
                        <button className="srch-btn" onClick={handleSubmit}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>
                        <button className="srch-close" onClick={onClose}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <div className="srch-results">
                        {loading ? (
                            <div className="srch-loading"><div className="srch-spinner" />검색 중...</div>
                        ) : results.length > 0 ? (
                            <div className="srch-grid">
                                {results.map(item => (
                                    <div key={item.id} className="srch-card" onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}>
                                        <div className="srch-card-thumb">
                                            {item.poster_path ? <img src={`${IMG}/w154${item.poster_path}`} alt={item.name} /> : <div className="srch-card-np">{(item.name || '?')[0]}</div>}
                                        </div>
                                        <div className="srch-card-info">
                                            <p className="srch-card-name">{item.name}</p>
                                            <p className="srch-card-meta">{item.first_air_date?.slice(0, 4) || ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : query.trim() ? (
                            <div className="srch-empty">검색 결과가 없어요</div>
                        ) : (
                            <div className="srch-hint">제목을 입력하면 바로 검색됩니다 · Enter로 전체 결과 보기</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default function Header() {
    const user = useAuthStore(s => s.user)
    const avatarConfig = useAuthStore(s => s.avatarConfig)
    const { onLogout } = useAuthStore()
    const { points, fetchPoints } = usePointStore()
    const { notifications, unreadCount, subscribeNotifications, markAllRead, markOneRead } = useNotificationStore()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notiOpen, setNotiOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [gradeOpen, setGradeOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const notiRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const membership = user?.membership || 'none'
    const memberInfo = membershipConfig[membership] || membershipConfig['none']

    useEffect(() => {
        if (user?.uid) {
            fetchPoints(user.uid)
            subscribeNotifications(user.uid)
        }
    }, [user])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
            if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        document.body.style.overflow = searchOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [searchOpen])

    const handleLogout = async () => {
        await onLogout()
        setDropdownOpen(false)
        router.push('/')
    }

    const DropdownMenu = [
        { title: memberInfo.label, path: "/membership", sub: membership !== 'none' ? '✓' : undefined, subColor: memberInfo.color, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg> },
        { title: "내 포인트", path: "/point", sub: `${points.toLocaleString()}P`, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
        { title: "쿠폰 등록", path: "/coupon", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg> },
        { title: "이용내역", path: "/history", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg> },
        { title: "스토어 주문내역", path: "/store/orders", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg> },
        { title: "공지사항", path: "/notice", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
        { title: "고객센터", path: "https://help.laftel.net/hc/ko", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" /></svg> },
        { title: "설정", path: "/setting", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
    ]

    return (
        <>
            {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
            {gradeOpen && <GradeModal onClose={() => setGradeOpen(false)} />}

            {/* StoreHeader 스타일: py-[10px] wrapper + pill 내부 */}
            <header className="fixed top-0 left-0 w-full z-[1000] w-full py-[10px] px-[10px]">
                <div className="w-full h-[55px] flex items-center justify-between px-[28px]">

                    {/* 좌측: 로고 + 네비게이션 */}
                    <div className="flex items-center gap-[28px]">
                        {/* 로고 */}
                        <Link href="/" className="flex items-center gap-[12px]">
                            <img src="/images/stone.svg" alt="" className="h-7" />
                            <img src="/images/logo-white.svg" alt="logo" className="h-5 w-auto" />
                        </Link>

                        {/* 네비게이션 */}
                        <nav>
                            <ul className="flex items-center gap-[28px]">
                                {MenuList.map((menu) => (
                                    <li key={menu.id} className="relative">
                                        <Link
                                            href={menu.path}
                                            className="flex items-center gap-1.5 text-white/80 hover:text-white text-[14px] font-medium transition-colors duration-200"
                                        >
                                            {menu.title}
                                            {menu.live && (
                                                <span className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-red-500 text-[10px] font-bold text-white animate-pulse">
                                                    LIVE
                                                </span>
                                            )}
                                            {menu.badge && (
                                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/25 text-[10px] font-bold text-white">
                                                    {menu.badge}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    {/* 우측: 아이콘 + 유저 */}
                    <div className="flex items-center gap-[8px]">

                        {/* 검색 */}
                        <button
                            type="button"
                            aria-label="검색"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>
                        {/* 멤버십 */}
                        <Link
                            href="/membership"
                            aria-label="멤버십"
                            className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                <path d="M13 5v2M13 17v2M13 11v2" />
                            </svg>
                        </Link>



                        {/* 알림 */}
                        <div className="relative" ref={notiRef}>
                            <button
                                onClick={() => {
                                    setNotiOpen(!notiOpen)
                                    if (!notiOpen && user?.uid && unreadCount > 0) markAllRead(user.uid)
                                }}
                                aria-label="알림"
                                className="relative flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {notiOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                        <span className="text-sm font-bold text-white">알림</span>
                                        {unreadCount > 0 && (
                                            <button onClick={() => user?.uid && markAllRead(user.uid)} className="text-xs text-[#6c63ff] hover:text-[#5a52e0]">모두 읽음</button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto max-h-[360px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                </svg>
                                                <p className="text-white/30 text-xs">알림이 없어요</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div key={n.id}
                                                    onClick={() => { if (user?.uid) markOneRead(user.uid, n.id); if (n.link) router.push(n.link); setNotiOpen(false) }}
                                                    className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? 'bg-[#6c63ff]/5' : ''}`}>
                                                    <span className="text-lg shrink-0">{typeIcon[n.type] || '🔔'}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-medium ${!n.read ? 'text-white' : 'text-white/70'}`}>{n.title}</p>
                                                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{n.body}</p>
                                                        <p className="text-[10px] text-white/25 mt-1">{formatTime(n.createdAt)}</p>
                                                    </div>
                                                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#6c63ff] shrink-0 mt-1" />}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <EventNotifications />
                                </div>
                            )}
                        </div>

                        {/* 구분선 */}
                        <div className="w-px h-5 bg-white/20 mx-1" />

                        {/* 유저 프로필 */}
                        {!user ? (
                            <Link
                                href="/login"
                                className="text-sm text-white/80 hover:text-white transition-colors px-2"
                            >
                                로그인
                            </Link>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-[8px] cursor-pointer group h-[55px]"
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/30 group-hover:ring-white/60 transition-all duration-200 shrink-0"
                                        style={{ background: memberInfo.color || '#5a52e0' }}
                                    >
                                        {avatarConfig?.svgDataUrl ? (
                                            <img src={avatarConfig.svgDataUrl} alt="프로필" className="w-full h-full object-cover" />
                                        ) : user.photoURL ? (
                                            <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xs font-bold">
                                                {user.name?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-white/90 group-hover:text-white transition-colors">
                                        {user.name}
                                    </span>
                                    <svg
                                        width="13" height="13" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2"
                                        className={`text-white/60 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 top-[calc(100%+4px)] w-[300px] bg-[#141420] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                        {/* 프로필 헤더 */}
                                        <div className="flex flex-col items-center gap-2 px-5 py-6 border-b border-white/10">
                                            <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                                                <div
                                                    className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-1 ring-2 ring-white/20 hover:ring-white/40 transition-all"
                                                    style={{ background: memberInfo.color || '#6c63ff' }}
                                                >
                                                    {avatarConfig?.svgDataUrl ? (
                                                        <img src={avatarConfig.svgDataUrl} alt="프로필" className="w-full h-full object-cover" />
                                                    ) : user.photoURL ? (
                                                        <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-white text-2xl font-bold">{user?.name?.[0]?.toUpperCase() || '?'}</span>
                                                    )}
                                                </div>
                                            </Link>
                                            <div className="text-center">
                                                <Link href="/profile" onClick={() => setDropdownOpen(false)}
                                                    className="text-white font-bold text-sm flex items-center gap-1 justify-center hover:text-white/70 transition-colors cursor-pointer">
                                                    {user.name || user.email?.split('@')[0]}
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                                </Link>
                                                <button
                                                    onClick={() => { setGradeOpen(true); setDropdownOpen(false) }}
                                                    className="text-white/40 text-xs mt-0.5 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer p-0 block mx-auto">
                                                    😊 Lv.0 베이비
                                                </button>
                                                {membership !== 'none' && (
                                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                                                        style={{ background: `${memberInfo.color}30`, color: memberInfo.color! }}>
                                                        {memberInfo.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-6 mt-2">
                                                {[{ label: '별점', val: 0 }, { label: '리뷰', val: 0 }, { label: '댓글', val: 0 }].map(s => (
                                                    <div key={s.label} className="text-center">
                                                        <p className="text-white font-black text-base">{s.val}</p>
                                                        <p className="text-white/35 text-[11px]">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <Link href="/library" onClick={() => setDropdownOpen(false)}
                                                className="w-full mt-3 py-2.5 rounded-xl border border-white/10 bg-white/4 text-white/70 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/8 hover:text-white transition-colors">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                                                보관함
                                            </Link>
                                        </div>
                                        {/* 메뉴 리스트 */}
                                        <ul className="py-1">
                                            {DropdownMenu.map((item) => (
                                                <li key={item.title}>
                                                    <Link href={item.path} onClick={() => setDropdownOpen(false)}
                                                        target={item.path.startsWith('http') ? '_blank' : undefined}
                                                        rel={item.path.startsWith('http') ? 'noopener noreferrer' : undefined}
                                                        className="flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">
                                                        <span className="flex items-center gap-3">
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : 'rgba(255,255,255,0.5)' }}>
                                                                {item.icon}
                                                            </span>
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : undefined }}>
                                                                {item.title}
                                                            </span>
                                                        </span>
                                                        {item.sub && <span className="text-xs" style={{ color: item.subColor || undefined }}>{item.sub}</span>}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="border-t border-white/10 py-1">
                                            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                                                </svg>
                                                로그아웃
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    )
}
