"use client";

// app/store/order/page.tsx

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, addDoc, serverTimestamp, arrayRemove, doc, setDoc } from "firebase/firestore";

declare global { interface Window { daum: any; } }

// ─── 더미 데이터 ─────────────────────────────────────────────────────────────
const DUMMY_COUPONS = [
    { id: "c1", label: "신규 가입 쿠폰 10%", discount: 0.1, type: "rate" as const },
    { id: "c2", label: "여름 한정 3,000원 할인", discount: 3000, type: "fixed" as const },
    { id: "c3", label: "라프텔 멤버십 5,000원 할인", discount: 5000, type: "fixed" as const },
];
const MAX_POINTS = 5000;

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

    const handleAddressSearch = () => {
        if (!window.daum?.Postcode) {
            alert("주소 검색 서비스를 불러오는 중이에요. 잠시 후 다시 시도해주세요.");
            return;
        }
        new window.daum.Postcode({
            oncomplete: (data: any) => {
                const address = data.roadAddress || data.jibunAddress;
                setForm((f) => ({ ...f, zip: data.zonecode, address }));
            },
            theme: { bgColor: "#826CFF", searchBgColor: "#6B5CE7", contentBgColor: "#faf9ff", pageBgColor: "#f5f3ff", textColor: "#111018", queryTextColor: "#ffffff" },
        }).open();
    };

    return (
        <ModalWrap onClose={onClose} title="배송지 변경">
            <div className="space-y-3">
                <Field label="수령인" value={form.name} onChange={set("name")} placeholder="홍길동" />
                <Field label="연락처" value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" />
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Field label="우편번호" value={form.zip} onChange={set("zip")} placeholder="03706" />
                    </div>
                    <button
                        onClick={handleAddressSearch}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full max-w-[420px] bg-white rounded-[24px] p-6 shadow-2xl"
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

// ─── 인풋 필드 ───────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder }: {
    label: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#666] mb-1.5">{label}</label>
            <input value={value} onChange={onChange} placeholder={placeholder}
                className="w-full h-10 rounded-[10px] border border-[#e0daf7] px-3 text-[13px] outline-none focus:border-[#826CFF] transition-colors" />
        </div>
    );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
function OrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ── 상품 파싱 (단일 or 장바구니 다중) ──
    type OrderItem = { productId: string; title: string; price: number; thumbnail: string; option: string; qty: number; category?: string; };
    const itemsParam = searchParams.get("items");
    const items: OrderItem[] = (() => {
        if (itemsParam) {
            try { return JSON.parse(itemsParam) as OrderItem[]; } catch { }
        }
        // 단일 상품 (ProductDetail에서 직접 구매)
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
        if (cartRawsParam) {
            try { return JSON.parse(cartRawsParam) as unknown[]; } catch { }
        }
        return [];
    })();

    // ── 멤버십 / 배송비 ──
    const { user } = useAuthStore();
    const isMember = !!user?.membership;
    const FREE_SHIPPING_THRESHOLD = 100000;
    const shippingFee = isMember ? 0 : totalItemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 3000;

    // ── 단일 상품 호환용 (Firestore 저장 등에서 사용) ──
    const productId = items[0]?.productId ?? "unknown";
    const title = items[0]?.title ?? "상품명";
    const thumbnail = items[0]?.thumbnail ?? "";
    const option = items[0]?.option ?? "기본";
    const qty = items[0]?.qty ?? 1;
    const rawPrice = totalItemsPrice;

    // ── 주문자 정보 ──
    const [buyer, setBuyer] = useState<BuyerInfo>({ name: "라프텔", phone: "010-5959-5958", email: "laftel@naver.com" });
    const [showBuyerModal, setShowBuyerModal] = useState(false);

    // ── 배송지 ──
    const [shipping, setShipping] = useState<ShippingInfo>({
        name: "라프텔", phone: "010-5959-5959",
        address: "서울특별시 영등포구 국제금융로 10, (여의도동, 서울국제금융센터 투아이에프씨)",
        detail: "13층, 주식회사 라프텔", zip: "03706", memo: "빨리 와주세요",
    });
    const [showShippingModal, setShowShippingModal] = useState(false);

    // ── 쿠폰 / 포인트 ──
    const [selectedCoupon, setSelectedCoupon] = useState("");
    const [pointInput, setPointInput] = useState("");
    const [appliedPoint, setAppliedPoint] = useState(0);
    const [pointError, setPointError] = useState("");

    const coupon = DUMMY_COUPONS.find((c) => c.id === selectedCoupon);
    const couponDiscount = coupon
        ? coupon.type === "rate"
            ? Math.floor(rawPrice * coupon.discount)
            : coupon.discount
        : 0;

    const baseDiscount = 8000;
    const totalDiscount = baseDiscount + couponDiscount + appliedPoint;
    const totalPrice = Math.max(0, totalItemsPrice + shippingFee - totalDiscount);

    // ── 포인트 적용 ──
    const applyPoint = () => {
        const v = parseInt(pointInput.replace(/[^0-9]/g, ""), 10) || 0;
        if (v > MAX_POINTS) { setPointError(`최대 ${MAX_POINTS.toLocaleString()}P까지 사용 가능해요.`); return; }
        if (v > totalItemsPrice + shippingFee - baseDiscount - couponDiscount) { setPointError("사용 포인트가 결제 금액을 초과해요."); return; }
        setPointError("");
        setAppliedPoint(v);
    };
    const useAllPoints = () => {
        const max = Math.min(MAX_POINTS, Math.max(0, totalItemsPrice + shippingFee - baseDiscount - couponDiscount));
        setPointInput(String(max));
        setAppliedPoint(max);
        setPointError("");
    };

    // ── 결제 수단 ──
    const [selectedPayment, setSelectedPayment] = useState("laftel_pay");
    const [agreed, setAgreed] = useState(false);
    const [agreeError, setAgreeError] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── 금액 애니메이션 ──
    const animTotal = useAnimatedNumber(totalPrice);
    const animDiscount = useAnimatedNumber(totalDiscount);
    const flashTotal = useFlash(totalPrice);

    const handlePay = async () => {
        if (!agreed) {
            setAgreeError(true);
            document.getElementById("agree-checkbox")?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        if (!user?.uid) return;
        setLoading(true);
        try {
            // Firestore users/{uid}/orders 에 주문 저장
            const orderRef = await addDoc(
                collection(db, "users", user.uid, "orders"),
                {
                    status: "결제완료",
                    total: totalPrice,
                    usedPoints: appliedPoint,
                    createdAt: serverTimestamp(),
                    notified: false,
                    buyer: {
                        name: buyer.name,
                        phone: buyer.phone,
                        email: buyer.email,
                    },
                    shipping: {
                        name: shipping.name,
                        phone: shipping.phone,
                        address: shipping.address,
                        detail: shipping.detail,
                        zip: shipping.zip,
                        memo: shipping.memo,
                    },
                    items: items.map(item => ({
                        productId: item.productId,
                        title: item.title,
                        thumbnail: item.thumbnail,
                        option: item.option,
                        price: item.price,
                        qty: item.qty,
                    })),
                }
            );
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
                <EditShippingModal info={shipping} onSave={setShipping} onClose={() => setShowShippingModal(false)} />
            )}

            {/* 결제 로딩 오버레이 */}
            {loading && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
                    style={{ animation: "fadeIn 0.2s ease" }}>
                    <div className="flex flex-col items-center gap-6">
                        {/* 스피너 */}
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-[#ebe8ff]" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#826CFF] animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#826CFF" strokeWidth="1.8">
                                    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                                </svg>
                            </div>
                        </div>
                        {/* 텍스트 */}
                        <div className="text-center">
                            <p className="text-[18px] font-extrabold text-[#111018] tracking-tight">결제 처리 중</p>
                            <p className="mt-1.5 text-[13px] text-[#aaa]">잠시만 기다려주세요...</p>
                        </div>
                        {/* 진행 바 */}
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
                <div className="mx-auto max-w-[1770px] px-[75px] h-14 flex items-center">
                    <Link href={`/store/cart`} className="flex items-center gap-1.5 text-[13px] text-[#6B5CE7] hover:underline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        뒤로 돌아가기
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1770px] px-[75px] py-10">
                <div className="text-center mb-10">
                    <p className="text-[12px] font-semibold tracking-[0.2em] text-[#826CFF] uppercase mb-1">Laftel Store</p>
                    <h1 className="text-[34px] font-extrabold text-[#111018] tracking-tight">ORDER & PAY</h1>
                    <p className="text-[16px] text-[#aaa] mt-1">최종 주문하기</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-5 items-start">
                    {/* ── 왼쪽 ── */}
                    <div className="flex-1 space-y-4">
                        {/* 상품 정보 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff] mb-5">
                            <div className="space-y-4">
                                {items.map((item, i) => (
                                    <div key={i} className="flex gap-4 pb-4 border-b border-[#f5f3ff] last:border-0 last:pb-0 items-center">
                                        {item.thumbnail && (
                                            <div className="w-[170px] h-[170px] rounded-[12px] overflow-hidden bg-[#f5f3ff] flex-shrink-0 border border-[#ebe8ff]">
                                                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            {item.category && (
                                                <p className="text-[12px] font-semibold text-[#826CFF] mb-1">{item.category}</p>
                                            )}
                                            <h2 className="text-[16px] font-bold text-[#111018] leading-snug line-clamp-2 mb-3">{item.title}</h2>
                                            {item.option !== "기본" && <p className="mt-1 text-[13px] text-[#999]">옵션: {item.option}</p>}
                                            <p className="mt-0.5 text-[12px] text-[#bbb]">수량: {item.qty}개</p>
                                            <p className="mt-3 text-[12px] text-[#826CFF] font-semibold">
                                                {Math.floor(item.price * item.qty * 0.01).toLocaleString()}원 적립 예정 (결제금액의 1%)
                                            </p>
                                            <p className="mt-0.5 text-[23px] font-extrabold text-[#111018]">{(item.price * item.qty).toLocaleString()}원</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        {/* 주문자 정보 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[18px] font-bold text-[#111018]">주문자 정보</h3>
                                <button onClick={() => setShowBuyerModal(true)}
                                    className="text-[12px] text-[#826CFF] hover:underline font-semibold flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    정보수정
                                </button>
                            </div>
                            <div className="space-y-2 text-[14px]">
                                <p className="font-bold text-[#111]">{buyer.name}</p>
                                <div className="flex gap-3"><span className="w-14 text-[#aaa]">휴대폰</span><span className="text-[#333] font-medium">{buyer.phone}</span></div>
                                <div className="flex gap-3"><span className="w-14 text-[#aaa]">이메일</span><span className="text-[#333] font-medium">{buyer.email}</span></div>
                            </div>
                            <p className="mt-3 text-[12px] text-[#ccc] leading-relaxed">
                                * 위 연락처 정보는 배송 관련 알림 발송 시 사용됩니다.
                            </p>
                        </section>

                        {/* 배송지 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[18px] font-bold text-[#111018]">배송지 주소</h3>
                                <button onClick={() => setShowShippingModal(true)}
                                    className="text-[12px] text-[#826CFF] hover:underline font-semibold flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    주소변경
                                </button>
                            </div>
                            <div className="space-y-1 text-[14px]">
                                <p className="font-bold text-[#111]">{shipping.name}</p>
                                <p className="text-[#555]">{shipping.phone}</p>
                                <p className="text-[#555] leading-relaxed">{shipping.address}<br />{shipping.detail}<br />({shipping.zip})</p>
                                {shipping.memo && <p className="mt-2 text-[#aaa]">요청사항: {shipping.memo}</p>}
                            </div>
                        </section>

                        {/* 할인혜택 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff]">
                            <h3 className="text-[18px] font-bold text-[#111018] mb-4">할인혜택</h3>
                            <div className="grid grid-cols-2 gap-4">

                                {/* 쿠폰 */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">쿠폰 적용</label>
                                    <div className="relative">
                                        <select
                                            value={selectedCoupon}
                                            onChange={(e) => setSelectedCoupon(e.target.value)}
                                            className="w-full h-11 rounded-[12px] border border-[#e0daf7] px-4 pr-10 text-[13px] text-[#333] bg-white outline-none focus:border-[#826CFF] appearance-none transition-colors"
                                        >
                                            <option value="">쿠폰을 선택해주세요</option>
                                            {DUMMY_COUPONS.map((c) => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                        </select>
                                        <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#826CFF]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                    {coupon ? (
                                        <p className="mt-1.5 text-[12px] text-[#826CFF] font-semibold flex items-center gap-1">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            {coupon.type === "rate"
                                                ? `${(coupon.discount * 100).toFixed(0)}% 할인 — ${couponDiscount.toLocaleString()}원 절약`
                                                : `${coupon.discount.toLocaleString()}원 할인`}
                                        </p>
                                    ) : <p className="mt-1 text-[11px] text-transparent select-none">-</p>}
                                </div>

                                {/* 포인트 */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#666] mb-1.5">
                                        포인트
                                        <span className="text-[#aaa] font-normal ml-1.5">(보유 {MAX_POINTS.toLocaleString()}P)</span>
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
                                        <p className="mt-1 text-[11px] text-[#bbb]">사용 가능 포인트: {MAX_POINTS.toLocaleString()}P</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* ── 오른쪽: 결제 요약 ── */}
                    <div className="lg:w-[300px] space-y-4 lg:sticky lg:top-[80px]">

                        {/* 최종결제 금액 */}
                        <section className="bg-white rounded-[20px] p-6 border border-[#ebe8ff] overflow-hidden">
                            <h3 className="text-[18px] font-bold text-[#111018] mb-4">최종결제 금액</h3>
                            <div className="space-y-2.5 text-[13px]">
                                <div className="flex justify-between">
                                    <span className="text-[#888]">총 상품 금액</span>
                                    <span className="font-semibold text-[#111]">{rawPrice.toLocaleString()}원</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-[#888]">배송비</span>
                                    {isMember ? (
                                        <span className="font-semibold text-[#826CFF] flex items-center gap-1 text-[12px]">
                                            ✨ 멤버십 회원은 무료!
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

                                {/* 총 절약 금액 뱃지 */}
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
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "kakaopay", label: "카카오페이", img: "/images/pay/kakao.png" },
                                        { id: "naverpay", label: "네이버페이", img: "/images/pay/naver.png" },
                                        { id: "tosspay", label: "토스페이", img: "/images/pay/toss.png" },
                                        { id: "applepay", label: "Apple Pay", img: "/images/pay/apple.png" },
                                    ].map((pm) => (
                                        <button key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                                            className={`h-11 rounded-[12px] transition-all border-2 flex items-center justify-center ${selectedPayment === pm.id ? "border-[#826CFF] bg-[#f5f3ff]" : "border-[#e0daf7] bg-white hover:border-[#c4bbff]"}`}>
                                            <img src={pm.img} alt={pm.label}
                                                className={`object-contain ${pm.id === "applepay" ? "h-8" : "h-5"}`}
                                            />
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
                        </section>

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