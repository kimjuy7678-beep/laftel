"use client"
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

const MenuList = [
    { id: 1, title: "태그검색", path: "/tag-search" },
    { id: 2, title: "요일별 신작", path: "/day" },
    { id: 3, title: "멤버십", path: "/membership" },
    { id: 4, title: "스토어", path: "/store", badge: "N" },
    { id: 5, title: "이벤트", path: "/event" },
]

export default function Header() {
    const { user, onLogout } = useAuthStore()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header
            className={`fixed top-0 left-0 w-full z-[1000] transition-colors duration-300 ${scrolled ? 'bg-black' : 'bg-gradient-to-b from-black/60 to-transparent'
                }`}
        >
            <div className="inner flex h-[56px] items-center justify-between px-6">

                <div className="flex items-center gap-10">
                    <h1>
                        <Link href="/">
                            <img src="/images/logo.png" alt="logo" className='w-50' />
                        </Link>
                    </h1>
                    <nav>
                        <ul className="flex gap-6">
                            {MenuList.map((menu) => (
                                <li key={menu.id} className="relative group">
                                    <Link
                                        href={menu.path}
                                        className="flex items-center gap-1 text-sm text-white/90 hover:text-white transition-colors"
                                    >
                                        {menu.title}
                                        {menu.badge && (
                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6c63ff] text-[10px] font-bold text-white">
                                                {menu.badge}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* 오른쪽: 검색 / 알림 / 유저 */}
                <div className="flex items-center gap-4">
                    {/* 검색 아이콘 */}
                    <button className="text-white/80 hover:text-white transition-colors" aria-label="검색">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    {/* 알림 아이콘 */}
                    <button className="text-white/80 hover:text-white transition-colors" aria-label="알림">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </button>

                    {/* 유저 영역 */}
                    {!user ? (
                        <Link
                            href="/login"
                            className="text-sm text-white/80 hover:text-white transition-colors"
                        >
                            로그인
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-8 h-8 rounded-full bg-[#6c63ff] flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <span className="text-sm text-white/90 group-hover:text-white transition-colors">
                                {user.name}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    )}
                </div>

            </div>
        </header>
    )
}
