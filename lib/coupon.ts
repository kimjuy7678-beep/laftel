import { db } from "@/firebase/firebase";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { saveNotification } from "@/utils/notification";

export type CouponType = "rate" | "fixed";
export type CouponStatus = "active" | "used" | "expired";

export interface Coupon {
    id: string;
    label: string;
    discount: number;
    type: CouponType;
    minOrderAmount: number;
    maxDiscountAmount?: number;
    status: CouponStatus;
    expiresAt: Timestamp | null;
    issuedAt: Timestamp;
    usedAt?: Timestamp | null;
    usedOrderId?: string | null;
}

export async function fetchUserCoupons(uid: string): Promise<Coupon[]> {
    const snap = await getDocs(collection(db, "users", uid, "coupons"));
    const coupons = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
    return coupons.sort((a, b) =>
        (b.issuedAt?.toMillis() ?? 0) - (a.issuedAt?.toMillis() ?? 0)
    );
}

export async function fetchActiveCoupons(uid: string): Promise<Coupon[]> {
    const all = await fetchUserCoupons(uid);
    const now = Timestamp.now();
    return all.filter(
        (c) =>
            c.status === "active" &&
            (c.expiresAt === null || c.expiresAt.toMillis() > now.toMillis())
    );
}

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
        issuedAt: Timestamp.fromDate(new Date()),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        usedAt: null,
        usedOrderId: null,
    });

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

export async function getCoupon(
    uid: string,
    couponId: string
): Promise<Coupon | null> {
    const snap = await getDoc(doc(db, "users", uid, "coupons", couponId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Coupon;
}

export function calcCouponDiscount(
    coupon: Coupon,
    orderAmount: number
): number {
    if (orderAmount < coupon.minOrderAmount) return 0;

    if (coupon.type === "fixed") {
        return Math.min(coupon.discount, orderAmount);
    }

    const raw = Math.floor(orderAmount * coupon.discount);
    if (coupon.maxDiscountAmount !== undefined) {
        return Math.min(raw, coupon.maxDiscountAmount);
    }
    return raw;
}