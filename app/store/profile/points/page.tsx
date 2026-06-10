"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, getDocs, orderBy, query, onSnapshot, doc } from "firebase/firestore";
import Link from "next/link";
import CountUp from 'react-countup'

type PointRecord = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "earn" | "use";
    createdAt: any;
};

const ITEMS_PER_PAGE = 8;

export default function PointsPage() {
    const { user } = useAuthStore();
    const [records, setRecords] = useState<PointRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [livePoints, setLivePoints] = useState(user?.points ?? 0);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
            if (snap.exists()) setLivePoints(snap.data().points ?? 0);
        });
        return () => unsub();
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) { setLoading(false); return; }
        (async () => {
            try {
                const q = query(
                    collection(db, "users", user.uid!, "pointHistory"),
                    orderBy("createdAt", "desc")
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    date: d.data().createdAt?.toDate?.()?.toLocaleDateString("ko-KR", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                    }) ?? "-",
                })) as PointRecord[];
                setRecords(data);
            } catch (err) {
                console.error("[Points]", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
    const paginated = records.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const totalEarned = records.filter(r => r.type === "earn").reduce((s, r) => s + r.amount, 0);
    const totalUsed = records.filter(r => r.type === "use").reduce((s, r) => s + Math.abs(r.amount), 0);

    return (
        <>
            <h2 className="mb-5 md:mb-6 text-[18px] md:text-[20px] font-bold text-[#16121f]">포인트 내역</h2>

            {/* 포인트 요약 카드 */}
            <div className="mb-5 md:mb-6 rounded-[16px] bg-[#f0eeff] p-4 md:p-6">
                {/* 보유 포인트 행 */}
                <div className="flex items-center gap-3 md:gap-5">
                    {/* P 아이콘 */}
                    <div className="flex h-[52px] w-[52px] md:h-[72px] md:w-[72px] shrink-0 items-center justify-center rounded-full bg-[#7865ff] shadow-[0_6px_20px_rgba(120,101,255,0.35)]">
                        <span className="text-[22px] md:text-[32px] font-black text-white" style={{ fontStyle: 'italic' }}>P</span>
                    </div>

                    {/* 보유 포인트 */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] md:text-[12px] font-medium text-[#9b94b2] mb-0.5">현재 보유 포인트</p>
                        <p className="text-[24px] md:text-[32px] font-black text-[#7865ff] leading-none">
                            <CountUp end={livePoints} duration={0.4} separator="," enableScrollSpy scrollSpyOnce />
                            <span className="text-[14px] md:text-[18px] font-bold ml-1">P</span>
                        </p>
                    </div>

                    {/* 충전 버튼 */}
                    <Link
                        href="/point"
                        className="shrink-0 flex h-[36px] md:h-[38px] items-center gap-1.5 rounded-[10px] bg-[#7865ff] px-3 md:px-5 text-[12px] md:text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(120,101,255,0.3)] transition hover:bg-[#6b55f0] active:scale-[0.98] whitespace-nowrap"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span className="hidden md:inline">포인트 충전하기</span>
                        <span className="md:hidden">충전</span>
                    </Link>
                </div>

                {/* 적립/사용 요약 */}
                <div className="mt-4 md:mt-5 grid grid-cols-2 gap-2 md:gap-3">
                    <div className="rounded-[12px] bg-white px-3 md:px-4 py-3 flex items-center gap-2 md:gap-3">
                        <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-[#f0eeff]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7865ff" strokeWidth="2.5">
                                <path d="M12 5v14M5 12l7-7 7 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] md:text-[11px] text-[#9b94b2]">총 적립</p>
                            <p className="text-[13px] md:text-[15px] font-bold text-[#16121f]">
                                +<CountUp end={totalEarned} duration={0.4} separator="," enableScrollSpy scrollSpyOnce />P
                            </p>
                        </div>
                    </div>
                    <div className="rounded-[12px] bg-white px-3 md:px-4 py-3 flex items-center gap-2 md:gap-3">
                        <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0f3]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2.5">
                                <path d="M12 19V5M5 12l7 7 7-7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] md:text-[11px] text-[#9b94b2]">총 사용</p>
                            <p className="text-[13px] md:text-[15px] font-bold text-[#16121f]">
                                -<CountUp end={totalUsed} duration={0.4} separator="," enableScrollSpy scrollSpyOnce />P
                            </p>
                        </div>
                    </div>
                </div>

                {/* OTT 연동 안내 배너 */}
                <Link href="/point"
                    className="mt-3 md:mt-4 flex items-center justify-between rounded-[12px] border border-[#c4baff] bg-white px-3 md:px-4 py-3 transition hover:border-[#7865ff] hover:shadow-[0_2px_12px_rgba(120,101,255,0.15)] group">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-[#7865ff]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] md:text-[12px] font-bold text-[#7865ff] truncate">라프텔 OTT에서 충전하기</p>
                            <p className="text-[10px] md:text-[11px] text-[#9b94b2] truncate">포인트는 OTT · 스토어 공통으로 사용돼요</p>
                        </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2"
                        className="shrink-0 group-hover:stroke-[#7865ff] transition-colors ml-2">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </Link>
            </div>

            {/* 포인트 내역 테이블 */}
            <div className="rounded-[12px] border border-[#ebe8ff] overflow-hidden">
                {/* 헤더 */}
                <div className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[1fr_2fr_auto] gap-2 md:gap-4 border-b border-[#ebe8ff] bg-[#faf9ff] px-3 md:px-6 py-3">
                    <p className="text-[11px] md:text-[12px] font-semibold text-[#9b94b2]">날짜</p>
                    <p className="text-[11px] md:text-[12px] font-semibold text-[#9b94b2]">내역</p>
                    <p className="text-[11px] md:text-[12px] font-semibold text-[#9b94b2] text-right">포인트</p>
                </div>

                {loading ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" />
                            <p className="text-[12px] text-[#9b94b2]">불러오는 중...</p>
                        </div>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="flex h-[200px] flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0eeff]">
                            <span className="text-[22px] font-black text-[#c4baff]" style={{ fontStyle: 'italic' }}>P</span>
                        </div>
                        <p className="text-[13px] text-[#9b94b2]">포인트 내역이 없어요.</p>
                        <Link href="/point"
                            className="flex items-center gap-1 text-[12px] font-semibold text-[#7865ff] underline underline-offset-2">
                            포인트 충전하러 가기
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </Link>
                    </div>
                ) : (
                    paginated.map((r, idx) => (
                        <div key={r.id}
                            className={`grid grid-cols-[80px_1fr_auto] md:grid-cols-[1fr_2fr_auto] gap-2 md:gap-4 items-center px-3 md:px-6 py-3 md:py-4 transition hover:bg-[#faf9ff] ${idx < paginated.length - 1 ? "border-b border-[#f0edf8]" : ""}`}>
                            <p className="text-[11px] md:text-[13px] text-[#9b94b2]">{r.date}</p>
                            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.type === "earn" ? "bg-[#7865ff]" : "bg-[#ff4d6d]"}`} />
                                <p className="text-[12px] md:text-[13px] font-medium text-[#16121f] truncate">{r.description}</p>
                                {r.description?.includes("충전") && (
                                    <span className="shrink-0 rounded-[4px] bg-[#f0eeff] px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold text-[#7865ff]">OTT</span>
                                )}
                                {r.description?.includes("스토어") && (
                                    <span className="shrink-0 rounded-[4px] bg-[#fff0f3] px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold text-[#ff4d6d]">STORE</span>
                                )}
                            </div>
                            <p className={`text-[13px] md:text-[14px] font-bold text-right whitespace-nowrap ${r.type === "earn" ? "text-[#7865ff]" : "text-[#ff4d6d]"}`}>
                                {r.type === "earn" ? "+" : "-"}{Math.abs(r.amount).toLocaleString()}P
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div className="mt-6 md:mt-8 flex items-center justify-center gap-1.5 md:gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    {(() => {
                        const PAGE_GROUP = 6;
                        const groupIndex = Math.floor((page - 1) / PAGE_GROUP);
                        const groupStart = groupIndex * PAGE_GROUP + 1;
                        const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, totalPages);
                        const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
                        return (
                            <>
                                {groupStart > 1 && (
                                    <button onClick={() => setPage(groupStart - 1)}
                                        className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] md:text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">
                                        ···
                                    </button>
                                )}
                                {pages.map(n => (
                                    <button key={n} onClick={() => setPage(n)}
                                        className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[10px] text-[13px] md:text-[14px] font-medium transition ${page === n ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]" : "border border-[#d8d4ee] bg-white text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                                        {n}
                                    </button>
                                ))}
                                {groupEnd < totalPages && (
                                    <button onClick={() => setPage(groupEnd + 1)}
                                        className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] md:text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">
                                        ···
                                    </button>
                                )}
                            </>
                        );
                    })()}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                </div>
            )}

            {/* 안내 문구 */}
            <div className="mt-5 md:mt-6 rounded-[12px] border border-[#ebe8ff] bg-[#faf9ff] px-4 md:px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold text-[#7865ff]">포인트 안내</p>
                <ul className="flex flex-col gap-1.5">
                    {[
                        "포인트는 라프텔 OTT 및 스토어 결제 시 공통으로 사용 가능해요.",
                        "포인트 충전은 라프텔 OTT 사이트에서 진행돼요.",
                        "포인트 유효기간은 적립일로부터 1년이에요.",
                        "멤버십 등급에 따라 포인트 적립률이 달라져요.",
                        "부정 사용이 확인될 경우 포인트가 회수될 수 있어요.",
                    ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] md:text-[12px] text-[#9b94b2]">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c4baff]" />
                            {t}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}