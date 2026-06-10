"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Link from "next/link";

interface Card {
    id: string;
    brand: string;
    last4: string;
    expiry: string;
    isDefault: boolean;
}

const BRAND_COLOR: Record<string, string> = {
    VISA: "#1a1f71",
    Mastercard: "#eb001b",
    AMEX: "#007bc1",
    카드: "#7865ff",
};

const BRAND_BG: Record<string, string> = {
    VISA: "#eef0ff",
    Mastercard: "#fff0f0",
    AMEX: "#e8f4ff",
    카드: "#f0eeff",
};

export default function PaymentPage() {
    const { user } = useAuthStore();
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) { setLoading(false); return; }
        const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
            if (snap.exists()) setCards(snap.data().cards ?? []);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid]);

    return (
        <>
            {/* 헤더 */}
            <div className="mb-5 md:mb-6">
                <div className="flex items-center justify-between gap-3 mb-1">
                    <h2 className="text-[18px] md:text-[20px] font-bold text-[#16121f]">결제 수단 관리</h2>
                    <Link href="/mypage"
                        className="shrink-0 flex h-[36px] md:h-[38px] items-center gap-1.5 rounded-[10px] bg-[#7865ff] px-3 md:px-4 text-[12px] md:text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(120,101,255,0.3)] transition hover:bg-[#6b55f0]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span className="hidden md:inline">카드 추가하기</span>
                        <span className="md:hidden">추가</span>
                    </Link>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#9b94b2]">라프텔 OTT에 등록된 결제수단이 연동돼요.</p>
            </div>

            {/* OTT 연동 안내 배너 */}
            <Link href="/mypage"
                className="mb-4 md:mb-5 flex items-center justify-between rounded-[12px] border border-[#c4baff] bg-[#f8f6ff] px-3 md:px-4 py-3 transition hover:border-[#7865ff] hover:shadow-[0_2px_12px_rgba(120,101,255,0.12)] group">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-[#7865ff]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] md:text-[12px] font-bold text-[#7865ff] truncate">OTT 마이페이지에서 관리</p>
                        <p className="text-[10px] md:text-[11px] text-[#9b94b2] truncate">카드 추가 · 삭제 · 기본카드 설정은 OTT에서 진행해요</p>
                    </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2"
                    className="shrink-0 ml-2 group-hover:stroke-[#7865ff] transition-colors">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            </Link>

            {/* 카드 목록 */}
            {loading ? (
                <div className="flex h-[160px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" />
                        <p className="text-[12px] text-[#9b94b2]">불러오는 중...</p>
                    </div>
                </div>
            ) : cards.length === 0 ? (
                <div className="flex h-[180px] flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0eeff]">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4baff" strokeWidth="1.5">
                            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                    </div>
                    <p className="text-[13px] text-[#9b94b2]">등록된 결제수단이 없어요.</p>
                    <Link href="/mypage"
                        className="flex items-center gap-1 text-[12px] font-semibold text-[#7865ff] underline underline-offset-2">
                        OTT에서 카드 등록하기
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5 md:gap-3">
                    {cards.map(card => {
                        const color = BRAND_COLOR[card.brand] ?? "#7865ff";
                        const bg = BRAND_BG[card.brand] ?? "#f0eeff";
                        return (
                            <div key={card.id}
                                className="flex items-center gap-3 md:gap-4 rounded-[14px] border border-[#ebe8ff] bg-white px-3 md:px-5 py-3 md:py-4 transition hover:border-[#c4baff]">
                                {/* 카드 브랜드 아이콘 */}
                                <div className="flex h-[36px] w-[54px] md:h-[44px] md:w-[66px] shrink-0 items-center justify-center rounded-[8px] md:rounded-[10px] text-[10px] md:text-[11px] font-black"
                                    style={{ background: bg, color }}>
                                    {card.brand}
                                </div>

                                {/* 카드 정보 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 flex-wrap">
                                        <p className="text-[12px] md:text-[14px] font-bold text-[#16121f] truncate">
                                            {card.brand} •••• {card.last4}
                                        </p>
                                        {card.isDefault && (
                                            <span className="shrink-0 rounded-full bg-[#f0eeff] px-2 py-0.5 text-[10px] font-bold text-[#7865ff] border border-[#d8d4ff]">
                                                기본
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] md:text-[12px] text-[#9b94b2]">유효기간 {card.expiry}</p>
                                </div>

                                {/* OTT 이동 버튼 */}
                                <Link href="/mypage"
                                    className="shrink-0 flex h-[30px] md:h-[32px] items-center gap-1 rounded-[8px] border border-[#ddd8f4] px-2 md:px-3 text-[10px] md:text-[11px] font-semibold text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff] whitespace-nowrap">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                    <span className="hidden md:inline">OTT에서 관리</span>
                                    <span className="md:hidden">관리</span>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 안내 */}
            <div className="mt-5 md:mt-6 rounded-[12px] border border-[#ebe8ff] bg-[#faf9ff] px-4 md:px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold text-[#7865ff]">결제수단 안내</p>
                <ul className="flex flex-col gap-1.5">
                    {[
                        "카드 추가 · 삭제 · 기본카드 변경은 라프텔 OTT 마이페이지에서 가능해요.",
                        "OTT에서 변경된 내용은 스토어에 실시간으로 반영돼요.",
                        "기본 카드로 설정된 카드가 스토어 결제 시 우선 사용돼요.",
                        "등록된 카드 정보는 암호화되어 안전하게 보관돼요.",
                    ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] md:text-[12px] text-[#9b94b2]">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c4baff]" />
                            {t}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}