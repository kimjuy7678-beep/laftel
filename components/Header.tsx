"use client"
import HeaderSearch from './HeaderSearch'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useActivityStore } from '@/store/useActiveStore'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePageTransition } from '@/hook/usePageTransition'
import GradeModal from './GradeModal'
import { toast } from 'sonner'

const MenuList = [
    { id: 1, title: "태그검색", path: "/tag-search" },
    { id: 2, title: "요일별 신작", path: "/day-new" },
    { id: 3, title: "라이브", path: "/live", live: true },
    { id: 4, title: "OST", path: "/ost" },
    { id: 5, title: "이벤트", path: "/event" },
    { id: 6, title: "스토어", path: "/store", badge: "N" },
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

// ✅ EventNotifications에서 useActivityStore 제거
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
        <div className="border-t border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-faint)] px-4 py-2 font-medium">진행중인 이벤트</p>
            {events.map((e: any) => (
                <div key={e.id} onClick={() => router.push(`/event/${e.id}`)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border-b border-[var(--border-faint)] last:border-0">
                    <img src={e.img} alt={e.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)] truncate">{e.name}</p>
                        <p className="text-[10px] text-[#6c63ff]">진행중</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function Header() {
    const user = useAuthStore(s => s.user)
    const avatarConfig = useAuthStore(s => s.avatarConfig)
    const { onLogout } = useAuthStore()
    const { points, fetchPoints } = usePointStore()
    const { notifications, unreadCount, subscribeNotifications, markAllRead, markOneRead, clearNotifications } = useNotificationStore()
    const { counts: activityCounts, fetchCounts, resetCounts } = useActivityStore()  // ✅ Header 안으로 이동
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notiOpen, setNotiOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [gradeOpen, setGradeOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const notiRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const pathname = usePathname()
    const { navigate } = usePageTransition()

    const membership = user?.membership || 'none'
    const memberInfo = membershipConfig[membership] || membershipConfig['none']

    const textColor = scrolled ? 'var(--text-primary)' : '#ffffff'
    const textMuted = scrolled ? 'var(--text-muted)' : 'rgba(255,255,255,0.7)'
    const hoverBg = scrolled ? 'var(--border)' : 'rgba(255,255,255,0.15)'

    useEffect(() => {
        if (user?.uid) {
            fetchPoints(user.uid)
            subscribeNotifications(user.uid)
            fetchCounts(user.uid)
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
        if (searchOpen) {
            const sw = window.innerWidth - document.documentElement.clientWidth
            document.body.style.overflow = 'hidden'
            document.body.style.paddingRight = `${sw}px`
            const header = document.querySelector('header') as HTMLElement | null
            if (header) header.style.paddingRight = `${sw + 10}px`
        } else {
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
            const header = document.querySelector('header') as HTMLElement | null
            if (header) header.style.paddingRight = ''
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
            const header = document.querySelector('header') as HTMLElement | null
            if (header) header.style.paddingRight = ''
        }
    }, [searchOpen])

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout = async () => {
        clearNotifications()
        resetCounts()
        await onLogout()
        setDropdownOpen(false)
        router.push('/')
        toast("로그아웃되었습니다")
    }

    const DropdownMenu = [
        { title: memberInfo.label, path: "/membership", sub: membership !== 'none' ? '✓' : undefined, subColor: memberInfo.color, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg> },
        { title: "내 포인트", path: "/point", sub: `${points.toLocaleString()}P`, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
        { title: "내 정보", path: "/mypage", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
        { title: "쿠폰 등록", path: "/coupon", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg> },
        { title: "이용내역", path: "/history", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg> },
        { title: "공지사항", path: "/notice", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
        { title: "고객센터", path: "https://help.laftel.net/hc/ko", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" /></svg> },
        { title: "설정", path: "/setting", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
    ]

    return (
        <>
            {searchOpen && <HeaderSearch onClose={() => setSearchOpen(false)} />}
            {gradeOpen && <GradeModal onClose={() => setGradeOpen(false)} />}

            <header
                className="fixed top-0 left-0 w-full z-[9999] transition-colors duration-300 py-[10px] px-[10px]"
                style={{ background: scrolled ? 'var(--bg-primary)' : 'transparent' }}
            >
                {!scrolled && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '140px',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, transparent 60%)',
                        pointerEvents: 'none', zIndex: -1,
                    }} />
                )}
                <div className="w-full h-[55px] flex items-center justify-between px-[28px] rounded-full transition-colors duration-300">
                    {/* 좌측: 로고 + 네비게이션 */}
                    <div className="flex items-center gap-[42px]">
                        <div className="flex items-center gap-[14px]">
                            <Link href="/" className="flex items-center gap-[12px]">
                                <img src="/images/stone.svg" alt="" className="h-10" />
                                <img src="/images/logo-white.svg" alt="logo" className="h-[22px] w-auto dark:block hidden" />
                                <img src="/images/logo-dark.png" alt="logo" className="h-[22px] w-auto dark:hidden block" />
                            </Link>
                            <div className="flex items-center bg-[var(--border)] rounded-full p-[3px] gap-[2px]"
                                style={{ background: scrolled ? 'var(--border)' : 'rgba(255,255,255,0.2)' }}>
                                <button onClick={() => navigate('/', 'var(--bg-primary)')}
                                    className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-200 ${!pathname.startsWith('/store') ? 'bg-white text-[#826CFF] shadow-sm' : scrolled ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]' : 'text-white/70 hover:text-white'}`}>
                                    OTT
                                </button>
                                <button onClick={() => navigate('/store', '#ffffff')}
                                    className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-200 ${pathname.startsWith('/store') ? 'bg-white text-[#826CFF] shadow-sm' : scrolled ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]' : 'text-white/70 hover:text-white'}`}>
                                    Store
                                </button>
                            </div>
                        </div>
                        <nav>
                            <ul className="flex items-center gap-[32px]">
                                {MenuList.map((menu) => {
                                    const isActive = pathname === menu.path || (menu.path !== '/' && pathname.startsWith(menu.path))
                                    return (
                                        <li key={menu.id} className="relative">
                                            <Link href={menu.path} style={{ color: isActive ? textColor : textMuted }}
                                                className={`flex items-center gap-1.5 text-[15px] transition-all duration-200 ${isActive ? 'font-extrabold' : 'font-medium hover:font-bold'}`}>
                                                {menu.title}
                                                {menu.live && <span className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-red-500 text-[10px] font-bold text-white animate-pulse">LIVE</span>}
                                                {menu.badge && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6c5ce7] text-[10px] font-bold text-white">{menu.badge}</span>}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </nav>
                    </div>

                    {/* 우측: 아이콘 + 유저 */}
                    <div className="flex items-center gap-[8px]">
                        <button type="button" aria-label="검색" onClick={() => setSearchOpen(true)}
                            className="flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-200 cursor-pointer"
                            style={{ color: textColor }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hoverBg}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>

                        <Link href="/membership" aria-label="멤버십"
                            className="flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-200"
                            style={{ color: textColor }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = hoverBg}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                <path d="M13 5v2M13 17v2M13 11v2" />
                            </svg>
                        </Link>

                        {/* 알림 */}
                        <div className="relative" ref={notiRef}>
                            <button onClick={() => { setNotiOpen(!notiOpen); if (!notiOpen && user?.uid && unreadCount > 0) markAllRead(user.uid) }}
                                aria-label="알림"
                                className="relative flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-200"
                                style={{ color: textColor }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hoverBg}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
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
                                <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">알림</span>
                                        {unreadCount > 0 && <button onClick={() => user?.uid && markAllRead(user.uid)} className="text-xs text-[#6c63ff] hover:text-[#5a52e0]">모두 읽음</button>}
                                    </div>
                                    <div className="overflow-y-auto max-h-[360px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-faint)]">
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                </svg>
                                                <p className="text-[var(--text-faint)] text-xs">알림이 없어요</p>
                                            </div>
                                        ) : notifications.map((n) => (
                                            <div key={n.id}
                                                onClick={() => { if (user?.uid) markOneRead(user.uid, n.id); if (n.link) router.push(n.link); setNotiOpen(false) }}
                                                className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-faint)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${!n.read ? 'bg-[#6c63ff]/5' : ''}`}>
                                                <span className="text-lg shrink-0">{typeIcon[n.type] || '🔔'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-medium ${!n.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{n.title}</p>
                                                    <p className="text-xs text-[var(--text-subtle)] mt-0.5 leading-relaxed">{n.body}</p>
                                                    <p className="text-[10px] text-[var(--text-faint)] mt-1">{formatTime(n.createdAt)}</p>
                                                </div>
                                                {!n.read && <div className="w-2 h-2 rounded-full bg-[#6c63ff] shrink-0 mt-1" />}
                                            </div>
                                        ))}
                                    </div>
                                    <EventNotifications />
                                </div>
                            )}
                        </div>

                        <div className="w-px h-5 mx-1" style={{ background: scrolled ? 'var(--border)' : 'rgba(255,255,255,0.3)' }} />

                        {!user ? (
                            <Link href="/login" className="text-sm transition-colors px-2" style={{ color: textMuted }}
                                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = textColor}
                                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = textMuted}>
                                로그인
                            </Link>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-[8px] cursor-pointer group h-[55px]">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 transition-all duration-200 shrink-0"
                                        style={{ background: memberInfo.color || '#5a52e0' }}>
                                        {avatarConfig?.svgDataUrl ? (
                                            <img src={avatarConfig.svgDataUrl} alt="프로필" className="w-full h-full object-cover" />
                                        ) : user.photoURL ? (
                                            <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xs font-bold">{user.name?.[0]?.toUpperCase() || '?'}</span>
                                        )}
                                    </div>
                                    <span className="text-sm transition-colors" style={{ color: textMuted }}>{user.name}</span>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        className={`transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} style={{ color: textMuted }}>
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 top-[calc(100%+4px)] w-[300px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
                                        <div className="flex flex-col items-center gap-2 px-5 py-6 border-b border-[var(--border)]">
                                            <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                                                <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-1 ring-2 ring-[var(--border)] hover:ring-[var(--text-subtle)] transition-all"
                                                    style={{ background: memberInfo.color || '#6c63ff' }}>
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
                                                    className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-1 justify-center hover:text-[var(--text-muted)] transition-colors cursor-pointer">
                                                    {user.name || user.email?.split('@')[0]}
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                                </Link>
                                                <button onClick={() => { setGradeOpen(true); setDropdownOpen(false) }}
                                                    className="text-[var(--text-subtle)] text-xs mt-0.5 hover:text-[var(--text-muted)] transition-colors bg-transparent border-none cursor-pointer p-0 block mx-auto">
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
                                                {[
                                                    { label: '별점', val: activityCounts.rating, tab: 'reviews' },
                                                    { label: '리뷰', val: activityCounts.review, tab: 'reviews' },
                                                    { label: '댓글', val: activityCounts.comment, tab: 'comments' },
                                                ].map(s => (
                                                    <div key={s.label} className="text-center cursor-pointer group"
                                                        onClick={() => { setDropdownOpen(false); router.push(`/library?tab=${s.tab}`) }}>
                                                        <p className="text-[var(--text-primary)] font-black text-base group-hover:text-[#6c63ff] transition-colors">{s.val}</p>
                                                        <p className="text-[var(--text-subtle)] text-[11px] group-hover:text-[#6c63ff] transition-colors">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <Link href="/library" onClick={() => setDropdownOpen(false)}
                                                className="w-full mt-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                                                보관함
                                            </Link>
                                        </div>
                                        <ul className="py-1">
                                            {DropdownMenu.map((item) => (
                                                <li key={item.title}>
                                                    <Link href={item.path} onClick={() => setDropdownOpen(false)}
                                                        target={item.path.startsWith('http') ? '_blank' : undefined}
                                                        rel={item.path.startsWith('http') ? 'noopener noreferrer' : undefined}
                                                        className="flex items-center justify-between px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                                                        <span className="flex items-center gap-3">
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : 'var(--text-subtle)' }}>{item.icon}</span>
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : undefined }}>{item.title}</span>
                                                        </span>
                                                        {item.sub && <span className="text-xs" style={{ color: item.subColor || undefined }}>{item.sub}</span>}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="border-t border-[var(--border)] py-1">
                                            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-[var(--bg-hover)] transition-colors">
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