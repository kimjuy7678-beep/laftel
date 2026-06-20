"use client";

import Link from "next/link";
import { useAuthStore } from '@/store/useAuthStore'
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePageTransition } from "@/hook/usePageTransition";
import { StoreSearchModal } from "@/components/store/StoreSearch";
import NotificationGNB from "@/components/store/NotificationGNB";
import HeaderLoginAlert from "@/components/store/HeaderLoginAlert";
import { useStoreNotificationStore } from "@/store/useStoreNotificationStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const StoreMenuList = [
    { id: 1, title: "전체 굿즈", path: "/store/all" },
    { id: 2, title: "예약 굿즈", path: "/store/reserve" },
    { id: 3, title: "BEST", path: "/store/best" },
];

const MEMBERSHIP_DISPLAY: Record<string, string> = {
    none: "일반 회원",
    anime: "anime",
    ost: "ost",
    allinone: "all-in-one",
};

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

function getNotificationLink(type: string, status?: string, link?: string) {
    if (link) return link;
    if (type === "point") return "/store/profile/points";
    if (type === "coupon") return "/store/profile/coupon";
    if (type === "restock") return "/store/profile/restock";
    if (type === "inquiry") return "/store/profile/inquiry";
    if (status === "배송중" || status === "배송시작" || status === "결제완료") return "/store/profile?tab=배송중";
    if (status === "배송완료") return "/store/profile?tab=배송완료";
    if (status === "처리중" || status === "주문취소" || status === "교환환불신청" || status === "환불완료") return "/store/profile?tab=교환환불/취소";
    return "/store/profile";
}

function getNotificationActionText(type: string, status?: string) {
    if (type === "coupon") return "쿠폰함으로 이동";
    if (type === "restock") return "재입고 알림 보기";
    if (type === "inquiry") return "문의내역 보기";
    if (status === "배송완료") return "배송완료 보기";
    if (status === "처리중" || status === "주문취소" || status === "교환환불신청" || status === "환불완료") return "취소/환불 내역 보기";
    return "주문내역 보기";
}

type HeaderNotification = {
    id: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    status?: string;
    read: boolean;
    createdAt?: unknown;
};

function normalizeNotification(notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    status?: unknown;
    read: boolean;
    createdAt?: unknown;
}): HeaderNotification {
    return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        status: typeof notification.status === "string" ? notification.status : undefined,
        read: notification.read,
        createdAt: notification.createdAt,
    };
}

function getNotificationTimeValue(createdAt: unknown) {
    if (!createdAt) return 0;

    const candidate = createdAt as { toDate?: () => Date };
    const date = typeof candidate.toDate === "function"
        ? candidate.toDate()
        : new Date(createdAt as string | number | Date);

    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatNotificationTime(createdAt: unknown) {
    if (!createdAt) return "";

    const candidate = createdAt as { toDate?: () => Date };
    const date = typeof candidate.toDate === "function"
        ? candidate.toDate()
        : new Date(createdAt as string | number | Date);

    if (Number.isNaN(date.getTime())) return "";

    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;

    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}시간 전`;
    return `${Math.floor(hour / 24)}일 전`;
}

export default function StoreHeader() {
    const { user, onLogout } = useAuthStore();
    const avatarConfig = useAuthStore(s => s.avatarConfig);
    const router = useRouter();
    const pathname = usePathname();
    const { navigate } = usePageTransition();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileNotificationOpen, setMobileNotificationOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [loginAlertOpen, setLoginAlertOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const {
        notifications: storeNotifications,
        subscribeNotifications: subscribeStoreNotifications,
        markAllRead,
        markOneRead,
    } = useStoreNotificationStore();
    const {
        notifications: generalNotifications,
        subscribeNotifications: subscribeGeneralNotifications,
        markAllRead: markAllGeneralRead,
    } = useNotificationStore();

    const mobileNotifications = useMemo(() => {
        const notificationMap = new Map<string, HeaderNotification>();

        [...storeNotifications, ...generalNotifications].forEach((notification) => {
            const normalized = normalizeNotification(notification);
            notificationMap.set(normalized.id, normalized);
        });

        return Array.from(notificationMap.values()).sort(
            (a, b) => getNotificationTimeValue(b.createdAt) - getNotificationTimeValue(a.createdAt),
        );
    }, [storeNotifications, generalNotifications]);

    const mobileUnreadCount = mobileNotifications.filter((notification) => !notification.read).length;

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setMobileMenuOpen(false);
            setMobileNotificationOpen(false);
        });
        return () => cancelAnimationFrame(frame);
    }, [pathname]);

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

    useEffect(() => {
        if (!user?.uid) {
            return;
        }

        subscribeStoreNotifications(user.uid);
        subscribeGeneralNotifications(user.uid);
    }, [user?.uid, subscribeStoreNotifications, subscribeGeneralNotifications]);

    const guardedLink = (path: string) => {
        if (!user) { setLoginAlertOpen(true); return; }
        router.push(path);
    };

    const handleLogout = async () => {
        await onLogout();
        setDropdownOpen(false);
        setMobileMenuOpen(false);
        setMobileNotificationOpen(false);
        router.push("/store");
    };

    const visibleCartCount = user ? cartCount : 0;
    const membershipLabel = user?.membership
        ? MEMBERSHIP_DISPLAY[user.membership] ?? user.membership
        : MEMBERSHIP_DISPLAY.none;

    const handleMobileNotificationClick = async (notification: {
        id: string;
        type: string;
        status?: string;
        link?: string;
        read?: boolean;
    }) => {
        if (user?.uid && !notification.read) {
            await markOneRead(user.uid, notification.id);
        }

        setMobileNotificationOpen(false);
        setMobileMenuOpen(false);
        router.push(getNotificationLink(notification.type, notification.status, notification.link));
    };

    return (
        <header className="w-full bg-white px-[10px] py-1.5 md:py-[10px]">
            <StoreSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
            {loginAlertOpen && <HeaderLoginAlert onClose={() => setLoginAlertOpen(false)} />}
            <div className="flex min-h-[46px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[18px] bg-[#826CFF] px-3 py-1.5 sm:min-h-[50px] sm:rounded-[24px] sm:px-4 sm:py-2 md:h-[55px] md:min-h-[55px] md:flex-nowrap md:rounded-full md:px-[28px] md:py-0">

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 md:flex-nowrap md:gap-[42px]">
                    {/* 로고 */}
                    <div className="flex min-w-0 items-center gap-2 sm:gap-[14px]">
                        <Link href="/store" className="flex items-center gap-2 sm:gap-[12px]">
                            <img src="/images/stone.svg" alt="" className="h-7 sm:h-8 md:h-10" />
                            <img src="/images/logo-white.svg" alt="logo" className="h-[16px] w-auto sm:h-[18px] md:h-[22px]" />
                        </Link>
                        {/* OTT / Store 토글 */}
                        <div className="flex items-center gap-[2px] rounded-full bg-white/10 p-[3px]">
                            <button
                                onClick={() => navigate('/', '#0a0a0a')}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all duration-200 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-[12px] ${!pathname.startsWith('/store')
                                    ? 'bg-white text-[#826CFF] shadow-sm'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                OTT
                            </button>
                            <button
                                onClick={() => navigate('/store', '#ffffff')}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all duration-200 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-[12px] ${pathname.startsWith('/store')
                                    ? 'bg-white text-[#826CFF] shadow-sm'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                Store
                            </button>
                        </div>
                    </div>

                    {/* ── 네비게이션 ── */}
                    <nav className="hidden min-[1281px]:block min-[1281px]:w-auto min-[1281px]:overflow-visible">
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
                        className="hidden h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/15 sm:h-[36px] sm:w-[36px] min-[1281px]:flex"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    {/* 알림 (하트 자리 → 종으로 교체) */}
                    <div className="hidden min-[1281px]:block">
                        <NotificationGNB />
                    </div>

                    {/* 장바구니 */}
                    <button
                        aria-label="장바구니"
                        onClick={() => guardedLink("/store/cart")}
                        className="relative hidden h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/15 sm:h-[36px] sm:w-[36px] min-[1281px]:flex"
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

                    <button
                        type="button"
                        aria-label="검색"
                        onClick={() => setSearchOpen(true)}
                        className="hidden h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/25 min-[1281px]:hidden"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                        aria-expanded={mobileMenuOpen}
                        onClick={() => {
                            setMobileMenuOpen((open) => !open);
                            setDropdownOpen(false);
                        }}
                        className="flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/25 min-[1281px]:hidden"
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

                    <div className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />

                    {/* 유저 프로필 */}
                    {!user ? (
                        <Link
                            href="/login"
                            className="hidden px-1 text-[13px] text-white/80 transition-colors hover:text-white sm:px-2 sm:text-sm min-[1281px]:block"
                        >
                            로그인
                        </Link>
                    ) : (
                        <div className="relative hidden min-[1281px]:block" ref={dropdownRef}>
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
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[10000] min-[1281px]:hidden">
                    <button
                        type="button"
                        aria-label="메뉴 닫기"
                        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <aside className="absolute right-0 top-0 flex h-full w-[min(88vw,350px)] flex-col overflow-hidden bg-[#fbfaff] shadow-[-20px_0_60px_rgba(0,0,0,0.28)]">
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-4 pb-4 pt-4">
                                <div className="rounded-[22px] bg-[#826CFF] px-5 pb-5 pt-4 text-white shadow-[0_16px_34px_rgba(130,108,255,0.28)]">
                                    <div className="mb-5 flex items-center justify-between">
                                        <Link
                                            href="/store"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-2"
                                        >
                                            <img src="/images/stone.svg" alt="" className="h-8" />
                                            <img src="/images/logo-white.svg" alt="logo" className="h-[18px] w-auto" />
                                        </Link>
                                        <button
                                            type="button"
                                            aria-label="메뉴 닫기"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                {user ? (
                                    <>
                                        <Link
                                            href="/store/profile"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3"
                                        >
                                            <div
                                                className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30"
                                            >
                                                {avatarConfig?.svgDataUrl ? (
                                                    <img src={avatarConfig.svgDataUrl} alt="프로필" className="h-full w-full object-cover" />
                                                ) : user.photoURL ? (
                                                    <img src={user.photoURL} alt="프로필" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-[22px] font-black text-white">
                                                        {user.name?.[0]?.toUpperCase() || "?"}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <p className="truncate text-[18px] font-extrabold text-white">{user.name}</p>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                                        <path d="m9 18 6-6-6-6" />
                                                    </svg>
                                                </div>
                                                <p className="mt-1 text-[12px] font-semibold text-white/75">
                                                    {membershipLabel} · {(user.points ?? 0).toLocaleString()}P
                                                </p>
                                            </div>
                                        </Link>
                                        <div className="mt-5 grid grid-cols-2 gap-2">
                                            <Link
                                                href="/store/cart"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex h-11 items-center justify-center rounded-[12px] bg-white text-[13px] font-extrabold text-[#826CFF]"
                                            >
                                                장바구니 {visibleCartCount > 0 ? visibleCartCount : ""}
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setMobileNotificationOpen((open) => !open)}
                                                className={`flex h-11 items-center justify-center rounded-[12px] text-[13px] font-extrabold ring-1 ring-white/20 transition ${mobileNotificationOpen ? "bg-white text-[#826CFF]" : "bg-white/15 text-white"}`}
                                            >
                                                알림 보기 {mobileUnreadCount > 0 ? mobileUnreadCount : ""}
                                            </button>
                                        </div>
                                        {mobileNotificationOpen && (
                                            <div className="mt-3 overflow-hidden rounded-[16px] bg-white text-[#221b38] shadow-[0_12px_24px_rgba(39,24,111,0.16)]">
                                                <div className="flex items-center justify-between border-b border-[#f0edff] px-4 py-3">
                                                    <div>
                                                        <p className="text-[14px] font-black">알림</p>
                                                        <p className="mt-0.5 text-[11px] font-semibold text-[#9b94b2]">
                                                            주문, 쿠폰, 재입고 소식을 확인해요
                                                        </p>
                                                    </div>
                                                    {mobileUnreadCount > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!user.uid) return;
                                                                markAllRead(user.uid);
                                                                markAllGeneralRead(user.uid);
                                                            }}
                                                            className="rounded-full bg-[#f3f0ff] px-3 py-1.5 text-[11px] font-extrabold text-[#826CFF]"
                                                        >
                                                            전체 읽음
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="max-h-[260px] overflow-y-auto">
                                                    {mobileNotifications.length === 0 ? (
                                                        <div className="px-5 py-8 text-center">
                                                            <p className="text-[13px] font-extrabold text-[#312b45]">아직 도착한 알림이 없어요</p>
                                                            <p className="mt-1 text-[12px] font-semibold text-[#9b94b2]">주문 취소 처리, 쿠폰 발급 같은 소식이 오면 여기에 보여요.</p>
                                                        </div>
                                                    ) : (
                                                        mobileNotifications.slice(0, 8).map((notification) => (
                                                            <button
                                                                key={notification.id}
                                                                type="button"
                                                                onClick={() => handleMobileNotificationClick(notification)}
                                                                className={`flex w-full items-start gap-3 border-b border-[#f3f0ff] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#faf9ff] ${notification.read ? "bg-white" : "bg-[#fbfaff]"}`}
                                                            >
                                                                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-[#ddd7ef]" : "bg-[#826CFF]"}`} />
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block truncate text-[13px] font-extrabold text-[#221b38]">{notification.title}</span>
                                                                    <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#6f6882]">{notification.body}</span>
                                                                    <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#aaa3bd]">
                                                                        <span>{formatNotificationTime(notification.createdAt)}</span>
                                                                        <span className="text-[#d2cce6]">·</span>
                                                                        <span className="text-[#826CFF]">{getNotificationActionText(notification.type, notification.status)}</span>
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div>
                                        <p className="text-[22px] font-extrabold text-white">라프텔 스토어</p>
                                        <p className="mt-2 text-[13px] leading-relaxed text-white/75">로그인하면 찜, 장바구니, 주문내역을 더 편하게 관리할 수 있어요.</p>
                                        <Link
                                            href="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="mt-5 flex h-[46px] items-center justify-center rounded-[12px] bg-white text-[14px] font-extrabold text-[#826CFF]"
                                        >
                                            로그인하기
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        <nav className="pb-2">
                            <p className="mb-2 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#9b94b2]">Store</p>
                            {[
                                { title: "전체 굿즈", href: "/store/all" },
                                { title: "예약 굿즈", href: "/store/reserve" },
                                { title: "BEST", href: "/store/best" },
                                { title: "최근본상품", href: "/store/recent" },
                                { title: "한정판 굿즈", href: "/store/rare" },
                            ].map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center justify-between px-4 py-3 text-[14px] font-extrabold transition ${isActive ? "bg-[#f0eeff] text-[#826CFF]" : "text-[#312b45] hover:bg-white"}`}
                                    >
                                        {item.title}
                                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#826CFF]" />}
                                    </Link>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchOpen(true);
                                    setMobileMenuOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                상품 검색

                            </button>
                        </nav>

                        <div className="mx-4 my-1 h-px bg-[#e9e5f4]" />
                        <div className="pb-3">
                            <p className="mb-2 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#9b94b2]">My Store</p>
                            <Link
                                href="/store/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3 text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                구매목록
                                <span className="text-[#c2bdd4]">→</span>
                            </Link>
                            <Link
                                href="/store/profile/wishlist"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3 text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                위시리스트
                                <span className="text-[#c2bdd4]">→</span>
                            </Link>
                            <Link
                                href="/store/profile/inquiry"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3 text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                문의내역
                                <span className="text-[#c2bdd4]">→</span>
                            </Link>
                            <Link
                                href="/store/profile/coupon"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3 text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                쿠폰함
                                <span className="text-[#c2bdd4]">→</span>
                            </Link>
                            <Link
                                href="/store/profile/restock"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3 text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                재입고 알림
                                <span className="text-[#c2bdd4]">→</span>
                            </Link>
                            <Link
                                href="/store/profile/points"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center px-4 py-3 text-[14px] font-extrabold text-[#312b45] transition hover:bg-white"
                            >
                                내 포인트
                                <span className="ml-auto text-[13px] font-bold text-[#9b94b2]">{(user?.points ?? 0).toLocaleString()}P</span>
                            </Link>
                        </div>
                        </div>
                        <div className="border-t border-[#e9e5f4] p-3.5">
                            {user ? (
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] text-red-400 transition hover:bg-white hover:text-red-500"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16,17 21,12 16,7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    로그아웃
                                </button>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex w-full items-center justify-center rounded-xl bg-[#826CFF] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#6f58ff]"
                                >
                                    로그인
                                </Link>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </header>
    );
}
