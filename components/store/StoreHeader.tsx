"use client";

import Link from "next/link";
import { useAuthStore } from '@/store/useAuthStore'
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePageTransition } from "@/hook/usePageTransition";
import { StoreSearchModal } from "@/components/store/StoreSearch";
import NotificationGNB from "@/components/store/NotificationGNB";
import HeaderLoginAlert from "@/components/store/HeaderLoginAlert";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const StoreMenuList = [
    { id: 1, title: "전체 굿즈", path: "/store/all" },
    { id: 2, title: "예약 굿즈", path: "/store/reserve" },
    { id: 3, title: "BEST", path: "/store/best" },
];

function getCartItemCount(cart: unknown) {
    if (!Array.isArray(cart)) return 0;

    return cart.reduce((total, item) => {
        if (typeof item === "string") return total + 1;
        if (!item || typeof item !== "object") return total;

        const quantity = Number((item as { quantity?: unknown }).quantity);
        if (!Number.isFinite(quantity)) return total + 1;

        return total + Math.max(1, quantity);
    }, 0);
}

export default function StoreHeader() {
    const { user, onLogout } = useAuthStore();
    const avatarConfig = useAuthStore(s => s.avatarConfig);
    const router = useRouter();
    const pathname = usePathname();
    const { navigate } = usePageTransition();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [loginAlertOpen, setLoginAlertOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (!user?.uid) {
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, "users", user.uid),
            (snap) => {
                setCartCount(getCartItemCount(snap.data()?.cart));
            },
            () => {
                setCartCount(0);
            },
        );

        return unsubscribe;
    }, [user?.uid]);

    const guardedLink = (path: string) => {
        if (!user) { setLoginAlertOpen(true); return; }
        router.push(path);
    };

    const handleLogout = async () => {
        await onLogout();
        setDropdownOpen(false);
        router.push("/store");
    };

    const visibleCartCount = user ? cartCount : 0;

    return (
        <header className="w-full bg-white px-[10px] py-[10px]">
            <StoreSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
            {loginAlertOpen && <HeaderLoginAlert onClose={() => setLoginAlertOpen(false)} />}
            <div className="flex min-h-[55px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[22px] bg-[#826CFF] px-4 py-3 sm:rounded-[28px] md:h-[55px] md:flex-nowrap md:rounded-full md:px-[28px] md:py-0">

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 md:flex-nowrap md:gap-[42px]">
                    {/* 로고 */}
                    <div className="flex min-w-0 items-center gap-2 sm:gap-[14px]">
                        <Link href="/store" className="flex items-center gap-2 sm:gap-[12px]">
                            <img src="/images/stone.svg" alt="" className="h-8 sm:h-10" />
                            <img src="/images/logo-white.svg" alt="logo" className="h-[18px] w-auto sm:h-[22px]" />
                        </Link>
                        {/* OTT / Store 토글 */}
                        <div className="flex items-center gap-[2px] rounded-full bg-white/10 p-[3px]">
                            <button
                                onClick={() => navigate('/', '#0a0a0a')}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 sm:px-3 sm:text-[12px] ${!pathname.startsWith('/store')
                                    ? 'bg-white text-[#826CFF] shadow-sm'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                OTT
                            </button>
                            <button
                                onClick={() => navigate('/store', '#ffffff')}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 sm:px-3 sm:text-[12px] ${pathname.startsWith('/store')
                                    ? 'bg-white text-[#826CFF] shadow-sm'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                Store
                            </button>
                        </div>
                    </div>

                    {/* ── 네비게이션 ── */}
                    <nav className="order-last w-full overflow-x-auto md:order-none md:w-auto md:overflow-visible">
                        <ul className="flex min-w-max items-center gap-5 md:gap-[32px]">
                            {StoreMenuList.map((menu) => {
                                const isActive = pathname === menu.path || pathname.startsWith(menu.path)
                                return (
                                    <li key={menu.id}>
                                        <Link
                                            href={menu.path}
                                            className={`whitespace-nowrap text-[13px] transition-all duration-200 md:text-[15px]
                                                ${isActive
                                                    ? 'text-white font-extrabold'
                                                    : 'text-white/70 font-medium hover:text-white hover:font-bold'
                                                }`}
                                        >
                                            {menu.title}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>
                </div>

                {/* ── 우측: 아이콘 + 유저 ── */}
                <div className="flex shrink-0 items-center gap-1 sm:gap-[8px]">
                    {/* 검색 */}
                    <button
                        type="button"
                        aria-label="검색"
                        onClick={() => setSearchOpen(true)}
                        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/15 sm:h-[36px] sm:w-[36px]"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    {/* 알림 (하트 자리 → 종으로 교체) */}
                    <NotificationGNB />

                    {/* 장바구니 */}
                    <button
                        aria-label="장바구니"
                        onClick={() => guardedLink("/store/cart")}
                        className="relative flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/15 sm:h-[36px] sm:w-[36px]"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        {visibleCartCount > 0 && (
                            <span className="absolute top-1 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                {visibleCartCount > 99 ? "99+" : visibleCartCount}
                            </span>
                        )}
                    </button>

                    <div className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />

                    {/* 유저 프로필 */}
                    {!user ? (
                        <Link
                            href="/login"
                            className="px-1 text-[13px] text-white/80 transition-colors hover:text-white sm:px-2 sm:text-sm"
                        >
                            로그인
                        </Link>
                    ) : (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="group flex h-[40px] cursor-pointer items-center gap-[6px] sm:h-[55px] sm:gap-[8px]"
                            >
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/30 transition-all duration-200 group-hover:ring-white/60"
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
                                <span className="hidden max-w-[120px] truncate text-sm text-white/90 transition-colors group-hover:text-white lg:block">
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
                                        href="/store/profile"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                        마이페이지
                                    </Link>
                                    {/* 위시리스트 */}
                                    <Link
                                        href="/store/profile/wishlist"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                        </svg>
                                        위시리스트
                                    </Link>
                                    <Link
                                        href="/store/profile/inquiry"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        문의내역
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16,17 21,12 16,7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        로그아웃
                                    </button>
                                    <div className="border-t border-white/10 mt-1 pt-1">

                                        <Link
                                            href="/"
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                                        >
                                            {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                                            </svg> */}
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
