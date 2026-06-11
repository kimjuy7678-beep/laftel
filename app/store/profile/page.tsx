"use client";

// app/store/profile/page.tsx

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { saveStoreNotification } from "@/utils/storeNotification";
import Link from "next/link";

// ─── 타입 ────────────────────────────────────────────────────────────────────
type ItemStatus =
    | "결제완료" | "배송시작" | "배송중" | "배송완료"
    | "취소신청" | "취소완료" | "환불신청" | "환불완료";

type OrderItem = {
    productId: string;
    title: string;
    thumbnail: string;
    option: string;
    price: number;
    qty: number;
    status?: ItemStatus; // 낱개 상태 (없으면 order.status 기준)
};

type Order = {
    id: string;
    date: string;
    status: "결제완료" | "배송시작" | "배송중" | "배송완료" | "처리중" | "주문취소" | "교환환불신청" | "환불완료";
    items: OrderItem[];
    total: number;
    usedPoints: number;
    couponId?: string;
    usedCouponId?: string;
    couponLabel?: string;
    usedCouponLabel?: string;
    couponDiscount?: number;
    createdAt?: Date | { toDate?: () => Date } | null;
    cancelReason?: string;
    refundReason?: string;
    refundType?: "제품하자" | "단순변심";
    paymentMethod?: string;
    shipping?: { name?: string; phone?: string; address?: string; detail?: string; zip?: string; memo?: string };
};

// ─── 상수 ────────────────────────────────────────────────────────────────────
const STATUS_TABS = ["전체", "배송중", "배송완료", "교환환불/취소"];
const STATUS_COLOR: Record<string, string> = {
    "결제완료": "text-[#7865ff]",
    "배송시작": "text-[#7865ff]",
    "배송중": "text-[#7865ff]",
    "배송완료": "text-[#22c55e]",
    "처리중": "text-[#f59e0b]",
    "주문취소": "text-[#ff4d6d]",
    "교환환불신청": "text-[#d97706]",
    "환불완료": "text-[#16a34a]",
    "취소신청": "text-[#f59e0b]",
    "취소완료": "text-[#888]",
    "환불신청": "text-[#d97706]",
};

const ITEM_STATUS_LABEL: Record<string, { text: string; color: string }> = {
    "결제완료": { text: "결제완료", color: "text-[#7865ff]" },
    "배송시작": { text: "배송시작", color: "text-[#7865ff]" },
    "배송중": { text: "배송중", color: "text-[#7865ff]" },
    "배송완료": { text: "배송완료", color: "text-[#22c55e]" },
    "취소신청": { text: "취소신청", color: "text-[#f59e0b]" },
    "취소완료": { text: "취소완료", color: "text-[#888]" },
    "환불신청": { text: "환불신청", color: "text-[#d97706]" },
    "환불완료": { text: "환불완료", color: "text-[#16a34a]" },
};

const CANCEL_REASONS = ["단순 변심", "상품 불량/파손", "배송 지연", "주문 실수", "기타"];

const DATE_RANGE_BUTTONS = [
    { label: "1개월", months: 1 },
    { label: "3개월", months: 3 },
    { label: "6개월", months: 6 },
];

// ─── 유틸 ────────────────────────────────────────────────────────────────────
function toDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function toOrderDateLabel(date?: Date) {
    if (!date) return "-";
    return toDateInputValue(date).replaceAll("-", ".");
}
function getOrderCreatedDate(createdAt: Order["createdAt"]): Date | undefined {
    if (!createdAt) return undefined;
    if (createdAt instanceof Date) return createdAt;
    const c = createdAt as any;
    if (typeof c.toDate === "function") return c.toDate();
    if (typeof c.seconds === "number") return new Date(c.seconds * 1000);
    if (typeof createdAt === "string" || typeof createdAt === "number") return new Date(createdAt);
    return undefined;
}
function getDateRange(months: number) {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - months);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

/** 아이템의 실효 상태 반환 (item.status 없으면 order.status 기반 추정) */
function resolveItemStatus(item: OrderItem, orderStatus: Order["status"]): ItemStatus {
    if (item.status) return item.status;
    // 구버전 주문: order.status로 일괄 매핑
    if (orderStatus === "주문취소") return "취소완료";
    if (orderStatus === "환불완료") return "환불완료";
    if (orderStatus === "교환환불신청") return "환불신청";
    if (orderStatus === "처리중") return "취소신청";
    return orderStatus as ItemStatus;
}

/** 주문에서 취소/환불 가능한 아이템만 필터 */
function getCancellableItems(order: Order) {
    return order.items.filter(item => {
        const s = resolveItemStatus(item, order.status);
        return s === "결제완료";
    });
}
/** 배송시작 이상으로 진행된 아이템이 있는지 (취소 불가 안내용) */
function hasShippingStartedItems(order: Order) {
    return order.items.some(item => {
        const s = resolveItemStatus(item, order.status);
        return s === "배송시작" || s === "배송중";
    });
}
function getRefundableItems(order: Order) {
    return order.items.filter(item => {
        const s = resolveItemStatus(item, order.status);
        return s === "배송완료";
    });
}

/** 주문의 대표 탭 분류 */
function getOrderTabCategory(order: Order): string[] {
    const statuses = order.items.map(item => resolveItemStatus(item, order.status));
    const categories: string[] = [];

    const shippingStatuses: ItemStatus[] = ["결제완료", "배송시작", "배송중"];
    const doneStatuses: ItemStatus[] = ["배송완료"];
    const cancelRefundStatuses: ItemStatus[] = ["취소신청", "취소완료", "환불신청", "환불완료"];

    if (statuses.some(s => shippingStatuses.includes(s))) categories.push("배송중");
    if (statuses.some(s => doneStatuses.includes(s))) categories.push("배송완료");
    if (statuses.some(s => cancelRefundStatuses.includes(s))) categories.push("교환환불/취소");
    return categories;
}

// ─── 주문 상세 팝업 ───────────────────────────────────────────────────────────
function OrderDetailPopup({ order, onClose }: { order: Order; onClose: () => void }) {
    const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const resolvedCouponId = order.usedCouponId ?? order.couponId;
    const [couponLabel, setCouponLabel] = useState<string | null>(
        order.usedCouponLabel ?? order.couponLabel ?? null
    );
    const { user } = useAuthStore();

    useEffect(() => {
        if (!resolvedCouponId || couponLabel !== null) return;
        if (!user?.uid) return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid!, "coupons", resolvedCouponId));
                if (snap.exists()) setCouponLabel(snap.data().label ?? "쿠폰 할인");
                else setCouponLabel("쿠폰 할인");
            } catch { setCouponLabel("쿠폰 할인"); }
        })();
    }, [resolvedCouponId, user?.uid]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="relative w-full max-w-[460px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white shadow-2xl"
                onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white flex items-center justify-between border-b border-[#f0edf8] px-6 py-4 z-10">
                    <h3 className="text-[16px] font-bold text-[#16121f]">주문 상세</h3>
                    <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2ddf5] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-5">
                    <div className="rounded-[12px] bg-[#f5f3ff] px-4 py-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-[#9b94b2]">주문번호</p>
                            <p className="text-[12px] font-bold text-[#3d3755] tabular-nums">{order.id.slice(0, 16)}...</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-[#9b94b2]">주문일시</p>
                            <p className="text-[12px] text-[#3d3755]">{order.date}</p>
                        </div>
                    </div>
                    {/* 상품별 상태 표시 */}
                    <div>
                        <p className="mb-2 text-[12px] font-bold text-[#6b647a]">주문 상품</p>
                        <div className="flex flex-col gap-3">
                            {order.items.map((item, i) => {
                                const s = resolveItemStatus(item, order.status);
                                const sl = ITEM_STATUS_LABEL[s];
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0eeff]">
                                            {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="line-clamp-1 text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                            <p className="text-[11px] text-[#9b94b2]">옵션: {item.option} · {item.qty}개</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className={`text-[11px] font-bold ${sl?.color ?? "text-[#7865ff]"}`}>{sl?.text ?? s}</p>
                                            <p className="text-[13px] font-bold text-[#16121f]">{(item.price * item.qty).toLocaleString()}원</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <p className="mb-2 text-[12px] font-bold text-[#6b647a]">결제 내역</p>
                        <div className="rounded-[12px] border border-[#ebe8ff] overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0edf8]">
                                <p className="text-[12px] text-[#6b647a]">상품 금액</p>
                                <p className="text-[12px] font-semibold text-[#16121f]">{subtotal.toLocaleString()}원</p>
                            </div>
                            {(order.couponDiscount ?? 0) > 0 && (
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0edf8]">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[12px] text-[#6b647a]">쿠폰 할인</p>
                                        {couponLabel && <p className="text-[10px] text-[#a89fce]">{couponLabel}</p>}
                                    </div>
                                    <p className="text-[12px] font-semibold text-[#ff4d6d]">-{(order.couponDiscount ?? 0).toLocaleString()}원</p>
                                </div>
                            )}
                            {(order.usedPoints ?? 0) > 0 && (
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0edf8]">
                                    <p className="text-[12px] text-[#6b647a]">포인트 사용</p>
                                    <p className="text-[12px] font-semibold text-[#ff4d6d]">-{(order.usedPoints ?? 0).toLocaleString()}원</p>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#faf9ff]">
                                <p className="text-[13px] font-bold text-[#16121f]">최종 결제금액</p>
                                <p className="text-[16px] font-extrabold text-[#7865ff]">{order.total.toLocaleString()}원</p>
                            </div>
                        </div>
                    </div>
                    {order.paymentMethod && (
                        <div>
                            <p className="mb-2 text-[12px] font-bold text-[#6b647a]">결제 수단</p>
                            <div className="rounded-[12px] border border-[#ebe8ff] px-4 py-3">
                                <p className="text-[13px] text-[#3d3755]">{order.paymentMethod}</p>
                            </div>
                        </div>
                    )}
                    {order.shipping && (
                        <div>
                            <p className="mb-2 text-[12px] font-bold text-[#6b647a]">배송지</p>
                            <div className="rounded-[12px] border border-[#ebe8ff] px-4 py-3 flex flex-col gap-1">
                                <p className="text-[13px] font-semibold text-[#16121f]">{order.shipping.name}</p>
                                <p className="text-[12px] text-[#6b647a]">{order.shipping.phone}</p>
                                <p className="text-[12px] text-[#6b647a]">{order.shipping.address} {order.shipping.detail}</p>
                                <p className="text-[12px] text-[#9b94b2]">({order.shipping.zip})</p>
                                {order.shipping.memo && <p className="text-[12px] text-[#9b94b2]">요청사항: {order.shipping.memo}</p>}
                            </div>
                        </div>
                    )}
                    {order.cancelReason && (
                        <div className="rounded-[12px] bg-[#fff0f3] border border-[#ffb3c1] px-4 py-3">
                            <p className="text-[11px] font-bold text-[#ff4d6d] mb-1">취소 사유</p>
                            <p className="text-[12px] text-[#6b647a]">{order.cancelReason}</p>
                        </div>
                    )}
                    {order.refundReason && (
                        <div className="rounded-[12px] bg-[#fff8e6] border border-[#fde68a]/60 px-4 py-3">
                            <p className="text-[11px] font-bold text-[#d97706] mb-1">교환/환불 사유 {order.refundType && `(${order.refundType})`}</p>
                            <p className="text-[12px] text-[#6b647a]">{order.refundReason}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── 주문취소 팝업 ────────────────────────────────────────────────────────────
function CancelPopup({ order, onClose, onConfirm }: {
    order: Order;
    onClose: () => void;
    onConfirm: (orderId: string, selectedProductIds: string[], reason: string) => Promise<void>;
}) {
    const cancellable = getCancellableItems(order);
    const [selected, setSelected] = useState<string[]>([]);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const toggle = (productId: string) =>
        setSelected(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);

    const selectedItems = cancellable.filter(i => selected.includes(i.productId));
    const selectedTotal = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    // 쿠폰 비례 차감: 전체 취소면 0 (쿠폰 복원), 부분 취소면 비례 차감
    const couponDiscount = order.couponDiscount ?? 0;
    const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const isAllSelected = cancellable.length === selected.length && order.items.every(item => {
        const s = resolveItemStatus(item, order.status);
        return selected.includes(item.productId) || ["취소신청", "취소완료", "환불신청", "환불완료"].includes(s);
    });
    const couponRate = subtotal > 0 ? couponDiscount / subtotal : 0;
    const couponDeductForSelected = isAllSelected
        ? 0 // 전체 취소 → 쿠폰 복원되므로 차감 없음
        : Math.round(selectedTotal * couponRate);
    const refundAmount = Math.max(0, selectedTotal - couponDeductForSelected);

    const handleConfirm = async () => {
        if (selected.length === 0) { alert("취소할 상품을 선택해주세요."); return; }
        if (!reason) { alert("취소 사유를 선택해주세요."); return; }
        setLoading(true);
        await onConfirm(order.id, selected, reason);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[22px] font-bold text-[#7865ff]">주문 취소</h2>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eeff] text-[#9b94b2] hover:bg-[#e0daf7] hover:text-[#7865ff] transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                {/* 취소 가능 아이템만 표시 */}
                <div className="mb-5 rounded-[16px] bg-[#f0eeff] p-4 flex flex-col gap-4">
                    {cancellable.map(item => (
                        <div key={item.productId} className="flex items-center gap-3">
                            <button onClick={() => toggle(item.productId)}
                                className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${selected.includes(item.productId) ? "bg-[#7865ff] border-[#7865ff]" : "bg-white border-[#d8d4ee]"}`}>
                                {selected.includes(item.productId) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                            </button>
                            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[10px] bg-[#e8e4f8]">
                                {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                            </div>
                            <div>
                                <p className="line-clamp-1 text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                <p className="text-[11px] text-[#9b94b2]">옵션 : {item.option}</p>
                                <p className="mt-1 text-[14px] font-bold text-[#16121f]">{item.price.toLocaleString()}원</p>
                                <p className="text-[11px] text-[#9b94b2]">총 수량 : {item.qty}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mb-5 relative">
                    <select value={reason} onChange={e => setReason(e.target.value)}
                        className="w-full h-[48px] appearance-none rounded-[12px] border border-[#ddd8f4] bg-white px-4 text-[13px] text-[#3d3755] outline-none focus:border-[#7865ff] cursor-pointer">
                        <option value="">취소 사유 선택</option>
                        {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
                <div className="mb-6 text-center">
                    {couponDiscount > 0 && selected.length > 0 && (
                        <div className="mb-3 rounded-[10px] bg-[#fff8e6] border border-[#fde68a]/60 px-4 py-2.5 text-left flex flex-col gap-1">
                            <p className="text-[11px] font-bold text-[#d97706]">쿠폰 할인 적용</p>
                            <div className="flex items-center justify-between text-[12px] text-[#6b647a]">
                                <span>선택 상품 금액</span>
                                <span>{selectedTotal.toLocaleString()}원</span>
                            </div>
                            {isAllSelected ? (
                                <div className="flex items-center justify-between text-[12px] text-[#16a34a]">
                                    <span>🎟 쿠폰 복원 (전체 취소)</span>
                                    <span>복원됨</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-[12px] text-[#ff4d6d]">
                                    <span>🎟 쿠폰 할인 차감 ({Math.round(couponRate * 100)}%)</span>
                                    <span>-{couponDeductForSelected.toLocaleString()}원</span>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="text-[14px] text-[#9b94b2]">환불 예상금액</p>
                    <p className="text-[28px] font-bold text-[#7865ff]">{refundAmount.toLocaleString()}원</p>
                    <p className="text-[11px] text-[#9b94b2] mt-1">※ 포인트는 결제 비율로 함께 복원돼요. 관리자 승인 후 처리돼요.</p>
                </div>
                <button onClick={handleConfirm} disabled={loading}
                    className="w-full h-[44px] rounded-[12px] border border-[#ddd8f4] text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff] disabled:opacity-50">
                    {loading ? "처리 중..." : "취소 신청"}
                </button>
            </div>
        </div>
    );
}

// ─── 교환/환불 신청 팝업 ──────────────────────────────────────────────────────
function RefundPopup({ order, onClose, onConfirm }: {
    order: Order;
    onClose: () => void;
    onConfirm: (orderId: string, selectedProductIds: string[], reason: string, refundType: "제품하자" | "단순변심") => Promise<void>;
}) {
    const refundable = getRefundableItems(order);
    const [selected, setSelected] = useState<string[]>([]);
    const [refundType, setRefundType] = useState<"제품하자" | "단순변심" | "">("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const toggle = (productId: string) =>
        setSelected(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);

    const DEFECT_REASONS = ["제품 불량/파손", "오배송", "상품 정보 상이", "기타 하자"];
    const CHANGE_REASONS = ["단순 변심", "사이즈/색상 불만족", "다른 상품 구매", "기타"];
    const reasons = refundType === "제품하자" ? DEFECT_REASONS : refundType === "단순변심" ? CHANGE_REASONS : [];

    const handleConfirm = async () => {
        if (selected.length === 0) { alert("환불할 상품을 선택해주세요."); return; }
        if (!refundType) { alert("신청 유형을 선택해주세요."); return; }
        if (!reason) { alert("사유를 선택해주세요."); return; }
        setLoading(true);
        await onConfirm(order.id, selected, reason, refundType);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[20px] font-bold text-[#d97706]">교환 / 환불 신청</h2>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff8e6] text-[#9b94b2] hover:bg-[#fde68a]/40 hover:text-[#d97706] transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mb-4 rounded-[12px] bg-[#fff8e6] border border-[#fde68a]/60 px-4 py-3">
                    <p className="text-[12px] text-[#d97706] font-medium">수령 후 7일 이내에만 신청 가능해요.</p>
                    <p className="text-[11px] text-[#d97706]/70 mt-0.5">단순변심의 경우 왕복 배송비가 부과될 수 있어요.</p>
                </div>
                {/* 환불 가능 아이템 선택 */}
                <div className="mb-5 rounded-[16px] bg-[#fff8e6] p-4 flex flex-col gap-4">
                    {refundable.map(item => (
                        <div key={item.productId} className="flex items-center gap-3">
                            <button onClick={() => toggle(item.productId)}
                                className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${selected.includes(item.productId) ? "bg-[#d97706] border-[#d97706]" : "bg-white border-[#d8d4ee]"}`}>
                                {selected.includes(item.productId) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                            </button>
                            <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0eeff]">
                                {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                            </div>
                            <div className="min-w-0">
                                <p className="line-clamp-1 text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                <p className="text-[11px] text-[#9b94b2]">{item.option} · {item.qty}개</p>
                                <p className="text-[12px] font-bold text-[#16121f]">{item.price.toLocaleString()}원</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mb-4">
                    <p className="mb-2 text-[12px] font-semibold text-[#6b647a]">신청 유형</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(["제품하자", "단순변심"] as const).map(type => (
                            <button key={type} onClick={() => { setRefundType(type); setReason(""); }}
                                className={`h-[44px] rounded-[12px] border-2 text-[13px] font-semibold transition ${refundType === type
                                    ? type === "제품하자" ? "border-[#d97706] bg-[#fff8e6] text-[#d97706]" : "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]"
                                    : "border-[#e2ddf5] text-[#9b94b2] hover:border-[#c0bcd0]"}`}>
                                {type === "제품하자" ? "🔧 제품 하자" : "💭 단순 변심"}
                            </button>
                        ))}
                    </div>
                </div>
                {refundType && (
                    <div className="mb-5 relative">
                        <select value={reason} onChange={e => setReason(e.target.value)}
                            className="w-full h-[48px] appearance-none rounded-[12px] border border-[#ddd8f4] bg-white px-4 text-[13px] text-[#3d3755] outline-none cursor-pointer focus:border-[#7865ff]">
                            <option value="">사유 선택</option>
                            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                )}
                {refundType === "단순변심" && (
                    <div className="mb-4 rounded-[10px] bg-[#f5f3ff] px-3 py-2">
                        <p className="text-[11px] text-[#9b94b2]">단순변심 교환/환불 시 왕복 배송비(약 5,000원~6,000원)가 차감될 수 있어요.</p>
                    </div>
                )}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 h-[44px] rounded-[12px] border border-[#ddd8f4] text-[13px] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition">취소</button>
                    <button onClick={handleConfirm} disabled={loading || !refundType}
                        className="flex-1 h-[44px] rounded-[12px] bg-[#d97706] text-[13px] font-semibold text-white hover:bg-[#b45309] transition disabled:opacity-50">
                        {loading ? "신청 중..." : "신청하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 로딩 컴포넌트 ────────────────────────────────────────────────────────────
function OrderLoading() {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 1rem" }}>
            <style>{`
                @keyframes ol-truck-move {
                    0%   { transform: translateX(-130px); }
                    40%  { transform: translateX(0px); }
                    60%  { transform: translateX(0px); }
                    100% { transform: translateX(130px); }
                }
                @keyframes ol-bounce {
                    0%, 100% { transform: translateY(0); }
                    50%       { transform: translateY(-3px); }
                }
                @keyframes ol-road {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-40px); }
                }
                @keyframes ol-dots {
                    0%   { content: ''; }
                    33%  { content: '.'; }
                    66%  { content: '..'; }
                    100% { content: '...'; }
                }
                .ol-truck {
                    position: absolute; bottom: 20px; left: 50%;
                    animation: ol-truck-move 2s cubic-bezier(.4,0,.2,1) infinite,
                               ol-bounce 0.45s ease-in-out infinite;
                }
                .ol-road {
                    position: absolute; bottom: 20px; left: -40px; right: -40px; height: 1.5px;
                    background: repeating-linear-gradient(to right, #c0bcd0 0px, #c0bcd0 12px, transparent 12px, transparent 22px);
                    animation: ol-road 0.45s linear infinite;
                }
                .ol-dots::after { content: ''; animation: ol-dots 1.2s steps(1) infinite; }
            `}</style>
            <div style={{ width: 240, height: 90, position: "relative", overflow: "hidden", marginBottom: 10 }}>
                <div className="ol-road" />
                <div className="ol-truck">
                    <svg width="96" height="52" viewBox="0 0 96 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 박스 */}
                        <rect x="8" y="2" width="18" height="18" rx="2" fill="#ebe8ff" stroke="#7865ff" strokeWidth="1.5">
                            <animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="2s" repeatCount="indefinite" />
                        </rect>
                        <line x1="8" y1="11" x2="26" y2="11" stroke="#7865ff" strokeWidth="1.2">
                            <animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="2s" repeatCount="indefinite" />
                        </line>
                        <line x1="17" y1="2" x2="17" y2="20" stroke="#7865ff" strokeWidth="1.2">
                            <animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="2s" repeatCount="indefinite" />
                        </line>
                        {/* 트럭 바디 */}
                        <rect x="0" y="18" width="52" height="26" rx="3" fill="#7865ff" />
                        {/* 캡 */}
                        <rect x="52" y="26" width="26" height="18" rx="3" fill="#6050e0" />
                        {/* 창문 */}
                        <rect x="57" y="30" width="14" height="9" rx="2" fill="#ebe8ff" />
                        {/* 구분선 */}
                        <line x1="52" y1="18" x2="52" y2="44" stroke="#6050e0" strokeWidth="1" />
                        {/* 바퀴 왼쪽 */}
                        <circle cx="16" cy="44" r="8" fill="#3d3755" stroke="#c0bcd0" strokeWidth="2" />
                        <circle cx="16" cy="44" r="3" fill="#9b94b2" />
                        {/* 바퀴 오른쪽 */}
                        <circle cx="66" cy="44" r="8" fill="#3d3755" stroke="#c0bcd0" strokeWidth="2" />
                        <circle cx="66" cy="44" r="3" fill="#9b94b2" />
                        {/* 범퍼 */}
                        <rect x="78" y="38" width="6" height="6" rx="1" fill="#9b94b2" />
                        {/* 헤드라이트 */}
                        <rect x="76" y="34" width="4" height="3" rx="1" fill="#ebe8ff" />
                    </svg>
                </div>
            </div>
            <p className="ol-dots" style={{ fontSize: 13, color: "#9b94b2", letterSpacing: "0.03em" }}>불러오는 중</p>
        </div>
    );
}
function DateRangeFilter({ dateFrom, dateTo, activeRange, onDateFromChange, onDateToChange, onRangeClick, onSearch, onReset }: {
    dateFrom: string; dateTo: string; activeRange: string;
    onDateFromChange: (v: string) => void; onDateToChange: (v: string) => void;
    onRangeClick: (label: string, months: number) => void; onSearch: () => void; onReset: () => void;
}) {
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);
    const openFromPicker = () => { try { fromRef.current?.showPicker(); } catch { fromRef.current?.focus(); } };
    const openToPicker = () => { try { toRef.current?.showPicker(); } catch { toRef.current?.focus(); } };

    return (
        <div className="mb-5 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {DATE_RANGE_BUTTONS.map((range) => (
                    <button key={range.label} type="button"
                        onClick={() => onRangeClick(range.label, range.months)}
                        className={`h-[32px] rounded-[7px] px-2.5 text-[11px] font-semibold transition sm:h-[34px] sm:px-3 sm:text-[12px] ${activeRange === range.label ? "bg-[#7865ff] text-white" : "border border-[#ddd8f4] hover:border-[#7865ff]"}`}
                        style={{ color: activeRange === range.label ? "#fff" : "#111" }}>
                        {range.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="relative cursor-pointer" onClick={openFromPicker}>
                    <input ref={fromRef} type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)}
                        className="h-[32px] w-[118px] cursor-pointer rounded-[7px] border border-[#ddd8f4] px-2.5 text-[11px] outline-none focus:border-[#7865ff] sm:h-[34px] sm:w-[126px] sm:px-3 sm:text-[12px]" style={{ color: "#111" }} />
                </div>
                <span className="text-[12px] text-[#9b94b2]">~</span>
                <div className="relative cursor-pointer" onClick={openToPicker}>
                    <input ref={toRef} type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)}
                        className="h-[32px] w-[118px] cursor-pointer rounded-[7px] border border-[#ddd8f4] px-2.5 text-[11px] outline-none focus:border-[#7865ff] sm:h-[34px] sm:w-[126px] sm:px-3 sm:text-[12px]" style={{ color: "#111" }} />
                </div>
            </div>

            <div className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-2">
                <button onClick={onSearch} className="h-[32px] flex-1 rounded-[7px] bg-[#7865ff] px-3 text-[11px] font-semibold text-white transition hover:bg-[#6b55f0] sm:h-[34px] sm:flex-none sm:px-4 sm:text-[12px]">기간 검색</button>
                <button onClick={onReset} className="flex h-[32px] flex-1 items-center justify-center gap-1 rounded-[7px] border border-[#ddd8f4] px-2.5 text-[11px] font-semibold transition hover:border-[#7865ff] sm:h-[34px] sm:flex-none sm:px-3 sm:text-[12px]" style={{ color: "#111" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    초기화
                </button>
            </div>
        </div>
    );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
function ProfileContent() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();

    const initialTab = (() => {
        const t = searchParams.get("tab");
        if (t && STATUS_TABS.includes(t)) return t;
        return "전체";
    })();

    const [tab, setTab] = useState(initialTab);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [refundTarget, setRefundTarget] = useState<Order | null>(null);
    const [detailTarget, setDetailTarget] = useState<Order | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 6;

    const [initialDateRange] = useState(() => getDateRange(1));
    const [dateFrom, setDateFrom] = useState(initialDateRange.from);
    const [dateTo, setDateTo] = useState(initialDateRange.to);
    const [appliedFrom, setAppliedFrom] = useState(initialDateRange.from);
    const [appliedTo, setAppliedTo] = useState(initialDateRange.to);
    const [activeRange, setActiveRange] = useState("1개월");

    useEffect(() => {
        const t = searchParams.get("tab");
        if (t && STATUS_TABS.includes(t)) setTab(t);
    }, [searchParams]);

    useEffect(() => {
        if (!user?.uid) return;
        setLoading(true);
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, "users", user.uid!, "orders"), orderBy("createdAt", "desc")));
                setOrders(snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        ...data,
                        couponId: data.usedCouponId ?? data.couponId ?? null,
                        couponLabel: data.usedCouponLabel ?? data.couponLabel ?? null,
                        couponDiscount: data.couponDiscount ?? data.usedCouponDiscount ?? null,
                        date: toOrderDateLabel(getOrderCreatedDate(data.createdAt)),
                    };
                }) as Order[]);
            } catch (err) { console.error("[Orders]", err); }
            finally { setLoading(false); }
        })();
    }, [user?.uid]);

    // ── 취소 신청: 선택 아이템만 status="취소신청", order.status는 items 종합으로 결정
    const handleCancel = async (orderId: string, selectedProductIds: string[], reason: string) => {
        if (!user?.uid) return;
        const uid = user.uid;
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            // 아이템별 status 업데이트
            const updatedItems = order.items.map(item => ({
                ...item,
                status: selectedProductIds.includes(item.productId)
                    ? "취소신청" as ItemStatus
                    : (resolveItemStatus(item, order.status)),
            }));

            // 취소신청 아이템이 하나라도 있으면 order.status는 무조건 "처리중"
            // → 어드민 cancelOrders 필터(취소신청 아이템 기준) + Firestore where 쿼리 모두 정상 동작
            const hasCancelPending = updatedItems.some(i => i.status === "취소신청");
            const hasActive = updatedItems.some(i =>
                i.status && ["결제완료", "배송시작", "배송중", "배송완료"].includes(i.status)
            );
            const newOrderStatus = hasCancelPending
                ? "처리중"
                : hasActive ? order.status : "처리중";

            await updateDoc(doc(db, "users", uid, "orders", orderId), {
                items: updatedItems,
                status: newOrderStatus,
                cancelReason: reason,
                cancelledAt: serverTimestamp(),
                // 어드민이 어떤 productId 취소 승인해야 하는지 기록
                pendingCancelItems: selectedProductIds,
            });
            await saveStoreNotification(uid, {
                type: "cancel", title: "주문 취소 신청이 접수됐어요",
                body: `${selectedProductIds.length}개 상품 취소 신청 · 관리자 확인 후 처리돼요.`,
                link: "/store/profile?tab=교환환불/취소",
            });
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, items: updatedItems, status: newOrderStatus as Order["status"] } : o
            ));
        } catch (err) { console.error("[Cancel]", err); alert("취소 처리 중 오류가 발생했습니다."); }
    };

    // ── 환불 신청: 선택 아이템만 status="환불신청"
    const handleRefund = async (orderId: string, selectedProductIds: string[], reason: string, refundType: "제품하자" | "단순변심") => {
        if (!user?.uid) return;
        const uid = user.uid;
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const updatedItems = order.items.map(item => ({
                ...item,
                status: selectedProductIds.includes(item.productId)
                    ? "환불신청" as ItemStatus
                    : (resolveItemStatus(item, order.status)),
            }));

            const hasActive = updatedItems.some(i =>
                i.status && ["결제완료", "배송시작", "배송중", "배송완료"].includes(i.status)
            );
            const newOrderStatus = hasActive ? order.status : "교환환불신청";

            await updateDoc(doc(db, "users", uid, "orders", orderId), {
                items: updatedItems,
                status: newOrderStatus,
                refundReason: reason,
                refundType,
                refundRequestedAt: serverTimestamp(),
                pendingRefundItems: selectedProductIds,
            });
            await saveStoreNotification(uid, {
                type: "order", title: "교환/환불 신청이 완료됐어요",
                body: `[${refundType}] ${selectedProductIds.length}개 상품 · 영업일 기준 3~5일 내 처리돼요.`,
                link: "/store/profile?tab=교환환불/취소",
            });
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, items: updatedItems, status: newOrderStatus as Order["status"] } : o
            ));
        } catch (err) { console.error("[Refund]", err); alert("신청 처리 중 오류가 발생했습니다."); }
    };

    const applyDateRange = (label: string, months: number) => {
        const range = getDateRange(months);
        setDateFrom(range.from); setDateTo(range.to);
        setAppliedFrom(range.from); setAppliedTo(range.to);
        setActiveRange(label); setPage(1);
    };
    const applyCustomDateRange = () => {
        setAppliedFrom(dateFrom); setAppliedTo(dateTo);
        setActiveRange(""); setPage(1);
    };

    // 탭에 해당하는 아이템 상태 목록
    const TAB_ITEM_STATUSES: Record<string, ItemStatus[]> = {
        "배송중": ["결제완료", "배송시작", "배송중"],
        "배송완료": ["배송완료"],
        "교환환불/취소": ["취소신청", "취소완료", "환불신청", "환불완료"],
    };

    // 탭 필터: 아이템 단위로 보여줄 항목 계산
    // { order, visibleItems } 형태로 반환 — 같은 주문이 탭에 따라 다른 아이템 subset으로 표시됨
    const filteredEntries = useMemo(() => {
        const result: { order: Order; visibleItems: OrderItem[] }[] = [];
        for (const o of orders) {
            // 날짜 필터
            if (appliedFrom || appliedTo) {
                const orderDate = getOrderCreatedDate(o.createdAt);
                if (orderDate) {
                    if (appliedFrom && orderDate < new Date(appliedFrom)) continue;
                    if (appliedTo && orderDate > new Date(appliedTo + "T23:59:59")) continue;
                }
            }
            if (tab === "전체") {
                result.push({ order: o, visibleItems: o.items });
            } else {
                const allowedStatuses = TAB_ITEM_STATUSES[tab] ?? [];
                const visibleItems = o.items.filter(item =>
                    allowedStatuses.includes(resolveItemStatus(item, o.status))
                );
                if (visibleItems.length > 0) result.push({ order: o, visibleItems });
            }
        }
        return result;
    }, [orders, tab, appliedFrom, appliedTo]);

    const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
    const paginated = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // 주문카드에서 버튼 표시 여부: 아이템 단위 가능 여부
    const hasCancellable = (order: Order) => getCancellableItems(order).length > 0;
    const hasRefundable = (order: Order) => getRefundableItems(order).length > 0;

    return (
        <>
            <h2 className="mb-5 text-[18px] sm:text-[20px] font-bold text-[#16121f]">구매목록</h2>

            <div className="mb-5 flex items-center gap-3 sm:gap-6 border-b border-[#f0edf8] overflow-x-auto">
                {STATUS_TABS.map(t => (
                    <button key={t} onClick={() => { setTab(t); setPage(1); }}
                        className={`pb-3 text-[13px] font-semibold transition border-b-2 whitespace-nowrap ${tab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
                        {t}
                    </button>
                ))}
            </div>

            <DateRangeFilter
                dateFrom={dateFrom} dateTo={dateTo} activeRange={activeRange}
                onDateFromChange={setDateFrom} onDateToChange={setDateTo}
                onRangeClick={applyDateRange} onSearch={applyCustomDateRange}
                onReset={() => {
                    const range = getDateRange(1);
                    setDateFrom(range.from); setDateTo(range.to);
                    setAppliedFrom(range.from); setAppliedTo(range.to);
                    setActiveRange("1개월"); setPage(1);
                }}
            />

            {loading ? (
                <OrderLoading />
            ) : filteredEntries.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-[13px] text-[#9b94b2]">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg>
                    주문 내역이 없어요.
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-4">
                        {paginated.map(({ order, visibleItems }) => (
                            <div key={`${order.id}-${tab}`} className="rounded-[12px] border border-[#ebe8ff] p-3 sm:p-5">
                                {/* 주문일자 */}
                                <p className="mb-3 text-[12px] text-[#9b94b2]">{order.date}</p>
                                {/* 아이템 목록 */}
                                <div className="flex flex-col gap-3 mb-4">
                                    {visibleItems.map((item, i) => {
                                        const s = resolveItemStatus(item, order.status);
                                        const sl = ITEM_STATUS_LABEL[s];
                                        return (
                                            <Link key={i} href={item.productId}>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0eeff] sm:h-[56px] sm:w-[56px]">
                                                        {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-1 text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                                        <p className="text-[11px] text-[#9b94b2]">옵션 : {item.option}</p>
                                                        <p className="text-[12px] font-bold text-[#16121f]">{item.price.toLocaleString()}원</p>
                                                        <p className="text-[11px] text-[#9b94b2]">총 수량 : {item.qty}</p>
                                                    </div>
                                                    {/* 아이템별 상태 — 우측 고정 */}
                                                    <span className={`w-[48px] shrink-0 text-right text-[10px] font-bold sm:w-[52px] sm:text-[11px] ${sl?.color ?? "text-[#7865ff]"}`}>
                                                        {sl?.text ?? s}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                                {/* 하단: 금액 + 버튼 — 항상 같은 행에 정렬 */}
                                <div className="flex flex-col gap-3 border-t border-[#f0edf8] pt-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[16px] font-bold text-[#16121f]">
                                            {visibleItems.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}원
                                        </p>
                                        {tab === "전체" && (order.usedPoints ?? 0) > 0 && (
                                            <p className="text-[11px] text-[#9b94b2]">🪙 {order.usedPoints.toLocaleString()}원</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                        <button onClick={() => setDetailTarget(order)}
                                            className="rounded-[8px] border border-[#e2ddf5] px-3 py-1.5 text-[11px] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                                            상세 보기
                                        </button>
                                        {hasCancellable(order) && (
                                            <button onClick={() => setCancelTarget(order)}
                                                className="rounded-[8px] border border-[#ffb3c1] px-3 py-1.5 text-[11px] text-[#ff4d6d] hover:bg-[#fff0f3] transition">
                                                주문 취소
                                            </button>
                                        )}
                                        {!hasCancellable(order) && hasShippingStartedItems(order) && (
                                            <button onClick={() => alert("배송이 시작된 후엔 취소가 불가능합니다.")}
                                                className="rounded-[8px] border border-[#e2ddf5] px-3 py-1.5 text-[11px] text-[#c0bcd0] cursor-not-allowed">
                                                주문 취소
                                            </button>
                                        )}
                                        {hasRefundable(order) && (
                                            <button onClick={() => setRefundTarget(order)}
                                                className="rounded-[8px] border border-[#ddd8f4] px-3 py-1.5 text-[11px] text-[#6b647a] hover:border-[#d97706] hover:text-[#d97706] transition">
                                                교환 / 환불 신청
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            {(() => {
                                const PAGE_GROUP = 6;
                                const groupIndex = Math.floor((page - 1) / PAGE_GROUP);
                                const groupStart = groupIndex * PAGE_GROUP + 1;
                                const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, totalPages);
                                const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
                                return (
                                    <>
                                        {groupStart > 1 && <button onClick={() => setPage(groupStart - 1)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]">···</button>}
                                        {pages.map(n => (
                                            <button key={n} onClick={() => setPage(n)}
                                                className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-medium transition sm:h-10 sm:w-10 sm:text-[14px] ${page === n ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]" : "border border-[#d8d4ee] bg-white text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                                                {n}
                                            </button>
                                        ))}
                                        {groupEnd < totalPages && <button onClick={() => setPage(groupEnd + 1)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]">···</button>}
                                    </>
                                );
                            })()}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </div>
                    )}
                </>
            )}

            {detailTarget && <OrderDetailPopup order={detailTarget} onClose={() => setDetailTarget(null)} />}
            {cancelTarget && <CancelPopup order={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />}
            {refundTarget && <RefundPopup order={refundTarget} onClose={() => setRefundTarget(null)} onConfirm={handleRefund} />}
        </>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="flex h-[200px] items-center justify-center text-[13px] text-[#9b94b2]">불러오는 중...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
