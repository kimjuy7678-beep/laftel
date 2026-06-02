"use client";

import Link from "next/link";
import { useAuthStore } from '@/store/useAuthStore'
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const StoreMenuList = [
    { id: 1, title: "전체 굿즈", path: "/store/all" },
    { id: 2, title: "예약 굿즈", path: "/store/reserve" },
    { id: 3, title: "BEST", path: "/store/best" },
];

export default function StoreHeader() {
    const { user } = useAuthStore();
    const avatarConfig = useAuthStore(s => s.avatarConfig);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <header
            className="fixed top-0 left-0 w-full z-[1000] transition-colors duration-300"
            style={{ background: scrolled ? '#4c3fc7' : '#6B5CE7' }}
        >
            <div className="w-full h-[55px] flex items-center justify-between px-[28px]">

                {/* 좌측: 로고 + Store텍스트 + 네비게이션 */}
                <div className="flex items-center gap-[28px]">
                    <Link href="/" className="flex items-center gap-[12px]">
                        <img src="/images/stone.svg" alt="" className="h-7" />
                        <img src="/images/logo-white.svg" alt="logo" className="h-5 w-auto" />
                    </Link>

                    <Link href="/store">
                        <span className="text-white/70 font-[300] text-[15px] tracking-wide">Store</span>
                    </Link>

                    <nav>
                        <ul className="flex items-center gap-[28px]">
                            {StoreMenuList.map((menu) => (
                                <li key={menu.id}>
                                    <Link
                                        href={menu.path}
                                        className="text-white/80 hover:text-white text-[14px] font-medium transition-colors duration-200"
                                    >
                                        {menu.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* 우측: 아이콘 + 유저 */}
                <div className="flex items-center gap-[8px]">

                    {/* 검색 */}
                    <button type="button" aria-label="검색"
                        className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    {/* 위시리스트 */}
                    <button type="button" aria-label="위시리스트"
                        className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>

                    {/* 장바구니 */}
                    <Link href="/store/cart" aria-label="장바구니"
                        className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                    </Link>

                    {/* 구분선 */}
                    <div className="w-px h-5 bg-white/20 mx-1" />

                    {/* 유저 프로필 */}
                    {!user ? (
                        <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors px-2">
                            로그인
                        </Link>
                    ) : (
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-[8px] cursor-pointer group h-[55px]">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/30 group-hover:ring-white/60 transition-all duration-200 shrink-0"
                                    style={{ background: '#5a52e0' }}>
                                    {avatarConfig?.svgDataUrl ? (
                                        <img src={avatarConfig.svgDataUrl} alt="프로필" className="w-full h-full object-cover" />
                                    ) : user.photoURL ? (
                                        <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white text-xs font-bold">{user.name?.[0]?.toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <span className="text-sm text-white/90 group-hover:text-white transition-colors">{user.name}</span>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                    className={`text-white/60 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}>
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 top-[calc(100%+4px)] w-[200px] bg-[#141420] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                                    <Link
                                        href="/store/profile"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                        마이 페이지
                                    </Link>
                                    <Link href="/store/orders" onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
                                        </svg>
                                        주문내역
                                    </Link>
                                    <div className="border-t border-white/10 mt-1 pt-1">
                                        <Link href="/" onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                                            </svg>
                                            라프텔로 돌아가기
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}