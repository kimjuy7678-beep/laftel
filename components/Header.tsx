"use client"
import HeaderSearch from './HeaderSearch'
import AniChatBot from './AniChatBot'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useActivityStore } from '@/store/useActiveStore'
import { useWatchProgressStore } from '@/store/useWatchProgressStore'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePageTransition } from '@/hook/usePageTransition'
import GradeModal from './GradeModal'
import { toast } from 'sonner'
import { FALLBACK_EVENTS, normalizeEventItem, type EventItem as LaftelEventItem } from '@/lib/eventData'

const GRADES = [
    { level: 0, name: '베이비', req: 0, color: '#a78bfa', image: 'https://thumbnail.laftel.net/profiles/default/48363a65-24d6-45a0-9eac-8c1726656c63.png' },
    { level: 1, name: '루키', req: 1, color: '#34d399', image: 'https://thumbnail.laftel.net/profiles/default/7478566c-4b3c-4a10-a7c0-2f8c05fb2370.jpg' },
    { level: 2, name: '뉴비', req: 3, color: '#60a5fa', image: 'https://thumbnail.laftel.net/profiles/default/fb48c8c7-ad22-4aa9-9038-c0637ba7e275.png' },
    { level: 3, name: '입문자', req: 5, color: '#f97316', image: 'https://thumbnail.laftel.net/profiles/default/b700435b-3ad2-4a31-9b72-3e9ae631dc47.png' },
    { level: 4, name: '덕후', req: 10, color: '#f43f5e', image: 'https://thumbnail.laftel.net/profiles/default/c38a5328-857c-4c12-a404-53d288460e2a.jpg' },
    { level: 5, name: '중독자', req: 30, color: '#ec4899', image: 'https://thumbnail.laftel.net/profiles/default/40028ff2-895a-4606-b759-2674b1cdc18e.jpg' },
    { level: 6, name: '오타쿠', req: 50, color: '#facc15', image: 'https://thumbnail.laftel.net/profiles/default/37710afc-0caa-4ea3-bd6d-1c900674141e.jpg' },
    { level: 7, name: '신', req: 100, color: '#6c63ff', image: 'https://thumbnail.laftel.net/profiles/default/8c6f615f-b949-4ed8-b027-bcf2bee4ea4a.jpg' },
]

type HeaderMenuItem = {
    id: number
    title: string
    path: string
    live?: boolean
    badge?: string
}

const MenuList: HeaderMenuItem[] = [
    { id: 1, title: "태그검색", path: "/tag-search" },
    { id: 2, title: "요일별 신작", path: "/day-new" },
    { id: 3, title: "라이브", path: "/live", live: true },
    { id: 4, title: "OST", path: "/ost" },
    { id: 5, title: "이벤트", path: "/event" },
    { id: 6, title: "커뮤니티", path: "/community" }

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

type DateLike = { toDate?: () => Date } | string | number | Date | null | undefined
const formatTime = (ts: DateLike) => {
    if (!ts) return ''
    const date = typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function'
        ? ts.toDate()
        : new Date(ts as string | number | Date)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
}

function EventNotifications() {
    const [events, setEvents] = useState<LaftelEventItem[]>([])
    const router = useRouter()

    useEffect(() => {
        fetch('/api/laftel/events/v2/list?offset=0&limit=5')
            .then(r => r.json())
            .then((d: { results?: LaftelEventItem[] }) => {
                const source = d.results?.map(normalizeEventItem) ?? FALLBACK_EVENTS
                setEvents(source.filter((e) => e.status === 'ongoing').slice(0, 3))
            })
            .catch(() => {
                setEvents(FALLBACK_EVENTS.filter((e) => e.status === 'ongoing').slice(0, 3))
            })
    }, [])

    if (events.length === 0) return null

    return (
        <div className="border-t border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-faint)] px-4 py-2 font-medium">진행중인 이벤트</p>
            {events.map((e) => (
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

type GradeInfo = (typeof GRADES)[number]

function GradeButton({
    currentGrade,
    nextGrade,
    watched,
    onPress,
    size = 'md',
}: {
    currentGrade: GradeInfo
    nextGrade: GradeInfo | null
    watched: number
    onPress: () => void
    size?: 'sm' | 'md'
}) {
    return (
        <button
            type="button"
            onClick={onPress}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 group"
        >
            <div
                className={`rounded-full overflow-hidden border shrink-0 ${size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'}`}
                style={{ borderColor: currentGrade.color }}
            >
                <img src={currentGrade.image} alt={currentGrade.name} className="w-full h-full object-cover" />
            </div>
            <span
                className={`font-bold transition-opacity group-hover:opacity-70 ${size === 'sm' ? 'text-[12px]' : 'text-[14px]'}`}
                style={{ color: currentGrade.color }}
            >
                {currentGrade.name}
            </span>
            {nextGrade && (
                <span className={`text-[var(--text-faint)] ${size === 'sm' ? 'text-[10px]' : 'text-[12px]'}`}>
                    ({watched}/{nextGrade.req}편)
                </span>
            )}
        </button>
    )
}

export default function Header() {
    const user = useAuthStore(s => s.user)
    const avatarConfig = useAuthStore(s => s.avatarConfig)
    const { onLogout } = useAuthStore()
    const { points, fetchPoints } = usePointStore()
    const { notifications, unreadCount, subscribeNotifications, markAllRead, markOneRead, clearNotifications } = useNotificationStore()
    const { counts: activityCounts, fetchCounts, resetCounts } = useActivityStore()
    const { items: progressItems, fetchProgress } = useWatchProgressStore()

    const profileId = user?.currentProfileId || user?.profileId || 'main'
    const watched = progressItems.length
    const currentGrade = [...GRADES].reverse().find(g => watched >= g.req) || GRADES[0]
    const nextGrade = GRADES[currentGrade.level + 1] ?? null

    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notiOpen, setNotiOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [gradeOpen, setGradeOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mobileNotiOpen, setMobileNotiOpen] = useState(false)
    const [mobileChatOpen, setMobileChatOpen] = useState(false)
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
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [mobileMenuOpen])

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setMobileMenuOpen(false)
            setMobileNotiOpen(false)
        })
        return () => cancelAnimationFrame(frame)
    }, [pathname])

    useEffect(() => {
        if (user?.uid) {
            fetchPoints(user.uid)
            subscribeNotifications(user.uid)
            fetchCounts(user.uid, user.currentProfileId || 'main')
            fetchProgress(user.uid, profileId)
        }
    }, [user?.uid, profileId])

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
        setMobileMenuOpen(false)
        setMobileNotiOpen(false)
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
            {mobileChatOpen && <AniChatBot rightOffset={-48} onClose={() => setMobileChatOpen(false)} />}

            {/* 모바일 메뉴 배경 오버레이 */}
            <div
                className={`min-[1281px]:hidden fixed inset-0 z-[10000] bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => { setMobileMenuOpen(false); setMobileNotiOpen(false) }}
            />

            {/* 모바일 알림 전체화면 */}
            {mobileMenuOpen && mobileNotiOpen && (
                <div className="min-[1281px]:hidden fixed inset-0 z-[10003] flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
                    <div className="relative flex h-[58px] shrink-0 items-center justify-center border-b border-[var(--border)]">
                        <button
                            type="button"
                            aria-label="뒤로가기"
                            onClick={() => setMobileNotiOpen(false)}
                            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[var(--text-primary)]"
                        >
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>
                        <h2 className="text-[19px] font-black text-[var(--text-primary)]">알림</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
                        {notifications.length === 0 ? (
                            <div className="flex h-full items-center justify-center px-6 text-center">
                                <p className="text-[15px] font-semibold text-[var(--text-muted)]">알림이 없어요</p>
                            </div>
                        ) : (
                            <ul>
                                {notifications.map((n) => (
                                    <li key={n.id} className="border-b border-[var(--border)]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (user?.uid) markOneRead(user.uid, n.id)
                                                if (n.link) router.push(n.link)
                                                setMobileNotiOpen(false)
                                                setMobileMenuOpen(false)
                                            }}
                                            className="flex w-full items-start gap-4 px-5 py-5 text-left hover:bg-[var(--bg-hover)] transition-colors"
                                        >
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[24px] leading-none">
                                                {typeIcon[n.type] || '🔔'}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[15px] font-bold leading-snug text-[var(--text-muted)]">
                                                    {n.title || '알림이 도착했어요'}
                                                </span>
                                                {n.body && (
                                                    <span className="mt-1.5 block text-[15px] leading-relaxed text-[var(--text-subtle)]">{n.body}</span>
                                                )}
                                                <span className="mt-2.5 block text-[13px] font-medium text-[var(--text-faint)]">{formatTime(n.createdAt) || '방금 전'}</span>
                                            </span>
                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[var(--text-subtle)]">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                    <circle cx="12" cy="5" r="1.5" />
                                                    <circle cx="12" cy="12" r="1.5" />
                                                    <circle cx="12" cy="19" r="1.5" />
                                                </svg>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* 모바일 사이드 메뉴 */}
            <aside
                className={`min-[1281px]:hidden fixed right-0 top-0 z-[10001] flex h-full w-[min(88vw,350px)] flex-col overflow-y-auto bg-[var(--bg-primary)] shadow-[-20px_0_60px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-end gap-2.5 px-4 pb-4 pt-4">
                    <button
                        type="button"
                        aria-label="알림"
                        onClick={() => {
                            const nextOpen = !mobileNotiOpen
                            setMobileNotiOpen(nextOpen)
                            if (nextOpen && user?.uid && unreadCount > 0) markAllRead(user.uid)
                        }}
                        className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                    >
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        aria-label="메뉴 닫기"
                        onClick={() => { setMobileMenuOpen(false); setMobileNotiOpen(false) }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>

                {user ? (
                    <div className="px-4 pb-5">
                        <div className="flex items-center gap-3">
                            <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="shrink-0">
                                <div
                                    className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-[var(--border)]"
                                    style={{ background: memberInfo.color || '#6c63ff' }}
                                >
                                    {avatarConfig?.svgDataUrl ? (
                                        <img src={avatarConfig.svgDataUrl} alt="프로필" className="h-full w-full object-cover" />
                                    ) : user.photoURL ? (
                                        <img src={user.photoURL} alt="프로필" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-white">{user.name?.[0]?.toUpperCase() || '?'}</span>
                                    )}
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1">
                                    <p className="truncate text-[20px] font-black text-[var(--text-primary)]">{user.name || user.email?.split('@')[0]}</p>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="shrink-0 text-[var(--text-primary)]">
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </Link>
                                {/* 실제 등급 표시 */}
                                <div className="mt-1.5">
                                    <GradeButton
                                        currentGrade={currentGrade}
                                        nextGrade={nextGrade}
                                        watched={watched}
                                        onPress={() => { setGradeOpen(true); setMobileMenuOpen(false) }}
                                        size="sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-3 text-center">
                            {[
                                { label: '별점', val: activityCounts?.rating ?? 0, tab: 'reviews' },
                                { label: '리뷰', val: activityCounts?.review ?? 0, tab: 'reviews' },
                                { label: '댓글', val: activityCounts?.comment ?? 0, tab: 'comments' },
                            ].map((item) => (
                                <div key={item.label} className="cursor-pointer group"
                                    onClick={() => { setMobileMenuOpen(false); router.push(`/library?tab=${item.tab}`) }}>
                                    <p className="text-[18px] font-black text-[var(--text-primary)] group-hover:text-[#6c63ff] transition-colors">{item.val}</p>
                                    <p className="mt-1.5 text-[13px] font-medium text-[var(--text-subtle)] group-hover:text-[#6c63ff] transition-colors">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/library"
                            onClick={() => setMobileMenuOpen(false)}
                            className="mt-5 flex h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[14px] font-black text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 7h18v13H3z" />
                                <path d="m7 7 2-4h6l2 4" />
                            </svg>
                            보관함
                        </Link>
                    </div>
                ) : (
                    <div className="px-4 pb-5">
                        <p className="text-[20px] font-black text-[var(--text-primary)]">라프텔</p>
                        <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">로그인하면 보관함과 알림을 확인할 수 있어요.</p>
                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="mt-5 flex h-11 items-center justify-center rounded-xl bg-[#6c5ce7] text-[13px] font-bold text-white"
                        >
                            로그인
                        </Link>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto">
                    <ul className="py-1.5">
                        {MenuList.map((menu) => {
                            const isActive = pathname === menu.path || (menu.path !== '/' && pathname.startsWith(menu.path))
                            return (
                                <li key={menu.id}>
                                    <Link
                                        href={menu.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center justify-between px-4 py-3 text-[14px] transition-colors ${isActive ? 'bg-[var(--bg-hover)] font-bold text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            {menu.title}
                                            {menu.live && <span className="inline-flex h-4 items-center justify-center rounded bg-red-500 px-1.5 text-[10px] font-bold text-white">LIVE</span>}
                                            {menu.badge && <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#6c5ce7] text-[10px] font-bold text-white">{menu.badge}</span>}
                                        </span>
                                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#6c5ce7]" />}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>

                    <div className="mx-4 my-1 h-px bg-[var(--border)]" />
                    <button
                        type="button"
                        onClick={() => {
                            setMobileChatOpen(true)
                            setMobileMenuOpen(false)
                            setMobileNotiOpen(false)
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-[14px] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-[18px] w-[18px] items-center justify-center text-[var(--text-subtle)]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3a7 7 0 0 0-7 7v2a5 5 0 0 0 5 5h1l3 3v-3h1a5 5 0 0 0 5-5v-2a7 7 0 0 0-7-7z" />
                                    <path d="M9 10h.01" />
                                    <path d="M15 10h.01" />
                                    <path d="M9.5 13.5c1.4 1 3.6 1 5 0" />
                                </svg>
                            </span>
                            <span>AI 추천</span>
                        </span>
                        <span className="rounded-full bg-[#6c5ce7]/15 px-2 py-0.5 text-[10px] font-bold text-[#6c5ce7]">라피</span>
                    </button>

                    {user && (
                        <>
                            <div className="mx-4 my-1 h-px bg-[var(--border)]" />
                            <ul className="py-1.5">
                                {DropdownMenu.slice(0, 6).map((item) => (
                                    <li key={item.title}>
                                        <Link
                                            href={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            target={item.path.startsWith('http') ? '_blank' : undefined}
                                            rel={item.path.startsWith('http') ? 'noopener noreferrer' : undefined}
                                            className="flex items-center justify-between px-4 py-2.5 text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : 'var(--text-subtle)' }}>
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
                        </>
                    )}
                </nav>

                <div className="border-t border-[var(--border)] p-3.5">
                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] text-red-400 transition-colors hover:bg-[var(--bg-hover)] hover:text-red-300"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            로그아웃
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex w-full items-center justify-center rounded-xl bg-[#6c5ce7] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#5a4bd6]"
                        >
                            로그인
                        </Link>
                    )}
                </div>
            </aside>

            {/* 데스크탑 + 공통 헤더 */}
            <header
                className="fixed top-0 left-0 w-full z-[9999] transition-colors duration-300 px-[10px] py-1.5 md:py-[10px]"
                style={{ background: scrolled ? 'var(--bg-primary)' : 'transparent' }}
            >
                {!scrolled && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: '140px',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, transparent 60%)',
                        pointerEvents: 'none',
                        zIndex: -1,
                    }} />
                )}
                <div className="flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[18px] px-3 py-1.5 transition-colors duration-300 sm:min-h-[50px] sm:rounded-[24px] sm:px-4 sm:py-2 md:h-[55px] md:min-h-[55px] md:rounded-full md:px-[28px] md:py-0">

                    {/* 좌측: 로고 + 네비게이션 */}
                    <div className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-2 min-[1281px]:gap-6 xl:gap-[42px]">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-[14px]">
                            <Link href="/" className="flex items-center gap-2 sm:gap-[12px]">
                                <img src="/images/stone.svg" alt="" className="h-7 sm:h-8 md:h-10" />
                                <img
                                    src="/images/logo-white.svg"
                                    alt="logo"
                                    className={`${scrolled ? 'hidden dark:block' : 'block'} h-[16px] w-auto sm:h-[18px] md:h-[22px]`}
                                />
                                <img
                                    src="/images/logo-dark.png"
                                    alt="logo"
                                    className={`${scrolled ? 'block dark:hidden' : 'hidden'} h-[16px] w-auto sm:h-[18px] md:h-[22px]`}
                                />
                            </Link>
                            <div className="flex shrink-0 items-center gap-[2px] rounded-full p-[3px]"
                                style={{ background: scrolled ? 'var(--border)' : 'rgba(255,255,255,0.2)' }}
                            >
                                <button
                                    onClick={() => navigate('/', 'var(--bg-primary)')}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all duration-200 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-[12px] ${!pathname.startsWith('/store')
                                        ? 'bg-white text-[#826CFF] shadow-sm'
                                        : scrolled
                                            ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            : 'text-white/70 hover:text-white'
                                        }`}
                                >
                                    OTT
                                </button>
                                <button
                                    onClick={() => navigate('/store', '#ffffff')}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all duration-200 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-[12px] ${pathname.startsWith('/store')
                                        ? 'bg-white text-[#826CFF] shadow-sm'
                                        : scrolled
                                            ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            : 'text-white/70 hover:text-white'
                                        }`}
                                >
                                    Store
                                </button>
                            </div>
                        </div>

                        <nav className="hidden min-[1281px]:block">
                            <ul className="flex items-center gap-5 xl:gap-[32px]">
                                {MenuList.map((menu) => {
                                    const isActive = pathname === menu.path || (menu.path !== '/' && pathname.startsWith(menu.path))
                                    return (
                                        <li key={menu.id} className="relative">
                                            <Link
                                                href={menu.path}
                                                style={{ color: isActive ? textColor : textMuted }}
                                                className={`flex items-center gap-1.5 text-[14px] transition-all duration-200 xl:text-[15px] ${isActive ? 'font-extrabold' : 'font-medium hover:font-bold'}`}
                                            >
                                                {menu.title}
                                                {menu.live && (
                                                    <span className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-red-500 text-[10px] font-bold text-white animate-pulse">
                                                        LIVE
                                                    </span>
                                                )}
                                                {menu.badge && (
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6c5ce7] text-[10px] font-bold text-white">
                                                        {menu.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </nav>
                    </div>

                    {/* 우측: 아이콘 + 유저 */}
                    <div className="flex shrink-0 items-center gap-1 sm:gap-[8px]">
                        <button
                            type="button"
                            aria-label="검색"
                            onClick={() => setSearchOpen(true)}
                            className="hidden h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full transition-colors duration-200 md:flex"
                            style={{ color: textColor }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hoverBg}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>

                        <Link
                            href="/membership"
                            aria-label="멤버십"
                            className="hidden h-[34px] w-[34px] items-center justify-center rounded-full transition-colors duration-200 md:flex sm:h-[36px] sm:w-[36px]"
                            style={{ color: textColor }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = hoverBg}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                <path d="M13 5v2M13 17v2M13 11v2" />
                            </svg>
                        </Link>

                        {/* 데스크탑 알림 */}
                        <div className="relative hidden md:block" ref={notiRef}>
                            <button
                                onClick={() => {
                                    setNotiOpen(!notiOpen)
                                    if (!notiOpen && user?.uid && unreadCount > 0) markAllRead(user.uid)
                                }}
                                aria-label="알림"
                                className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full transition-colors duration-200 sm:h-[36px] sm:w-[36px]"
                                style={{ color: textColor }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hoverBg}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
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
                                <div className="absolute right-0 top-[calc(100%+8px)] w-[min(320px,calc(100vw-24px))] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">알림</span>
                                        {unreadCount > 0 && (
                                            <button onClick={() => user?.uid && markAllRead(user.uid)} className="text-xs text-[#6c63ff] hover:text-[#5a52e0]">모두 읽음</button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto max-h-[360px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-faint)]">
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                </svg>
                                                <p className="text-[var(--text-faint)] text-xs">알림이 없어요</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
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
                                            ))
                                        )}
                                    </div>
                                    <EventNotifications />
                                </div>
                            )}
                        </div>

                        <div className="mx-1 hidden h-5 w-px md:block" style={{ background: scrolled ? 'var(--border)' : 'rgba(255,255,255,0.3)' }} />

                        {!user ? (
                            <Link
                                href="/login"
                                className="hidden px-2 text-sm transition-colors min-[1281px]:block"
                                style={{ color: textMuted }}
                                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = textColor}
                                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = textMuted}
                            >
                                로그인
                            </Link>
                        ) : (
                            <div className="relative hidden min-[1281px]:block" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-[8px] cursor-pointer group h-[55px]"
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 transition-all duration-200 shrink-0"
                                        style={{
                                            background: memberInfo.color || '#5a52e0',
                                            '--tw-ring-color': scrolled ? 'var(--border)' : 'rgba(255,255,255,0.3)',
                                        } as React.CSSProperties}
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
                                    <span className="text-sm transition-colors" style={{ color: textMuted }}>
                                        {user.name}
                                    </span>
                                    <svg
                                        width="13" height="13" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2"
                                        className={`transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                                        style={{ color: textMuted }}
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 top-[calc(100%+4px)] w-[300px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
                                        <div className="flex flex-col items-center gap-2 px-5 py-6 border-b border-[var(--border)]">
                                            <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                                                <div
                                                    className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-1 ring-2 ring-[var(--border)] hover:ring-[var(--text-subtle)] transition-all"
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
                                                    className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-1 justify-center hover:text-[var(--text-muted)] transition-colors cursor-pointer">
                                                    {user.name || user.email?.split('@')[0]}
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                                </Link>
                                                {/* 실제 등급 뱃지 */}
                                                <div className="mt-1.5 flex justify-center">
                                                    <GradeButton
                                                        currentGrade={currentGrade}
                                                        nextGrade={nextGrade}
                                                        watched={watched}
                                                        onPress={() => { setGradeOpen(true); setDropdownOpen(false) }}
                                                    />
                                                </div>
                                                {membership !== 'none' && (
                                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                                                        style={{ background: `${memberInfo.color}30`, color: memberInfo.color! }}>
                                                        {memberInfo.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-6 mt-2">
                                                {[
                                                    { label: '별점', val: activityCounts?.rating ?? 0, tab: 'reviews' },
                                                    { label: '리뷰', val: activityCounts?.review ?? 0, tab: 'reviews' },
                                                    { label: '댓글', val: activityCounts?.comment ?? 0, tab: 'comments' },
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
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : 'var(--text-subtle)' }}>
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

                        {/* 모바일 햄버거 버튼 */}
                        <button
                            type="button"
                            aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                            aria-expanded={mobileMenuOpen}
                            onClick={() => {
                                setMobileMenuOpen((open) => !open)
                                setMobileNotiOpen(false)
                                setDropdownOpen(false)
                                setNotiOpen(false)
                            }}
                            className="flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/15 min-[1281px]:hidden"
                            style={{ color: textColor }}
                        >
                            {mobileMenuOpen ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            ) : (
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                    <path d="M4 7h16" />
                                    <path d="M4 12h16" />
                                    <path d="M4 17h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </header>
        </>
    )
}
