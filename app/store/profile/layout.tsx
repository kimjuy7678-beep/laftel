// app/store/profile/layout.tsx
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const MENU_TOP = [
    { label: "구매목록", path: "/store/profile", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
    { label: "좋아요", path: "/store/profile/wishlist", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
    { label: "문의 내역", path: "/store/profile/inquiry", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { label: "쿠폰함", path: "/store/profile/coupon", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    { label: "포인트 내역", path: "/store/profile/points", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
];

const MENU_BOTTOM = [
    { label: "배송지 관리", path: "/store/profile/address", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> },
    { label: "결제 수단 관리", path: "/store/profile/payment", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    // 회원 정보 관리 → OTT 마이페이지로 외부 이동
    { label: "회원 정보 관리", path: "/mypage", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>, external: true },
    { label: "알림 설정", path: "/store/profile/notify", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
];

const MEMBERSHIP_LABEL: Record<string, string> = {
    none: "Basic Plan", anime: "Anime Plan", ost: "OST Plan", allinone: "All-in-One Plan",
};

const MEMBERSHIP_BENEFITS = [
    {
        key: "none",
        label: "BASIC",
        color: "#c4b5fd",
        bg: "#f0eeff",
        benefits: ["월 1회 50% 할인 쿠폰 지급", "신규 굿즈 알림 서비스", "라프텔 스토어 이용 가능"],
    },
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-[500px] max-h-[90vh] overflow-y-auto rounded-[24px] bg-white shadow-[0_20px_60px_rgba(120,101,255,0.2)]">
                <div className="flex justify-end px-6 pt-5">
                    <button onClick={onClose}
                        className="rounded-full border border-[#e2ddf5] px-4 py-1.5 text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                        닫기
                    </button>
                </div>
                <div className="mx-6 mb-5 rounded-[16px] bg-[#7865ff] px-6 py-7 text-center">
                    <p className="text-[22px] font-extrabold text-white tracking-wide">LAFTEL MEMBERSHIP</p>
                    <p className="mt-1 text-[14px] text-white/80">월간 혜택 안내</p>
                </div>
                <div className="mx-6 mb-4 rounded-[12px] px-5 py-4 flex items-center gap-3"
                    style={{ backgroundColor: current.bg }}>
                    <span className="rounded-full px-3 py-1 text-[12px] font-extrabold text-white"
                        style={{ backgroundColor: current.color }}>
                        {current.label}
                    </span>
                    <p className="text-[13px] font-semibold text-[#16121f]">현재 내 등급</p>
                </div>
                <div className="mx-6 mb-6 flex flex-col gap-4">
                    {MEMBERSHIP_BENEFITS.map((b) => (
                        <div
                            key={b.key}
                            className={`rounded-[12px] border px-5 py-4 transition ${b.key === membership ? "border-[#7865ff] shadow-[0_0_0_1px_#7865ff]" : "border-[#ebe8ff]"}`}
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

    // Firebase 실시간 구독 — OTT 연동
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLivePoints(data.points ?? 0);
                setLiveCoupons(data.coupons?.length ?? 0);
                setLiveWishCount(data.wishlist?.length ?? 0);
            }
        });
        return () => unsub();
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

            <div className="mx-auto max-w-[1200px] px-6 py-10">
                {/* 인사말 */}
                <div className="mb-6">
                    <h1 className="text-[26px] font-bold text-[#16121f]">
                        <span className="text-[#7865ff]">{user?.name ?? "회원"}</span>님, 반가워요!
                    </h1>
                    <p className="mt-1 text-[13px] text-[#9b94b2]">오늘도 라프텔과 함께 덕질 라이프를 즐겨보세요💜</p>
                </div>

                {/* 프로필 카드 */}
                <div className="mb-6 rounded-[16px] bg-[#ede9ff] px-8 py-6">
                    <div className="flex items-center gap-6">
                        <div className="h-[80px] w-[80px] overflow-hidden rounded-full bg-[#c8c0f0] shrink-0">
                            {user?.photoURL
                                ? <img src={user.photoURL} alt="프로필" className="h-full w-full object-cover" />
                                : <div className="flex h-full w-full items-center justify-center text-[28px] font-bold text-[#7865ff]">{user?.name?.[0] ?? "?"}</div>
                            }
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[17px] font-bold text-[#16121f]">{user?.name}</span>
                                <span className="rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[11px] font-bold text-[#16121f]">
                                    {MEMBERSHIP_LABEL[user?.membership ?? "none"]}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-6">
                                <div>
                                    <p className="text-[12px] text-[#9b94b2]">포인트</p>
                                    <p className="text-[15px] font-bold text-[#7865ff]">{livePoints.toLocaleString()}P</p>
                                </div>
                                <div className="h-7 w-px bg-[#d0caee]" />
                                <div>
                                    <p className="text-[12px] text-[#9b94b2]">쿠폰</p>
                                    <p className="text-[15px] font-bold text-[#7865ff]">{liveCoupons}장</p>
                                </div>
                                <div className="h-7 w-px bg-[#d0caee]" />
                                <div>
                                    <p className="text-[12px] text-[#9b94b2]">좋아요</p>
                                    <p className="text-[15px] font-bold text-[#7865ff]">{liveWishCount}개</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="flex gap-5">
                    {/* 사이드바 */}
                    <div className="w-[200px] shrink-0">
                        <div className="rounded-[16px] border border-[#ebe8ff] bg-white p-3">
                            {MENU_TOP.map((m) => (
                                <Link key={m.path} href={m.path}
                                    className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition ${isActive(m.path) ? "bg-[#7865ff] text-white font-semibold" : "text-[#3d3755] hover:bg-[#f0eeff]"}`}>
                                    {m.icon}{m.label}
                                </Link>
                            ))}
                            <div className="my-3 border-t border-[#f0edf8]" />
                            {MENU_BOTTOM.map((m) => (
                                (m as any).external
                                    ? (
                                        <a key={m.path} href={m.path}
                                            className="flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition text-[#3d3755] hover:bg-[#f0eeff]">
                                            {m.icon}
                                            {m.label}
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto opacity-30">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                        </a>
                                    )
                                    : (
                                        <Link key={m.path} href={m.path}
                                            className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition ${isActive(m.path) ? "bg-[#7865ff] text-white font-semibold" : "text-[#3d3755] hover:bg-[#f0eeff]"}`}>
                                            {m.icon}{m.label}
                                        </Link>
                                    )
                            ))}
                            <div className="my-3 border-t border-[#f0edf8]" />
                            <button onClick={() => setBenefitOpen(true)}
                                className="w-full rounded-[10px] bg-[#f0eeff] p-3 text-left transition hover:bg-[#e4dfff]">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7865ff]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-[#7865ff]">마이 혜택</p>
                                        <p className="text-[10px] text-[#9b94b2]">등급별 혜택 확인하기 ›</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="flex-1 min-w-0 rounded-[16px] border border-[#ebe8ff] bg-white p-7">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}