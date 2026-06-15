"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCouponStore } from "@/store/useCouponStore";
import type { Coupon } from "@/lib/coupon";
import { Timestamp } from "firebase/firestore";

function formatFullDate(ts: Timestamp | null | undefined): string {
    if (!ts) return "-";
    // Timestamp일 수도 있고 Date일 수도 있어서 둘 다 처리
    const d = typeof (ts as any).toDate === 'function'
        ? (ts as any).toDate()
        : new Date(ts as any);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDiscount(coupon: Coupon): string {
    if (coupon.type === "rate") return `${Math.round(coupon.discount * 100)}%`;
    return `${coupon.discount.toLocaleString("ko-KR")}원`;
}

const STATUS_LABEL: Record<Coupon["status"], string> = {
    active: "사용 가능",
    used: "사용 완료",
    expired: "기간 만료",
};
const STATUS_COLOR: Record<Coupon["status"], string> = {
    active: "text-[#7865ff]",
    used: "text-[#9b94b2]",
    expired: "text-[#ccc]",
};
const STATUS_BG: Record<Coupon["status"], string> = {
    active: "bg-[#f5f4ff]",
    used: "bg-[#f5f4ff]",
    expired: "bg-[#f5f4ff]",
};

function CouponCard({ coupon }: { coupon: Coupon }) {
    const isActive = coupon.status === "active";
    const isUsed = coupon.status === "used";

    return (
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[12px] border p-4 sm:p-5 transition-opacity ${isActive ? "border-[#ebe8ff]" : "border-[#e8e8e8] opacity-70"}`}>
            <div className="flex flex-col gap-1">
                <p className={`text-[15px] font-semibold ${isActive ? "text-[#16121f]" : "text-[#9b94b2]"}`}>
                    {coupon.label}
                </p>

                {/* 유효기간 */}
                {coupon.expiresAt && (
                    <p className="text-[12px] text-[#9b94b2]">
                        사용기간 : {formatFullDate(coupon.issuedAt)} ~ {formatFullDate(coupon.expiresAt)}
                    </p>
                )}

                {/* 최소 주문금액 */}
                {coupon.minOrderAmount > 0 && (
                    <p className="text-[12px] text-[#9b94b2]">
                        최소 주문금액 : {coupon.minOrderAmount.toLocaleString("ko-KR")}원 이상
                    </p>
                )}

                {/* ✅ 사용 완료 — 사용일 + 주문번호 표시 */}
                {isUsed && coupon.usedAt && (
                    <p className="text-[12px] text-[#9b94b2]">
                        사용일 : {formatFullDate(coupon.usedAt)}
                        {coupon.usedOrderId && (
                            <span className="ml-2 text-[#c4baff]">
                                주문 {coupon.usedOrderId.slice(0, 8)}...
                            </span>
                        )}
                    </p>
                )}

                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[coupon.status]} ${STATUS_BG[coupon.status]}`}>
                        {STATUS_LABEL[coupon.status]}
                    </span>
                    {/* ✅ 사용완료 — 자동 복원 안내 */}
                    {isUsed && (
                        <span className="text-[10px] text-[#c4baff]">주문 취소·환불 시 자동 복원</span>
                    )}
                </div>
            </div>

            <p className={`sm:ml-4 shrink-0 text-[24px] sm:text-[28px] font-extrabold ${isActive ? "text-[#7865ff]" : "text-[#ccc]"}`}>
                {formatDiscount(coupon)}
            </p>
        </div>
    );
}

function CouponSkeleton() {
    return (
        <div className="flex animate-pulse items-center justify-between rounded-[12px] border border-[#ebe8ff] p-5">
            <div className="flex flex-col gap-2">
                <div className="h-4 w-48 rounded bg-[#ebe8ff]" />
                <div className="h-3 w-36 rounded bg-[#f0eeff]" />
                <div className="h-3 w-28 rounded bg-[#f0eeff]" />
            </div>
            <div className="h-8 w-12 rounded bg-[#ebe8ff]" />
        </div>
    );
}

export default function CouponPage() {
    const user = useAuthStore((s) => s.user);
    const { coupons, loading, error, fetchCoupons } = useCouponStore();

    useEffect(() => {
        if (user?.uid) fetchCoupons(user.uid);
    }, [user?.uid]);

    const activeCoupons = coupons.filter((c) => c.status === "active");
    const usedCoupons = coupons.filter((c) => c.status !== "active");

    return (
        <>
            <h2 className="mb-5 text-[18px] sm:text-[20px] font-bold text-[#16121f]">쿠폰</h2>

            {loading && (
                <div className="flex flex-col gap-3">
                    {[1, 2].map((i) => <CouponSkeleton key={i} />)}
                </div>
            )}

            {!loading && error && (
                <p className="py-10 text-center text-sm text-red-400">{error}</p>
            )}

            {!loading && !error && coupons.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[#9b94b2]">
                    <p className="text-[40px]">🎟️</p>
                    <p className="mt-3 text-[15px]">보유한 쿠폰이 없습니다</p>
                </div>
            )}

            {!loading && activeCoupons.length > 0 && (
                <section className="mb-6">
                    <p className="mb-3 text-[13px] font-semibold text-[#7865ff]">사용 가능 ({activeCoupons.length})</p>
                    <div className="flex flex-col gap-3">
                        {activeCoupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
                    </div>
                </section>
            )}

            {!loading && usedCoupons.length > 0 && (
                <section>
                    <p className="mb-3 text-[13px] font-semibold text-[#9b94b2]">사용 완료 / 만료 ({usedCoupons.length})</p>
                    <div className="flex flex-col gap-3">
                        {usedCoupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
                    </div>
                </section>
            )}

            {/* 안내 */}
            <div className="mt-6 rounded-[12px] border border-[#ebe8ff] bg-[#faf9ff] px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold text-[#7865ff]">쿠폰 안내</p>
                <ul className="flex flex-col gap-1.5">
                    {[
                        "주문 취소 또는 환불 신청 시 사용한 쿠폰은 자동으로 복원돼요.",
                        "만료된 쿠폰은 복원이 불가능해요.",
                        "쿠폰은 결제 시 1장만 사용 가능해요.",
                        "쿠폰 유효기간 내에만 사용 가능해요.",
                    ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-[#9b94b2]">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c4baff]" />
                            {t}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}