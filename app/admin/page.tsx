"use client";

// app/store/admin/page.tsx

import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase/firebase";
import {
    collection, getDocs, query, orderBy,
    doc, updateDoc, getDoc, setDoc, addDoc, serverTimestamp, where, increment
} from "firebase/firestore";
import { saveStoreNotification } from "@/utils/storeNotification";

const ADMIN_ID = "laftel";
const ADMIN_PW = "000";
const PAGE_SIZE = 20;

type ItemStatus =
    | "결제완료" | "배송시작" | "배송중" | "배송완료"
    | "취소신청" | "취소완료" | "환불신청" | "환불완료";

type InquiryStatus = "답변대기" | "답변완료";
type AdminTab = "문의관리" | "배송관리" | "주문취소" | "환불관리";

interface Inquiry {
    id: string; uid: string; category: string; title: string; content: string;
    status: InquiryStatus; answer?: string; answeredAt?: any; createdAt: any;
    date: string; userEmail: string; userNickname: string;
}

interface OrderItem {
    productId: string;
    title: string;
    thumbnail?: string;
    option: string;
    qty: number;
    price: number;
    status?: ItemStatus;
}

interface Order {
    id: string; uid: string; status: string;
    items: OrderItem[];
    total: number; createdAt: any; date: string;
    cancelReason?: string; refundReason?: string;
    refundType?: string;
    userEmail: string; userNickname: string;
    usedPoints?: number;
    usedCouponId?: string;
    couponId?: string;
    couponDiscount?: number; // 쿠폰으로 할인된 총액
    // 낱개 처리용: 어떤 productId가 대기 중인지
    pendingCancelItems?: string[];
    pendingRefundItems?: string[];
}

// ─── 아이템 상태 유틸 ────────────────────────────────────────────────────────
function resolveItemStatus(item: OrderItem, orderStatus: string): ItemStatus {
    if (item.status) return item.status;
    if (orderStatus === "주문취소") return "취소완료";
    if (orderStatus === "환불완료") return "환불완료";
    if (orderStatus === "교환환불신청") return "환불신청";
    if (orderStatus === "처리중") return "취소신청";
    return orderStatus as ItemStatus;
}

/**
 * 특정 아이템들에 대한 쿠폰 할인 비례 계산
 * 쿠폰 할인율(%) = couponDiscount / 전체 소계
 * 아이템별 쿠폰 할인 = 아이템 금액 × 할인율
 * → 부분 취소 시 환불액 = 아이템 금액 합계 - 해당 아이템 쿠폰 할인액
 */
function calcCouponDiscountForItems(
    targetItems: OrderItem[],
    allItems: OrderItem[],
    couponDiscount: number
): number {
    if (!couponDiscount || couponDiscount <= 0) return 0;
    const subtotal = allItems.reduce((s, i) => s + i.price * i.qty, 0);
    if (subtotal <= 0) return 0;
    const couponRate = couponDiscount / subtotal; // 할인율
    return Math.round(
        targetItems.reduce((s, i) => s + i.price * i.qty * couponRate, 0)
    );
}

// ─── 쿠폰 복원 헬퍼 ──────────────────────────────────────────────────────────
async function restoreCouponIfUsed(uid: string, couponId?: string | null) {
    if (!couponId) return;
    try {
        const couponRef = doc(db, "users", uid, "coupons", couponId);
        const snap = await getDoc(couponRef);
        if (snap.exists() && snap.data().status === "used") {
            await updateDoc(couponRef, { status: "active", usedAt: null, usedOrderId: null });
        }
    } catch (err) { console.error("[CouponRestore]", err); }
}

// ─── 포인트 환불 헬퍼 ────────────────────────────────────────────────────────
async function refundPoints(uid: string, points: number, label: string) {
    if (!points || points <= 0) return;
    await setDoc(doc(db, "users", uid), { points: increment(points) }, { merge: true });
    await addDoc(collection(db, "users", uid, "pointHistory"), {
        amount: points, type: "earn", description: label, label, createdAt: new Date(),
    });
}

// ─── 로그인 화면 ──────────────────────────────────────────────────────────────
function LoginView({ onLogin }: { onLogin: () => void }) {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const [error, setError] = useState("");

    const handleLogin = () => {
        if (!id || !pw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
        if (id === ADMIN_ID && pw === ADMIN_PW) { onLogin(); }
        else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); }
    };

    return (
        <div className="min-h-screen bg-[#f5f3ff] flex items-center justify-center px-4">
            <div className="w-full max-w-[400px] bg-white rounded-[24px] border border-[#ebe8ff] shadow-xl overflow-hidden">
                <div className="bg-[#7865ff] px-8 py-8 text-center">
                    <span className="inline-block text-[11px] font-bold bg-white/20 text-white px-3 py-1 rounded-full mb-3">ADMIN</span>
                    <h1 className="text-[22px] font-extrabold text-white">라프텔 스토어</h1>
                    <p className="text-[13px] text-white/70 mt-1">관리자 전용</p>
                </div>
                <div className="px-8 py-8 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-[#6b647a]">아이디</label>
                        <input type="text" value={id} onChange={e => setId(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="관리자 아이디"
                            className="h-11 rounded-[10px] border border-[#e2ddf5] px-4 text-[13px] outline-none focus:border-[#7865ff] transition" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-[#6b647a]">비밀번호</label>
                        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••"
                            className="h-11 rounded-[10px] border border-[#e2ddf5] px-4 text-[13px] outline-none focus:border-[#7865ff] transition" />
                    </div>
                    {error && <p className="text-[12px] text-[#ff4d6d]">{error}</p>}
                    <button onClick={handleLogin}
                        className="mt-2 h-12 rounded-[12px] bg-[#7865ff] text-[14px] font-bold text-white hover:bg-[#6b55f0] transition">
                        로그인
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 유저 뱃지 ───────────────────────────────────────────────────────────────
function UserBadge({ email, nickname }: { email: string; nickname: string }) {
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ede9ff] text-[10px] font-bold text-[#7865ff] shrink-0">
                {(nickname || email)?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="hidden md:flex flex-col leading-tight">
                {nickname && <span className="text-[11px] font-semibold text-[#6b647a]">{nickname}</span>}
                <span className="text-[10px] text-[#c0bcd0]">{email}</span>
            </div>
        </div>
    );
}

// ─── 답변 모달 ───────────────────────────────────────────────────────────────
function AnswerModal({ inquiry, onClose, onSave }: {
    inquiry: Inquiry; onClose: () => void; onSave: (a: string) => Promise<void>;
}) {
    const [answer, setAnswer] = useState(inquiry.answer ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (answer.trim().length < 5) { setError("답변을 5자 이상 입력해주세요."); return; }
        setLoading(true);
        try { await onSave(answer.trim()); onClose(); }
        catch { setError("저장 중 오류가 발생했어요."); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-[560px] bg-white rounded-[20px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-[#f0edf8] px-6 py-5">
                    <div>
                        <h3 className="text-[15px] font-bold text-[#16121f]">답변 작성</h3>
                        <p className="mt-0.5 text-[12px] text-[#9b94b2] truncate max-w-[380px]">{inquiry.title}</p>
                    </div>
                    <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2ddf5] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#faf9ff] border border-[#ebe8ff]">
                        <UserBadge email={inquiry.userEmail} nickname={inquiry.userNickname} />
                        <span className="text-[11px] text-[#9b94b2]">의 문의</span>
                    </div>
                    <div className="rounded-[12px] bg-[#faf9ff] border border-[#ebe8ff] px-4 py-3">
                        <p className="mb-1.5 text-[11px] font-bold text-[#9b94b2]">고객 문의</p>
                        <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap line-clamp-6">{inquiry.content}</p>
                    </div>
                    <div>
                        <p className="mb-2 text-[12px] font-semibold text-[#6b647a]">답변 내용</p>
                        <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                            placeholder="고객에게 전달할 답변을 입력해주세요." rows={6}
                            className="w-full resize-none rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-3 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition" />
                        <p className="mt-1 text-right text-[11px] text-[#c0bcd0]">{answer.length}자</p>
                    </div>
                    {error && <p className="text-[12px] text-[#ff4d6d]">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <button onClick={onClose} className="flex-1 h-[42px] rounded-[10px] border border-[#e2ddf5] text-[13px] font-semibold text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition">취소</button>
                        <button onClick={handleSave} disabled={loading} className="flex-1 h-[42px] rounded-[10px] bg-[#7865ff] text-[13px] font-semibold text-white hover:bg-[#6b55f0] disabled:opacity-50 transition">{loading ? "저장 중..." : "답변 등록"}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 문의 카드 ───────────────────────────────────────────────────────────────
function InquiryRow({ inquiry, onAnswer }: { inquiry: Inquiry; onAnswer: (i: Inquiry) => void }) {
    const [open, setOpen] = useState(false);
    const isPending = inquiry.status === "답변대기";
    return (
        <div className={`rounded-[12px] border overflow-hidden ${isPending ? "border-[#ebe8ff]" : "border-[#f0f0f0]"}`}>
            <button onClick={() => setOpen(v => !v)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition ${isPending ? "bg-white hover:bg-[#faf9ff]" : "bg-[#fafafa] hover:bg-[#f5f5f5]"}`}>
                <span className="shrink-0 rounded-[6px] bg-[#f0eeff] px-2.5 py-1 text-[11px] font-bold text-[#7865ff]">{inquiry.category}</span>
                <p className={`flex-1 min-w-0 truncate text-[13px] font-semibold ${isPending ? "text-[#16121f]" : "text-[#888]"}`}>{inquiry.title}</p>
                <UserBadge email={inquiry.userEmail} nickname={inquiry.userNickname} />
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isPending ? "bg-[#fff8e6] text-[#d97706]" : "bg-[#f0eeff] text-[#7865ff]"}`}>{inquiry.status}</span>
                <span className="shrink-0 text-[11px] text-[#9b94b2] hidden sm:block">{inquiry.date}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2" className="shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div className="border-t border-[#f0edf8]">
                    <div className="px-5 py-4 bg-[#faf9ff]">
                        <p className="mb-1.5 text-[11px] font-bold text-[#9b94b2]">고객 문의</p>
                        <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap">{inquiry.content}</p>
                    </div>
                    {inquiry.status === "답변완료" && inquiry.answer ? (
                        <div className="px-5 py-4 bg-[#f0eeff] border-t border-[#e8e2ff]">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-[#7865ff]">라프텔 스토어 답변</p>
                                <button onClick={() => onAnswer(inquiry)} className="text-[11px] text-[#9b94b2] hover:text-[#7865ff] transition underline underline-offset-2">수정</button>
                            </div>
                            <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap">{inquiry.answer}</p>
                        </div>
                    ) : (
                        <div className="px-5 py-4 border-t border-[#f0edf8] flex items-center justify-between">
                            <p className="text-[12px] text-[#d97706]">아직 답변이 등록되지 않았어요.</p>
                            <button onClick={() => onAnswer(inquiry)} className="flex items-center gap-1.5 h-[34px] px-4 rounded-[8px] bg-[#7865ff] text-[12px] font-semibold text-white hover:bg-[#6b55f0] transition">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                답변 달기
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── 배송 카드 ───────────────────────────────────────────────────────────────
function ShippingRow({ order, onAction }: {
    order: Order;
    onAction: (order: Order, type: "shipping_start" | "shipping_complete") => void;
}) {
    const [open, setOpen] = useState(false);

    const CANCEL_REFUND_S = ["취소신청", "취소완료", "환불신청", "환불완료"];
    // 배송 가능한 아이템만
    const shippableItems = order.items.filter(item => {
        const s = resolveItemStatus(item, order.status);
        return !CANCEL_REFUND_S.includes(s);
    });
    // 버튼 조건: 배송 가능 아이템 기준
    const hasReadyToShip = shippableItems.some(i => resolveItemStatus(i, order.status) === "결제완료");
    const hasInProgress = shippableItems.some(i => ["배송시작", "배송중"].includes(resolveItemStatus(i, order.status)));
    const allShipDone = shippableItems.length > 0 && shippableItems.every(i => resolveItemStatus(i, order.status) === "배송완료");

    const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
        "결제완료": { label: "결제완료", color: "#7865ff", bg: "#f0eeff" },
        "배송시작": { label: "배송시작", color: "#3b82f6", bg: "#eff6ff" },
        "배송중": { label: "배송중", color: "#3b82f6", bg: "#eff6ff" },
        "배송완료": { label: "배송완료", color: "#16a34a", bg: "#f0fdf4" },
    };
    // 대표 상태: 배송 가능 아이템 중 가장 앞선 상태
    const repStatus = hasReadyToShip ? "결제완료" : hasInProgress ? "배송시작" : allShipDone ? "배송완료" : order.status;
    const s = STATUS_LABEL[repStatus] ?? { label: repStatus, color: "#888", bg: "#f5f5f5" };
    const isDone = allShipDone;

    // 헤더 상품명: 배송 가능 아이템 기준
    const firstShippable = shippableItems[0];

    return (
        <div className={`rounded-[12px] border overflow-hidden ${isDone ? "border-[#f0f0f0]" : "border-[#ebe8ff]"}`}>
            <button onClick={() => setOpen(v => !v)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition ${isDone ? "bg-[#fafafa] hover:bg-[#f5f5f5]" : "bg-white hover:bg-[#faf9ff]"}`}>
                <div className="flex-1 min-w-0">
                    <p className={`truncate text-[13px] font-semibold ${isDone ? "text-[#888]" : "text-[#16121f]"}`}>
                        {firstShippable?.title ?? order.items?.[0]?.title ?? "상품명 없음"}
                        {shippableItems.length > 1 && <span className="ml-1 text-[11px] text-[#9b94b2]">외 {shippableItems.length - 1}건</span>}
                    </p>
                </div>
                <UserBadge email={order.userEmail} nickname={order.userNickname} />
                <span className="shrink-0 text-[13px] font-bold text-[#7865ff]">{order.total?.toLocaleString()}원</span>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                <span className="shrink-0 text-[11px] text-[#9b94b2] hidden sm:block">{order.date}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2" className="shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
                <div className="border-t border-[#f0edf8] px-5 py-4 bg-[#faf9ff] flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[12px] text-[#6b647a]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        <span className="font-semibold">{order.userNickname || "-"}</span>
                        <span className="text-[#c0bcd0]">{order.userEmail}</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-[#9b94b2] mb-1.5">주문 상품</p>
                        <div className="flex flex-col gap-1.5">
                            {order.items?.map((item, i) => {
                                const itemStatus = resolveItemStatus(item, order.status);
                                const isCancelledOrRefunded = CANCEL_REFUND_S.includes(itemStatus);
                                return (
                                    <div key={i} className={`flex items-center gap-2 text-[13px] ${isCancelledOrRefunded ? "text-[#bbb]" : "text-[#3d3755]"}`}>
                                        <span className={isCancelledOrRefunded ? "text-[#ddd]" : "text-[#c0bcd0]"}>·</span>
                                        <span className={isCancelledOrRefunded ? "line-through" : ""}>{item.title}</span>
                                        {item.option && item.option !== "기본" && <span className="text-[#c0bcd0]">({item.option})</span>}
                                        <span className="text-[#c0bcd0]">{item.qty}개</span>
                                        <span className={`ml-auto font-semibold ${isCancelledOrRefunded ? "text-[#bbb] line-through" : "text-[#7865ff]"}`}>{item.price?.toLocaleString()}원</span>
                                        {isCancelledOrRefunded && (
                                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#f5f5f5] text-[#888]">환불처리</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[13px] border-t border-[#ebe8ff] pt-3">
                        <span className="text-[#9b94b2]">총 결제금액</span>
                        <span className="font-bold text-[#16121f]">{order.total?.toLocaleString()}원</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                        {hasReadyToShip && (
                            <button onClick={() => onAction(order, "shipping_start")}
                                className="flex items-center gap-1.5 h-[34px] px-4 rounded-[8px] bg-[#3b82f6] text-[12px] font-semibold text-white hover:bg-[#2563eb] transition">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" /><rect x="9" y="11" width="14" height="10" rx="1" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></svg>
                                배송 시작
                            </button>
                        )}
                        {hasInProgress && (
                            <button onClick={() => onAction(order, "shipping_complete")}
                                className="flex items-center gap-1.5 h-[34px] px-4 rounded-[8px] bg-[#16a34a] text-[12px] font-semibold text-white hover:bg-[#15803d] transition">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                배송 완료 처리
                            </button>
                        )}
                        {isDone && !hasReadyToShip && !hasInProgress && (
                            <span className="text-[12px] text-[#16a34a] flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                배송 완료
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── ITEM_STATUS_BADGE ───────────────────────────────────────────────────────
const ITEM_STATUS_BADGE: Record<string, { text: string; color: string; bg: string }> = {
    "결제완료": { text: "결제완료", color: "#7865ff", bg: "#f0eeff" },
    "배송시작": { text: "배송시작", color: "#3b82f6", bg: "#eff6ff" },
    "배송중": { text: "배송중", color: "#3b82f6", bg: "#eff6ff" },
    "배송완료": { text: "배송완료", color: "#16a34a", bg: "#f0fdf4" },
    "취소신청": { text: "취소신청", color: "#f59e0b", bg: "#fff8e6" },
    "취소완료": { text: "취소완료", color: "#888", bg: "#f5f5f5" },
    "환불신청": { text: "환불신청", color: "#d97706", bg: "#fff8e6" },
    "환불완료": { text: "환불완료", color: "#16a34a", bg: "#f0fdf4" },
};

// ─── 주문 카드 (취소/환불) ────────────────────────────────────────────────────
function OrderRow({ order, onAction, filterItemStatus }: {
    order: Order;
    onAction: (order: Order, type: "cancel_confirm" | "refund_complete", targetProductIds?: string[]) => void;
    filterItemStatus?: ItemStatus; // 이 상태 아이템만 표시 (환불완료 탭용)
}) {
    const [open, setOpen] = useState(false);

    // 낱개 단위 pending 아이템 목록
    const pendingCancelItems = order.items.filter(item =>
        resolveItemStatus(item, order.status) === "취소신청"
    );
    const pendingRefundItems = order.items.filter(item =>
        resolveItemStatus(item, order.status) === "환불신청"
    );
    const hasPendingCancel = pendingCancelItems.length > 0;
    const hasPendingRefund = pendingRefundItems.length > 0;
    const isAllDone = !hasPendingCancel && !hasPendingRefund;

    // 카드 테두리/배경
    const cardBorder = isAllDone ? "border-[#f0f0f0]" : "border-[#ebe8ff]";
    const cardBg = isAllDone ? "bg-[#fafafa] hover:bg-[#f5f5f5]" : "bg-white hover:bg-[#faf9ff]";

    // 대표 상태 텍스트 (헤더용)
    const repStatus = hasPendingCancel && hasPendingRefund ? "취소·환불 혼재"
        : hasPendingCancel ? `취소신청 ${pendingCancelItems.length}건`
            : hasPendingRefund ? `환불신청 ${pendingRefundItems.length}건`
                : "처리완료";
    const repColor = isAllDone ? "#888" : hasPendingCancel ? "#f59e0b" : "#d97706";
    const repBg = isAllDone ? "#f5f5f5" : "#fff8e6";

    // pending 아이템 목록
    const pendingProductIds = [
        ...pendingCancelItems.map(i => i.productId),
        ...pendingRefundItems.map(i => i.productId),
    ];
    const pendingItemObjs = order.items.filter(i => pendingProductIds.includes(i.productId));
    const pendingTotal = pendingItemObjs.reduce((s, i) => s + i.price * i.qty, 0);
    const orderTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);

    // 포인트: 비례 계산
    const pointRatio = orderTotal > 0 ? pendingTotal / orderTotal : 0;
    const restorePoints = Math.round((order.usedPoints ?? 0) * pointRatio);

    // 쿠폰: 전체 아이템이 모두 취소/환불 pending이면 전체 복원, 아니면 비례 할인 반영
    const allPending = order.items.every(item => {
        const s = resolveItemStatus(item, order.status);
        return ["취소신청", "취소완료", "환불신청", "환불완료"].includes(s);
    });
    const couponDiscount = order.couponDiscount ?? 0;
    // 부분 취소 시 쿠폰 할인 비례 적용 → 환불 예상액에서 차감
    const couponDiscountForPending = allPending
        ? 0 // 전체 취소면 쿠폰 복원이므로 차감 없음
        : calcCouponDiscountForItems(pendingItemObjs, order.items, couponDiscount);
    // 실제 환불 예상액 = 아이템 합계 - 쿠폰 할인 차감분 + 포인트 복원
    const estimatedRefund = Math.max(0, pendingTotal - couponDiscountForPending);

    return (
        <div className={`rounded-[12px] border overflow-hidden ${cardBorder}`}>
            <button onClick={() => setOpen(v => !v)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition ${cardBg}`}>
                <div className="flex-1 min-w-0">
                    <p className={`truncate text-[13px] font-semibold ${isAllDone ? "text-[#888]" : "text-[#16121f]"}`}>
                        {order.items?.[0]?.title ?? "상품명 없음"}
                        {order.items?.length > 1 && <span className="ml-1 text-[11px] text-[#9b94b2]">외 {order.items.length - 1}건</span>}
                    </p>
                </div>
                <UserBadge email={order.userEmail} nickname={order.userNickname} />
                <span className="shrink-0 text-[13px] font-bold text-[#7865ff]">{order.total?.toLocaleString()}원</span>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: repBg, color: repColor }}>{repStatus}</span>
                <span className="shrink-0 text-[11px] text-[#9b94b2] hidden sm:block">{order.date}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2" className="shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>

            {open && (
                <div className="border-t border-[#f0edf8] px-5 py-4 bg-[#faf9ff] flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[12px] text-[#6b647a]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        <span className="font-semibold">{order.userNickname || "-"}</span>
                        <span className="text-[#c0bcd0]">{order.userEmail}</span>
                    </div>

                    {/* 사유 */}
                    {(order.cancelReason || order.refundReason) && (
                        <div>
                            <p className="text-[11px] font-bold text-[#9b94b2] mb-1">
                                {order.refundReason ? "환불/교환 사유" : "취소 사유"}
                                {order.refundType && ` (${order.refundType})`}
                            </p>
                            <p className="text-[13px] text-[#3d3755]">{order.cancelReason || order.refundReason || "-"}</p>
                        </div>
                    )}

                    {/* 아이템별 상태 표시 */}
                    <div>
                        <p className="text-[11px] font-bold text-[#9b94b2] mb-1.5">
                            {filterItemStatus ? `${ITEM_STATUS_BADGE[filterItemStatus]?.text ?? filterItemStatus} 상품` : "주문 상품 (낱개 상태)"}
                        </p>
                        <div className="flex flex-col gap-2">
                            {order.items
                                ?.filter(item => filterItemStatus ? resolveItemStatus(item, order.status) === filterItemStatus : true)
                                .map((item, i) => {
                                    const s = resolveItemStatus(item, order.status);
                                    const badge = ITEM_STATUS_BADGE[s] ?? { text: s, color: "#888", bg: "#f5f5f5" };
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-[13px] text-[#3d3755]">
                                            <span className="text-[#c0bcd0]">·</span>
                                            <span className="flex-1">{item.title}</span>
                                            {item.option && item.option !== "기본" && <span className="text-[#9b94b2]">({item.option})</span>}
                                            <span className="text-[#9b94b2]">{item.qty}개</span>
                                            <span className="font-semibold text-[#7865ff]">{item.price?.toLocaleString()}원</span>
                                            {!filterItemStatus && (
                                                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                                    style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* 복원 예정 내역 */}
                    {(hasPendingCancel || hasPendingRefund) && (
                        <div className="rounded-[10px] bg-[#f0eeff] border border-[#e0d8ff] px-4 py-3 flex flex-col gap-1">
                            <p className="text-[11px] font-bold text-[#7865ff] mb-0.5">승인 시 처리 예정</p>
                            {allPending && couponDiscount > 0 && (
                                <p className="text-[12px] text-[#6b647a]">🎟 쿠폰 복원 (전체 취소/환불)</p>
                            )}
                            {!allPending && couponDiscount > 0 && (
                                <p className="text-[12px] text-[#6b647a]">🎟 쿠폰 할인 {couponDiscountForPending.toLocaleString()}원 차감 (부분 취소)</p>
                            )}
                            {restorePoints > 0 && (
                                <p className="text-[12px] text-[#6b647a]">🪙 포인트 {restorePoints.toLocaleString()}P 환불 (비례)</p>
                            )}
                            <p className="text-[12px] font-bold text-[#7865ff] mt-0.5 pt-1 border-t border-[#d8d0ff]">
                                💰 환불 예상액 {estimatedRefund.toLocaleString()}원 + 포인트 {restorePoints.toLocaleString()}P
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-[13px] border-t border-[#ebe8ff] pt-3">
                        <span className="text-[#9b94b2]">총 결제금액</span>
                        <span className="font-bold text-[#16121f]">{order.total?.toLocaleString()}원</span>
                    </div>

                    {/* 낱개 취소 승인 버튼 */}
                    <div className="flex flex-col gap-2 pt-1">
                        {hasPendingCancel && (
                            <button
                                onClick={() => onAction(order, "cancel_confirm", pendingCancelItems.map(i => i.productId))}
                                className="flex items-center gap-1.5 h-[34px] px-4 rounded-[8px] bg-[#7865ff] text-[12px] font-semibold text-white hover:bg-[#6b55f0] transition">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                취소 승인 ({pendingCancelItems.length}개) + 복원 처리
                            </button>
                        )}
                        {hasPendingRefund && (
                            <button
                                onClick={() => onAction(order, "refund_complete", pendingRefundItems.map(i => i.productId))}
                                className="flex items-center gap-1.5 h-[34px] px-4 rounded-[8px] bg-[#16a34a] text-[12px] font-semibold text-white hover:bg-[#15803d] transition">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                환불 완료 ({pendingRefundItems.length}개) + 복원 처리
                            </button>
                        )}
                        {isAllDone && (
                            <span className="text-[12px] text-[#888] flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                모든 처리 완료
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── 페이지네이션 ─────────────────────────────────────────────────────────────
function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-1 mt-6">
            <button onClick={() => onPage(page - 1)} disabled={page === 1}
                className="h-8 w-8 rounded-full border border-[#e2ddf5] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] disabled:opacity-30 transition flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => onPage(p)}
                    className={`h-8 w-8 rounded-full text-[13px] font-semibold transition ${p === page ? "bg-[#7865ff] text-white" : "border border-[#e2ddf5] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
                className="h-8 w-8 rounded-full border border-[#e2ddf5] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] disabled:opacity-30 transition flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem("admin_auth") === "1") setIsAdmin(true);
        setAuthChecked(true);
    }, []);

    const [adminTab, setAdminTab] = useState<AdminTab>("문의관리");
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const [inquiryTab, setInquiryTab] = useState<"전체" | "답변대기" | "답변완료">("답변대기");
    const [inquiryPage, setInquiryPage] = useState(1);
    const [orderTab, setOrderTab] = useState<"환불신청" | "환불완료">("환불신청");
    const [orderPage, setOrderPage] = useState(1);
    const [shippingPage, setShippingPage] = useState(1);
    const [shippingTab, setShippingTab] = useState<"진행중" | "배송완료">("진행중");
    const [cancelPage, setCancelPage] = useState(1);
    const [target, setTarget] = useState<Inquiry | null>(null);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const usersSnap = await getDocs(collection(db, "users"));
            const allInquiries: Inquiry[] = [];
            const allOrders: Order[] = [];

            await Promise.all(usersSnap.docs.map(async (userDoc) => {
                const uid = userDoc.id;
                const userData = userDoc.data();
                const userEmail = userData.email ?? "";
                const userNickname = userData.nickname ?? userData.name ?? "";

                try {
                    const iqSnap = await getDocs(query(
                        collection(db, "users", uid, "inquiries"),
                        orderBy("createdAt", "desc")
                    ));
                    iqSnap.docs.forEach(d => allInquiries.push({
                        id: d.id, uid, userEmail, userNickname, ...d.data(),
                        date: d.data().createdAt?.toDate?.()?.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) ?? "-",
                    } as Inquiry));
                } catch { }

                try {
                    const orSnap = await getDocs(query(
                        collection(db, "users", uid, "orders"),
                        where("status", "in", ["결제완료", "배송시작", "배송중", "배송완료", "처리중", "주문취소", "교환환불신청", "환불완료"])
                    ));
                    orSnap.docs.forEach(d => allOrders.push({
                        id: d.id, uid, userEmail, userNickname, ...d.data(),
                        date: d.data().createdAt?.toDate?.()?.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) ?? "-",
                    } as Order));
                } catch { }
            }));

            allInquiries.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
            allOrders.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
            setInquiries(allInquiries);
            setOrders(allOrders);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (isAdmin) fetchAllData(); }, [isAdmin]);

    const handleSaveAnswer = async (answer: string) => {
        if (!target) return;
        await updateDoc(doc(db, "users", target.uid, "inquiries", target.id), {
            answer, status: "답변완료", answeredAt: serverTimestamp(),
        });
        await saveStoreNotification(target.uid, {
            type: "event", title: "문의 답변이 등록됐어요",
            body: `'${target.title}' 문의에 답변이 달렸어요.`, link: "/store/profile/inquiry",
        });
        setInquiries(prev => prev.map(i =>
            i.id === target.id && i.uid === target.uid ? { ...i, answer, status: "답변완료" } : i
        ));
    };

    // ── 주문 액션 (낱개 취소/환불 승인) ────────────────────────────────────────
    const handleOrderAction = async (
        order: Order,
        type: "cancel_confirm" | "refund_complete" | "shipping_start" | "shipping_complete",
        targetProductIds?: string[]
    ) => {
        const confirmMsg =
            type === "cancel_confirm"
                ? `${targetProductIds?.length ?? 0}개 상품 취소 승인하고 포인트를 복원할까요?\n${order.userNickname || order.userEmail}`
                : type === "refund_complete"
                    ? `${targetProductIds?.length ?? 0}개 상품 환불 완료 처리하고 포인트를 복원할까요?\n${order.items?.[0]?.title} · ${order.total?.toLocaleString()}원`
                    : type === "shipping_start"
                        ? `배송을 시작할까요?\n${order.items?.[0]?.title}`
                        : `배송 완료 처리할까요?\n${order.items?.[0]?.title}`;

        if (!confirm(confirmMsg)) return;

        if (type === "cancel_confirm" && targetProductIds) {
            // 해당 아이템만 취소완료로 변경
            const updatedItems = order.items.map(item => ({
                ...item,
                status: targetProductIds.includes(item.productId)
                    ? "취소완료" as ItemStatus
                    : resolveItemStatus(item, order.status),
            }));

            const allCancelDone = updatedItems.every(i =>
                i.status && ["취소완료", "환불완료"].includes(i.status)
            );
            const hasAnyRefundPending = updatedItems.some(i => i.status === "환불신청");
            const newStatus = allCancelDone
                ? "주문취소"
                : hasAnyRefundPending
                    ? "교환환불신청"
                    : order.status;

            await updateDoc(doc(db, "users", order.uid, "orders", order.id), {
                items: updatedItems,
                status: newStatus,
                cancelConfirmedAt: serverTimestamp(),
                pendingCancelItems: [],
            });

            // 포인트: 취소 아이템 비율로 비례 복원
            const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
            const cancelItems = order.items.filter(i => targetProductIds.includes(i.productId));
            const cancelTotal = cancelItems.reduce((s, i) => s + i.price * i.qty, 0);
            const pointRatio = subtotal > 0 ? cancelTotal / subtotal : 0;
            const restorePoints = Math.round((order.usedPoints ?? 0) * pointRatio);
            await refundPoints(order.uid, restorePoints, "주문 취소 포인트 환불");

            // 쿠폰: 전체 취소이면 복원, 부분 취소이면 쿠폰 할인 비례 차감 (복원 X)
            if (allCancelDone) {
                await restoreCouponIfUsed(order.uid, order.usedCouponId ?? order.couponId);
            }
            // 부분 취소 시: 쿠폰 할인 차감액은 환불 예상액에 이미 반영됨 (복원 없음)

            const couponDiscountForCancel = allCancelDone
                ? 0
                : calcCouponDiscountForItems(cancelItems, order.items, order.couponDiscount ?? 0);
            const estimatedRefund = Math.max(0, cancelTotal - couponDiscountForCancel);

            await saveStoreNotification(order.uid, {
                type: "cancel",
                title: "주문 취소가 처리됐어요",
                body: `${targetProductIds.length}개 상품 취소 승인됐어요. 환불 예상 ${estimatedRefund.toLocaleString()}원 + 포인트 ${restorePoints.toLocaleString()}P · 3~5일 내 처리돼요.`,
                link: "/store/profile?tab=교환환불/취소",
            });

            setOrders(prev => prev.map(o =>
                o.id === order.id && o.uid === order.uid
                    ? { ...o, items: updatedItems, status: newStatus }
                    : o
            ));

        } else if (type === "refund_complete" && targetProductIds) {
            const updatedItems = order.items.map(item => ({
                ...item,
                status: targetProductIds.includes(item.productId)
                    ? "환불완료" as ItemStatus
                    : resolveItemStatus(item, order.status),
            }));

            const allDone = updatedItems.every(i =>
                i.status && ["취소완료", "환불완료"].includes(i.status)
            );
            const hasAnyCancelPending = updatedItems.some(i => i.status === "취소신청");
            const newStatus = allDone
                ? "환불완료"
                : hasAnyCancelPending
                    ? "처리중"
                    : order.status;

            await updateDoc(doc(db, "users", order.uid, "orders", order.id), {
                items: updatedItems,
                status: newStatus,
                refundCompletedAt: serverTimestamp(),
                pendingRefundItems: [],
            });

            // 포인트: 환불 아이템 비율로 비례 복원
            const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
            const refundItems = order.items.filter(i => targetProductIds.includes(i.productId));
            const refundTotal = refundItems.reduce((s, i) => s + i.price * i.qty, 0);
            const pointRatio = subtotal > 0 ? refundTotal / subtotal : 0;
            const restorePoints = Math.round((order.usedPoints ?? 0) * pointRatio);
            await refundPoints(order.uid, restorePoints, "교환/환불 포인트 환불");

            // 쿠폰: 전체 환불이면 복원, 부분 환불이면 쿠폰 할인 비례 차감 (복원 X)
            if (allDone) {
                await restoreCouponIfUsed(order.uid, order.usedCouponId ?? order.couponId);
            }

            const couponDiscountForRefund = allDone
                ? 0
                : calcCouponDiscountForItems(refundItems, order.items, order.couponDiscount ?? 0);
            const estimatedRefund = Math.max(0, refundTotal - couponDiscountForRefund);

            await saveStoreNotification(order.uid, {
                type: "cancel",
                title: "환불이 완료됐어요",
                body: `${targetProductIds.length}개 상품 환불 예상 ${estimatedRefund.toLocaleString()}원 + 포인트 ${restorePoints.toLocaleString()}P · 3~5일 내 입금돼요.`,
                link: "/store/profile?tab=교환환불/취소",
            });

            setOrders(prev => prev.map(o =>
                o.id === order.id && o.uid === order.uid
                    ? { ...o, items: updatedItems, status: newStatus }
                    : o
            ));

        } else if (type === "shipping_start") {
            // 배송 시작: 취소신청/환불신청 중인 아이템은 상태 유지, 나머지만 배송시작
            const CANCEL_REFUND_STATUSES: ItemStatus[] = ["취소신청", "취소완료", "환불신청", "환불완료"];
            const updatedItems = order.items.map(item => {
                const cur = resolveItemStatus(item, order.status);
                if (CANCEL_REFUND_STATUSES.includes(cur)) return { ...item, status: cur };
                return { ...item, status: "배송시작" as ItemStatus };
            });
            const shippingItems = updatedItems.filter(i => !CANCEL_REFUND_STATUSES.includes(i.status!));
            await updateDoc(doc(db, "users", order.uid, "orders", order.id), {
                items: updatedItems,
                status: "배송시작",
                shippingStartedAt: serverTimestamp(),
            });
            await saveStoreNotification(order.uid, {
                type: "order",
                title: "상품이 출발했어요 🚚",
                body: `${shippingItems[0]?.title ?? order.items?.[0]?.title} 배송이 시작됐어요.`,
                link: "/store/profile?tab=배송중",
            });
            setOrders(prev => prev.map(o =>
                o.id === order.id && o.uid === order.uid
                    ? { ...o, items: updatedItems, status: "배송시작" }
                    : o
            ));

        } else if (type === "shipping_complete") {
            // 배송 완료: 취소신청/환불신청 중인 아이템은 상태 유지, 나머지만 배송완료
            const CANCEL_REFUND_STATUSES: ItemStatus[] = ["취소신청", "취소완료", "환불신청", "환불완료"];
            const updatedItems = order.items.map(item => {
                const cur = resolveItemStatus(item, order.status);
                if (CANCEL_REFUND_STATUSES.includes(cur)) return { ...item, status: cur };
                return { ...item, status: "배송완료" as ItemStatus };
            });
            await updateDoc(doc(db, "users", order.uid, "orders", order.id), {
                items: updatedItems,
                status: "배송완료",
                deliveredAt: serverTimestamp(),
            });
            await saveStoreNotification(order.uid, {
                type: "order",
                title: "배송이 완료됐어요 📦",
                body: `${order.items?.[0]?.title} 배송이 완료됐어요. 상품을 확인해주세요!`,
                link: "/store/profile?tab=배송완료",
            });
            setOrders(prev => prev.map(o =>
                o.id === order.id && o.uid === order.uid
                    ? { ...o, items: updatedItems, status: "배송완료" }
                    : o
            ));
        }
    };

    // ── 필터/페이지 ───────────────────────────────────────────────────────────
    const filteredInquiries = useMemo(() =>
        inquiryTab === "전체" ? inquiries : inquiries.filter(i => i.status === inquiryTab),
        [inquiries, inquiryTab]
    );
    const pagedInquiries = useMemo(() =>
        filteredInquiries.slice((inquiryPage - 1) * PAGE_SIZE, inquiryPage * PAGE_SIZE),
        [filteredInquiries, inquiryPage]
    );

    // 취소관리: 취소신청 아이템이 있는 주문
    const cancelOrders = useMemo(() =>
        orders.filter(o => o.items.some(item => resolveItemStatus(item, o.status) === "취소신청")),
        [orders]
    );
    // 취소완료: 모든 아이템이 취소완료/환불완료이거나 order.status가 주문취소
    const cancelDoneOrders = useMemo(() =>
        orders.filter(o =>
            o.status === "주문취소" ||
            o.items.every(item => ["취소완료", "환불완료"].includes(resolveItemStatus(item, o.status)))
        ),
        [orders]
    );
    const pagedCancelOrders = useMemo(() =>
        cancelOrders.slice((cancelPage - 1) * PAGE_SIZE, cancelPage * PAGE_SIZE),
        [cancelOrders, cancelPage]
    );

    const SHIPPING_STATUSES = ["결제완료", "배송시작", "배송중", "배송완료"] as const;
    const CANCEL_REFUND_STATUSES_LIST = ["취소신청", "취소완료", "환불신청", "환불완료"];

    const shippingOrders = useMemo(() =>
        // 배송 가능(결제완료/배송시작/배송중/배송완료) 아이템이 하나라도 있는 주문
        orders.filter(o =>
            o.items.some(item => {
                const s = resolveItemStatus(item, o.status);
                return (SHIPPING_STATUSES as readonly string[]).includes(s);
            })
        ),
        [orders]
    );
    const filteredShipping = useMemo(() =>
        shippingTab === "진행중"
            ? shippingOrders.filter(o =>
                o.items.some(item => {
                    const s = resolveItemStatus(item, o.status);
                    return ["결제완료", "배송시작", "배송중"].includes(s);
                })
            )
            : shippingOrders.filter(o =>
                o.items.some(item => resolveItemStatus(item, o.status) === "배송완료")
            ),
        [shippingOrders, shippingTab]
    );
    const pagedShipping = useMemo(() =>
        filteredShipping.slice((shippingPage - 1) * PAGE_SIZE, shippingPage * PAGE_SIZE),
        [filteredShipping, shippingPage]
    );

    // 환불관리: 환불신청 아이템이 있는 주문
    const refundPendingOrders = useMemo(() =>
        orders.filter(o => o.items.some(item => resolveItemStatus(item, o.status) === "환불신청")),
        [orders]
    );
    const refundDoneOrders = useMemo(() =>
        orders.filter(o => o.items.some(item => resolveItemStatus(item, o.status) === "환불완료")),
        [orders]
    );
    const filteredOrders = useMemo(() =>
        orderTab === "환불신청" ? refundPendingOrders : refundDoneOrders,
        [orderTab, refundPendingOrders, refundDoneOrders]
    );
    const pagedOrders = useMemo(() =>
        filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE),
        [filteredOrders, orderPage]
    );

    const waitCount = inquiries.filter(i => i.status === "답변대기").length;
    const shippingPendingCount = shippingOrders.filter(o =>
        o.items.some(item => ["결제완료", "배송시작", "배송중"].includes(resolveItemStatus(item, o.status)))
    ).length;
    const cancelPendingCount = cancelOrders.length;
    const refundPendingCount = refundPendingOrders.length;

    if (!authChecked) return null;
    if (!isAdmin) return <LoginView onLogin={() => { sessionStorage.setItem("admin_auth", "1"); setIsAdmin(true); }} />;

    return (
        <div className="min-h-screen bg-[#f5f3ff]">
            {target && <AnswerModal inquiry={target} onClose={() => setTarget(null)} onSave={handleSaveAnswer} />}

            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#ebe8ff]">
                <div className="mx-auto max-w-[1200px] px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-[#7865ff] text-white px-2 py-0.5 rounded-full">ADMIN</span>
                        <span className="text-[14px] font-bold text-[#16121f]">라프텔 스토어 관리자</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#9b94b2]">{ADMIN_ID}</span>
                        <button onClick={() => { sessionStorage.removeItem("admin_auth"); setIsAdmin(false); }}
                            className="text-[12px] text-[#9b94b2] hover:text-[#ff4d6d] transition">로그아웃</button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1200px] px-6 py-10">
                <div className="mb-8 flex gap-2 flex-wrap">
                    {(["문의관리", "배송관리", "주문취소", "환불관리"] as AdminTab[]).map(t => (
                        <button key={t} onClick={() => setAdminTab(t)}
                            className={`relative h-10 px-5 rounded-full text-[13px] font-bold transition ${adminTab === t ? "bg-[#7865ff] text-white" : "bg-white border border-[#e2ddf5] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                            {t}
                            {t === "배송관리" && shippingPendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7865ff] px-1 text-[10px] font-bold text-white">{shippingPendingCount}</span>
                            )}
                            {t === "주문취소" && cancelPendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#f59e0b] px-1 text-[10px] font-bold text-white">{cancelPendingCount}</span>
                            )}
                            {t === "환불관리" && refundPendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4d6d] px-1 text-[10px] font-bold text-white">{refundPendingCount}</span>
                            )}
                        </button>
                    ))}
                    <button onClick={fetchAllData}
                        className="ml-auto h-10 px-4 rounded-full bg-white border border-[#e2ddf5] text-[12px] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        새로고침
                    </button>
                </div>

                {/* ── 문의관리 ── */}
                {adminTab === "문의관리" && (
                    <>
                        <div className="mb-6 grid grid-cols-3 gap-3">
                            {[
                                { label: "전체 문의", value: inquiries.length, color: "#7865ff" },
                                { label: "답변대기", value: waitCount, color: "#d97706" },
                                { label: "답변완료", value: inquiries.length - waitCount, color: "#16a34a" },
                            ].map(s => (
                                <div key={s.label} className="rounded-[14px] border border-[#ebe8ff] bg-white px-5 py-4">
                                    <p className="text-[12px] text-[#9b94b2]">{s.label}</p>
                                    <p className="mt-1 text-[22px] font-bold" style={{ color: s.color }}>{s.value}<span className="text-[13px] font-medium ml-1">건</span></p>
                                </div>
                            ))}
                        </div>
                        <div className="mb-4 flex items-center gap-5 border-b border-[#f0edf8]">
                            {(["전체", "답변대기", "답변완료"] as const).map(t => (
                                <button key={t} onClick={() => { setInquiryTab(t); setInquiryPage(1); }}
                                    className={`pb-3 text-[13px] font-semibold transition border-b-2 ${inquiryTab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
                                    {t}
                                    {t === "답변대기" && waitCount > 0 && <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7865ff] px-1 text-[10px] font-bold text-white">{waitCount}</span>}
                                </button>
                            ))}
                            <span className="ml-auto text-[12px] text-[#c0bcd0]">{filteredInquiries.length}건</span>
                        </div>
                        {loading ? <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" /></div>
                            : pagedInquiries.length === 0 ? <div className="flex h-[200px] items-center justify-center"><p className="text-[13px] text-[#9b94b2]">문의가 없어요.</p></div>
                                : <div className="flex flex-col gap-2.5">{pagedInquiries.map(i => <InquiryRow key={`${i.uid}-${i.id}`} inquiry={i} onAnswer={setTarget} />)}</div>}
                        <Pagination total={filteredInquiries.length} page={inquiryPage} onPage={setInquiryPage} />
                    </>
                )}

                {/* ── 배송관리 ── */}
                {adminTab === "배송관리" && (
                    <>
                        <div className="mb-6 grid grid-cols-2 gap-3">
                            {[
                                { label: "배송진행중", value: shippingPendingCount, color: "#7865ff" },
                                { label: "배송완료", value: shippingOrders.filter(o => o.status === "배송완료").length, color: "#16a34a" },
                            ].map(s => (
                                <div key={s.label} className="rounded-[14px] border border-[#ebe8ff] bg-white px-5 py-4">
                                    <p className="text-[12px] text-[#9b94b2]">{s.label}</p>
                                    <p className="mt-1 text-[22px] font-bold" style={{ color: s.color }}>{s.value}<span className="text-[13px] font-medium ml-1">건</span></p>
                                </div>
                            ))}
                        </div>
                        <div className="mb-4 flex items-center gap-5 border-b border-[#f0edf8]">
                            {(["진행중", "배송완료"] as const).map(t => (
                                <button key={t} onClick={() => { setShippingTab(t); setShippingPage(1); }}
                                    className={`pb-3 text-[13px] font-semibold transition border-b-2 ${shippingTab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>{t}</button>
                            ))}
                            <span className="ml-auto text-[12px] text-[#c0bcd0]">{filteredShipping.length}건</span>
                        </div>
                        {loading ? <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" /></div>
                            : pagedShipping.length === 0 ? <div className="flex h-[200px] items-center justify-center"><p className="text-[13px] text-[#9b94b2]">내역이 없어요.</p></div>
                                : <div className="flex flex-col gap-2.5">{pagedShipping.map(o => <ShippingRow key={`${o.uid}-${o.id}`} order={o} onAction={handleOrderAction} />)}</div>}
                        <Pagination total={filteredShipping.length} page={shippingPage} onPage={setShippingPage} />
                    </>
                )}

                {/* ── 주문취소 ── */}
                {adminTab === "주문취소" && (
                    <>
                        <div className="mb-6 grid grid-cols-2 gap-3">
                            {[
                                { label: "승인 대기", value: cancelPendingCount, color: "#f59e0b" },
                                { label: "취소 완료 주문", value: cancelDoneOrders.length, color: "#888" },
                            ].map(s => (
                                <div key={s.label} className="rounded-[14px] border border-[#ebe8ff] bg-white px-5 py-4">
                                    <p className="text-[12px] text-[#9b94b2]">{s.label}</p>
                                    <p className="mt-1 text-[22px] font-bold" style={{ color: s.color }}>{s.value}<span className="text-[13px] font-medium ml-1">건</span></p>
                                </div>
                            ))}
                        </div>
                        <p className="mb-4 text-[12px] text-[#9b94b2]">승인 버튼을 누르면 해당 상품의 포인트가 비례 복원되고 고객에게 알림이 발송돼요. 쿠폰은 전체 취소 시에만 복원돼요.</p>
                        {loading ? <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" /></div>
                            : pagedCancelOrders.length === 0 ? <div className="flex h-[200px] items-center justify-center"><p className="text-[13px] text-[#9b94b2]">취소 신청 내역이 없어요.</p></div>
                                : <div className="flex flex-col gap-2.5">{pagedCancelOrders.map(o => <OrderRow key={`${o.uid}-${o.id}`} order={o} onAction={handleOrderAction} />)}</div>}
                        <Pagination total={cancelOrders.length} page={cancelPage} onPage={setCancelPage} />
                    </>
                )}

                {/* ── 환불관리 ── */}
                {adminTab === "환불관리" && (
                    <>
                        <div className="mb-6 grid grid-cols-2 gap-3">
                            {[
                                { label: "환불신청", value: refundPendingCount, color: "#d97706" },
                                { label: "환불완료 주문", value: refundDoneOrders.length, color: "#16a34a" },
                            ].map(s => (
                                <div key={s.label} className="rounded-[14px] border border-[#ebe8ff] bg-white px-5 py-4">
                                    <p className="text-[12px] text-[#9b94b2]">{s.label}</p>
                                    <p className="mt-1 text-[22px] font-bold" style={{ color: s.color }}>{s.value}<span className="text-[13px] font-medium ml-1">건</span></p>
                                </div>
                            ))}
                        </div>
                        <div className="mb-4 flex items-center gap-5 border-b border-[#f0edf8]">
                            {(["환불신청", "환불완료"] as const).map(t => (
                                <button key={t} onClick={() => { setOrderTab(t); setOrderPage(1); }}
                                    className={`pb-3 text-[13px] font-semibold transition border-b-2 ${orderTab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
                                    {t}
                                    {t === "환불신청" && refundPendingCount > 0 && <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4d6d] px-1 text-[10px] font-bold text-white">{refundPendingCount}</span>}
                                </button>
                            ))}
                            <span className="ml-auto text-[12px] text-[#c0bcd0]">{filteredOrders.length}건</span>
                        </div>
                        <p className="mb-4 text-[12px] text-[#9b94b2]">환불 완료 버튼을 누르면 해당 상품의 포인트가 비례 복원되고 고객에게 알림이 발송돼요. 쿠폰은 전체 환불 시에만 복원돼요.</p>
                        {loading ? <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" /></div>
                            : pagedOrders.length === 0 ? <div className="flex h-[200px] items-center justify-center"><p className="text-[13px] text-[#9b94b2]">내역이 없어요.</p></div>
                                : <div className="flex flex-col gap-2.5">{pagedOrders.map(o => (
                                    <OrderRow
                                        key={`${o.uid}-${o.id}`}
                                        order={o}
                                        onAction={handleOrderAction}
                                        filterItemStatus={orderTab === "환불완료" ? "환불완료" : undefined}
                                    />
                                ))}</div>}
                        <Pagination total={filteredOrders.length} page={orderPage} onPage={setOrderPage} />
                    </>
                )}
            </main>
        </div>
    );
}