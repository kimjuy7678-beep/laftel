// app/store/profile/coupon/page.tsx
"use client";

const COUPONS = [
    { id: 1, name: "베이직 플랜 회원 월별 발급 쿠폰", period: "2025.06.01 ~ 2026.01.01", issuedAt: "25.05.01", discount: "50%" },
    { id: 2, name: "베이직 플랜 회원 월별 발급 쿠폰", period: "2025.06.01 ~ 2026.01.01", issuedAt: "25.05.01", discount: "50%" },
];

export default function CouponPage() {
    return (
        <>
            <h2 className="mb-5 text-[20px] font-bold text-[#16121f]">쿠폰</h2>
            <div className="flex flex-col gap-3">
                {COUPONS.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-[12px] border border-[#ebe8ff] p-5">
                        <div>
                            <p className="text-[15px] font-semibold text-[#16121f]">{c.name}</p>
                            <p className="mt-1 text-[12px] text-[#9b94b2]">사용기간 : {c.period}</p>
                            <p className="text-[12px] text-[#9b94b2]">발급일자 : {c.issuedAt}</p>
                        </div>
                        <p className="text-[28px] font-extrabold text-[#7865ff]">{c.discount}</p>
                    </div>
                ))}
            </div>
        </>
    );
}