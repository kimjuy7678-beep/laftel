// app/store/profile/layout.tsx
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const MENU_TOP = [
    { label: "구매목록", path: "/store/profile", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
    { label: "위시 리스트", path: "/store/profile/wishlist", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
    { label: "문의 내역", path: "/store/profile/inquiry", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { label: "쿠폰함", path: "/store/profile/coupon", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    { label: "재입고 알림", path: "/store/profile/restock", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
    { label: "포인트 내역", path: "/store/profile/points", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
];

const MENU_BOTTOM = [
    { label: "배송지 관리", path: "/store/profile/address", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> },
    { label: "결제 수단 관리", path: "/store/profile/payment", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    { label: "회원 정보 관리", path: "/mypage", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>, external: true },
    { label: "알림 설정", path: "/store/profile/notify", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
];

const MEMBERSHIP_LABEL: Record<string, string> = {
    none: "Basic Plan", anime: "Anime Plan", ost: "OST Plan", allinone: "All-in-One Plan",
};

const MEMBERSHIP_BENEFITS = [
    {
        key: "allinone",
        label: "ALL",
        color: "#7865ff",
        bg: "#ede9ff",
        benefits: ["월 1회 80% 할인 쿠폰 지급", "신규 굿즈 알림 서비스", "전용 굿즈 선구매 혜택", "배송비 무료", "포인트 2배 적립"],
    },
    {
        key: "ost",
        label: "OST",
        color: "#a78bfa",
        bg: "#f5f3ff",
        benefits: ["월 1회 20% 할인 쿠폰 지급", "신규 굿즈 알림 서비스", "OST 연동 포인트 적립"],
    },
    {
        key: "anime",
        label: "ANIME",
        color: "#818cf8",
        bg: "#eef2ff",
        benefits: ["월 1회 30% 할인 쿠폰 지급", "신규 굿즈 알림 서비스", "애니메 전용 굿즈 할인"],
    },
];

function BenefitModal({ membership, onClose }: { membership: string; onClose: () => void }) {
    const current = MEMBERSHIP_BENEFITS.find((b) => b.key === membership) ?? MEMBERSHIP_BENEFITS[0];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white shadow-[0_20px_60px_rgba(120,101,255,0.2)] sm:rounded-[24px]">
                <div className="flex justify-end px-6 pt-5">
                    <button onClick={onClose}
                        className="rounded-full border border-[#e2ddf5] px-4 py-1.5 text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                        닫기
                    </button>
                </div>
                <div className="mx-4 mb-5 rounded-[16px] bg-[#7865ff] px-4 py-6 text-center sm:mx-6 sm:px-6 sm:py-7">
                    <p className="text-[19px] font-extrabold tracking-wide text-white sm:text-[22px]">LAFTEL MEMBERSHIP</p>
                    <p className="mt-1 text-[14px] text-white/80">월간 혜택 안내</p>
                </div>
                <div className="mx-4 mb-4 flex items-center gap-3 rounded-[12px] px-4 py-4 sm:mx-6 sm:px-5"
                    style={{ backgroundColor: current.bg }}>
                    <span className="rounded-full px-3 py-1 text-[12px] font-extrabold text-white"
                        style={{ backgroundColor: current.color }}>
                        {current.label}
                    </span>
                    <p className="text-[13px] font-semibold text-[#16121f]">현재 내 등급</p>
                </div>
                <div className="mx-4 mb-6 flex flex-col gap-3 sm:mx-6 sm:gap-4">
                    {MEMBERSHIP_BENEFITS.map((b) => (
                        <div
                            key={b.key}
                            className={`rounded-[12px] border px-4 py-4 transition sm:px-5 ${b.key === membership ? "border-[#7865ff] shadow-[0_0_0_1px_#7865ff]" : "border-[#ebe8ff]"}`}
                            style={{ backgroundColor: b.bg }}
                        >
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-full px-3 py-0.5 text-[11px] font-extrabold text-white"
                                    style={{ backgroundColor: b.color }}>
                                    {b.label}
                                </span>
                                {b.key === membership && (
                                    <span className="text-[11px] font-semibold text-[#7865ff]">✓ 현재 등급</span>
                                )}
                            </div>
                            <ul className="flex flex-col gap-1.5">
                                {b.benefits.map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-[13px] text-[#3d3755]">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={b.color} strokeWidth="2.5">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ProfileStoreLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const pathname = usePathname();
    const [benefitOpen, setBenefitOpen] = useState(false);
    const [livePoints, setLivePoints] = useState<number>(user?.points ?? 0);
    const [liveCoupons, setLiveCoupons] = useState<number>(0);
    const [liveWishCount, setLiveWishCount] = useState<number>(0);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLivePoints(data.points ?? 0);
                setLiveWishCount(data.wishlist?.length ?? 0);
            }
        });
        const unsubCoupons = onSnapshot(collection(db, "users", user.uid, "coupons"), (snap) => {
            setLiveCoupons(snap.size);
        });
        return () => { unsubUser(); unsubCoupons(); };
    }, [user?.uid]);

    const isActive = (path: string) =>
        path === "/store/profile" ? pathname === "/store/profile" : pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-[#fafafa]">
            {benefitOpen && (
                <BenefitModal
                    membership={user?.membership ?? "none"}
                    onClose={() => setBenefitOpen(false)}
                />
            )}

            <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                {/* 인사말 */}
                <div className="mb-5 sm:mb-6">
                    <h1 className="text-[21px] font-bold text-[#16121f] sm:text-[24px] lg:text-[28px]">
                        <span className="text-[#7865ff]">{user?.name ?? "회원"}</span>님, 반가워요!
                    </h1>
                    <p className="mt-1 text-[12px] text-[#9b94b2] sm:text-[14px]">오늘도 라프텔과 함께 덕질 라이프를 즐겨보세요💜</p>
                </div>

                {/* 프로필 카드 */}
                <div className="mb-5 rounded-[16px] bg-[#ede9ff] px-4 py-5 sm:mb-6 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
                        <div className="h-[78px] w-[78px] shrink-0 overflow-hidden rounded-full bg-[#c8c0f0] sm:h-[88px] sm:w-[88px] lg:h-[104px] lg:w-[104px]">
                            {user?.photoURL
                                ? <img src={user.photoURL} alt="프로필" className="h-full w-full object-cover" />
                                : <div className="flex h-full w-full items-center justify-center text-[28px] font-bold text-[#7865ff] sm:text-[32px] lg:text-[36px]">{user?.name?.[0] ?? "?"}</div>
                            }
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="truncate text-[19px] font-bold text-[#16121f] sm:text-[21px] lg:text-[22px]">{user?.name}</span>
                                <span className="rounded-full bg-[#ffcc00] px-2.5 py-1 text-[12px] font-bold text-[#16121f] sm:px-3 sm:text-[13px]">
                                    {MEMBERSHIP_LABEL[user?.membership ?? "none"]}
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:flex sm:items-center sm:gap-8 lg:gap-10">
                                <div className="min-w-0">
                                    <p className="text-[12px] text-[#9b94b2] sm:text-[14px]">포인트</p>
                                    <p className="truncate text-[16px] font-bold text-[#7865ff] sm:text-[18px] lg:text-[20px]">{livePoints.toLocaleString()}P</p>
                                </div>
                                <div className="hidden h-9 w-px bg-[#d0caee] sm:block" />
                                <div className="min-w-0">
                                    <p className="text-[12px] text-[#9b94b2] sm:text-[14px]">쿠폰</p>
                                    <p className="truncate text-[16px] font-bold text-[#7865ff] sm:text-[18px] lg:text-[20px]">{liveCoupons}장</p>
                                </div>
                                <div className="hidden h-9 w-px bg-[#d0caee] sm:block" />
                                <div className="min-w-0">
                                    <p className="text-[12px] text-[#9b94b2] sm:text-[14px]">위시리스트</p>
                                    <p className="truncate text-[16px] font-bold text-[#7865ff] sm:text-[18px] lg:text-[20px]">{liveWishCount}개</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="flex flex-col gap-4 lg:flex-row lg:gap-7">
                    {/* 사이드바 */}
                    <div className="w-full shrink-0 lg:w-[260px]">
                        <div className="rounded-[16px] border border-[#ebe8ff] bg-white p-3 sm:p-4">
                            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                            {MENU_TOP.map((m) => (
                                <Link key={m.path} href={m.path}
                                    className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] transition sm:text-[14px] lg:gap-3 lg:px-4 lg:py-3 lg:text-[15px] ${isActive(m.path) ? "bg-[#7865ff] text-white font-semibold" : "text-[#3d3755] hover:bg-[#f0eeff]"}`}>
                                    {m.icon}{m.label}
                                </Link>
                            ))}
                            </div>
                            <div className="my-3 border-t border-[#f0edf8]" />
                            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                            {MENU_BOTTOM.map((m) => (
                                "external" in m && m.external
                                    ? (
                                        <a key={m.path} href={m.path}
                                            className="flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] text-[#3d3755] transition hover:bg-[#f0eeff] sm:text-[14px] lg:gap-3 lg:px-4 lg:py-3 lg:text-[15px]">
                                            {m.icon}
                                            {m.label}
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto opacity-30">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                        </a>
                                    )
                                    : (
                                        <Link key={m.path} href={m.path}
                                            className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] transition sm:text-[14px] lg:gap-3 lg:px-4 lg:py-3 lg:text-[15px] ${isActive(m.path) ? "bg-[#7865ff] text-white font-semibold" : "text-[#3d3755] hover:bg-[#f0eeff]"}`}>
                                            {m.icon}{m.label}
                                        </Link>
                                    )
                            ))}
                            </div>
                            <div className="my-3 border-t border-[#f0edf8]" />
                            <button onClick={() => setBenefitOpen(true)}
                                className="w-full rounded-[12px] bg-[#f0eeff] p-3 text-left transition hover:bg-[#e4dfff] sm:p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7865ff]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-[#7865ff]">마이 혜택</p>
                                        <p className="text-[11px] text-[#9b94b2]">등급별 혜택 확인하기 ›</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="min-w-0 flex-1 rounded-[16px] border border-[#ebe8ff] bg-white p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
