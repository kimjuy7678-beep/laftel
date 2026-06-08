"use client";

// app/store/profile/page.tsx

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp, getDoc, setDoc, increment, addDoc } from "firebase/firestore";
import { saveStoreNotification } from "@/utils/storeNotification";

type OrderItem = {
    productId: string;
    title: string;
    thumbnail: string;
    option: string;
    price: number;
    qty: number;
};

type Order = {
    id: string;
    date: string;
    status: "결제완료" | "배송시작" | "배송중" | "배송완료" | "처리중" | "주문취소" | "교환환불신청" | "환불완료";
    items: OrderItem[];
    total: number;
    usedPoints: number;
    couponId?: string;
    couponDiscount?: number;
    createdAt: any;
    cancelReason?: string;
    refundReason?: string;
    refundType?: "제품하자" | "단순변심";
};

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
};

const CANCEL_REASONS = ["단순 변심", "상품 불량/파손", "배송 지연", "주문 실수", "기타"];

// ─── 주문취소 팝업 ─────────────────────────────────────────────────────────────
function CancelPopup({ order, onClose, onConfirm }: {
    order: Order;
    onClose: () => void;
    onConfirm: (orderId: string, selectedIds: string[], reason: string) => Promise<void>;
}) {
    const [selected, setSelected] = useState<string[]>([]);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const toggle = (productId: string) =>
        setSelected(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);

    const selectedItems = order.items.filter(i => selected.includes(i.productId));
    const refundAmount = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const discount = order.usedPoints;

    const handleConfirm = async () => {
        if (selected.length === 0) { alert("취소할 상품을 선택해주세요."); return; }
        if (!reason) { alert("취소 사유를 선택해주세요."); return; }
        setLoading(true);
        await onConfirm(order.id, selected, reason);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="relative w-[480px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[22px] font-bold text-[#7865ff]">주문 취소</h2>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eeff] text-[#9b94b2] hover:bg-[#e0daf7] hover:text-[#7865ff] transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mb-5 rounded-[16px] bg-[#f0eeff] p-4 flex flex-col gap-4">
                    {order.items.map(item => (
                        <div key={item.productId} className="flex items-center gap-3">
                            <button onClick={() => toggle(item.productId)}
                                className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${selected.includes(item.productId) ? "bg-[#7865ff] border-[#7865ff]" : "bg-white border-[#d8d4ee]"}`}>
                                {selected.includes(item.productId) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                            </button>
                            <div className="h-[90px] w-[90px] shrink-0 overflow-hidden rounded-[10px] bg-[#e8e4f8]">
                                {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                            </div>
                            <div>
                                <p className="line-clamp-1 text-[14px] font-medium text-[#16121f]">{item.title}</p>
                                <p className="text-[12px] text-[#9b94b2]">옵션 : {item.option}</p>
                                <p className="mt-1 text-[15px] font-bold text-[#16121f]">{item.price.toLocaleString()}원</p>
                                <p className="text-[12px] text-[#9b94b2]">총 수량 : {item.qty}</p>
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
                <div className="mb-5 text-[13px] text-[#6b647a]">
                    <p>결제금액 : {order.total.toLocaleString()}원</p>
                    <p>할인금액 제외 : -{discount.toLocaleString()}원</p>
                </div>
                <div className="mb-6 text-center">
                    <p className="text-[14px] text-[#9b94b2]">환불금액 :</p>
                    <p className="text-[28px] font-bold text-[#7865ff]">{Math.max(0, refundAmount - discount).toLocaleString()}원</p>
                </div>
                <button onClick={handleConfirm} disabled={loading}
                    className="w-full h-[44px] rounded-[12px] border border-[#ddd8f4] text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff] disabled:opacity-50">
                    {loading ? "처리 중..." : "취소 신청"}
                </button>
            </div>
        </div>
    );
}

// ─── 교환/환불 신청 팝업 ───────────────────────────────────────────────────────
function RefundPopup({ order, onClose, onConfirm }: {
    order: Order;
    onClose: () => void;
    onConfirm: (orderId: string, reason: string, refundType: "제품하자" | "단순변심") => Promise<void>;
}) {
    const [refundType, setRefundType] = useState<"제품하자" | "단순변심" | "">("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const DEFECT_REASONS = ["제품 불량/파손", "오배송", "상품 정보 상이", "기타 하자"];
    const CHANGE_REASONS = ["단순 변심", "사이즈/색상 불만족", "다른 상품 구매", "기타"];

    const reasons = refundType === "제품하자" ? DEFECT_REASONS : refundType === "단순변심" ? CHANGE_REASONS : [];

    const handleConfirm = async () => {
        if (!refundType) { alert("신청 유형을 선택해주세요."); return; }
        if (!reason) { alert("사유를 선택해주세요."); return; }
        setLoading(true);
        await onConfirm(order.id, reason, refundType);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="relative w-[440px] rounded-[20px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[20px] font-bold text-[#d97706]">교환 / 환불 신청</h2>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff8e6] text-[#9b94b2] hover:bg-[#fde68a]/40 hover:text-[#d97706] transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* 안내 */}
                <div className="mb-4 rounded-[12px] bg-[#fff8e6] border border-[#fde68a]/60 px-4 py-3">
                    <p className="text-[12px] text-[#d97706] font-medium">수령 후 7일 이내에만 신청 가능해요.</p>
                    <p className="text-[11px] text-[#d97706]/70 mt-0.5">단순변심의 경우 왕복 배송비가 부과될 수 있어요.</p>
                </div>

                {/* 상품 요약 */}
                <div className="mb-5 flex flex-col gap-2">
                    {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0eeff]">
                                {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                            </div>
                            <div className="min-w-0">
                                <p className="line-clamp-1 text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                <p className="text-[11px] text-[#9b94b2]">{item.option} · {item.qty}개</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 유형 선택 */}
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

                {/* 사유 선택 */}
                {refundType && (
                    <div className="mb-5 relative">
                        <select value={reason} onChange={e => setReason(e.target.value)}
                            className={`w-full h-[48px] appearance-none rounded-[12px] border bg-white px-4 text-[13px] text-[#3d3755] outline-none cursor-pointer transition ${refundType === "제품하자" ? "border-[#ddd8f4] focus:border-[#d97706]" : "border-[#ddd8f4] focus:border-[#7865ff]"}`}>
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
                    <button onClick={onClose}
                        className="flex-1 h-[44px] rounded-[12px] border border-[#ddd8f4] text-[13px] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                        취소
                    </button>
                    <button onClick={handleConfirm} disabled={loading || !refundType}
                        className="flex-1 h-[44px] rounded-[12px] bg-[#d97706] text-[13px] font-semibold text-white hover:bg-[#b45309] transition disabled:opacity-50">
                        {loading ? "신청 중..." : "신청하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user } = useAuthStore();
    const [tab, setTab] = useState("전체");
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [refundTarget, setRefundTarget] = useState<Order | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 6;
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [appliedFrom, setAppliedFrom] = useState("");
    const [appliedTo, setAppliedTo] = useState("");

    useEffect(() => {
        if (!user?.uid) { setLoading(false); return; }
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, "users", user.uid!, "orders"), orderBy("createdAt", "desc")));
                setOrders(snap.docs.map(d => ({
                    id: d.id, ...d.data(),
                    date: d.data().createdAt?.toDate?.()?.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) ?? "-",
                })) as Order[]);
            } catch (err) { console.error("[Orders]", err); }
            finally { setLoading(false); }
        })();
    }, [user?.uid]);

    useEffect(() => { setPage(1); setAppliedFrom(""); setAppliedTo(""); setDateFrom(""); setDateTo(""); }, [tab]);

    // ── 주문 취소 → "처리중" 상태로 저장 (관리자 확인 후 주문취소로 변경) ──────
    const handleCancel = async (orderId: string, selectedIds: string[], reason: string) => {
        if (!user?.uid) return;
        const uid = user.uid;
        try {
            const order = orders.find(o => o.id === orderId);
            await updateDoc(doc(db, "users", uid, "orders", orderId), {
                status: "처리중",
                cancelReason: reason,
                cancelledItems: selectedIds,
                cancelledAt: serverTimestamp(),
            });

            // 포인트 환불 (즉시)
            if (order?.usedPoints && order.usedPoints > 0) {
                await setDoc(doc(db, "users", uid), { points: increment(order.usedPoints) }, { merge: true });
                await addDoc(collection(db, "users", uid, "pointHistory"), {
                    amount: order.usedPoints, type: "earn",
                    description: "주문 취소 포인트 환불", label: "주문 취소 포인트 환불", createdAt: new Date(),
                });
            }

            // 쿠폰 복원
            if (order?.couponId) {
                const couponRef = doc(db, "users", uid, "coupons", order.couponId);
                const couponSnap = await getDoc(couponRef);
                if (couponSnap.exists() && couponSnap.data().status === "used") {
                    await updateDoc(couponRef, { status: "active", usedAt: null, usedOrderId: null });
                }
            }

            await saveStoreNotification(uid, {
                type: "order",
                title: "주문 취소 신청이 접수됐어요",
                body: `사유: ${reason} · 관리자 확인 후 처리돼요.`,
                link: "/store/profile",
            });

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "처리중" } : o));
        } catch (err) {
            console.error("[Cancel]", err);
            alert("취소 처리 중 오류가 발생했습니다.");
        }
    };

    // ── 교환/환불 신청 ─────────────────────────────────────────────────────────
    const handleRefund = async (orderId: string, reason: string, refundType: "제품하자" | "단순변심") => {
        if (!user?.uid) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "orders", orderId), {
                status: "교환환불신청",
                refundReason: reason,
                refundType,
                refundRequestedAt: serverTimestamp(),
            });
            await saveStoreNotification(user.uid, {
                type: "order",
                title: "교환/환불 신청이 완료됐어요",
                body: `[${refundType}] ${reason} · 영업일 기준 3~5일 내 처리돼요.`,
                link: "/store/profile",
            });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "교환환불신청" } : o));
        } catch (err) {
            console.error("[Refund]", err);
            alert("신청 처리 중 오류가 발생했습니다.");
        }
    };

    const canCancel = (status: string) => status === "결제완료" || status === "배송시작";
    const canRefund = (status: string) => status === "배송완료";

    const filtered = orders.filter(o => {
        if (tab === "배송중" && !(o.status === "결제완료" || o.status === "배송시작" || o.status === "배송중")) return false;
        if (tab === "배송완료" && o.status !== "배송완료") return false;
        if (tab === "교환환불" && !(o.status === "처리중" || o.status === "주문취소" || o.status === "교환환불신청" || o.status === "환불완료")) return false;
        if (appliedFrom || appliedTo) {
            const orderDate = o.createdAt?.toDate?.() as Date | undefined;
            if (!orderDate) return false;
            if (appliedFrom && orderDate < new Date(appliedFrom)) return false;
            if (appliedTo && orderDate > new Date(appliedTo + "T23:59:59")) return false;
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <>
            <h2 className="mb-5 text-[20px] font-bold text-[#16121f]">구매목록</h2>

            {/* 탭 */}
            <div className="mb-5 flex items-center gap-6 border-b border-[#f0edf8]">
                {STATUS_TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`pb-3 text-[13px] font-semibold transition border-b-2 ${tab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
                        {t}
                    </button>
                ))}
            </div>

            {/* 날짜 검색 */}
            <div className="mb-5 flex items-center gap-2 flex-wrap">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="h-[36px] rounded-[8px] border border-[#ddd8f4] px-3 text-[12px] outline-none focus:border-[#7865ff]" />
                <span className="text-[#9b94b2]">~</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="h-[36px] rounded-[8px] border border-[#ddd8f4] px-3 text-[12px] outline-none focus:border-[#7865ff]" />
                <button onClick={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); setPage(1); }}
                    className="h-[36px] rounded-[8px] bg-[#7865ff] px-4 text-[12px] font-semibold text-white hover:bg-[#6b55f0] transition">
                    기간 검색
                </button>
                {(appliedFrom || appliedTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); setAppliedFrom(""); setAppliedTo(""); setPage(1); }}
                        className="h-[36px] rounded-[8px] border border-[#ddd8f4] px-3 text-[12px] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                        초기화
                    </button>
                )}
            </div>

            {/* 주문 목록 */}
            {loading ? (
                <div className="flex h-[200px] items-center justify-center text-[13px] text-[#9b94b2]">불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-[13px] text-[#9b94b2]">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg>
                    주문 내역이 없어요.
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-4">
                        {paginated.map(order => (
                            <div key={order.id} className="rounded-[12px] border border-[#ebe8ff] p-5">
                                <div className="flex gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="mb-3 text-[12px] text-[#9b94b2]">{order.date}</p>
                                        {order.items.map((item, i) => (
                                            <div key={i} className="mb-3 flex items-center gap-3">
                                                <div className="h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[8px] bg-[#f0eeff]">
                                                    {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="line-clamp-1 text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                                    <p className="text-[11px] text-[#9b94b2]">옵션 : {item.option}</p>
                                                    <p className="text-[12px] font-bold text-[#16121f]">{item.price.toLocaleString()}원</p>
                                                    <p className="text-[11px] text-[#9b94b2]">총 수량 : {item.qty}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={`mb-1 text-[13px] font-bold ${STATUS_COLOR[order.status] ?? "text-[#7865ff]"}`}>{order.status}</p>
                                        {/* 처리중 안내 */}
                                        {order.status === "처리중" && (
                                            <p className="text-[10px] text-[#f59e0b] mb-1">관리자 확인 중</p>
                                        )}
                                        {/* 교환환불 타입 뱃지 */}
                                        {order.status === "교환환불신청" && order.refundType && (
                                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${order.refundType === "제품하자" ? "bg-[#fff8e6] text-[#d97706]" : "bg-[#f0eeff] text-[#7865ff]"}`}>
                                                {order.refundType}
                                            </span>
                                        )}
                                        <p className="text-[17px] font-bold text-[#16121f]">{order.total.toLocaleString()}원</p>
                                        {order.usedPoints > 0 && <p className="text-[11px] text-[#9b94b2]">🪙 {order.usedPoints.toLocaleString()}원</p>}
                                        <div className="mt-2 flex flex-col gap-1.5 items-end">
                                            {canCancel(order.status) && (
                                                <button onClick={() => setCancelTarget(order)}
                                                    className="rounded-[8px] border border-[#ffb3c1] px-3 py-1 text-[11px] text-[#ff4d6d] hover:bg-[#fff0f3] transition">
                                                    주문 취소
                                                </button>
                                            )}
                                            {canRefund(order.status) && (
                                                <button onClick={() => setRefundTarget(order)}
                                                    className="rounded-[8px] border border-[#ddd8f4] px-3 py-1 text-[11px] text-[#6b647a] hover:border-[#d97706] hover:text-[#d97706] transition">
                                                    교환 / 환불 신청
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0daf7] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] disabled:opacity-30 transition">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} onClick={() => setPage(n)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition ${page === n ? "bg-[#7865ff] text-white" : "border border-[#e0daf7] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                    {n}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0daf7] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] disabled:opacity-30 transition">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </div>
                    )}
                </>
            )}

            {cancelTarget && <CancelPopup order={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />}
            {refundTarget && <RefundPopup order={refundTarget} onClose={() => setRefundTarget(null)} onConfirm={handleRefund} />}
        </>
    );
}