// lib/coupon.ts
import { db } from "@/firebase/firebase";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { saveNotification } from "@/utils/notification";

// ─── 타입 ──────────────────────────────────────────────────────────────────

export type CouponType = "rate" | "fixed";
export type CouponStatus = "active" | "used" | "expired";

export interface Coupon {
    id: string;
    label: string;              // 쿠폰명
    discount: number;           // rate: 0.1 = 10%, fixed: 원 단위
    type: CouponType;
    minOrderAmount: number;     // 최소 주문금액 (0이면 제한 없음)
    maxDiscountAmount?: number; // rate 쿠폰의 최대 할인 한도
    status: CouponStatus;
    expiresAt: Timestamp | null;
    issuedAt: Timestamp;
    usedAt?: Timestamp | null;
    usedOrderId?: string | null;
}

// ─── 내 쿠폰 전체 목록 조회 ───────────────────────────────────────────────

export async function fetchUserCoupons(uid: string): Promise<Coupon[]> {
    const q = query(
        collection(db, "users", uid, "coupons"),
        orderBy("issuedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
}

// ─── 사용 가능한 쿠폰만 ───────────────────────────────────────────────────

export async function fetchActiveCoupons(uid: string): Promise<Coupon[]> {
    const all = await fetchUserCoupons(uid);
    const now = Timestamp.now();
    return all.filter(
        (c) =>
            c.status === "active" &&
            (c.expiresAt === null || c.expiresAt.toMillis() > now.toMillis())
    );
}

// ─── 쿠폰 발급 ────────────────────────────────────────────────────────────

export interface IssueCouponParams {
    uid: string;
    label: string;
    discount: number;
    type: CouponType;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    expiresAt?: Date | null;
}

export async function issueCoupon(params: IssueCouponParams): Promise<string> {
    const {
        uid,
        label,
        discount,
        type,
        minOrderAmount = 0,
        maxDiscountAmount,
        expiresAt = null,
    } = params;

    const ref = await addDoc(collection(db, "users", uid, "coupons"), {
        label,
        discount,
        type,
        minOrderAmount,
        ...(maxDiscountAmount !== undefined ? { maxDiscountAmount } : {}),
        status: "active",
        issuedAt: serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        usedAt: null,
        usedOrderId: null,
    });

    // 알림 저장 → 알림창에 즉시 반영
    const discountText =
        type === "rate"
            ? `${Math.round(discount * 100)}% 할인`
            : `${discount.toLocaleString("ko-KR")}원 할인`;

    await saveNotification(uid, {
        type: "coupon",
        title: "쿠폰이 발급되었어요 🎟️",
        body: `${label} (${discountText}) 쿠폰을 받았어요!`,
        link: "/store/profile/coupon",
    });

    return ref.id;
}

// ─── 쿠폰 사용 처리 (주문 완료 시 호출) ──────────────────────────────────

export async function useCoupon(
    uid: string,
    couponId: string,
    orderId: string
): Promise<void> {
    const ref = doc(db, "users", uid, "coupons", couponId);
    await updateDoc(ref, {
        status: "used",
        usedAt: serverTimestamp(),
        usedOrderId: orderId,
    });
}

// ─── 단일 쿠폰 조회 ───────────────────────────────────────────────────────

export async function getCoupon(
    uid: string,
    couponId: string
): Promise<Coupon | null> {
    const snap = await getDoc(doc(db, "users", uid, "coupons", couponId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Coupon;
}

// ─── 할인 금액 계산 ───────────────────────────────────────────────────────

export function calcCouponDiscount(
    coupon: Coupon,
    orderAmount: number
): number {
    if (orderAmount < coupon.minOrderAmount) return 0;

    if (coupon.type === "fixed") {
        return Math.min(coupon.discount, orderAmount);
    }

    // rate
    const raw = Math.floor(orderAmount * coupon.discount);
    if (coupon.maxDiscountAmount !== undefined) {
        return Math.min(raw, coupon.maxDiscountAmount);
    }
    return raw;
}