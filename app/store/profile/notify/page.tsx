// app/store/profile/payment/page.tsx
"use client";

const PAYMENTS = [
    { id: 1, label: "생활비 통장카드", method: "카카오페이", number: "202020202020-202020202020", registeredAt: "2026.01.02" },
];

export default function PaymentPage() {
    return (
        <>
            <h2 className="mb-5 text-[20px] font-bold text-[#16121f]">결제수단</h2>
            <div className="flex flex-col gap-3">
                {PAYMENTS.map(p => (
                    <div key={p.id} className="rounded-[12px] border border-[#ebe8ff] p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[14px] font-bold text-[#7865ff]">{p.label}</p>
                            <div className="flex gap-2">
                                <button className="rounded-[6px] border border-[#ddd8f4] px-3 py-1 text-[11px] text-[#9b94b2] hover:border-[#ff4d6d] hover:text-[#ff4d6d]">삭제</button>
                                <button className="rounded-[6px] border border-[#ddd8f4] px-3 py-1 text-[11px] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff]">수정</button>
                            </div>
                        </div>
                        <p className="text-[12px] text-[#9b94b2]">{p.method}</p>
                        <p className="text-[12px] text-[#9b94b2]">{p.number}</p>
                        <p className="text-[12px] text-[#9b94b2]">등록일 : {p.registeredAt}</p>
                    </div>
                ))}
            </div>
        </>
    );
}