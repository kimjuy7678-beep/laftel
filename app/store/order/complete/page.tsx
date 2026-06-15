"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { saveStoreNotification } from "@/utils/storeNotification";
import { issueCoupon } from "@/lib/coupon";
import { db } from "@/firebase/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

interface OrderData {
    buyer?: { name?: string; phone?: string; email?: string };
    shipping?: { name?: string; phone?: string; address?: string; detail?: string; zip?: string; memo?: string };
    paymentMethod?: string;
    items?: { title: string; thumbnail: string; option: string; qty: number; price: number }[];
    notified?: boolean;
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
    const category = searchParams.get("category") ?? "";

    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);
    const [orderData, setOrderData] = useState<OrderData | null>(null);
    const [invalid, setInvalid] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!user?.uid || !orderNumber) { setLoading(false); return; }
        getDoc(doc(db, "users", user.uid, "orders", orderNumber))
            .then((snap) => {
                if (snap.exists()) setOrderData(snap.data() as OrderData);
                else setInvalid(true);
            })
            .catch(() => setInvalid(true))
            .finally(() => setLoading(false));
    }, [user?.uid, orderNumber]);

    // ── 주문 완료 알림 + 첫 구매 쿠폰 발급 (최초 1회만) ─────────────────────
    useEffect(() => {
        if (!user?.uid || !orderNumber || !orderData || orderData.notified) return;
        const uid = user.uid;

        updateDoc(doc(db, "users", uid, "orders", orderNumber), { notified: true }).catch(() => { });

        // ✅ link를 주문내역 배송중 탭으로 변경
        saveStoreNotification(uid, {
            type: "order",
            title: "주문이 완료되었어요 🛍️",
            body: `${title} 주문이 정상 접수되었어요. 주문번호: ${orderNumber.slice(0, 8)}...`,
            link: "/store/profile?tab=배송중",
            status: "결제완료",
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
    }, [orderData]); // eslint-disable-line

    const copyOrderNumber = async () => {
        await navigator.clipboard.writeText(orderNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="min-h-screen bg-[#f5f3ff]" />;

    if (invalid) {
        return (
            <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center justify-center gap-4 px-5 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#ebe8ff] mb-2 sm:h-16 sm:w-16">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-[18px] font-extrabold text-[#826CFF] sm:text-[20px]">잘못된 접근입니다</h2>
                <p className="text-[13px] text-[#aaa]">이미 처리된 주문이거나 유효하지 않은 페이지예요.</p>
                <Link href="/store" className="mt-2 h-11 px-8 rounded-full bg-[#826CFF] text-white text-[14px] font-bold hover:bg-[#6B5CE7] transition-colors shadow-md shadow-[#826cff25] flex items-center">
                    메인으로 돌아가기
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f3ff] flex flex-col">
            <main
                className="flex-1 flex flex-col items-center mx-auto w-full max-w-[1770px] px-4 py-8 sm:px-6 sm:py-12 lg:px-[75px] lg:py-16"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                }}
            >
                <div className="text-center mb-7 sm:mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#826CFF] mb-4 shadow-lg shadow-[#826cff30] sm:h-16 sm:w-16">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 className="text-[23px] font-extrabold text-[#826CFF] tracking-tight sm:text-[28px]">ORDER COMPLETED!</h1>
                    <p className="text-[13px] text-[#888] mt-2 sm:text-[14px]">주문이 정상적으로 완료되었습니다</p>
                </div>

                <div className="mb-6 flex w-full max-w-[480px] items-center gap-2 rounded-[14px] border border-[#ebe8ff] bg-white px-3 py-2.5 sm:mb-8 sm:w-auto sm:max-w-none sm:border-0 sm:bg-transparent sm:p-0">
                    <span className="shrink-0 text-[11px] font-bold bg-[#826CFF] text-white px-3 py-1 rounded-full">주문번호</span>
                    <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold text-[#333] tabular-nums sm:text-[14px]">{orderNumber}</span>
                    <button onClick={copyOrderNumber}
                        className="w-7 h-7 shrink-0 rounded-full bg-white border border-[#e0daf7] flex items-center justify-center hover:bg-[#f0eeff] transition-colors">
                        {copied ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        )}
                    </button>
                </div>

                <div className="mb-8 flex w-full max-w-[480px] flex-col gap-2 sm:mb-10 sm:w-auto sm:flex-row sm:gap-3">
                    {/* ✅ 주문상세 버튼도 배송중 탭으로 이동 */}
                    <Link href="/store/profile?tab=배송중"
                        className="h-10 justify-center px-6 rounded-full bg-[#826CFF] text-white text-[13px] font-bold hover:bg-[#6B5CE7] transition-colors shadow-md shadow-[#826cff25] flex items-center">
                        주문상세 보기
                    </Link>
                    <Link href="/store"
                        className="h-10 justify-center px-6 rounded-full border-2 border-[#826CFF] text-[#826CFF] text-[13px] font-bold hover:bg-[#f0eeff] transition-colors flex items-center">
                        계속 쇼핑하기
                    </Link>
                </div>

                <p className="mb-6 px-2 text-center text-[11px] leading-relaxed text-[#bbb] sm:mb-8 sm:text-[12px]">결제 가능 가능시간 이후 카드사 기준 2~3일 소요될 수 있습니다.</p>

                <div className="w-full max-w-[480px] bg-white rounded-[18px] border border-[#ebe8ff] overflow-hidden shadow-sm sm:rounded-[24px]">
                    <div className="p-4 border-b border-[#f0eeff] sm:p-6">
                        <h2 className="text-[16px] font-bold text-[#111018] mb-4 sm:text-[18px]">주문상품</h2>
                        {thumbnail && (
                            <div className="flex gap-3 items-center sm:gap-4">
                                <div className="w-[76px] h-[76px] rounded-[12px] overflow-hidden border border-[#ebe8ff] flex-shrink-0 bg-[#f5f3ff] sm:h-[100px] sm:w-[100px] sm:rounded-[14px]">
                                    <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {category && <p className="text-[11px] font-semibold text-[#826CFF] mb-1">{category}</p>}
                                    <p className="text-[13px] font-semibold text-[#111] leading-snug line-clamp-2 sm:text-[14px]">{title}</p>
                                    {option !== "기본" && <p className="mt-1.5 text-[12px] text-[#aaa]">옵션: {option}</p>}
                                    <p className="mt-1 text-[12px] text-[#bbb]">수량: {qty}개</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-4 border-b border-[#f0eeff] flex items-center justify-between gap-3 sm:px-6">
                        <span className="text-[14px] font-bold text-[#111018] sm:text-[16px]">총 결제 금액</span>
                        <span className="shrink-0 text-[18px] font-extrabold text-[#826CFF] sm:text-[20px]">{total.toLocaleString()}원</span>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                        <h2 className="text-[16px] font-bold text-[#111018] mb-3">배송정보</h2>
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
