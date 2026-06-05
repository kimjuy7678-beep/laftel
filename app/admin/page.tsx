"use client";

// app/admin/page.tsx
// 접근 제한: ADMIN_EMAIL 과 일치하는 계정만 진입 가능

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { db } from "@/firebase/firebase";
import {
    collectionGroup, collection, getDocs, query, orderBy,
    doc, updateDoc, serverTimestamp, where
} from "firebase/firestore";
import { saveStoreNotification } from "@/utils/storeNotification";

// ── 관리자 이메일 (본인 이메일로 교체) ──────────────────────────────────────
const ADMIN_EMAIL = "cky0u0@gmail.com";

type InquiryStatus = "답변대기" | "답변완료";

interface Inquiry {
    id: string;
    uid: string;          // 문의 작성자 uid
    category: string;
    title: string;
    content: string;
    status: InquiryStatus;
    answer?: string;
    answeredAt?: any;
    createdAt: any;
    date: string;
    userEmail?: string;
}

const STATUS_STYLE: Record<InquiryStatus, { bg: string; color: string }> = {
    "답변대기": { bg: "#fff8e6", color: "#d97706" },
    "답변완료": { bg: "#f0eeff", color: "#7865ff" },
};

// ─── 답변 모달 ───────────────────────────────────────────────────────────────
function AnswerModal({
    inquiry,
    onClose,
    onSave,
}: {
    inquiry: Inquiry;
    onClose: () => void;
    onSave: (answer: string) => Promise<void>;
}) {
    const [answer, setAnswer] = useState(inquiry.answer ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (answer.trim().length < 5) { setError("답변을 5자 이상 입력해주세요."); return; }
        setLoading(true);
        try {
            await onSave(answer.trim());
            onClose();
        } catch {
            setError("저장 중 오류가 발생했어요. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}>
            <div className="w-full max-w-[560px] bg-white rounded-[20px] shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-[#f0edf8] px-6 py-5">
                    <div>
                        <h3 className="text-[15px] font-bold text-[#16121f]">답변 작성</h3>
                        <p className="mt-0.5 text-[12px] text-[#9b94b2] truncate max-w-[380px]">{inquiry.title}</p>
                    </div>
                    <button onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2ddf5] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    {/* 원문 */}
                    <div className="rounded-[12px] bg-[#faf9ff] border border-[#ebe8ff] px-4 py-3">
                        <p className="mb-1.5 text-[11px] font-bold text-[#9b94b2]">고객 문의</p>
                        <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap line-clamp-4">
                            {inquiry.content}
                        </p>
                    </div>

                    {/* 답변 입력 */}
                    <div>
                        <p className="mb-2 text-[12px] font-semibold text-[#6b647a]">답변 내용</p>
                        <textarea
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder="고객에게 전달할 답변을 입력해주세요."
                            rows={6}
                            className="w-full resize-none rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-3 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition"
                        />
                        <p className="mt-1 text-right text-[11px] text-[#c0bcd0]">{answer.length}자</p>
                    </div>

                    {error && (
                        <p className="text-[12px] text-[#ff4d6d] flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </p>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button onClick={onClose}
                            className="flex-1 h-[42px] rounded-[10px] border border-[#e2ddf5] text-[13px] font-semibold text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition">
                            취소
                        </button>
                        <button onClick={handleSave} disabled={loading}
                            className="flex-1 h-[42px] rounded-[10px] bg-[#7865ff] text-[13px] font-semibold text-white hover:bg-[#6b55f0] disabled:opacity-50 transition">
                            {loading ? "저장 중..." : "답변 등록"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 문의 카드 ───────────────────────────────────────────────────────────────
function InquiryRow({
    inquiry,
    onAnswer,
}: {
    inquiry: Inquiry;
    onAnswer: (inquiry: Inquiry) => void;
}) {
    const [open, setOpen] = useState(false);
    const s = STATUS_STYLE[inquiry.status];

    return (
        <div className="rounded-[12px] border border-[#ebe8ff] overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left bg-white hover:bg-[#faf9ff] transition">
                <span className="shrink-0 rounded-[6px] bg-[#f0eeff] px-2.5 py-1 text-[11px] font-bold text-[#7865ff]">
                    {inquiry.category}
                </span>
                <p className="flex-1 min-w-0 truncate text-[13px] font-semibold text-[#16121f]">
                    {inquiry.title}
                </p>
                {inquiry.userEmail && (
                    <span className="shrink-0 text-[11px] text-[#c0bcd0] hidden md:block">{inquiry.userEmail}</span>
                )}
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ background: s.bg, color: s.color }}>
                    {inquiry.status}
                </span>
                <span className="shrink-0 text-[11px] text-[#9b94b2] hidden sm:block">{inquiry.date}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2"
                    className="shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {open && (
                <div className="border-t border-[#f0edf8]">
                    {/* 문의 내용 */}
                    <div className="px-5 py-4 bg-[#faf9ff]">
                        <p className="mb-1.5 text-[11px] font-bold text-[#9b94b2]">고객 문의</p>
                        <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap">{inquiry.content}</p>
                    </div>

                    {/* 기존 답변 or 답변 대기 */}
                    {inquiry.status === "답변완료" && inquiry.answer ? (
                        <div className="px-5 py-4 bg-[#f0eeff] border-t border-[#e8e2ff]">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-[#7865ff]">라프텔 스토어 답변</p>
                                <button
                                    onClick={() => onAnswer(inquiry)}
                                    className="text-[11px] text-[#9b94b2] hover:text-[#7865ff] transition underline underline-offset-2">
                                    수정
                                </button>
                            </div>
                            <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap">{inquiry.answer}</p>
                        </div>
                    ) : (
                        <div className="px-5 py-4 border-t border-[#f0edf8] flex items-center justify-between">
                            <p className="text-[12px] text-[#d97706]">아직 답변이 등록되지 않았어요.</p>
                            <button
                                onClick={() => onAnswer(inquiry)}
                                className="flex items-center gap-1.5 h-[34px] px-4 rounded-[8px] bg-[#7865ff] text-[12px] font-semibold text-white hover:bg-[#6b55f0] transition">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                답변 달기
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"전체" | "답변대기" | "답변완료">("전체");
    const [target, setTarget] = useState<Inquiry | null>(null);

    // ── 접근 제한 ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (user === null) return; // 아직 로드 중
        if (user?.email !== ADMIN_EMAIL) {
            router.replace("/");
        }
    }, [user]);

    // ── 전체 유저 문의 로드 (collectionGroup) ──────────────────────────────
    const fetchAll = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(
                query(collectionGroup(db, "inquiries"), orderBy("createdAt", "desc"))
            );
            const data = snap.docs.map(d => {
                // path: users/{uid}/inquiries/{id}
                const uid = d.ref.parent.parent?.id ?? "";
                return {
                    id: d.id,
                    uid,
                    ...d.data(),
                    date: d.data().createdAt?.toDate?.()?.toLocaleDateString("ko-KR", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                    }) ?? "-",
                };
            }) as Inquiry[];
            setInquiries(data);
        } catch (err) {
            console.error("[Admin] inquiries load error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.email === ADMIN_EMAIL) fetchAll();
    }, [user]);

    // ── 답변 저장 ──────────────────────────────────────────────────────────
    const handleSave = async (answer: string) => {
        if (!target) return;
        const ref = doc(db, "users", target.uid, "inquiries", target.id);
        await updateDoc(ref, {
            answer,
            status: "답변완료",
            answeredAt: serverTimestamp(),
        });

        // 알림 저장 — 문의 작성자에게
        await saveStoreNotification(target.uid, {
            type: "event",
            title: "문의 답변이 등록됐어요",
            body: `'${target.title}' 문의에 답변이 달렸어요.`,
            link: "/store/mypage/inquiry",
        });

        // 로컬 state 업데이트
        setInquiries(prev => prev.map(i =>
            i.id === target.id && i.uid === target.uid
                ? { ...i, answer, status: "답변완료" }
                : i
        ));
    };

    const filtered = inquiries.filter(i => tab === "전체" || i.status === tab);
    const waitCount = inquiries.filter(i => i.status === "답변대기").length;

    // 접근 제한 중 렌더 방지
    if (!user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen bg-[#f5f3ff] flex items-center justify-center">
                <p className="text-[14px] text-[#9b94b2]">접근 권한이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f3ff]">
            {target && (
                <AnswerModal
                    inquiry={target}
                    onClose={() => setTarget(null)}
                    onSave={handleSave}
                />
            )}

            {/* 헤더 */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#ebe8ff]">
                <div className="mx-auto max-w-[1200px] px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-[#7865ff] text-white px-2 py-0.5 rounded-full">ADMIN</span>
                        <span className="text-[14px] font-bold text-[#16121f]">라프텔 스토어 관리자</span>
                    </div>
                    <span className="text-[12px] text-[#9b94b2]">{user.email}</span>
                </div>
            </header>

            <main className="mx-auto max-w-[1200px] px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-[24px] font-bold text-[#16121f]">문의 관리</h1>
                    <p className="mt-1 text-[13px] text-[#9b94b2]">전체 고객 문의를 확인하고 답변을 등록하세요.</p>
                </div>

                {/* 요약 */}
                <div className="mb-6 grid grid-cols-3 gap-3">
                    {[
                        { label: "전체 문의", value: inquiries.length, color: "#7865ff", bg: "#f0eeff" },
                        { label: "답변대기", value: waitCount, color: "#d97706", bg: "#fff8e6" },
                        { label: "답변완료", value: inquiries.length - waitCount, color: "#16a34a", bg: "#f0fdf4" },
                    ].map(s => (
                        <div key={s.label} className="rounded-[14px] border border-[#ebe8ff] bg-white px-5 py-4">
                            <p className="text-[12px] text-[#9b94b2]">{s.label}</p>
                            <p className="mt-1 text-[22px] font-bold" style={{ color: s.color }}>{s.value}<span className="text-[13px] font-medium ml-1">건</span></p>
                        </div>
                    ))}
                </div>

                {/* 탭 */}
                <div className="mb-4 flex items-center gap-5 border-b border-[#f0edf8]">
                    {(["전체", "답변대기", "답변완료"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`pb-3 text-[13px] font-semibold transition border-b-2 ${tab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
                            {t}
                            {t === "답변대기" && waitCount > 0 && (
                                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7865ff] px-1 text-[10px] font-bold text-white">
                                    {waitCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* 목록 */}
                {loading ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center">
                        <p className="text-[13px] text-[#9b94b2]">문의가 없어요.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {filtered.map(i => (
                            <InquiryRow key={`${i.uid}-${i.id}`} inquiry={i} onAnswer={setTarget} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}