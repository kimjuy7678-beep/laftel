"use client";

import Link from "next/link";
import { useAuthStore } from '@/store/useAuthStore'
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const StoreMenuList = [
    { id: 1, title: "전체 굿즈", path: "/store" },
    { id: 2, title: "예약 굿즈", path: "/store/popular" },
    { id: 3, title: "BEST", path: "/store/best" },
];

export default function StoreHeader() {
    const { user } = useAuthStore();
    const avatarConfig = useAuthStore(s => s.avatarConfig);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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
        <header className="w-full py-[10px] bg-white px-[10px]">
            <div className="w-full h-[55px] flex items-center justify-between bg-[#6B5CE7] rounded-full px-[28px]">

                {/* ── 좌측: 로고 + 브레드크럼 + 네비게이션 ── */}
                <div className="flex items-center gap-[28px]">
                    {/* 로고 */}
                    <div className="flex items-center gap-[6px]">
                        <Link href="/" className="flex items-center gap-[12px]">
                            <img src="/images/stone.svg" alt="" className="h-7" />
                            <img src="/images/laftel 3.svg" alt="logo" className="h-5 w-auto" />
                        </Link>
                        <span className="text-white font-semibold text-[15px] tracking-wide leading-none">
                            Store
                        </span>
                    </div>

                    {/* 브레드크럼 */}
                    <div className="flex items-center gap-[6px] text-white/50 text-[12px]">
                        <span>애니플레이  |</span>

                        <span className="text-white/80">굿즈살래!</span>
                    </div>

                    {/* ── 네비게이션 (왼쪽으로 이동) ── */}
                    <nav>
                        <ul className="flex items-center gap-[32px]">
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

                {/* ── 우측: 아이콘 + 유저 ── */}
                <div className="flex items-center gap-[8px]">
                    {/* 검색 */}
                    <button
                        type="button"
                        aria-label="검색"
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 cursor-pointer text-white"
                    >
                        <img src="/images/store/search.svg" alt="검색" className="w-[30px] h-[30px]" />
                    </button>

                    {/* 위시리스트 */}
                    <button
                        type="button"
                        aria-label="위시리스트"
                        className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 cursor-pointer text-white"
                    >
                        <img src="/images/store/wish.svg" alt="위시리스트" className="w-[30px] h-[30px]" />
                    </button>

                    {/* 장바구니 */}
                    <Link
                        href="/store/cart"
                        aria-label="장바구니"
                        className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 cursor-pointer text-white"
                    >
                        <img src="/images/store/cart.svg" alt="장바구니" className="w-[30px] h-[30px]" />
                    </Link>

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
                                    style={{ background: '#5a52e0' }}
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
                                <div className="absolute right-0 top-[calc(100%+4px)] w-[200px] bg-[#141420] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                                    <Link
                                        href="/profile"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                        프로필
                                    </Link>
                                    <Link
                                        href="/store/orders"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
                                        </svg>
                                        주문내역
                                    </Link>
                                    <div className="border-t border-white/10 mt-1 pt-1">
                                        <Link
                                            href="/"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                                        >
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