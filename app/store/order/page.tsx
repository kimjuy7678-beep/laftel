"use client";

// app/store/order/page.tsx

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useCouponStore } from "@/store/useCouponStore";
import { usePointStore } from "@/store/usePointStore";
import { db } from "@/firebase/firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { useCoupon, issueCoupon } from "@/lib/coupon";

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
                <Field label="휴대폰" value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" />
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

// ─── 모달: 배송지 수정 ───────────────────────────────────────────────────────
interface ShippingInfo { name: string; phone: string; address: string; detail: string; zip: string; memo: string; }

function EditShippingModal({ info, onSave, onClose }: {
    info: ShippingInfo;
    onSave: (v: ShippingInfo) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState(info);
    const set = (k: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <ModalWrap onClose={onClose} title="배송지 변경">
            <div className="space-y-3">
                <Field label="수령인" value={form.name} onChange={set("name")} placeholder="홍길동" />
                <Field label="연락처" value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" />
                <div className="flex gap-2">
                    <Field label="우편번호" value={form.zip} onChange={set("zip")} placeholder="03706" />
                    <button className="mt-5 h-10 px-4 rounded-[10px] bg-[#826CFF] text-white text-[12px] font-bold flex-shrink-0 hover:bg-[#6B5CE7] transition-colors whitespace-nowrap">
                        주소검색
                    </button>
                </div>
                <Field label="주소" value={form.address} onChange={set("address")} placeholder="서울시 영등포구..." />
                <Field label="상세주소" value={form.detail} onChange={set("detail")} placeholder="13층, 라프텔" />
                <div>
                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">배송 메모</label>
                    <select value={form.memo} onChange={set("memo")}
                        className="w-full h-10 rounded-[10px] border border-[#e0daf7] px-3 text-[13px] text-[#555] bg-white outline-none focus:border-[#826CFF]">
                        <option value="">배송 메모 선택</option>
                        <option>문 앞에 놔주세요</option>
                        <option>경비실에 맡겨 주세요</option>
                        <option>직접 받겠습니다</option>
                        <option>벨리 와주세요</option>
                    </select>
                </div>
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

// ─── 공통 모달 래퍼 ──────────────────────────────────────────────────────────
function ModalWrap({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={onClose}>
            <div className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[16px] font-bold text-[#111]">{title}</h3>
                    <button onClick={onClose} className="text-[#aaa] hover:text-[#555] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

// ─── 공통 인풋 필드 ──────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder }: {
    label: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#666] mb-1.5">{label}</label>
            <input value={value} onChange={onChange} placeholder={placeholder}
                className="w-full h-10 rounded-[10px] border border-[#e0daf7] px-3 text-[13px] text-[#333] outline-none focus:border-[#826CFF] transition-colors" />
        </div>
    );
}

// ─── 등록된 결제수단 선택 팝업 ───────────────────────────────────────────────

interface SavedCard {
    id: string; brand: string; last4: string; expiry: string; isDefault: boolean;
}

function SavedCardModal({
    cards,
    selectedId,
    onSelect,
    onClose,
}: {
    cards: SavedCard[];
    selectedId: string;
    onSelect: (id: string) => void;
    onClose: () => void;
}) {
    const [tempId, setTempId] = useState(selectedId);

    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[20px] w-full max-w-sm p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[16px] font-bold text-[#111]">결제수단 선택</h3>
                    <button onClick={onClose} className="text-[#aaa] hover:text-[#555] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="flex flex-col gap-2 mb-5">
                    {cards.map(card => (
                        <button
                            key={card.id}
                            onClick={() => setTempId(card.id)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-[12px] border-2 text-left transition-all ${tempId === card.id
                                    ? "border-[#826CFF] bg-[#f5f3ff]"
                                    : "border-[#e0daf7] hover:border-[#c4bbff]"
                                }`}
                        >
                            {/* 라디오 */}
                            <span className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${tempId === card.id ? "border-[#826CFF]" : "border-[#d0c9f0]"
                                }`}>
                                {tempId === card.id && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#826CFF]" />
                                )}
                            </span>

                            {/* 브랜드 뱃지 */}
                            <span className="text-[11px] font-bold text-[#826CFF] bg-[#f0eeff] px-2 py-0.5 rounded flex-shrink-0">
                                {card.brand}
                            </span>

                            {/* 카드 번호 */}
                            <span className="text-[13px] font-semibold text-[#333] flex-1">
                                •••• {card.last4}
                            </span>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[11px] text-[#aaa]">{card.expiry}</span>
                                {card.isDefault && (
                                    <span className="text-[10px] font-bold text-[#826CFF] bg-[#f0eeff] px-1.5 py-0.5 rounded-full">
                                        기본
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-full border-2 border-[#e0daf7] text-[#888] text-[14px] font-bold hover:bg-[#f5f3ff] transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => { onSelect(tempId); onClose(); }}
                        className="flex-1 h-11 rounded-full bg-[#826CFF] text-white text-[14px] font-bold hover:bg-[#6B5CE7] transition-colors"
                    >
                        선택 완료
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 주문 페이지 본체 ─────────────────────────────────────────────────────────
function OrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const productId = searchParams.get("productId") ?? "unknown";
    const title = searchParams.get("title") ?? "상품명";
    const price = searchParams.get("price") ?? "0원";
    const thumbnail = searchParams.get("thumbnail") ?? "";
    const option = searchParams.get("option") ?? "기본";
    const qty = Number(searchParams.get("qty") ?? 1);
    const rawPrice = parseInt(price.replace(/[^0-9]/g, ""), 10) || 0;

    // ── 멤버십 / 배송비 ──
    const { user } = useAuthStore();
    const isMember = !!user?.membership;
    const FREE_SHIPPING_THRESHOLD = 100000;
    const shippingFee = isMember ? 0 : rawPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 3000;

    // ── 쿠폰 (Firebase 연동) ──
    const {
        activeCoupons,
        selectedCoupon,
        selectCoupon,
        getDiscount,
        fetchActiveCoupons,
    } = useCouponStore();

    // ── 포인트 (Firebase 연동) ──
    const { points, fetchPoints } = usePointStore();

    // ── 유저 데이터 로드 ──
    useEffect(() => {
        if (user?.uid) {
            fetchActiveCoupons(user.uid);
            fetchPoints(user.uid);
        }
    }, [user?.uid]);

    // ── 주문자 정보 — user 값으로 초기화 ──
    const [buyer, setBuyer] = useState<BuyerInfo>({
        name: user?.name ?? "",
        phone: "",
        email: user?.email ?? "",
    });
    const [showBuyerModal, setShowBuyerModal] = useState(false);

    // user 로드 완료 후 buyer 동기화
    useEffect(() => {
        setBuyer((prev) => ({
            ...prev,
            name: prev.name || user?.name || "",
            email: prev.email || user?.email || "",
        }));
    }, [user?.name, user?.email]);

    // ── 배송지 ──
    const [shipping, setShipping] = useState<ShippingInfo>({
        name: "라프텔", phone: "010-5959-5959",
        address: "서울특별시 영등포구 국제금융로 10, (여의도동, 서울국제금융센터 투아이에프씨)",
        detail: "13층, 주식회사 라프텔", zip: "03706", memo: "벨리 와주세요",
    });
    const [showShippingModal, setShowShippingModal] = useState(false);

    // ── 쿠폰 셀렉트 핸들러 ──
    const handleCouponChange = (couponId: string) => {
        if (!couponId) { selectCoupon(null); return; }
        const found = activeCoupons.find((c) => c.id === couponId) ?? null;
        selectCoupon(found);
    };

    // ── 할인 계산 ──
    // 쿠폰은 상품금액 기준 (배송비 제외), baseDiscount 적용 후 금액 기준
    const baseDiscount = 8000;
    const orderBase = rawPrice + shippingFee - baseDiscount; // 쿠폰/포인트 적용 전 기준 금액
    const couponDiscount = getDiscount(Math.max(0, orderBase));

    // ── 포인트 입력 ──
    const [pointInput, setPointInput] = useState("");
    const [appliedPoint, setAppliedPoint] = useState(0);
    const [pointError, setPointError] = useState("");

    // 쿠폰 변경 시 포인트 자동 재계산 (전체사용 중이었으면 다시 맞춰줌)
    useEffect(() => {
        if (appliedPoint === 0) return;
        const maxAfterCoupon = Math.max(0, orderBase - couponDiscount);
        const newMax = Math.min(points, maxAfterCoupon);
        if (appliedPoint > newMax) {
            setAppliedPoint(newMax);
            setPointInput(String(newMax));
        }
    }, [couponDiscount]); // eslint-disable-line

    const applyPoint = () => {
        const v = parseInt(pointInput.replace(/[^0-9]/g, ""), 10) || 0;
        if (v > points) { setPointError(`보유 포인트(${points.toLocaleString()}P)를 초과했어요.`); return; }
        const maxUsable = Math.max(0, orderBase - couponDiscount);
        if (v > maxUsable) { setPointError("사용 포인트가 결제 금액을 초과해요."); return; }
        setPointError("");
        setAppliedPoint(v);
    };
    const useAllPoints = () => {
        const maxUsable = Math.max(0, orderBase - couponDiscount);
        const max = Math.min(points, maxUsable);
        setPointInput(String(max));
        setAppliedPoint(max);
        setPointError("");
    };

    const totalDiscount = baseDiscount + couponDiscount + appliedPoint;
    const totalPrice = Math.max(0, rawPrice + shippingFee - totalDiscount);

    // ── 저장된 카드 (Firestore users/{uid}.cards) ──
    const [savedCards, setSavedCards] = useState<{
        id: string; brand: string; last4: string; expiry: string; isDefault: boolean;
    }[]>([]);

    useEffect(() => {
        if (!user?.uid) return;
        import("@/firebase/firebase").then(({ db: fsdb }) =>
            import("firebase/firestore").then(({ getDoc, doc: fsDoc }) =>
                getDoc(fsDoc(fsdb, "users", user.uid!)).then(snap => {
                    if (snap.exists()) setSavedCards(snap.data().cards ?? []);
                })
            )
        );
    }, [user?.uid]);

    // ── 결제 수단 ──
    const [selectedPayment, setSelectedPayment] = useState("laftel_pay");
    const [showCardModal, setShowCardModal] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [agreeError, setAgreeError] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── 금액 애니메이션 ──
    const animTotal = useAnimatedNumber(totalPrice);
    const animDiscount = useAnimatedNumber(totalDiscount);
    const flashTotal = useFlash(totalPrice);

    // ── 결제 처리 ─────────────────────────────────────────────────────────────
    const handlePay = async () => {
        if (!agreed) {
            setAgreeError(true);
            document.getElementById("agree-checkbox")?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        if (!user?.uid) return;
        setLoading(true);
        try {
            const uid = user.uid;

            // 1. 첫 구매 여부 — addDoc 전에 먼저 확인 (타이밍 이슈 방지)
            const existingOrders = await getDocs(collection(db, "users", uid, "orders"));
            const isFirstPurchase = existingOrders.size === 0;

            // 2. 주문 Firestore 저장
            const orderRef = await addDoc(
                collection(db, "users", uid, "orders"),
                {
                    status: "결제완료",
                    total: totalPrice,
                    usedPoints: appliedPoint,
                    couponId: selectedCoupon?.id ?? null,
                    couponDiscount,
                    paymentMethod: selectedPayment,
                    buyer,
                    shipping,
                    createdAt: serverTimestamp(),
                    items: [{
                        productId,
                        title,
                        thumbnail,
                        option,
                        price: rawPrice,
                        qty,
                    }],
                }
            );

            // 3. 쿠폰 사용 처리
            if (selectedCoupon) {
                await useCoupon(uid, selectedCoupon.id, orderRef.id);
                selectCoupon(null);
            }

            // 4. 포인트 차감
            if (appliedPoint > 0) {
                await usePointStore.getState().chargePoints(uid, -appliedPoint, "스토어 결제 포인트 사용");
            }

            // 5. 첫 구매면 축하 쿠폰 발급 (issueCoupon 내부에서 쿠폰 알림도 함께 저장)
            if (isFirstPurchase) {
                await issueCoupon({
                    uid,
                    label: "첫 구매 축하 쿠폰",
                    discount: 0.1,
                    type: "rate",
                    minOrderAmount: 5000,
                    maxDiscountAmount: 3000,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                });
            }

            router.push(
                `/store/order/complete?orderNumber=${orderRef.id}` +
                `&title=${encodeURIComponent(title)}` +
                `&thumbnail=${encodeURIComponent(thumbnail)}` +
                `&total=${totalPrice}` +
                `&option=${encodeURIComponent(option)}` +
                `&qty=${qty}`
            );
        } catch (err) {
            console.error("[Order] 결제 처리 실패:", err);
            alert("주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f3ff]">
            {showBuyerModal && (
                <EditBuyerModal info={buyer} onSave={setBuyer} onClose={() => setShowBuyerModal(false)} />
            )}
            {showShippingModal && (
                <EditShippingModal info={shipping} onSave={setShipping} onClose={() => setShowShippingModal(false)} />
            )}
            {showCardModal && savedCards.length > 0 && (
                <SavedCardModal
                    cards={savedCards}
                    selectedId={savedCards.some(c => c.id === selectedPayment) ? selectedPayment : (savedCards.find(c => c.isDefault)?.id ?? savedCards[0].id)}
                    onSelect={setSelectedPayment}
                    onClose={() => setShowCardModal(false)}
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

            {/* 헤더 */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#ebe8ff]">
                <div className="mx-auto max-w-[1770px] px-1 h-14 flex items-center">
                    <Link href={`/store/${productId}`} className="flex items-center gap-1.5 text-[13px] text-[#6B5CE7] hover:underline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        뒤로 돌아가기
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1770px] px-[75px] py-10">
                <div className="text-center mb-10">
                    <p className="text-[12px] font-semibold tracking-[0.2em] text-[#826CFF] uppercase mb-1">Laftel Store</p>
                    <h1 className="text-[28px] font-extrabold text-[#111018] tracking-tight">ORDER & PAY</h1>
                    <p className="text-[13px] text-[#aaa] mt-1">최종 주문하기</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-5 items-start">
                    {/* ── 왼쪽 ── */}
                    <div className="flex-1 space-y-4">

                        {/* 상품 정보 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <div className="flex gap-4">
                                {thumbnail && (
                                    <div className="w-[100px] h-[100px] rounded-[12px] overflow-hidden bg-[#f5f3ff] flex-shrink-0 border border-[#ebe8ff]">
                                        <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <span className="inline-block text-[10px] font-bold bg-[#f0eeff] text-[#826CFF] px-2 py-0.5 rounded-full mb-1.5">예약</span>
                                    <h2 className="text-[14px] font-bold text-[#111018] leading-snug line-clamp-2">{title}</h2>
                                    {option !== "기본" && <p className="mt-1 text-[12px] text-[#999]">옵션: {option}</p>}
                                    <p className="mt-1 text-[12px] text-[#bbb]">수량: {qty}개</p>
                                    <p className="mt-2 text-[18px] font-extrabold text-[#111018]">{rawPrice.toLocaleString()}원</p>
                                </div>
                            </div>
                        </section>

                        {/* 주문자 정보 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[15px] font-bold text-[#111018]">주문자 정보</h3>
                                <button onClick={() => setShowBuyerModal(true)}
                                    className="text-[12px] text-[#826CFF] hover:underline font-semibold flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    정보수정
                                </button>
                            </div>
                            <div className="space-y-2 text-[13px]">
                                <p className="font-bold text-[#111]">{buyer.name || "이름을 입력해주세요"}</p>
                                <div className="flex gap-3"><span className="w-14 text-[#aaa]">휴대폰</span><span className="text-[#333] font-medium">{buyer.phone || "-"}</span></div>
                                <div className="flex gap-3"><span className="w-14 text-[#aaa]">이메일</span><span className="text-[#333] font-medium">{buyer.email || "-"}</span></div>
                            </div>
                            <p className="mt-3 text-[11px] text-[#ccc] leading-relaxed">
                                * 위 연락처 정보는 배송 관련 알림 발송 시 사용됩니다.
                            </p>
                        </section>

                        {/* 배송지 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[15px] font-bold text-[#111018]">배송지 주소</h3>
                                <button onClick={() => setShowShippingModal(true)}
                                    className="text-[12px] text-[#826CFF] hover:underline font-semibold flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    주소변경
                                </button>
                            </div>
                            <div className="space-y-1 text-[13px]">
                                <p className="font-bold text-[#111]">{shipping.name}</p>
                                <p className="text-[#555]">{shipping.phone}</p>
                                <p className="text-[#555] leading-relaxed">{shipping.address}<br />{shipping.detail}<br />({shipping.zip})</p>
                                {shipping.memo && <p className="mt-2 text-[#aaa]">요청사항: {shipping.memo}</p>}
                            </div>
                        </section>

                        {/* 할인혜택 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <h3 className="text-[15px] font-bold text-[#111018] mb-4">할인혜택</h3>
                            <div className="grid grid-cols-2 gap-4">

                                {/* 쿠폰 */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">쿠폰 적용</label>
                                    <div className="relative">
                                        <select
                                            value={selectedCoupon?.id ?? ""}
                                            onChange={(e) => handleCouponChange(e.target.value)}
                                            className="w-full h-11 rounded-[12px] border border-[#e0daf7] px-4 pr-10 text-[13px] text-[#333] bg-white outline-none focus:border-[#826CFF] appearance-none transition-colors"
                                        >
                                            <option value="">쿠폰을 선택해주세요</option>
                                            {activeCoupons.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.label} ({c.type === "rate"
                                                        ? `${Math.round(c.discount * 100)}%`
                                                        : `${c.discount.toLocaleString()}원`} 할인)
                                                </option>
                                            ))}
                                        </select>
                                        <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#826CFF]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                    {selectedCoupon ? (
                                        <p className="mt-1.5 text-[12px] text-[#826CFF] font-semibold flex items-center gap-1">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {selectedCoupon.type === "rate"
                                                ? `${Math.round(selectedCoupon.discount * 100)}% 할인 — ${couponDiscount.toLocaleString()}원 절약`
                                                : `${selectedCoupon.discount.toLocaleString()}원 할인`}
                                        </p>
                                    ) : <p className="mt-1 text-[11px] text-transparent select-none">-</p>}
                                </div>

                                {/* 포인트 */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">
                                        포인트
                                        <span className="text-[#aaa] font-normal ml-1.5">(보유 {points.toLocaleString()}P)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={pointInput}
                                            onChange={(e) => {
                                                setPointInput(e.target.value.replace(/[^0-9]/g, ""));
                                                setAppliedPoint(0);
                                                setPointError("");
                                            }}
                                            placeholder="0"
                                            className={`flex-1 h-11 rounded-[12px] border px-4 text-[13px] outline-none transition-colors ${pointError ? "border-[#ff4d6d]" : "border-[#e0daf7] focus:border-[#826CFF]"}`}
                                        />
                                        <button onClick={useAllPoints}
                                            className="h-11 px-3 rounded-[12px] border border-[#e0daf7] text-[#826CFF] text-[12px] font-bold hover:bg-[#f5f3ff] transition-colors whitespace-nowrap">
                                            전체사용
                                        </button>
                                        <button onClick={applyPoint}
                                            className="h-11 px-3 rounded-[12px] bg-[#826CFF] text-white text-[12px] font-bold hover:bg-[#6B5CE7] transition-colors">
                                            적용
                                        </button>
                                    </div>
                                    {pointError && <p className="mt-1.5 text-[12px] text-[#ff4d6d] font-semibold">{pointError}</p>}
                                    {!pointError && appliedPoint > 0 && (
                                        <p className="mt-1.5 text-[12px] text-[#826CFF] font-semibold flex items-center gap-1">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {appliedPoint.toLocaleString()}P 사용
                                        </p>
                                    )}
                                    {!pointError && appliedPoint === 0 && (
                                        <p className="mt-1 text-[11px] text-[#bbb]">사용 가능 포인트: {Math.min(points, Math.max(0, orderBase - couponDiscount)).toLocaleString()}P</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* ── 오른쪽: 결제 요약 ── */}
                    <div className="lg:w-[300px] space-y-4 lg:sticky lg:top-[80px]">

                        {/* 최종결제 금액 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff] overflow-hidden">
                            <h3 className="text-[15px] font-bold text-[#111018] mb-4">최종결제 금액</h3>
                            <div className="space-y-2.5 text-[13px]">
                                <div className="flex justify-between">
                                    <span className="text-[#888]">총 상품 금액</span>
                                    <span className="font-semibold text-[#111]">{rawPrice.toLocaleString()}원</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-[#888]">배송비</span>
                                    {isMember ? (
                                        <span className="font-semibold text-[#826CFF] flex items-center gap-1 text-[12px]">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                            멤버십 회원은 무료!
                                        </span>
                                    ) : rawPrice >= FREE_SHIPPING_THRESHOLD ? (
                                        <span className="font-semibold text-[#826CFF] text-[12px]">무료 (10만원 이상)</span>
                                    ) : (
                                        <span className="text-right">
                                            <span className="font-semibold text-[#111] block">3,000원</span>
                                            <span className="text-[11px] text-[#aaa]">10만원 이상 무료배송</span>
                                        </span>
                                    )}
                                </div>

                                {/* 기본 할인 */}
                                <div className="flex justify-between">
                                    <span className="text-[#888]">기본 할인</span>
                                    <span className="font-semibold text-[#ff4d6d]">-8,000원</span>
                                </div>

                                {/* 쿠폰 할인 — 적용 시만 */}
                                {couponDiscount > 0 && (
                                    <div className="flex justify-between" style={{ animation: "fadeSlideIn 0.3s ease" }}>
                                        <span className="text-[#888]">쿠폰 할인</span>
                                        <span className="font-semibold text-[#ff4d6d]">-{couponDiscount.toLocaleString()}원</span>
                                    </div>
                                )}

                                {/* 포인트 — 적용 시만 */}
                                {appliedPoint > 0 && (
                                    <div className="flex justify-between" style={{ animation: "fadeSlideIn 0.3s ease" }}>
                                        <span className="text-[#888]">포인트 사용</span>
                                        <span className="font-semibold text-[#ff4d6d]">-{appliedPoint.toLocaleString()}원</span>
                                    </div>
                                )}

                                <div className={`border-t border-[#f0eeff] pt-3 flex justify-between items-center rounded-[10px] px-2 py-2 -mx-2 transition-colors duration-300 ${flashTotal === "down" ? "bg-[#f0fdf4]" : flashTotal === "up" ? "bg-[#fff0f0]" : ""}`}>
                                    <span className="font-bold text-[#111]">총 결제 금액</span>
                                    <span className="text-[20px] font-extrabold text-[#826CFF] tabular-nums">
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
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <h3 className="text-[15px] font-bold text-[#111018] mb-4">결제수단</h3>
                            <div className="space-y-2">
                                <button onClick={() => setSelectedPayment("laftel_pay")}
                                    className={`w-full h-11 rounded-[12px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${selectedPayment === "laftel_pay" ? "bg-[#826CFF] text-white shadow-md shadow-[#826cff40]" : "bg-[#f0eeff] text-[#826CFF] hover:bg-[#e8e3ff]"}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                    라프텔 페이로 1초 만에 결제
                                </button>

                                {/* 등록된 결제수단 */}
                                {savedCards.length > 0 && (
                                    <>
                                        <p className="text-[11px] text-[#bbb] font-semibold pt-1 px-1">등록된 결제수단</p>
                                        <button
                                            onClick={() => setShowCardModal(true)}
                                            className={`w-full h-11 rounded-[12px] border-2 text-left px-4 flex items-center gap-3 transition-all ${savedCards.some(c => c.id === selectedPayment)
                                                    ? "border-[#826CFF] bg-[#f5f3ff]"
                                                    : "border-[#e0daf7] hover:border-[#c4bbff]"
                                                }`}
                                        >
                                            {(() => {
                                                const chosen = savedCards.find(c => c.id === selectedPayment);
                                                return chosen ? (
                                                    <>
                                                        <span className="text-[11px] font-bold text-[#826CFF] bg-[#f0eeff] px-1.5 py-0.5 rounded flex-shrink-0">{chosen.brand}</span>
                                                        <span className="text-[13px] font-semibold text-[#333] flex-1">•••• {chosen.last4}</span>
                                                        <span className="text-[11px] text-[#826CFF] font-semibold">변경 ›</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="2.2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                                        <span className="text-[13px] text-[#826CFF] font-semibold flex-1">카드 선택하기</span>
                                                        <span className="text-[11px] text-[#826CFF]">›</span>
                                                    </>
                                                );
                                            })()}
                                        </button>
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "kakaopay", label: "카카오페이", color: "#3A1D1D" },
                                        { id: "naverpay", label: "네이버페이", color: "#03C75A" },
                                        { id: "tosspay", label: "토스페이", color: "#0064FF" },
                                        { id: "applepay", label: "Apple Pay", color: "#111" },
                                    ].map((pm) => (
                                        <button key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                                            className={`h-11 rounded-[12px] text-[13px] font-bold transition-all border-2 ${selectedPayment === pm.id ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] bg-white hover:border-[#c4bbff]"}`}>
                                            <span style={{ color: pm.color }}>{pm.label}</span>
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
                            </div>
                            <button
                                id="agree-checkbox"
                                type="button"
                                onClick={() => { setAgreed(v => !v); setAgreeError(false); }}
                                className={`mt-3 w-full flex items-center gap-2 rounded-[10px] px-3 py-2.5 transition-colors ${agreeError ? "bg-[#fff0f3] border border-[#ffb3c1]" : agreed ? "bg-[#f0eeff]" : "bg-[#fafafa] border border-transparent hover:bg-[#f5f3ff]"}`}
                            >
                                <span className={`w-5 h-5 rounded-[6px] flex-shrink-0 flex items-center justify-center border-2 transition-colors ${agreed ? "bg-[#826CFF] border-[#826CFF]" : agreeError ? "border-[#ff4d6d]" : "border-[#d0c9f0]"}`}>
                                    {agreed && (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </span>
                                <span className={`text-[11px] font-semibold leading-relaxed ${agreed ? "text-[#826CFF]" : agreeError ? "text-[#ff4d6d]" : "text-[#aaa]"}`}>
                                    주문 내용을 확인하였으며, 정보 제공 등에 동의합니다. (필수)
                                </span>
                            </button>
                            {agreeError && (
                                <p className="mt-1.5 text-[11px] text-[#ff4d6d] font-semibold text-center" style={{ animation: "fadeSlideIn 0.2s ease" }}>
                                    동의 후 결제를 진행해주세요.
                                </p>
                            )}
                        </section>

                        {/* 결제하기 */}
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