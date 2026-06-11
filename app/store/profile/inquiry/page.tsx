"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";

type InquiryStatus = "답변대기" | "답변완료";
type InquiryCategory = "상품문의" | "배송문의" | "교환/환불" | "기타";

type Inquiry = {
    id: string;
    category: InquiryCategory;
    title: string;
    content: string;
    status: InquiryStatus;
    answer?: string;
    answeredAt?: string;
    createdAt: any;
    date: string;
};

const CATEGORIES: InquiryCategory[] = ["상품문의", "배송문의", "교환/환불", "기타"];
const STATUS_TABS = ["전체", "답변대기", "답변완료"];

const STATUS_STYLE: Record<InquiryStatus, { bg: string; color: string }> = {
    "답변대기": { bg: "#fff8e6", color: "#d97706" },
    "답변완료": { bg: "#f0eeff", color: "#7865ff" },
};

function WriteModal({ onClose, onSubmit }: {
    onClose: () => void;
    onSubmit: (data: { category: InquiryCategory; title: string; content: string }) => Promise<void>;
}) {
    const [category, setCategory] = useState<InquiryCategory>("상품문의");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!title.trim()) { setError("제목을 입력해주세요."); return; }
        if (content.trim().length < 10) { setError("내용을 10자 이상 입력해주세요."); return; }
        setLoading(true);
        try {
            await onSubmit({ category, title, content });
            onClose();
        } catch {
            setError("문의 등록에 실패했어요. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
            <div className="w-full md:max-w-[520px] rounded-t-[24px] md:rounded-[20px] bg-white shadow-2xl overflow-hidden">
                {/* 모바일 핸들 */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-[#e2ddf5]" />
                </div>
                <div className="flex items-center justify-between border-b border-[#f0edf8] px-5 md:px-6 py-4 md:py-5">
                    <h3 className="text-[16px] font-bold text-[#16121f]">문의 작성</h3>
                    <button onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2ddf5] text-[#9b94b2] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="px-5 md:px-6 py-4 md:py-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <p className="mb-2 text-[12px] font-semibold text-[#6b647a]">문의 유형</p>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(c => (
                                <button key={c} onClick={() => setCategory(c)}
                                    className="h-[32px] rounded-full px-3.5 text-[12px] font-semibold transition-all"
                                    style={category === c
                                        ? { background: '#7865ff', color: '#fff' }
                                        : { background: '#f4f2ff', color: '#9b94b2', border: '1px solid #e2ddf5' }
                                    }>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="mb-2 text-[12px] font-semibold text-[#6b647a]">제목</p>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="문의 제목을 입력해주세요."
                            className="w-full rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-2.5 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition" />
                    </div>
                    <div>
                        <p className="mb-2 text-[12px] font-semibold text-[#6b647a]">내용</p>
                        <textarea value={content} onChange={e => setContent(e.target.value)}
                            placeholder="문의 내용을 자세히 입력해주세요. (10자 이상)"
                            rows={5}
                            className="w-full resize-none rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-3 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition" />
                        <p className="mt-1 text-right text-[11px] text-[#c0bcd0]">{content.length}자</p>
                    </div>
                    {error && (
                        <p className="flex items-center gap-1.5 text-[12px] text-[#ff4d6d]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {error}
                        </p>
                    )}
                    <div className="flex gap-2 pt-1 pb-2 md:pb-0">
                        <button onClick={onClose}
                            className="flex-1 h-[44px] md:h-[42px] rounded-[10px] border border-[#e2ddf5] text-[13px] font-semibold text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                            취소
                        </button>
                        <button onClick={handleSubmit} disabled={loading}
                            className="flex-1 h-[44px] md:h-[42px] rounded-[10px] bg-[#7865ff] text-[13px] font-semibold text-white transition hover:bg-[#6b55f0] disabled:opacity-50">
                            {loading ? "등록 중..." : "문의 등록"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InquiryCard({ inquiry, onDelete }: {
    inquiry: Inquiry;
    onDelete: (id: string) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const statusStyle = STATUS_STYLE[inquiry.status];

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("문의를 삭제할까요?")) return;
        setDeleting(true);
        await onDelete(inquiry.id);
        setDeleting(false);
    };

    return (
        <div className="rounded-[12px] border border-[#ebe8ff] overflow-hidden transition hover:border-[#c4baff]">
            <button onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 md:py-4 text-left bg-white hover:bg-[#faf9ff] transition">
                <span className="shrink-0 rounded-[6px] bg-[#f0eeff] px-2 md:px-2.5 py-1 text-[11px] font-bold text-[#7865ff]">
                    {inquiry.category}
                </span>
                <p className="flex-1 min-w-0 truncate text-[12px] md:text-[13px] font-semibold text-[#16121f]">
                    {inquiry.title}
                </p>
                <span className="shrink-0 rounded-full px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-bold"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}>
                    {inquiry.status}
                </span>
                <span className="shrink-0 text-[11px] text-[#9b94b2] hidden md:block">{inquiry.date}</span>
                {inquiry.status === "답변대기" && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#ffd0d8] text-[#ff4d6d] transition hover:bg-[#fff0f3] disabled:opacity-40"
                        title="문의 삭제">
                        {deleting
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                        }
                    </button>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b94b2" strokeWidth="2"
                    className="shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {open && (
                <div className="px-3 py-1 bg-white border-t border-[#f5f3ff] md:hidden">
                    <p className="text-[11px] text-[#c0bcd0]">{inquiry.date}</p>
                </div>
            )}

            {open && (
                <div className="border-t border-[#f0edf8]">
                    <div className="px-3 md:px-5 py-4 bg-[#faf9ff]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-[#e2ddf5]">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7865ff" strokeWidth="2.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <p className="text-[11px] font-bold text-[#9b94b2]">내 문의</p>
                        </div>
                        <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap">{inquiry.content}</p>
                    </div>
                    {inquiry.status === "답변완료" && inquiry.answer ? (
                        <div className="px-3 md:px-5 py-4 bg-[#f0eeff] border-t border-[#e8e2ff]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-[#7865ff]">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <p className="text-[11px] font-bold text-[#7865ff]">라프텔 스토어</p>
                                {inquiry.answeredAt && <p className="ml-auto text-[11px] text-[#c0bcd0]">{inquiry.answeredAt}</p>}
                            </div>
                            <p className="text-[13px] text-[#3d3755] leading-relaxed whitespace-pre-wrap">{inquiry.answer}</p>
                        </div>
                    ) : (
                        <div className="px-3 md:px-5 py-4 bg-[#fffbf0] border-t border-[#fde68a]/40 flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                            </svg>
                            <p className="text-[12px] text-[#d97706] font-medium">답변 준비 중이에요. 영업일 기준 1~3일 내에 답변드릴게요.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function InquiryPage() {
    const { user } = useAuthStore();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("전체");
    const [showWrite, setShowWrite] = useState(false);

    const fetchInquiries = async () => {
        if (!user?.uid) return;
        try {
            const q = query(collection(db, "users", user.uid, "inquiries"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({
                id: d.id, ...d.data(),
                date: d.data().createdAt?.toDate?.()?.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) ?? "-",
                answeredAt: d.data().answeredAt?.toDate?.()?.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }),
            })) as Inquiry[];
            setInquiries(data);
        } catch (err) { console.error("[Inquiries]", err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (user?.uid) fetchInquiries();
        else setLoading(false);
    }, [user?.uid]);

    const handleSubmit = async (data: { category: InquiryCategory; title: string; content: string }) => {
        if (!user?.uid) return;
        await addDoc(collection(db, "users", user.uid, "inquiries"), {
            ...data, status: "답변대기", createdAt: serverTimestamp(),
        });
        await fetchInquiries();
    };

    const handleDelete = async (id: string) => {
        if (!user?.uid) return;
        await deleteDoc(doc(db, "users", user.uid, "inquiries", id));
        setInquiries(prev => prev.filter(i => i.id !== id));
    };

    const filtered = inquiries.filter(i => tab === "전체" || i.status === tab);
    const waitCount = inquiries.filter(i => i.status === "답변대기").length;
    const doneCount = inquiries.filter(i => i.status === "답변완료").length;

    return (
        <>
            {/* 헤더 */}
            <div className="mb-5 md:mb-6">
                <div className="flex items-center justify-between gap-3 mb-1">
                    <h2 className="text-[18px] md:text-[20px] font-bold text-[#16121f]">문의 내역</h2>
                    <button onClick={() => setShowWrite(true)}
                        className="flex shrink-0 h-[36px] items-center gap-1.5 rounded-[10px] bg-[#7865ff] px-3 md:px-4 text-[12px] md:text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(120,101,255,0.3)] transition hover:bg-[#6b55f0]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        문의하기
                    </button>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#9b94b2]">상품, 배송, 교환/환불 관련 문의를 남겨주세요.</p>
            </div>

            {/* 통계 카드 */}
            <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
                {[
                    { label: "전체 문의", labelMobile: "전체", value: inquiries.length, unit: "건", color: "#7865ff", bg: "#f0eeff" },
                    { label: "답변대기", labelMobile: "대기", value: waitCount, unit: "건", color: "#d97706", bg: "#fff8e6" },
                    { label: "답변완료", labelMobile: "완료", value: doneCount, unit: "건", color: "#16a34a", bg: "#f0fdf4" },
                ].map(s => (
                    <div key={s.label} className="rounded-[12px] border border-[#ebe8ff] bg-white px-2.5 md:px-4 py-3 flex flex-col items-center justify-center gap-1 md:flex-row md:items-center md:gap-3">
                        <div className="hidden md:flex h-9 w-9 shrink-0 rounded-full items-center justify-center" style={{ background: s.bg }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div className="flex flex-col items-center md:items-start">
                            <p className="text-[10px] md:text-[11px] text-[#9b94b2]">
                                <span className="md:hidden">{s.labelMobile}</span>
                                <span className="hidden md:inline">{s.label}</span>
                            </p>
                            <p className="text-[18px] md:text-[16px] font-bold leading-none md:leading-normal" style={{ color: s.color }}>
                                {s.value}
                                <span className="text-[10px] md:text-[11px] font-medium ml-0.5 hidden md:inline">{s.unit}</span>
                            </p>
                            <p className="text-[10px] text-[#9b94b2] md:hidden">건</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 탭 */}
            <div className="mb-4 flex items-center gap-4 md:gap-5 border-b border-[#f0edf8] overflow-x-auto">
                {STATUS_TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`pb-3 text-[13px] font-semibold transition border-b-2 whitespace-nowrap ${tab === t ? "border-[#7865ff] text-[#7865ff]" : "border-transparent text-[#9b94b2] hover:text-[#3d3755]"}`}>
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
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" />
                        <p className="text-[12px] text-[#9b94b2]">불러오는 중...</p>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex h-[220px] flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0eeff]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c4baff" strokeWidth="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <p className="text-[13px] text-[#9b94b2]">{tab === "전체" ? "아직 문의 내역이 없어요." : `${tab} 문의가 없어요.`}</p>
                    {tab === "전체" && (
                        <button onClick={() => setShowWrite(true)}
                            className="flex items-center gap-1 text-[12px] font-semibold text-[#7865ff] underline underline-offset-2">
                            첫 문의 남기기
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {filtered.map(inquiry => (
                        <InquiryCard key={inquiry.id} inquiry={inquiry} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            {/* 안내 */}
            <div className="mt-5 md:mt-6 rounded-[12px] border border-[#ebe8ff] bg-[#faf9ff] px-4 md:px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold text-[#7865ff]">문의 안내</p>
                <ul className="flex flex-col gap-1.5">
                    {[
                        "문의 답변은 영업일 기준 1~3일 내에 드려요.",
                        "주문번호를 함께 남겨주시면 더 빠른 답변이 가능해요.",
                        "교환/환불은 수령 후 7일 이내에 신청 가능해요.",
                        "단순 변심으로 인한 교환은 불가능합니다.",
                    ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-[#9b94b2]">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c4baff]" />
                            {t}
                        </li>
                    ))}
                </ul>
            </div>

            {showWrite && <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleSubmit} />}
        </>
    );
}