// app/store/profile/coupon/page.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCouponStore } from "@/store/useCouponStore";
import type { Coupon } from "@/lib/coupon";
import { Timestamp } from "firebase/firestore";

// ─── 날짜 포맷 헬퍼 ────────────────────────────────────────────────────────

function formatDate(ts: Timestamp | null | undefined): string {
    if (!ts) return "-";
    const d = ts.toDate();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}.${mm}.${dd}`;
}

function formatFullDate(ts: Timestamp | null | undefined): string {
    if (!ts) return "-";
    const d = ts.toDate();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 할인 표시 헬퍼 ────────────────────────────────────────────────────────

function formatDiscount(coupon: Coupon): string {
    if (coupon.type === "rate") return `${Math.round(coupon.discount * 100)}%`;
    return `${coupon.discount.toLocaleString("ko-KR")}원`;
}

// ─── 상태 뱃지 ─────────────────────────────────────────────────────────────

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

// ─── 쿠폰 카드 ─────────────────────────────────────────────────────────────

function CouponCard({ coupon }: { coupon: Coupon }) {
    const isActive = coupon.status === "active";

    return (
        <div
            className={`flex items-center justify-between rounded-[12px] border p-5 transition-opacity ${isActive ? "border-[#ebe8ff]" : "border-[#e8e8e8] opacity-60"
                }`}
        >
            <div className="flex flex-col gap-1">
                <p
                    className={`text-[15px] font-semibold ${isActive ? "text-[#16121f]" : "text-[#9b94b2]"
                        }`}
                >
                    {coupon.label}
                </p>
                {coupon.expiresAt && (
                    <p className="text-[12px] text-[#9b94b2]">
                        사용기간 : {formatFullDate(coupon.issuedAt)} ~{" "}
                        {formatFullDate(coupon.expiresAt)}
                    </p>
                )}
                <p className="text-[12px] text-[#9b94b2]">
                    발급일자 : {formatDate(coupon.issuedAt)}
                </p>
                {coupon.minOrderAmount > 0 && (
                    <p className="text-[12px] text-[#9b94b2]">
                        최소 주문금액 :{" "}
                        {coupon.minOrderAmount.toLocaleString("ko-KR")}원 이상
                    </p>
                )}
                <span
                    className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[coupon.status]} bg-[#f5f4ff]`}
                >
                    {STATUS_LABEL[coupon.status]}
                </span>
            </div>

            <p
                className={`ml-4 shrink-0 text-[28px] font-extrabold ${isActive ? "text-[#7865ff]" : "text-[#ccc]"
                    }`}
            >
                {formatDiscount(coupon)}
            </p>
        </div>
    );
}

// ─── 스켈레톤 ──────────────────────────────────────────────────────────────

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

// ─── 메인 페이지 ───────────────────────────────────────────────────────────

export default function CouponPage() {
    const user = useAuthStore((s) => s.user);
    const { coupons, loading, error, fetchCoupons } = useCouponStore();

    useEffect(() => {
        if (user?.uid) {
            fetchCoupons(user.uid);
        }
    }, [user?.uid]);

    const activeCoupons = coupons.filter((c) => c.status === "active");
    const usedCoupons = coupons.filter((c) => c.status !== "active");

    return (
        <>
            <h2 className="mb-5 text-[20px] font-bold text-[#16121f]">쿠폰</h2>

            {/* 로딩 */}
            {loading && (
                <div className="flex flex-col gap-3">
                    {[1, 2].map((i) => (
                        <CouponSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* 에러 */}
            {!loading && error && (
                <p className="py-10 text-center text-sm text-red-400">{error}</p>
            )}

            {/* 빈 상태 */}
            {!loading && !error && coupons.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[#9b94b2]">
                    <p className="text-[40px]">🎟️</p>
                    <p className="mt-3 text-[15px]">보유한 쿠폰이 없습니다</p>
                </div>
            )}

            {/* 사용 가능 쿠폰 */}
            {!loading && activeCoupons.length > 0 && (
                <section className="mb-6">
                    <p className="mb-3 text-[13px] font-semibold text-[#7865ff]">
                        사용 가능 ({activeCoupons.length})
                    </p>
                    <div className="flex flex-col gap-3">
                        {activeCoupons.map((c) => (
                            <CouponCard key={c.id} coupon={c} />
                        ))}
                    </div>
                </section>
            )}

            {/* 사용 완료 / 만료 쿠폰 */}
            {!loading && usedCoupons.length > 0 && (
                <section>
                    <p className="mb-3 text-[13px] font-semibold text-[#9b94b2]">
                        사용 완료 / 만료 ({usedCoupons.length})
                    </p>
                    <div className="flex flex-col gap-3">
                        {usedCoupons.map((c) => (
                            <CouponCard key={c.id} coupon={c} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}