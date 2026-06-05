"use client";

// app/store/order/complete/page.tsx
// 주문 완료 페이지

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function OrderCompleteContent() {
    const searchParams = useSearchParams();

    const orderNumber = searchParams.get("orderNumber") ?? "000000000000000";
    const title = searchParams.get("title") ?? "상품명";
    const thumbnail = searchParams.get("thumbnail") ?? "";
    const total = Number(searchParams.get("total") ?? 0);
    const option = searchParams.get("option") ?? "기본";
    const qty = Number(searchParams.get("qty") ?? 1);

    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // 페이드인 애니메이션
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const copyOrderNumber = async () => {
        await navigator.clipboard.writeText(orderNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 썸네일을 3개로 보여주기 (더미 틸트 효과)
    const thumbImages = thumbnail ? [thumbnail] : [];

    return (
        <div className="min-h-screen bg-[#f5f3ff] flex flex-col">
            <main
                className="flex-1 flex flex-col items-center mx-auto w-full max-w-[1770px] px-[75px] py-16"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                }}
            >
                {/* 완료 타이틀 */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#826CFF] mb-4 shadow-lg shadow-[#826cff30]">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 className="text-[28px] font-extrabold text-[#826CFF] tracking-tight">ORDER COMPLETED!</h1>
                    <p className="text-[14px] text-[#888] mt-2">주문이 정상적으로 완료되었습니다</p>
                </div>

                {/* 주문번호 */}
                <div className="flex items-center gap-2 mb-8">
                    <span className="text-[11px] font-bold bg-[#826CFF] text-white px-3 py-1 rounded-full">주문번호</span>
                    <span className="text-[14px] font-semibold text-[#333] tabular-nums">{orderNumber}</span>
                    <button
                        onClick={copyOrderNumber}
                        className="w-7 h-7 rounded-full bg-white border border-[#e0daf7] flex items-center justify-center hover:bg-[#f0eeff] transition-colors"
                        title="복사"
                    >
                        {copied ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        )}
                    </button>
                </div>

                {/* CTA 버튼 */}
                <div className="flex gap-3 mb-10">
                    <Link
                        href="/store/profile/payment"
                        className="h-10 px-6 rounded-full bg-[#826CFF] text-white text-[13px] font-bold hover:bg-[#6B5CE7] transition-colors shadow-md shadow-[#826cff25] flex items-center"
                    >
                        주문상세 보기
                    </Link>
                    <Link
                        href="/store"
                        className="h-10 px-6 rounded-full border-2 border-[#826CFF] text-[#826CFF] text-[13px] font-bold hover:bg-[#f0eeff] transition-colors flex items-center"
                    >
                        계속 쇼핑하기
                    </Link>
                </div>

                <p className="text-[12px] text-[#bbb] mb-8">결제 가능 가능시간 이후 카드사 기준 2~3일 소요될 수 있습니다.</p>

                {/* 주문 카드 */}
                <div className="w-full max-w-[480px] bg-white rounded-[24px] border border-[#ebe8ff] overflow-hidden shadow-sm">
                    {/* 주문상품 */}
                    <div className="p-6 border-b border-[#f0eeff]">
                        <h2 className="text-[14px] font-bold text-[#111018] mb-4">주문상품</h2>
                        {thumbnail && (
                            <div className="flex gap-4 items-center">
                                <div className="w-[100px] h-[100px] rounded-[14px] overflow-hidden border border-[#ebe8ff] flex-shrink-0 bg-[#f5f3ff]">
                                    <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-semibold text-[#111] leading-snug line-clamp-2">{title}</p>
                                    {option !== "기본" && (
                                        <p className="mt-1.5 text-[12px] text-[#aaa]">옵션: {option}</p>
                                    )}
                                    <p className="mt-1 text-[12px] text-[#bbb]">수량: {qty}개</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 총 결제 금액 */}
                    <div className="px-6 py-4 border-b border-[#f0eeff] flex items-center justify-between">
                        <span className="text-[14px] font-bold text-[#111018]">총 결제 금액</span>
                        <span className="text-[20px] font-extrabold text-[#826CFF]">{total.toLocaleString()}원</span>
                    </div>

                    {/* 배송정보 */}
                    <div className="px-6 py-5">
                        <h2 className="text-[14px] font-bold text-[#111018] mb-3">배송정보</h2>
                        <div className="space-y-1 text-[13px]">
                            <p className="font-bold text-[#111]">라프텔</p>
                            <p className="text-[#555]">010-5959-5959</p>
                            <p className="text-[#555] leading-relaxed">
                                서울특별시 영등포구 국제금융로 10, (여의도동, 서울국제금융센터 투아이에프씨)<br />
                                13층, 주식회사 라프텔<br />
                                (03706)
                            </p>
                            <p className="mt-2 text-[#aaa]">요청사항 : 벨리 와주세요</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function OrderCompletePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f3ff]" />}>
            <OrderCompleteContent />
        </Suspense>
    );
}