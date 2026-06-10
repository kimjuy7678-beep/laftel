"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, addDoc } from "firebase/firestore";

type Address = {
    id: string;
    label: string;
    name: string;
    phone: string;
    zip: string;
    address: string;
    detail: string;
    isDefault: boolean;
};

declare global {
    interface Window { daum: any; }
}

// ─── 주소 추가/수정 모달 ──────────────────────────
function AddressModal({ initial, onClose, onSave }: {
    initial?: Address | null;
    onClose: () => void;
    onSave: (data: Omit<Address, "id">) => Promise<void>;
}) {
    const [label, setLabel] = useState(initial?.label ?? "");
    const [name, setName] = useState(initial?.name ?? "");
    const [phone, setPhone] = useState(initial?.phone ?? "");
    const [zip, setZip] = useState(initial?.zip ?? "");
    const [address, setAddress] = useState(initial?.address ?? "");
    const [detail, setDetail] = useState(initial?.detail ?? "");
    const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const PRESETS = ["우리집", "회사", "부모님댁"];
    const [showCustomInput, setShowCustomInput] = useState(
        !!initial?.label && !["우리집", "회사", "부모님댁"].includes(initial?.label ?? "")
    );

    useEffect(() => {
        if (window.daum) return;
        const script = document.createElement("script");
        script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        document.head.appendChild(script);
    }, []);

    const handleSearchAddress = () => {
        if (!window.daum?.Postcode) {
            alert("주소 검색 서비스를 불러오는 중이에요. 잠시 후 다시 시도해주세요.");
            return;
        }
        new window.daum.Postcode({
            oncomplete: (data: any) => {
                setZip(data.zonecode);
                setAddress(data.roadAddress || data.jibunAddress);
            },
        }).open();
    };

    const formatPhone = (val: string) => {
        const nums = val.replace(/\D/g, "").slice(0, 11);
        if (nums.length <= 3) return nums;
        if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
        return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
    };

    const handleSubmit = async () => {
        if (!label.trim()) { setError("배송지명을 입력해주세요."); return; }
        if (!name.trim()) { setError("수령인 이름을 입력해주세요."); return; }
        if (phone.replace(/\D/g, "").length < 10) { setError("연락처를 올바르게 입력해주세요."); return; }
        if (!zip || !address) { setError("주소를 검색해주세요."); return; }
        setLoading(true);
        try {
            await onSave({ label, name, phone, zip, address, detail, isDefault });
            onClose();
        } catch {
            setError("저장에 실패했어요. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4" onClick={onClose}>
            <div className="w-full md:max-w-[500px] rounded-t-[24px] md:rounded-[20px] bg-white shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                {/* 모바일 핸들 */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-[#e2ddf5]" />
                </div>

                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-[#f0edf8] px-5 md:px-6 py-4 md:py-5 sticky top-0 bg-white z-10">
                    <h3 className="text-[15px] md:text-[16px] font-bold text-[#16121f]">
                        {initial ? "배송지 수정" : "배송지 추가"}
                    </h3>
                    <button onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2ddf5] text-[#9b94b2] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-5 md:px-6 py-4 md:py-5 flex flex-col gap-4">
                    {/* 배송지명 */}
                    <div>
                        <p className="mb-1.5 text-[12px] font-semibold text-[#6b647a]">
                            배송지명 <span className="text-[#ff4d6d]">*</span>
                        </p>
                        <div className="flex gap-2 mb-2 flex-wrap">
                            {PRESETS.map(preset => (
                                <button key={preset} onClick={() => { setLabel(preset); setShowCustomInput(false); }}
                                    className="h-[30px] rounded-full px-3 text-[11px] font-semibold transition-all"
                                    style={label === preset && !showCustomInput
                                        ? { background: '#7865ff', color: '#fff' }
                                        : { background: '#f4f2ff', color: '#9b94b2', border: '1px solid #e2ddf5' }
                                    }>
                                    {preset}
                                </button>
                            ))}
                            <button onClick={() => { setShowCustomInput(true); if (PRESETS.includes(label)) setLabel(""); }}
                                className="h-[30px] rounded-full px-3 text-[11px] font-semibold transition-all flex items-center gap-1"
                                style={showCustomInput
                                    ? { background: '#7865ff', color: '#fff' }
                                    : { background: '#f4f2ff', color: '#9b94b2', border: '1px solid #e2ddf5' }
                                }>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                직접입력
                            </button>
                        </div>
                        {showCustomInput && (
                            <div className="relative">
                                <input
                                    autoFocus
                                    value={label}
                                    onChange={e => { if (e.target.value.length <= 6) setLabel(e.target.value); }}
                                    placeholder="배송지명 입력 (최대 6자)"
                                    maxLength={6}
                                    className="w-full rounded-[10px] border border-[#7865ff] bg-[#faf9ff] px-4 py-2.5 pr-12 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]"
                                    style={{ color: label.length >= 6 ? '#ff4d6d' : '#c0bcd0' }}>
                                    {label.length}/6
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 수령인 */}
                    <div>
                        <p className="mb-1.5 text-[12px] font-semibold text-[#6b647a]">수령인 <span className="text-[#ff4d6d]">*</span></p>
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder="수령인 이름"
                            className="w-full rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-2.5 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition" />
                    </div>

                    {/* 연락처 */}
                    <div>
                        <p className="mb-1.5 text-[12px] font-semibold text-[#6b647a]">연락처 <span className="text-[#ff4d6d]">*</span></p>
                        <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                            placeholder="010-0000-0000"
                            className="w-full rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-2.5 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition" />
                    </div>

                    {/* 주소 */}
                    <div>
                        <p className="mb-1.5 text-[12px] font-semibold text-[#6b647a]">주소 <span className="text-[#ff4d6d]">*</span></p>
                        <div className="flex gap-2 mb-2">
                            <input value={zip} readOnly placeholder="우편번호"
                                className="w-[100px] md:w-[120px] rounded-[10px] border border-[#e2ddf5] bg-[#f4f2ff] px-3 md:px-4 py-2.5 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] cursor-default" />
                            <button onClick={handleSearchAddress}
                                className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#7865ff] text-[12px] md:text-[13px] font-semibold text-[#7865ff] transition hover:bg-[#f0eeff]">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" strokeLinecap="round" />
                                </svg>
                                주소 검색
                            </button>
                        </div>
                        <input value={address} readOnly placeholder="기본 주소 (주소 검색으로 입력)"
                            className="w-full rounded-[10px] border border-[#e2ddf5] bg-[#f4f2ff] px-4 py-2.5 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] mb-2 cursor-default" />
                        <input value={detail} onChange={e => setDetail(e.target.value)}
                            placeholder="상세 주소 (동/호수 등)"
                            className="w-full rounded-[10px] border border-[#e2ddf5] bg-[#faf9ff] px-4 py-2.5 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition" />
                    </div>

                    {/* 기본 배송지 */}
                    <button onClick={() => setIsDefault(v => !v)} className="flex items-center gap-2.5 py-1">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full transition-all shrink-0"
                            style={isDefault ? { background: '#7865ff' } : { border: '2px solid #d8d4ee' }}>
                            {isDefault && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                        </div>
                        <span className="text-[13px] font-semibold text-[#3d3755]">기본 배송지로 설정</span>
                    </button>

                    {error && (
                        <p className="flex items-center gap-1.5 text-[12px] text-[#ff4d6d]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
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
                            {loading ? "저장 중..." : initial ? "수정 완료" : "배송지 추가"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 삭제 확인 모달 ────────────────────────────────
function DeleteConfirmModal({ label, onClose, onConfirm }: {
    label: string; onClose: () => void; onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-[320px] md:max-w-[340px] rounded-[20px] bg-white p-5 md:p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f3]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                </div>
                <h3 className="mb-2 text-[15px] md:text-[16px] font-bold text-[#16121f]">배송지 삭제</h3>
                <p className="mb-5 text-[12px] md:text-[13px] text-[#9b94b2]">
                    <span className="font-semibold text-[#3d3755]">"{label}"</span> 배송지를 삭제할까요?<br />삭제 후 복구가 불가능해요.
                </p>
                <div className="flex gap-2">
                    <button onClick={onClose}
                        className="flex-1 h-[40px] rounded-[10px] border border-[#e2ddf5] text-[13px] font-semibold text-[#6b647a] transition hover:border-[#7865ff]">
                        취소
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 h-[40px] rounded-[10px] bg-[#ff4d6d] text-[13px] font-semibold text-white transition hover:bg-[#e6445f]">
                        삭제
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 메인 ─────────────────────────────────────────
export default function AddressPage() {
    const { user } = useAuthStore();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<Address | null | "new">(null);
    const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

    const fetchAddresses = async () => {
        if (!user?.uid) return;
        const snap = await getDocs(collection(db, "users", user.uid, "addresses"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Address));
        setAddresses(data.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)));
        setLoading(false);
    };

    useEffect(() => { fetchAddresses(); }, [user?.uid]);

    const handleSave = async (data: Omit<Address, "id">) => {
        if (!user?.uid) return;
        if (data.isDefault) {
            await Promise.all(
                addresses
                    .filter(a => a.isDefault && a.id !== (editTarget as Address)?.id)
                    .map(a => setDoc(doc(db, "users", user.uid!, "addresses", a.id), { ...a, isDefault: false }))
            );
        }
        if (editTarget && editTarget !== "new") {
            await setDoc(doc(db, "users", user.uid, "addresses", editTarget.id), { ...data });
        } else {
            await addDoc(collection(db, "users", user.uid, "addresses"), { ...data });
        }
        await fetchAddresses();
    };

    const handleDelete = async () => {
        if (!user?.uid || !deleteTarget) return;
        await deleteDoc(doc(db, "users", user.uid, "addresses", deleteTarget.id));
        setDeleteTarget(null);
        await fetchAddresses();
    };

    return (
        <>
            {/* 헤더 */}
            <div className="mb-5 md:mb-6">
                <div className="flex items-center justify-between gap-3 mb-1">
                    <h2 className="text-[18px] md:text-[20px] font-bold text-[#16121f]">배송지 관리</h2>
                    <button onClick={() => setEditTarget("new")}
                        className="shrink-0 flex h-[36px] md:h-[38px] items-center gap-1.5 rounded-[10px] bg-[#7865ff] px-3 md:px-4 text-[12px] md:text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(120,101,255,0.3)] transition hover:bg-[#6b55f0]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span className="hidden md:inline">배송지 추가</span>
                        <span className="md:hidden">추가</span>
                    </button>
                </div>
                <p className="text-[12px] md:text-[13px] text-[#9b94b2]">자주 사용하는 배송지를 등록해두면 결제 시 편리해요.</p>
            </div>

            {loading ? (
                <div className="flex h-[160px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" />
                        <p className="text-[12px] text-[#9b94b2]">불러오는 중...</p>
                    </div>
                </div>
            ) : addresses.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0eeff]">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4baff" strokeWidth="1.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                    </div>
                    <p className="text-[13px] text-[#9b94b2]">등록된 배송지가 없어요.</p>
                    <button onClick={() => setEditTarget("new")}
                        className="flex items-center gap-1 text-[12px] font-semibold text-[#7865ff] underline underline-offset-2">
                        첫 배송지 등록하기
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5 md:gap-3">
                    {addresses.map(a => (
                        <div key={a.id}
                            className="rounded-[14px] border border-[#ebe8ff] bg-white px-4 md:px-5 py-3.5 md:py-4 transition hover:border-[#c4baff]"
                            style={a.isDefault ? { borderColor: '#7865ff', boxShadow: '0 0 0 1px #7865ff20' } : {}}>
                            <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <p className="text-[13px] md:text-[14px] font-bold text-[#16121f] truncate">{a.label}</p>
                                    {a.isDefault && (
                                        <span className="shrink-0 rounded-full bg-[#f0eeff] px-2 py-0.5 text-[10px] font-bold text-[#7865ff] border border-[#d8d4ff]">
                                            기본
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 md:gap-1.5 shrink-0">
                                    <button onClick={() => setEditTarget(a)}
                                        className="flex h-[26px] md:h-[28px] items-center gap-1 rounded-[6px] border border-[#ddd8f4] px-2 md:px-2.5 text-[10px] md:text-[11px] font-semibold text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        수정
                                    </button>
                                    <button onClick={() => setDeleteTarget(a)}
                                        className="flex h-[26px] md:h-[28px] items-center gap-1 rounded-[6px] border border-[#ddd8f4] px-2 md:px-2.5 text-[10px] md:text-[11px] font-semibold text-[#9b94b2] transition hover:border-[#ff4d6d] hover:text-[#ff4d6d]">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                        </svg>
                                        삭제
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <p className="text-[12px] md:text-[13px] font-semibold text-[#3d3755]">{a.name}</p>
                                    <span className="h-3 w-px bg-[#e2ddf5]" />
                                    <p className="text-[11px] md:text-[12px] text-[#9b94b2]">{a.phone}</p>
                                </div>
                                <p className="text-[11px] md:text-[12px] text-[#6b647a] leading-relaxed">
                                    [{a.zip}] {a.address}{a.detail && ` ${a.detail}`}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {addresses.length > 0 && (
                <div className="mt-4 md:mt-5 rounded-[12px] border border-[#ebe8ff] bg-[#faf9ff] px-4 md:px-5 py-4">
                    <p className="mb-2 text-[12px] font-semibold text-[#7865ff]">배송지 안내</p>
                    <ul className="flex flex-col gap-1.5">
                        {[
                            "기본 배송지는 결제 시 자동으로 선택돼요.",
                            "배송지는 최대 10개까지 등록 가능해요.",
                            "배송 시작 후에는 배송지 변경이 불가능해요.",
                        ].map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] md:text-[12px] text-[#9b94b2]">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c4baff]" />
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {editTarget !== null && (
                <AddressModal
                    initial={editTarget === "new" ? null : editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={handleSave}
                />
            )}
            {deleteTarget && (
                <DeleteConfirmModal
                    label={deleteTarget.label}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                />
            )}
        </>
    );
}