"use client";

// app/store/order/complete/page.tsx
// 주문 완료 페이지

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
    // 결제 직후 정상 진입 여부 — order 페이지에서 from=new로 넘어온 경우만 true
    const isNewOrder = searchParams.get("from") === "new";

    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);
    const [orderData, setOrderData] = useState<OrderData | null>(null);
    const [invalid, setInvalid] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    // from=new 파라미터 제거해서 히스토리 교체
    // → 뒤로가기 시 from=new 없는 URL로 돌아옴 → notified 체크 → 잘못된 접근
    useEffect(() => {
        if (isNewOrder) {
            const url = new URL(window.location.href);
            url.searchParams.delete("from");
            window.history.replaceState(null, "", url.toString());
        }
    }, []);

    // ── Firestore에서 실제 주문 데이터 가져오기 ───────────────────────────────
    useEffect(() => {
        if (!user?.uid || !orderNumber) return;
        getDoc(doc(db, "users", user.uid, "orders", orderNumber))
            .then((snap) => {
                if (snap.exists()) {
                    const data = snap.data() as OrderData;
                    if (isNewOrder) {
                        // 결제 직후 정상 진입 → notified 무시하고 완료 페이지 표시
                        setOrderData(data);
                    } else {
                        // 뒤로가기 / 직접 URL 접근 → notified 체크
                        if (data.notified) {
                            setInvalid(true);
                        } else {
                            setOrderData(data);
                        }
                    }
                } else {
                    setInvalid(true);
                }
            })
            .catch(() => { setInvalid(true); })
            .finally(() => setLoading(false));
    }, [user?.uid, orderNumber]);

    // ── 주문 완료 알림 + 첫 구매 쿠폰 발급 (최초 1회만) ─────────────────────
    useEffect(() => {
        if (!user?.uid || !orderNumber || !orderData || orderData.notified) return;
        const uid = user.uid;

        // notified 플래그 세팅 (이후 재접근 시 잘못된 접근 처리)
        updateDoc(doc(db, "users", uid, "orders", orderNumber), { notified: true }).catch(() => { });

        saveStoreNotification(uid, {
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
    }, [orderData]); // eslint-disable-line

    const copyOrderNumber = async () => {
        await navigator.clipboard.writeText(orderNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return <div className="min-h-screen bg-[#f5f3ff]" />;
    }

    if (invalid) {
        return (
            <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center justify-center gap-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ebe8ff] mb-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-[20px] font-extrabold text-[#826CFF]">잘못된 접근입니다</h2>
                <p className="text-[13px] text-[#aaa]">이미 처리된 주문이거나 유효하지 않은 페이지예요.</p>
                <Link
                    href="/store"
                    className="mt-2 h-11 px-8 rounded-full bg-[#826CFF] text-white text-[14px] font-bold hover:bg-[#6B5CE7] transition-colors shadow-md shadow-[#826cff25] flex items-center"
                >
                    메인으로 돌아가기
                </Link>
            </div>
        );
    }

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
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#826CFF] mb-4 shadow-lg shadow-[#826cff30]">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 className="text-[28px] font-extrabold text-[#826CFF] tracking-tight">ORDER COMPLETED!</h1>
                    <p className="text-[14px] text-[#888] mt-2">주문이 정상적으로 완료되었습니다</p>
                </div>

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

                <div className="flex gap-3 mb-10">
                    <Link
                        href="/store/profile"
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

                <div className="w-full max-w-[480px] bg-white rounded-[24px] border border-[#ebe8ff] overflow-hidden shadow-sm">
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

                    <div className="px-6 py-4 border-b border-[#f0eeff] flex items-center justify-between">
                        <span className="text-[14px] font-bold text-[#111018]">총 결제 금액</span>
                        <span className="text-[20px] font-extrabold text-[#826CFF]">{total.toLocaleString()}원</span>
                    </div>

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