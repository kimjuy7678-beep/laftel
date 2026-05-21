"use client"
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const MenuList = [
    { id: 1, title: "태그검색", path: "/tag-search" },
    { id: 2, title: "요일별 신작", path: "/day-new" },
    { id: 3, title: "라이브", path: "/live", live: true },
    { id: 4, title: "스토어", path: "/store", badge: "N" },
    { id: 5, title: "이벤트", path: "/event" },
]

const DropdownMenu = [
    { title: "라프텔 멤버십", path: "/membership", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg> },
    { title: "내 포인트", path: "/point", sub: "0P", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
    { title: "쿠폰 등록", path: "/coupon", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg> },
    { title: "이용내역", path: "/history", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg> },
    { title: "스토어 주문내역", path: "/store/orders", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg> },
    { title: "공지사항", path: "/notice", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
    { title: "고객센터", path: "/support", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" /></svg> },
    { title: "설정", path: "/settings", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
]

export default function Header() {
    const { user, onLogout } = useAuthStore()
    const [scrolled, setScrolled] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await onLogout()
        setDropdownOpen(false)
        router.push('/')
    }

    return (
        <header className={`fixed top-0 left-0 w-full z-[1000] transition-colors duration-300 ${scrolled ? 'bg-black' : 'bg-gradient-to-b from-black/60 to-transparent'}`}>
            <div className="inner flex h-[56px] items-center justify-between px-6">

                <div className="flex items-center gap-10">
                    <h1>
                        <Link href="/">
                            <img src="/images/logo.png" alt="logo" className='w-28' />
                        </Link>
                    </h1>
                    <nav>
                        <ul className="flex gap-6">
                            {MenuList.map((menu) => (
                                <li key={menu.id} className="relative group">
                                    <Link href={menu.path} className="flex items-center gap-1 text-sm text-white/90 hover:text-white transition-colors">
                                        {menu.title}
                                        {menu.live && (
                                            <span className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-red-500 text-[10px] font-bold text-white animate-pulse">LIVE</span>
                                        )}
                                        {menu.badge && (
                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6c63ff] text-[10px] font-bold text-white">{menu.badge}</span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/membership" className="text-white/80 hover:text-white transition-colors" aria-label="멤버십">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                            <path d="M13 5v2M13 17v2M13 11v2" />
                        </svg>
                    </Link>

                    <button className="text-white/80 hover:text-white transition-colors" aria-label="검색">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    <button className="text-white/80 hover:text-white transition-colors" aria-label="알림">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>

                    {!user ? (
                        <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">
                            로그인
                        </Link>
                    ) : (
                        <div className="relative" ref={dropdownRef}>
                            {/* 프로필 버튼 */}
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#6c63ff] flex items-center justify-center overflow-hidden">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-sm text-white/90 group-hover:text-white transition-colors">{user.name}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-white/60 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>

                            {/* 드롭다운 */}
                            {dropdownOpen && (
                                <div className="absolute right-0 top-12 w-[260px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">

                                    {/* 프로필 상단 */}
                                    <div className="flex flex-col items-center gap-3 px-4 py-5 border-b border-white/10">
                                        <div className="w-16 h-16 rounded-full bg-[#6c63ff] flex items-center justify-center overflow-hidden">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-semibold text-sm">{user.name}</p>
                                            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* 메뉴 */}
                                    <ul className="py-1">
                                        {DropdownMenu.map((item) => (
                                            <li key={item.title}>
                                                <Link
                                                    href={item.path}
                                                    onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <span className="text-white/50">{item.icon}</span>
                                                        {item.title}
                                                    </span>
                                                    {item.sub && <span className="text-white/40 text-xs">{item.sub}</span>}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* 로그아웃 */}
                                    <div className="border-t border-white/10 py-1">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                                        >
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
    )
}