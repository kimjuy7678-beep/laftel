// app/store/profile/page.tsx
"use client";

import { useState } from "react";

const STATUS_TABS = ["전체", "배송중", "배송완료", "교환환불"];
const STATUS_COLOR: Record<string, string> = {
    "배송시작": "text-[#7865ff]", "배송중": "text-[#7865ff]",
    "배송완료": "text-[#22c55e]", "교환환불": "text-[#ff4d6d]",
};

const MOCK_ORDERS = [
    {
        id: "1", date: "2026.12.02", status: "배송시작", total: "78,000원", usedPoints: 3000,
        items: [
            { title: "하즈네미쿠 2026년맞이 신년 피규어 한정판", price: "78,000원", option: "민트ver.MIKU", qty: 1 },
            { title: "하즈네미쿠 2026년맞이 신년 피규어 한정판", price: "78,000원", option: "민트ver.MIKU", qty: 1 },
            { title: "하즈네미쿠 2026년맞이 신년 피규어 한정판", price: "78,000원", option: "민트ver.MIKU", qty: 1 },
        ],
    },
    {
        id: "2", date: "2026.12.02", status: "배송완료", total: "78,000원", usedPoints: 3000,
        items: [
            { title: "하즈네미쿠 2026년맞이 신년 피규어 한정판", price: "78,000원", option: "민트ver.MIKU", qty: 1 },
            { title: "하즈네미쿠 2026년맞이 신년 피규어 한정판", price: "78,000원", option: "민트ver.MIKU", qty: 1 },
            { title: "하즈네미쿠 2026년맞이 신년 피규어 한정판", price: "78,000원", option: "민트ver.MIKU", qty: 1 },
        ],
    },
];

export default function ProfilePage() {
    const [tab, setTab] = useState("전체");
    const filtered = tab === "전체" ? MOCK_ORDERS : MOCK_ORDERS.filter(o =>
        tab === "배송중" ? o.status.includes("배송") && o.status !== "배송완료"
            : tab === "배송완료" ? o.status === "배송완료"
                : o.status === "교환환불"
    );

    return (
        <>
            <h2 className="mb-5 text-[20px] font-bold text-[#16121f]">구매목록</h2>
            <div className="mb-5 flex items-center gap-6 border-b border-[#f0edf8]">
                {STATUS_TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`pb-3 text-[13px] font-semibold transition border-b-2 ${tab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
                        {t}
                    </button>
                ))}
            </div>
            <div className="mb-5 flex items-center gap-2">
                <input type="date" className="h-[36px] rounded-[8px] border border-[#ddd8f4] px-3 text-[12px] text-[#3d3755] outline-none focus:border-[#7865ff]" />
                <span className="text-[#9b94b2]">~</span>
                <input type="date" className="h-[36px] rounded-[8px] border border-[#ddd8f4] px-3 text-[12px] text-[#3d3755] outline-none focus:border-[#7865ff]" />
                <button className="h-[36px] rounded-[8px] bg-[#7865ff] px-4 text-[12px] font-semibold text-white">기간 검색</button>
            </div>
            <div className="flex flex-col gap-4">
                {filtered.map(order => (
                    <div key={order.id} className="rounded-[12px] border border-[#ebe8ff] p-5">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="mb-3 text-[12px] text-[#9b94b2]">{order.date}</p>
                                {order.items.map((item, i) => (
                                    <div key={i} className="mb-3 flex items-center gap-3">
                                        <div className="h-[56px] w-[56px] shrink-0 rounded-[8px] bg-[#f0eeff]" />
                                        <div>
                                            <p className="text-[13px] font-medium text-[#16121f]">{item.title}</p>
                                            <p className="text-[11px] text-[#9b94b2]">옵션 : {item.option}</p>
                                            <p className="text-[12px] font-bold text-[#16121f]">{item.price}</p>
                                            <p className="text-[11px] text-[#9b94b2]">총 수량 : {item.qty}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="shrink-0 text-right">
                                <p className={`mb-1 text-[13px] font-bold ${STATUS_COLOR[order.status] ?? "text-[#7865ff]"}`}>{order.status}</p>
                                <p className="text-[17px] font-bold text-[#16121f]">{order.total}</p>
                                <p className="text-[11px] text-[#9b94b2]">🪙 {order.usedPoints.toLocaleString()}원</p>
                                {order.status === "배송완료" && (
                                    <button className="mt-2 rounded-[8px] border border-[#ddd8f4] px-3 py-1 text-[11px] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]">교환 / 환불 신청</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-4 text-right text-[11px] text-[#9b94b2]">※ 단순변심으로 인한 교환은 불가능합니다</p>
        </>
    );
}