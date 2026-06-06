"use client";

// app/store/order/complete/page.tsx
// 주문 완료 페이지

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { saveNotification } from "@/utils/notification";
import { issueCoupon } from "@/lib/coupon";
import { db } from "@/firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

interface OrderData {
    buyer?: { name?: string; phone?: string; email?: string };
    shipping?: { name?: string; phone?: string; address?: string; detail?: string; zip?: string; memo?: string };
    paymentMethod?: string;
    items?: { title: string; thumbnail: string; option: string; qty: number; price: number }[];
}

function OrderCompleteContent() {
    const searchParams = useSearchParams();
    const { user } = useAuthStore();

    const orderNumber = searchParams.get("orderNumber") ?? "000000000000000";
    const title = searchParams.get("title") ?? "상품명";
    const thumbnail = searchParams.get("thumbnail") ?? "";
    const total = Number(searchParams.get("total") ?? 0);
    const option = searchParams.get("option") ?? "기본";
    const qty = Number(searchParams.get("qty") ?? 1);

    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);
    const [orderData, setOrderData] = useState<OrderData | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    // ── Firestore에서 실제 주문 데이터 가져오기 ───────────────────────────────
    useEffect(() => {
        if (!user?.uid || !orderNumber) return;
        getDoc(doc(db, "users", user.uid, "orders", orderNumber))
            .then((snap) => { if (snap.exists()) setOrderData(snap.data() as OrderData); })
            .catch(() => { });
    }, [user?.uid, orderNumber]);

    // ── 주문 완료 알림 + 첫 구매 쿠폰 발급 ───────────────────────────────────
    useEffect(() => {
        if (!user?.uid || !orderNumber) return;
        const uid = user.uid;

        saveNotification(uid, {
            type: "order",
            title: "주문이 완료되었어요 🛍️",
            body: `${title} 주문이 정상 접수되었어요. 주문번호: ${orderNumber.slice(0, 8)}...`,
            link: `/store/order/complete?orderNumber=${orderNumber}&title=${encodeURIComponent(title)}&thumbnail=${encodeURIComponent(thumbnail)}&total=${total}&option=${encodeURIComponent(option)}&qty=${qty}`,
        }).catch(() => { });

        getDocs(collection(db, "users", uid, "coupons")).then(async (snap) => {
            const alreadyIssued = snap.docs.some((d) => d.data().label === "첫 구매 축하 쿠폰");
            if (!alreadyIssued) {
                await issueCoupon({
                    uid,
                    label: "첫 구매 축하 쿠폰",
                    discount: 0.1,
                    type: "rate",
                    minOrderAmount: 5000,
                    maxDiscountAmount: 3000,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                });
            }
        }).catch(() => { });
    }, [user?.uid, orderNumber]); // eslint-disable-line

    const copyOrderNumber = async () => {
        await navigator.clipboard.writeText(orderNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                        {orderData?.shipping ? (
                            <div className="space-y-1 text-[13px]">
                                <p className="font-bold text-[#111]">{orderData.shipping.name}</p>
                                <p className="text-[#555]">{orderData.shipping.phone}</p>
                                <p className="text-[#555] leading-relaxed">
                                    {orderData.shipping.address}<br />
                                    {orderData.shipping.detail}<br />
                                    ({orderData.shipping.zip})
                                </p>
                                {orderData.shipping.memo && (
                                    <p className="mt-2 text-[#aaa]">요청사항 : {orderData.shipping.memo}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-[13px] text-[#bbb]">배송정보를 불러오는 중...</p>
                        )}
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