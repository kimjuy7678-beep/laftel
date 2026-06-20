"use client";

// app/store/order/page.tsx

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useAuthStore } from "@/store/useAuthStore";
import { useCouponStore } from "@/store/useCouponStore";
import { db } from "@/firebase/firebase";
import {
    collection, addDoc, serverTimestamp, arrayRemove,
    doc, setDoc, onSnapshot, getDoc, getDocs, runTransaction,
} from "firebase/firestore";
import type { Coupon } from "@/lib/coupon";
import { calcCouponDiscount, useCoupon as markCouponUsed } from "@/lib/coupon";
import { getLimitedInitialQuantity, isLimitedStoreProduct, LIMITED_STOCK_COLLECTION } from "@/lib/storeLimitedProducts";

type DaumPostcodeData = {
    roadAddress?: string;
    jibunAddress?: string;
    zonecode: string;
};

type DaumPostcodeConstructor = new (options: {
    oncomplete: (data: DaumPostcodeData) => void;
    theme?: Record<string, string>;
}) => { open: () => void };

type DaumPostcodeApi = {
    Postcode?: DaumPostcodeConstructor;
};

// ─── 타입 ────────────────────────────────────────────────────────────────────
type SavedAddress = {
    id: string;
    label?: string;
    name: string;
    phone: string;
    address: string;
    detail: string;
    zip: string;
    isDefault?: boolean;
};

type SavedCard = {
    id: string;
    name?: string;
    brand: string;
    last4: string;
    expiry?: string;
    isDefault?: boolean;
};

const PAYMENT_PROVIDER_METHODS = [
    { id: "kakaopay", label: "카카오페이", img: "/images/pay/kakao.png" },
    { id: "naverpay", label: "네이버페이", img: "/images/pay/naver.png" },
    { id: "tosspay", label: "토스페이", img: "/images/pay/toss.png" },
    { id: "applepay", label: "Apple Pay", img: "/images/pay/apple.png", tall: true },
];

// ─── 애니메이션 숫자 훅 ──────────────────────────────────────────────────────
function useAnimatedNumber(target: number, duration = 350) {
    const [display, setDisplay] = useState(target);
    const prev = useRef(target);
    const raf = useRef<number | null>(null);

    useEffect(() => {
        const start = prev.current;
        const diff = target - start;
        if (diff === 0) return;
        const startTime = performance.now();

        const tick = (now: number) => {
            const t = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(start + diff * ease));
            if (t < 1) raf.current = requestAnimationFrame(tick);
            else { setDisplay(target); prev.current = target; }
        };
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(tick);
        return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [target, duration]);

    return display;
}

// ─── 플래시 하이라이트 훅 ────────────────────────────────────────────────────
function useFlash(value: number) {
    const [flash, setFlash] = useState<"up" | "down" | null>(null);
    const prev = useRef(value);
    useEffect(() => {
        if (value === prev.current) return;
        setFlash(value < prev.current ? "down" : "up");
        prev.current = value;
        const t = setTimeout(() => setFlash(null), 600);
        return () => clearTimeout(t);
    }, [value]);
    return flash;
}

// ─── 공통 모달 래퍼 ──────────────────────────────────────────────────────────
function ModalWrap({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}>
            {/* 모바일: 바텀시트 / sm+: 센터 모달 */}
            <div className="w-full sm:max-w-[420px] bg-white sm:rounded-[24px] rounded-t-[24px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: "modalIn 0.2s ease" }}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[16px] font-extrabold text-[#111018]">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f3ff] flex items-center justify-center hover:bg-[#ebe8ff] transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                {children}
            </div>
            <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        </div>
    );
}

// ─── 전화번호 하이픈 포맷 ────────────────────────────────────────────────────
function formatPhone(val: string): string {
    const nums = val.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

// ─── 인풋 필드 ───────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, error, type = "text" }: {
    label: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    error?: boolean;
    type?: string;
}) {
    const [nonNumericWarn, setNonNumericWarn] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (type === "tel") {
            const raw = e.target.value;
            if (/[^0-9\-]/.test(raw)) {
                setNonNumericWarn(true);
                setTimeout(() => setNonNumericWarn(false), 1500);
            }
            const formatted = formatPhone(raw);
            const syntheticEvent = Object.assign({}, e, {
                target: Object.assign({}, e.target, { value: formatted })
            });
            onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
        } else {
            onChange(e);
        }
    };

    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#666] mb-1.5">{label}</label>
            <div className="relative">
                <input
                    value={value}
                    onChange={handleChange}
                    placeholder={nonNumericWarn ? "" : placeholder}
                    inputMode={type === "tel" ? "numeric" : undefined}
                    style={{ color: "#111" }}
                    className={`w-full h-10 rounded-[10px] border px-3 text-[13px] outline-none transition-colors ${nonNumericWarn ? "border-[#ff4d6d] bg-[#fff5f7]" : error ? "border-[#ff4d6d] bg-[#fff5f7]" : "border-[#e0daf7] focus:border-[#826CFF]"}`}
                />
                {nonNumericWarn && (
                    <div className="absolute inset-0 flex items-center gap-1.5 px-3 pointer-events-none">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2.5" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <p className="text-[12px] text-[#ff4d6d] font-semibold">숫자만 입력 가능해요</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── 모달: 주문자 정보 수정 ──────────────────────────────────────────────────
interface BuyerInfo { name: string; phone: string; email: string; }

function EditBuyerModal({ info, onSave, onClose }: {
    info: BuyerInfo;
    onSave: (v: BuyerInfo) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState(info);
    const set = (k: keyof BuyerInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <ModalWrap onClose={onClose} title="주문자 정보 수정">
            <div className="space-y-3">
                <Field label="이름" value={form.name} onChange={set("name")} placeholder="홍길동" />
                <Field label="휴대폰" value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" type="tel" />
                <Field label="이메일" value={form.email} onChange={set("email")} placeholder="email@example.com" />
            </div>
            <div className="flex gap-2 mt-6">
                <button onClick={onClose}
                    className="flex-1 h-11 rounded-full border-2 border-[#e0daf7] text-[#888] text-[14px] font-bold hover:bg-[#f5f3ff] transition-colors">
                    취소
                </button>
                <button onClick={() => { onSave(form); onClose(); }}
                    className="flex-1 h-11 rounded-full bg-[#826CFF] text-white text-[14px] font-bold hover:bg-[#6B5CE7] transition-colors">
                    저장
                </button>
            </div>
        </ModalWrap>
    );
}

// ─── 모달: 배송지 변경 ───────────────────────────────────────────────────────
interface ShippingInfo { name: string; phone: string; address: string; detail: string; zip: string; memo: string; }

function EditShippingModal({ info, savedAddresses, onSave, onClose, uid }: {
    info: ShippingInfo;
    savedAddresses: SavedAddress[];
    onSave: (v: ShippingInfo, isDefault: boolean) => void;
    onClose: () => void;
    uid?: string;
}) {
    const [tab, setTab] = useState<"saved" | "new">(savedAddresses.length > 0 ? "saved" : "new");
    const [form, setForm] = useState(info);
    const set = (k: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));
    const [selectedId, setSelectedId] = useState(
        savedAddresses.find(a => a.address === info.address)?.id ?? ""
    );

    const handleAddressSearch = () => {
        const daumPostcode = window.daum as DaumPostcodeApi | undefined;
        if (!daumPostcode?.Postcode) {
            alert("주소 검색 서비스를 불러오는 중이에요. 잠시 후 다시 시도해주세요.");
            return;
        }
        new daumPostcode.Postcode({
            oncomplete: (data) => {
                const address = data.roadAddress || data.jibunAddress || "";
                setForm((f) => ({ ...f, zip: data.zonecode, address }));
            },
            theme: { bgColor: "#826CFF", searchBgColor: "#6B5CE7", contentBgColor: "#faf9ff", pageBgColor: "#f5f3ff", textColor: "#111018", queryTextColor: "#ffffff" },
        }).open();
    };

    const handleApplySaved = () => {
        const found = savedAddresses.find(a => a.id === selectedId);
        if (!found) return;
        onSave({
            name: found.name, phone: found.phone,
            address: found.address, detail: found.detail,
            zip: found.zip, memo: form.memo,
        }, !!found.isDefault);
        onClose();
    };

    const handleApplyNew = () => {
        onSave(form, false);
        onClose();
    };

    const handleSaveToMypage = async () => {
        if (!uid) return;
        try {
            await addDoc(collection(db, "users", uid, "addresses"), {
                name: form.name, phone: form.phone,
                address: form.address, detail: form.detail,
                zip: form.zip, isDefault: false,
                createdAt: new Date(),
            });
            onSave(form, false);
            onClose();
        } catch (e) {
            console.error("[Address] 저장 실패:", e);
        }
    };

    return (
        <ModalWrap onClose={onClose} title="배송지 변경">
            {savedAddresses.length > 0 && (
                <div className="flex gap-1 mb-4 rounded-[10px] bg-[#f5f3ff] p-1">
                    {(["saved", "new"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 h-8 rounded-[8px] text-[12px] font-bold transition-all ${tab === t ? "bg-white text-[#826CFF] shadow-sm" : "text-[#aaa]"}`}>
                            {t === "saved" ? `저장된 주소 (${savedAddresses.length})` : "새 주소 입력"}
                        </button>
                    ))}
                </div>
            )}

            {tab === "saved" ? (
                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {savedAddresses.map(a => (
                        <button key={a.id} onClick={() => setSelectedId(a.id)}
                            className={`w-full text-left rounded-[12px] border-2 p-3.5 transition-all ${selectedId === a.id ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] hover:border-[#c4bbff]"}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                                {a.label && (
                                    <span className="text-[11px] font-bold text-[#826CFF] bg-[#ede9ff] px-2 py-0.5 rounded-full">{a.label}</span>
                                )}
                                {a.isDefault && (
                                    <span className="text-[11px] font-bold text-white bg-[#826CFF] px-2 py-0.5 rounded-full">기본 배송지</span>
                                )}
                            </div>
                            <p className="text-[13px] font-semibold text-[#111]">{a.name} · {a.phone}</p>
                            <p className="text-[12px] text-[#666] mt-0.5 leading-snug">{a.address} {a.detail}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <Field label="수령인" value={form.name} onChange={set("name")} placeholder="홍길동" />
                    <Field label="연락처" value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" type="tel" />
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Field label="우편번호" value={form.zip} onChange={set("zip")} placeholder="03706" />
                        </div>
                        <button onClick={handleAddressSearch}
                            className="h-10 px-4 rounded-[10px] bg-[#826CFF] text-white text-[12px] font-bold flex-shrink-0 hover:bg-[#6B5CE7] transition-colors whitespace-nowrap flex items-center gap-1.5 mb-[1px]">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            주소검색
                        </button>
                    </div>
                    <Field label="주소" value={form.address} onChange={set("address")} placeholder="주소검색 버튼을 눌러주세요" />
                    <Field label="상세주소" value={form.detail} onChange={set("detail")} placeholder="동/호수, 층 등 상세주소 입력" />
                    <div>
                        <label className="block text-[12px] font-semibold text-[#666] mb-1.5">배송 메모</label>
                        <select value={form.memo} onChange={set("memo")}
                            className="w-full h-10 rounded-[10px] border border-[#e0daf7] px-3 text-[13px] text-[#555] bg-white outline-none focus:border-[#826CFF]">
                            <option value="">배송 메모 선택</option>
                            <option>문 앞에 놔주세요</option>
                            <option>경비실에 맡겨 주세요</option>
                            <option>직접 받겠습니다</option>
                            <option>빨리 와주세요</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-5">
                <button onClick={onClose}
                    className="flex-1 h-10 rounded-full border-2 border-[#e0daf7] text-[#888] text-[13px] font-bold hover:bg-[#f5f3ff] transition-colors">
                    취소
                </button>
                {tab === "new" && (
                    <button onClick={handleSaveToMypage}
                        className="flex-1 h-10 rounded-full border-2 border-[#826CFF] text-[#826CFF] text-[13px] font-bold hover:bg-[#f5f3ff] transition-colors whitespace-nowrap">
                        주소 등록 후 적용
                    </button>
                )}
                <button onClick={tab === "saved" ? handleApplySaved : handleApplyNew}
                    className="flex-1 h-10 rounded-full bg-[#826CFF] text-white text-[13px] font-bold hover:bg-[#6B5CE7] transition-colors">
                    적용
                </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-[#bbb]">
                주소 관리는{" "}
                <Link href="/store/profile/address" className="text-[#826CFF] underline underline-offset-2">
                    마이페이지 &gt; 배송지 관리
                </Link>에서 할 수 있어요
            </p>
        </ModalWrap>
    );
}

// ─── 결제수단 선택 모달 ──────────────────────────────────────────────────────
function CardSelectModal({ savedCards, selectedPayment, selectedCardId, onSelect, onClose }: {
    savedCards: SavedCard[];
    selectedPayment: string;
    selectedCardId: string;
    onSelect: (paymentId: string, cardId?: string) => void;
    onClose: () => void;
}) {
    const cardIcon = (color = "#826CFF") => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
        </svg>
    );

    return (
        <ModalWrap onClose={onClose} title="결제수단 선택">
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                {savedCards.length > 0 && (
                    <>
                        <p className="text-[11px] font-semibold text-[#aaa] mb-0.5">등록된 결제수단</p>
                        {savedCards.map(card => {
                            const isSelected = selectedPayment === "saved_card" && selectedCardId === card.id;
                            return (
                                <button key={card.id}
                                    onClick={() => { onSelect("saved_card", card.id); onClose(); }}
                                    className={"w-full text-left rounded-[12px] border-2 px-4 py-3 transition-all flex items-center justify-between " +
                                        (isSelected ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] hover:border-[#c4bbff]")}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#f0eeff]">
                                            {cardIcon()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-[13px] font-bold text-[#111]">{card.name || card.brand}</p>
                                                <span className="text-[10px] font-bold text-[#826CFF] bg-[#ede9ff] px-1.5 py-0.5 rounded-[4px]">카드</span>
                                            </div>
                                            <p className="text-[11px] text-[#aaa]">{"•••• •••• •••• " + card.last4}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {card.isDefault && (
                                            <span className="text-[10px] font-bold text-white bg-[#826CFF] px-2 py-0.5 rounded-full">기본</span>
                                        )}
                                        {isSelected && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                        <div className="border-t border-[#f0eeff] my-1" />
                    </>
                )}

                {savedCards.length === 0 && (
                    <div className="py-8 text-center">
                        <p className="text-[13px] text-[#aaa] mb-3">등록된 카드가 없어요</p>
                        <a href="/mypage" className="text-[12px] font-semibold text-[#826CFF] underline underline-offset-2">
                            OTT 마이페이지에서 카드 등록하기
                        </a>
                    </div>
                )}

                <a href="/mypage"
                    className="mt-1 flex items-center justify-center gap-1.5 text-[12px] text-[#826CFF] underline underline-offset-2 py-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    카드 추가하기 (OTT 마이페이지)
                </a>
            </div>
        </ModalWrap>
    );
}

// ─── 쿠폰 선택 모달 ──────────────────────────────────────────────────────────
function CouponSelectModal({ coupons, selectedId, orderAmount, onSelect, onClose }: {
    coupons: Coupon[];
    selectedId: string;
    orderAmount: number;
    onSelect: (coupon: Coupon | null) => void;
    onClose: () => void;
}) {
    return (
        <ModalWrap onClose={onClose} title="쿠폰 선택">
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                <button
                    onClick={() => { onSelect(null); onClose(); }}
                    className={`w-full text-left rounded-[12px] border-2 p-4 transition-all ${selectedId === "" ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] hover:border-[#c4bbff]"}`}>
                    <p className="text-[13px] font-semibold text-[#888]">쿠폰 사용 안 함</p>
                </button>

                {coupons.length === 0 ? (
                    <div className="py-8 text-center text-[13px] text-[#aaa]">사용 가능한 쿠폰이 없어요</div>
                ) : (
                    coupons.map(c => {
                        const discount = calcCouponDiscount(c, orderAmount);
                        const isApplicable = orderAmount >= c.minOrderAmount;
                        return (
                            <button key={c.id} disabled={!isApplicable}
                                onClick={() => { onSelect(c); onClose(); }}
                                className={`w-full text-left rounded-[12px] border-2 p-4 transition-all ${!isApplicable ? "opacity-40 cursor-not-allowed border-[#e8e8e8]" : selectedId === c.id ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] hover:border-[#c4bbff]"}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[14px] font-bold text-[#111]">{c.label}</p>
                                        {c.minOrderAmount > 0 && (
                                            <p className="text-[11px] text-[#aaa] mt-0.5">{c.minOrderAmount.toLocaleString()}원 이상 구매 시</p>
                                        )}
                                        {c.expiresAt && (
                                            <p className="text-[11px] text-[#aaa]">~{c.expiresAt.toDate().toLocaleDateString("ko-KR")} 까지</p>
                                        )}
                                    </div>
                                    <p className="text-[20px] font-extrabold text-[#826CFF] ml-4 shrink-0">
                                        {c.type === "rate" ? `${Math.round(c.discount * 100)}%` : `${c.discount.toLocaleString()}원`}
                                    </p>
                                </div>
                                {isApplicable && (
                                    <p className="mt-2 text-[12px] font-semibold text-[#826CFF]">
                                        → {discount.toLocaleString()}원 할인
                                    </p>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </ModalWrap>
    );
}


// ─── 포인트 입력 컴포넌트 (리마운트 격리) ──────────────────────────────────
function PointInput({ livePoints, onApply, onError }: {
    livePoints: number;
    onApply: (v: number) => void;
    onError: (msg: string) => void;
}) {
    const [val, setVal] = useState("");
    const [applied, setApplied] = useState(false);
    const [nonNumericWarn, setNonNumericWarn] = useState(false);

    const applyValue = (v: number) => {
        onApply(v);
        onError("");
        setApplied(true);
    };

    const handleApply = () => {
        const v = Number(val) || 0;
        if (v > livePoints) {
            setVal(String(livePoints));
            applyValue(livePoints);
            onError(`최대 사용 가능 포인트인 ${livePoints.toLocaleString()}P로 설정됐어요.`);
            return;
        }
        applyValue(v);
    };

    const handleUseAll = () => {
        setVal(String(livePoints));
        applyValue(livePoints);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        if (/[^0-9]/.test(raw)) {
            setNonNumericWarn(true);
            setTimeout(() => setNonNumericWarn(false), 1500);
            const numOnly = raw.replace(/[^0-9]/g, "");
            setVal(numOnly);
            return;
        }

        setNonNumericWarn(false);
        const v = Number(raw) || 0;

        if (v > livePoints) {
            setVal(String(livePoints));
            applyValue(livePoints);
            onError(`최대 사용 가능 포인트인 ${livePoints.toLocaleString()}P로 자동 설정됐어요.`);
            return;
        }

        setVal(raw);
        setApplied(false);
        onError("");
    };

    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={val}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                    placeholder={nonNumericWarn ? "" : "0"}
                    style={{
                        color: applied ? "#826CFF" : "#111111",
                        fontWeight: applied ? 700 : 400,
                    } as React.CSSProperties}
                    className={`w-full h-11 rounded-[12px] border pr-8 pl-4 text-[13px] outline-none transition-colors ${nonNumericWarn ? "border-[#ff4d6d]" : applied ? "border-[#826CFF]" : "border-[#e0daf7] focus:border-[#826CFF]"}`}
                />
                {nonNumericWarn ? (
                    <div className="absolute inset-0 flex items-center gap-1.5 pl-4 pr-8 pointer-events-none">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2.5" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <p className="text-[12px] text-[#ff4d6d] font-semibold">숫자만 입력 가능해요</p>
                    </div>
                ) : (
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold pointer-events-none select-none"
                        style={{ color: applied ? "#826CFF" : "#aaaaaa" }}
                    >P</span>
                )}
            </div>
            <button
                type="button"
                onClick={handleUseAll}
                className="h-11 px-3 rounded-[12px] border border-[#e0daf7] text-[#826CFF] text-[12px] font-bold hover:bg-[#f5f3ff] transition-colors whitespace-nowrap"
            >
                전체사용
            </button>
            <button
                type="button"
                onClick={handleApply}
                className="h-11 px-3 rounded-[12px] bg-[#826CFF] text-white text-[12px] font-bold hover:bg-[#6B5CE7] transition-colors"
            >
                적용
            </button>
        </div>
    );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
function OrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();

    // ── 상품 파싱 ──
    type OrderItem = { productId: string; title: string; price: number; thumbnail: string; option: string; qty: number; category?: string; };
    const itemsParam = searchParams.get("items");
    const items: OrderItem[] = (() => {
        if (itemsParam) { try { return JSON.parse(itemsParam) as OrderItem[]; } catch { } }
        const productId = searchParams.get("productId") ?? "unknown";
        const title = searchParams.get("title") ?? "상품명";
        const price = parseInt((searchParams.get("price") ?? "0").replace(/[^0-9]/g, ""), 10) || 0;
        const thumbnail = searchParams.get("thumbnail") ?? "";
        const option = searchParams.get("option") ?? "기본";
        const qty = Number(searchParams.get("qty") ?? 1);
        const category = searchParams.get("category") ?? "";
        return [{ productId, title, price, thumbnail, option, qty, category }];
    })();
    const totalItemsPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const cartRawsParam = searchParams.get("cartRaws");
    const cartRaws: unknown[] = (() => {
        if (cartRawsParam) { try { return JSON.parse(cartRawsParam) as unknown[]; } catch { } }
        return [];
    })();

    // ── 멤버십 / 배송비 ──
    const isMember = !!user?.membership && user.membership !== "none";
    const FREE_SHIPPING_THRESHOLD = 100000;
    const shippingFee = isMember ? 0 : totalItemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 3000;

    // ── 단일 상품 호환용 ──
    const title = items[0]?.title ?? "상품명";
    const thumbnail = items[0]?.thumbnail ?? "";
    const option = items[0]?.option ?? "기본";
    const qty = items[0]?.qty ?? 1;

    // ── 주문자 정보 ──
    const [buyer, setBuyer] = useState<BuyerInfo>({
        name: user?.name ?? "",
        phone: "",
        email: user?.email ?? "",
    });
    const [showBuyerModal, setShowBuyerModal] = useState(false);

    // ── 배송지 ──
    const [shipping, setShipping] = useState<ShippingInfo>({
        name: "", phone: "", address: "", detail: "", zip: "", memo: "",
    });
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [isDefaultAddress, setIsDefaultAddress] = useState(false);

    // ── 유효성 에러 상태 ──
    const [formErrors, setFormErrors] = useState<{
        buyerName?: boolean;
        buyerPhone?: boolean;
        shippingAddress?: boolean;
    }>({});

    // ── 저장된 주소 목록 (Firebase) ──
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

    // ── 저장된 카드 목록 (Firebase) ──
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string>("");
    const [selectedPayment, setSelectedPayment] = useState("laftel_pay");
    const [showCardModal, setShowCardModal] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [agreeError, setAgreeError] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── Firebase 주소 + 카드 로드 ──
    useEffect(() => {
        if (!user?.uid) return;

        getDocs(collection(db, "users", user.uid, "addresses")).then(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedAddress));
            list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
            setSavedAddresses(list);
            const def = list.find(a => a.isDefault);
            if (def) {
                setShipping({ name: def.name, phone: def.phone, address: def.address, detail: def.detail, zip: def.zip, memo: "" });
                setIsDefaultAddress(true);
            }
        });

        getDoc(doc(db, "users", user.uid)).then(snap => {
            if (!snap.exists()) return;
            const cards: SavedCard[] = snap.data()?.cards ?? [];
            setSavedCards(cards);
            const defCard = cards.find(c => c.isDefault);
            if (defCard) {
                setSelectedCardId(defCard.id);
                setSelectedPayment("saved_card");
            }
        });
    }, [user?.uid]);

    // ── 쿠폰 ──
    const { activeCoupons, fetchActiveCoupons, selectCoupon, selectedCoupon } = useCouponStore();
    const [showCouponModal, setShowCouponModal] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            fetchActiveCoupons(user.uid);
        }
    }, [fetchActiveCoupons, user?.uid]);

    const couponDiscount = selectedCoupon ? calcCouponDiscount(selectedCoupon, totalItemsPrice) : 0;

    // ── 포인트 ──
    const [livePoints, setLivePoints] = useState(user?.points ?? 0);
    const [appliedPoint, setAppliedPoint] = useState(0);
    const [pointError, setPointError] = useState("");

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
            if (snap.exists()) setLivePoints(snap.data().points ?? 0);
        });
        return () => unsub();
    }, [user?.uid]);

    // ── 금액 계산 ──
    const totalDiscount = couponDiscount + appliedPoint;
    const totalPrice = Math.max(0, totalItemsPrice + shippingFee - totalDiscount);

    // ── 금액 애니메이션 ──
    const animTotal = useAnimatedNumber(totalPrice);
    const animDiscount = useAnimatedNumber(totalDiscount);
    const flashTotal = useFlash(totalPrice);

    // ── 유효성 검사 ──
    const validate = (): boolean => {
        const errors: typeof formErrors = {};
        if (!buyer.name.trim()) errors.buyerName = true;
        if (!buyer.phone.trim()) errors.buyerPhone = true;
        if (!shipping.address.trim()) errors.shippingAddress = true;

        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            if (errors.buyerName || errors.buyerPhone) {
                document.getElementById("section-buyer")?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (errors.shippingAddress) {
                document.getElementById("section-shipping")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return false;
        }
        return true;
    };

    // ── 결제 처리 ──
    const handlePay = async () => {
        if (!validate()) return;

        if (!agreed) {
            setAgreeError(true);
            document.getElementById("agree-checkbox")?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        if (!user?.uid) return;
        setLoading(true);
        try {
            const orderRef = doc(collection(db, "users", user.uid, "orders"));
            const orderItems = items.map(item => ({
                productId: item.productId, title: item.title,
                thumbnail: item.thumbnail, option: item.option,
                price: item.price, qty: item.qty,
            }));
            const orderPayload = {
                status: "결제완료",
                total: totalPrice,
                usedPoints: appliedPoint,
                usedCouponId: selectedCoupon?.id ?? null,
                usedCouponLabel: selectedCoupon?.label ?? null,
                usedCouponDiscount: couponDiscount > 0 ? couponDiscount : null,
                createdAt: serverTimestamp(),
                notified: false,
                buyer: { name: buyer.name, phone: buyer.phone, email: buyer.email },
                shipping: {
                    name: shipping.name, phone: shipping.phone,
                    address: shipping.address, detail: shipping.detail,
                    zip: shipping.zip, memo: shipping.memo,
                },
                items: orderItems,
            };
            const limitedItems = Array.from(
                orderItems.reduce((map, item) => {
                    if (!isLimitedStoreProduct(item.productId)) return map;

                    const previous = map.get(item.productId);
                    map.set(item.productId, {
                        productId: item.productId,
                        title: previous?.title ?? item.title,
                        qty: (previous?.qty ?? 0) + item.qty,
                    });
                    return map;
                }, new Map<string, { productId: string; title: string; qty: number }>()),
            ).map(([, item]) => item);

            await runTransaction(db, async (transaction) => {
                const limitedStockSnapshots = await Promise.all(
                    limitedItems.map(async (item) => {
                        const ref = doc(db, LIMITED_STOCK_COLLECTION, item.productId);
                        return {
                            item,
                            ref,
                            snap: await transaction.get(ref),
                        };
                    }),
                );

                limitedStockSnapshots.forEach(({ item, ref, snap }) => {
                    const initialQuantity = getLimitedInitialQuantity(item.productId);
                    if (initialQuantity === null) return;

                    const rawRemaining = snap.data()?.remainingQuantity;
                    const currentRemaining = typeof rawRemaining === "number" ? rawRemaining : initialQuantity;
                    if (currentRemaining < item.qty) {
                        throw new Error(`LIMITED_STOCK_SHORTAGE:${item.title}`);
                    }

                    transaction.set(
                        ref,
                        {
                            productId: item.productId,
                            initialQuantity,
                            remainingQuantity: currentRemaining - item.qty,
                            updatedAt: serverTimestamp(),
                            ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
                        },
                        { merge: true },
                    );
                });

                transaction.set(orderRef, orderPayload);
            });

            if (selectedCoupon) {
                await markCouponUsed(user.uid, selectedCoupon.id, orderRef.id);
            }

            if (appliedPoint > 0) {
                const newPoints = Math.max(0, livePoints - appliedPoint);
                await setDoc(doc(db, "users", user.uid), { points: newPoints }, { merge: true });
                await addDoc(collection(db, "users", user.uid, "pointHistory"), {
                    amount: -appliedPoint,
                    type: "use",
                    description: "스토어 결제 사용",
                    createdAt: new Date(),
                });
            }

            if (cartRaws.length > 0) {
                await setDoc(
                    doc(db, "users", user.uid),
                    { cart: arrayRemove(...cartRaws) },
                    { merge: true }
                );
            }

            sessionStorage.setItem(`order_new_${orderRef.id}`, "1");
            router.push(
                `/store/order/complete?orderNumber=${orderRef.id}` +
                `&title=${encodeURIComponent(title)}` +
                `&thumbnail=${encodeURIComponent(thumbnail)}` +
                `&total=${totalPrice}` +
                `&option=${encodeURIComponent(option)}` +
                `&qty=${qty}` +
                `&category=${encodeURIComponent(items[0]?.category ?? "")}`
            );
        } catch (err) {
            console.error("[Order] Firestore 저장 실패:", err);
            if (err instanceof Error && err.message.startsWith("LIMITED_STOCK_SHORTAGE:")) {
                const shortageTitle = err.message.replace("LIMITED_STOCK_SHORTAGE:", "");
                alert(`${shortageTitle}의 남은 수량이 부족해요.`);
                setLoading(false);
                return;
            }
            alert("주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f3ff]">
            <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />

            {showBuyerModal && (
                <EditBuyerModal info={buyer} onSave={setBuyer} onClose={() => setShowBuyerModal(false)} />
            )}
            {showShippingModal && (
                <EditShippingModal
                    info={shipping}
                    savedAddresses={savedAddresses}
                    uid={user?.uid ?? ""}
                    onSave={(v, isDef) => { setShipping(v); setIsDefaultAddress(isDef); }}
                    onClose={() => setShowShippingModal(false)}
                />
            )}
            {showCardModal && (
                <CardSelectModal
                    savedCards={savedCards}
                    selectedPayment={selectedPayment}
                    selectedCardId={selectedCardId}
                    onSelect={(paymentId, cardId) => {
                        setSelectedPayment(paymentId);
                        if (cardId) setSelectedCardId(cardId);
                    }}
                    onClose={() => setShowCardModal(false)}
                />
            )}
            {showCouponModal && (
                <CouponSelectModal
                    coupons={activeCoupons}
                    selectedId={selectedCoupon?.id ?? ""}
                    orderAmount={totalItemsPrice}
                    onSelect={(c) => { selectCoupon(c); setAppliedPoint(0); }}
                    onClose={() => setShowCouponModal(false)}
                />
            )}

            {/* 결제 로딩 오버레이 */}
            {loading && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
                    style={{ animation: "fadeIn 0.2s ease" }}>
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-[#ebe8ff]" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#826CFF] animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="1.8">
                                    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-[18px] font-extrabold text-[#111018] tracking-tight">결제 처리 중</p>
                            <p className="mt-1.5 text-[13px] text-[#aaa]">잠시만 기다려주세요...</p>
                        </div>
                        <div className="w-48 h-1.5 bg-[#ebe8ff] rounded-full overflow-hidden">
                            <div className="h-full bg-[#826CFF] rounded-full" style={{ animation: "progressBar 1.4s ease-in-out infinite" }} />
                        </div>
                        <p className="text-[11px] text-[#ccc]">페이지를 닫지 마세요</p>
                    </div>
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes progressBar {
                            0%   { width: 0%;   margin-left: 0; }
                            50%  { width: 70%;  margin-left: 15%; }
                            100% { width: 0%;   margin-left: 100%; }
                        }
                    `}</style>
                </div>
            )}

            {/* ── 헤더: 모바일 px-4, 태블릿 px-6, 데스크톱 px-[75px] 유지 ── */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#ebe8ff]">
                <div className="mx-auto max-w-[1770px] px-4 sm:px-6 lg:px-[75px] h-14 flex items-center">
                    <Link href="/store/cart" className="flex items-center gap-1.5 text-[13px] text-[#6B5CE7] hover:underline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        뒤로 돌아가기
                    </Link>
                </div>
            </header>

            {/* ── main: 모바일 px-4 py-6, 태블릿 px-6, 데스크톱 px-[75px] py-10 유지 ── */}
            <main className="mx-auto w-full max-w-[1770px] px-4 pb-[126px] pt-6 sm:px-6 sm:pb-10 lg:px-[75px] lg:py-10">

                {/* ── 타이틀: 모바일에서 폰트 축소 ── */}
                <div className="text-center mb-6 lg:mb-10">
                    <p className="text-[12px] font-semibold tracking-[0.2em] text-[#826CFF] uppercase mb-1">Laftel Store</p>
                    <h1 className="text-[24px] sm:text-[28px] lg:text-[34px] font-extrabold text-[#826CFF] tracking-tight">ORDER & PAY</h1>
                    <p className="text-[14px] lg:text-[16px] text-[#aaa] mt-1">최종 주문하기</p>
                </div>

                {/* ── 좌우 레이아웃: 모바일/태블릿 세로 스택, 와이드 데스크톱 가로 유지 ── */}
                <div className="flex flex-col gap-4 xl:flex-row xl:gap-5 xl:items-start">
                    {/* ── 왼쪽 ── */}
                    <div className="w-full flex-1 space-y-4">

                        {/* 상품 정보 */}
                        <section className="bg-white rounded-[20px] p-4 sm:p-6 border border-[#ebe8ff] mb-4 lg:mb-5">
                            <div className="space-y-4">
                                {items.map((item, i) => (
                                    <div key={i} className="flex gap-3 sm:gap-4 pb-4 border-b border-[#f5f3ff] last:border-0 last:pb-0 items-center">
                                        {item.thumbnail && (
                                            /* 모바일 80px, sm 120px, 데스크톱 170px 유지 */
                                            <div className="w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] lg:w-[170px] lg:h-[170px] rounded-[12px] overflow-hidden bg-[#f5f3ff] flex-shrink-0 border border-[#ebe8ff]">
                                                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {item.category && (
                                                <p className="text-[11px] sm:text-[12px] font-semibold text-[#826CFF] mb-1">{item.category}</p>
                                            )}
                                            <h2 className="text-[14px] sm:text-[16px] font-bold text-[#111018] leading-snug line-clamp-2 mb-2 sm:mb-3">{item.title}</h2>
                                            {item.option !== "기본" && <p className="mt-1 text-[12px] sm:text-[13px] text-[#999]">옵션: {item.option}</p>}
                                            <p className="mt-0.5 text-[11px] sm:text-[12px] text-[#bbb]">수량: {item.qty}개</p>
                                            <p className="mt-2 sm:mt-3 text-[11px] sm:text-[12px] text-[#826CFF] font-semibold">
                                                {Math.floor(item.price * item.qty * 0.01).toLocaleString()}원 적립 예정 (결제금액의 1%)
                                            </p>
                                            <p className="mt-0.5 text-[18px] sm:text-[20px] lg:text-[23px] font-extrabold text-[#111018]">{(item.price * item.qty).toLocaleString()}원</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 주문자 정보 */}
                        <section id="section-buyer" className="bg-white rounded-[20px] p-4 sm:p-6 border border-[#ebe8ff]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111018]">주문자 정보</h3>
                                    {(formErrors.buyerName || formErrors.buyerPhone) && (
                                        <span className="text-[11px] font-bold text-[#ff4d6d] bg-[#fff0f3] px-2 py-0.5 rounded-full" style={{ animation: "fadeSlideIn 0.2s ease" }}>
                                            필수 정보를 입력해주세요
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => setShowBuyerModal(true)}
                                    className="text-[12px] text-[#826CFF] hover:underline font-semibold flex items-center gap-1 flex-shrink-0">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    정보수정
                                </button>
                            </div>
                            <div className="space-y-2 text-[13px] sm:text-[14px]">
                                <p className={`font-bold ${formErrors.buyerName && !buyer.name ? "text-[#ff4d6d]" : "text-[#111]"}`}>
                                    {buyer.name || <span className="font-normal text-[#bbb]">이름 미입력</span>}
                                </p>
                                <div className="flex gap-3">
                                    <span className="w-14 text-[#aaa]">휴대폰</span>
                                    <span className={`font-medium ${formErrors.buyerPhone && !buyer.phone ? "text-[#ff4d6d]" : "text-[#333]"}`}>
                                        {buyer.phone || <span className="font-normal text-[#bbb]">미입력</span>}
                                    </span>
                                </div>
                                <div className="flex gap-3"><span className="w-14 text-[#aaa]">이메일</span><span className="text-[#333] font-medium">{buyer.email || "-"}</span></div>
                            </div>
                            <p className="mt-3 text-[11px] sm:text-[12px] text-[#ccc] leading-relaxed">
                                * 위 연락처 정보는 배송 관련 알림 발송 시 사용됩니다.
                            </p>
                        </section>

                        {/* 배송지 */}
                        <section id="section-shipping" className="bg-white rounded-[20px] p-4 sm:p-6 border border-[#ebe8ff]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111018]">배송지 주소</h3>
                                    {isDefaultAddress && (
                                        <span className="text-[11px] font-bold text-white bg-[#826CFF] px-2 py-0.5 rounded-full">기본 배송지</span>
                                    )}
                                    {formErrors.shippingAddress && (
                                        <span className="text-[11px] font-bold text-[#ff4d6d] bg-[#fff0f3] px-2 py-0.5 rounded-full" style={{ animation: "fadeSlideIn 0.2s ease" }}>
                                            배송지를 입력해주세요
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => setShowShippingModal(true)}
                                    className="text-[12px] text-[#826CFF] hover:underline font-semibold flex items-center gap-1 flex-shrink-0">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    주소변경
                                </button>
                            </div>
                            <div className="space-y-2 text-[13px] sm:text-[14px]">
                                {shipping.address ? (
                                    <>
                                        <p className="font-bold text-[#111]">{shipping.name}</p>
                                        <p className="text-[#555]">{shipping.phone}</p>
                                        <p className="text-[#555] leading-relaxed">
                                            {shipping.address}<br />{shipping.detail}<br />({shipping.zip})
                                        </p>
                                        {shipping.memo && <p className="mt-2 text-[#aaa]">요청사항: {shipping.memo}</p>}
                                    </>
                                ) : (
                                    <p className={`text-[13px] ${formErrors.shippingAddress ? "text-[#ff4d6d] font-semibold" : "text-[#aaa]"}`}>
                                        배송지를 입력해주세요.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* 할인혜택 */}
                        <section className="bg-white rounded-[20px] p-4 sm:p-6 border border-[#ebe8ff]">
                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111018] mb-4">할인혜택</h3>
                            {/* 모바일 세로 스택, sm+ 가로 2열 */}
                            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">

                                {/* 쿠폰 */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">
                                        쿠폰 적용
                                        {activeCoupons.length > 0 && (
                                            <span className="ml-1.5 text-[#826CFF] font-bold">{activeCoupons.length}장 보유</span>
                                        )}
                                    </label>
                                    <button
                                        onClick={() => setShowCouponModal(true)}
                                        className="w-full h-11 rounded-[12px] border border-[#e0daf7] px-4 text-left text-[13px] flex items-center justify-between hover:border-[#826CFF] transition-colors">
                                        <span className={selectedCoupon ? "text-[#826CFF] font-semibold" : "text-[#aaa]"}>
                                            {selectedCoupon ? selectedCoupon.label : "쿠폰을 선택해주세요"}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
                                    </button>
                                    {selectedCoupon ? (
                                        <p className="mt-1.5 text-[12px] text-[#826CFF] font-semibold flex items-center gap-1">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {couponDiscount.toLocaleString()}원 할인
                                        </p>
                                    ) : <p className="mt-1 text-[11px] text-transparent select-none">-</p>}
                                </div>

                                {/* 포인트 */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">
                                        포인트
                                        <span className="text-[#aaa] font-normal ml-1.5">(보유 {livePoints.toLocaleString()}P)</span>
                                    </label>
                                    <PointInput
                                        livePoints={livePoints}
                                        onApply={(v) => { setAppliedPoint(v); setPointError(""); }}
                                        onError={(msg) => setPointError(msg)}
                                    />
                                    {pointError && (
                                        <p className={`mt-7 text-[12px] font-semibold ${pointError.includes("최대") ? "text-[#826CFF]" : "text-[#ff4d6d]"}`}>
                                            {pointError}
                                        </p>
                                    )}
                                    {!pointError && appliedPoint > 0 && (
                                        <p className="mt-7 text-[12px] text-[#826CFF] font-semibold flex items-center gap-1">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {appliedPoint.toLocaleString()}P 사용
                                        </p>
                                    )}
                                    {!pointError && appliedPoint === 0 && (
                                        <p className="mt-7 text-[11px] text-[#bbb]">사용 가능 포인트: {livePoints.toLocaleString()}P</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* ── 오른쪽: 결제 요약 ── */}
                    {/* 모바일/태블릿: 전체 너비 / 와이드 데스크톱: w-[300px] sticky 유지 */}
                    <div className="w-full space-y-3 xl:sticky xl:top-[80px] xl:w-[300px]">

                        {/* 최종결제 금액 */}
                        <section className="bg-white rounded-[20px] p-4 sm:p-6 border border-[#ebe8ff] overflow-hidden">
                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111018] mb-4">최종결제 금액</h3>
                            <div className="space-y-2.5 text-[13px]">
                                <div className="flex justify-between">
                                    <span className="text-[#888]">총 상품 금액</span>
                                    <span className="font-semibold text-[#111]">{totalItemsPrice.toLocaleString()}원</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-[#888]">배송비</span>
                                    {isMember ? (
                                        <span className="font-semibold text-[#826CFF] flex items-center gap-1 text-[12px]">
                                            ✨ 멤버십 회원은 무료!
                                        </span>
                                    ) : totalItemsPrice >= FREE_SHIPPING_THRESHOLD ? (
                                        <span className="font-semibold text-[#826CFF] text-[12px]">무료 (10만원 이상)</span>
                                    ) : (
                                        <span className="text-right">
                                            <span className="font-semibold text-[#111] block">3,000원</span>
                                            <span className="text-[11px] text-[#aaa]">10만원 이상 무료배송</span>
                                        </span>
                                    )}
                                </div>

                                {couponDiscount > 0 && (
                                    <div className="flex justify-between" style={{ animation: "fadeSlideIn 0.3s ease" }}>
                                        <span className="text-[#888]">쿠폰 할인</span>
                                        <span className="font-semibold text-[#ff4d6d]">-{couponDiscount.toLocaleString()}원</span>
                                    </div>
                                )}
                                {appliedPoint > 0 && (
                                    <div className="flex justify-between" style={{ animation: "fadeSlideIn 0.3s ease" }}>
                                        <span className="text-[#888]">포인트 사용</span>
                                        <span className="font-semibold text-[#ff4d6d]">-{appliedPoint.toLocaleString()}원</span>
                                    </div>
                                )}

                                <div className={`border-t border-[#f0eeff] pt-3 flex justify-between items-center rounded-[10px] px-2 py-2 -mx-2 transition-colors duration-300 ${flashTotal === "down" ? "bg-[#f0fdf4]" : flashTotal === "up" ? "bg-[#fff0f0]" : ""}`}>
                                    <span className="font-bold text-[#111]">총 결제 금액</span>
                                    <span className="text-[18px] sm:text-[20px] font-extrabold tabular-nums" style={{ color: "#826CFF" }}>
                                        {animTotal.toLocaleString()}원
                                    </span>
                                </div>

                                {totalDiscount > 0 && (
                                    <div className="flex justify-center">
                                        <span className="text-[11px] font-bold text-[#826CFF] bg-[#f0eeff] px-3 py-1 rounded-full" style={{ animation: "fadeSlideIn 0.3s ease" }}>
                                            🎉 총 {animDiscount.toLocaleString()}원 절약
                                        </span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 결제 수단 */}
                        <section className="bg-white rounded-[20px] p-4 sm:p-6 border border-[#ebe8ff]">
                            <h3 className="text-[15px] font-bold text-[#111018] mb-4">결제수단</h3>
                            <div className="space-y-2">

                                {savedCards.length > 0 && (
                                    <>
                                        <p className="text-[11px] font-semibold text-[#aaa] mb-1">등록된 결제수단</p>
                                        <button onClick={() => setShowCardModal(true)}
                                            className={`w-full h-12 rounded-[12px] border-2 flex items-center justify-between px-4 transition-all ${selectedPayment === "saved_card" ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] bg-white hover:border-[#c4bbff]"}`}>
                                            {selectedPayment === "saved_card" ? (() => {
                                                const card = savedCards.find(c => c.id === selectedCardId);
                                                return card ? (
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                                        <span className="text-[13px] font-bold text-[#111] truncate">{card.name || card.brand}</span>
                                                        <span className="text-[11px] font-bold text-[#826CFF] bg-[#ede9ff] px-1.5 py-0.5 rounded-[4px] flex-shrink-0">카드</span>
                                                        <span className="text-[12px] text-[#aaa] flex-shrink-0">•••• {card.last4}</span>
                                                        {card.isDefault && <span className="text-[10px] font-bold text-white bg-[#826CFF] px-2 py-0.5 rounded-full flex-shrink-0">기본</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-[13px] text-[#aaa]">카드를 선택해주세요</span>
                                                );
                                            })() : (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                                    <span className="text-[13px] text-[#aaa]">등록된 카드로 결제</span>
                                                    <span className="text-[11px] text-[#bbb]">({savedCards.length}장)</span>
                                                </div>
                                            )}
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                        </button>
                                        <div className="border-t border-[#f0eeff] my-1" />
                                    </>
                                )}

                                <button onClick={() => setSelectedPayment("laftel_pay")}
                                    className={`w-full h-11 rounded-[12px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${selectedPayment === "laftel_pay" ? "bg-[#826CFF] text-white shadow-md shadow-[#826cff40]" : "bg-[#f0eeff] text-[#826CFF] hover:bg-[#e8e3ff]"}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                    라프텔 페이로 1초 만에 결제
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    {PAYMENT_PROVIDER_METHODS.map((pm) => (
                                        <button key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                                            className={`h-11 rounded-[12px] transition-all border-2 flex items-center justify-center ${selectedPayment === pm.id ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] bg-white hover:border-[#c4bbff]"}`}>
                                            <img src={pm.img} alt={pm.label} className={`object-contain ${pm.tall ? "h-8" : "h-5"}`} />
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {[{ id: "card", label: "신용 / 체크카드" }, { id: "phone", label: "휴대폰 결제" }].map((pm) => (
                                        <button key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                                            className={`h-11 rounded-[12px] text-[12px] font-semibold transition-all border-2 ${selectedPayment === pm.id ? "border-[#826CFF] bg-[#f5f3ff] text-[#826CFF]" : "border-[#e0daf7] bg-white text-[#555] hover:border-[#c4bbff]"}`}>
                                            {pm.label}
                                        </button>
                                    ))}
                                </div>

                                <p className="text-center text-[11px] text-[#bbb] pt-1">
                                    카드 관리는{" "}
                                    <Link href="/store/profile/payment" className="text-[#826CFF] underline underline-offset-2">마이페이지 &gt; 결제수단 관리</Link>
                                </p>
                            </div>
                        </section>

                        <button
                            id="agree-checkbox"
                            type="button"
                            onClick={() => { setAgreed(v => !v); setAgreeError(false); }}
                            className={`w-full flex items-center gap-2 rounded-[10px] px-3 py-2.5 transition-colors border ${agreeError
                                ? "bg-[#fff0f3] border-[#ffb3c1]"
                                : agreed
                                    ? "bg-[#f0eeff] border-[#d4ccff]"
                                    : "bg-[#fafafa] border-transparent hover:bg-[#f5f3ff]"
                                }`}>
                            <span className={`w-5 h-5 rounded-[6px] flex-shrink-0 flex items-center justify-center border-2 transition-colors ${agreed ? "bg-[#826CFF] border-[#826CFF]" : agreeError ? "border-[#ff4d6d]" : "border-[#d0c9f0]"
                                }`}>
                                {agreed && (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </span>
                            <span className={`text-[11px] font-semibold leading-relaxed ${agreed ? "text-[#826CFF]" : agreeError ? "text-[#ff4d6d]" : "text-[#aaa]"
                                }`}>
                                주문 내용을 확인하였으며, 정보 제공 등에 동의합니다. (필수)
                            </span>
                        </button>
                        {agreeError && (
                            <p className="mt-1.5 text-[11px] text-[#ff4d6d] font-semibold text-center" style={{ animation: "fadeSlideIn 0.2s ease" }}>
                                동의 후 결제를 진행해주세요.
                            </p>
                        )}

                        {/* 결제 버튼: 모바일에서만 하단 fixed, 태블릿 이상은 일반 flow */}
                        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#ebe8ff] bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                            <button onClick={handlePay} disabled={loading}
                                className="w-full h-[54px] rounded-full bg-[#826CFF] hover:bg-[#6B5CE7] text-white text-[16px] font-extrabold transition-all shadow-lg shadow-[#826cff30] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity="0.3" /><path d="M21 12a9 9 0 0 1-9 9" />
                                        </svg>
                                        처리 중...
                                    </>
                                ) : (
                                    `${animTotal.toLocaleString()}원 결제하기`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}


export default function OrderPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f3ff]" />}>
            <OrderContent />
        </Suspense>
    );
}
