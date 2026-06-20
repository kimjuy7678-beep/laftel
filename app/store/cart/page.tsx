"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from "firebase/firestore";
import products from "@/data/store.json";
import { db } from "@/firebase/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Product } from "@/types/store";

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

const STORE_PRODUCTS = products as Product[];
const SHIPPING_FEE = 3000;
const FREE_SHIPPING_THRESHOLD = 100000;
const MEMBER_DISCOUNT = 3000;

type StoredCartItem = { productId: string; option?: unknown; quantity?: number; };
type CartItem = { key: string; product: Product; option: string; quantity: number; raw: string | StoredCartItem; };
type OptionModalState = { item: CartItem; selectedOption: string; };
type ProductWithOptions = Product & { options?: unknown[]; optionValues?: unknown[]; variants?: unknown[]; };

async function fetchProductOptions(productId: string) {
    try {
        const response = await fetch(`/api/store/products/${productId}/options`);
        if (!response.ok) return [];
        const data = await response.json() as { options?: unknown[] };
        return uniqueOptions(data.options ?? []);
    } catch { return []; }
}

function parsePrice(price: string) { return Number(price.replace(/[^0-9]/g, "")) || 0; }
function formatWon(value: number) { return `${value.toLocaleString()}원`; }
function cleanTitle(title: string) { return title.replace("[예약]", "").trim(); }

function cleanOptionValue(value: unknown) {
    const stringValue = typeof value === "string" ? value.trim() : "";
    let parsedValue: unknown = value;
    if (stringValue.startsWith("{") || stringValue.startsWith("[")) {
        try { parsedValue = JSON.parse(stringValue) as unknown; } catch { parsedValue = value; }
    }
    const raw = typeof parsedValue === "string"
        ? parsedValue
        : parsedValue && typeof parsedValue === "object"
            ? String((parsedValue as any).optionValue ?? (parsedValue as any).optionName ??
                (parsedValue as any).name ?? (parsedValue as any).value ??
                (parsedValue as any).label ?? (parsedValue as any).title ?? "")
            : "";
    return raw
        .replace(/[,{\s]*["']?add(?:i)?tional\w*["']?\s*:\s*["']?[-+]?\d[\d,]*(?:원)?["']?\s*[,}]*/gi, " ")
        .replace(/["{,]\s*add(?:i)?tionalAmou?n?t?\s*["]?\s*:\s*[-+]?\d[\d,]*(?:원)?\s*[,}]?/gi, "")
        .replace(/add(?:i)?tionalAmou?n?t?\s*[:=]\s*[-+]?\d[\d,]*(?:원)?/gi, "")
        .replace(/add(?:i)?tional[A-Za-z]*\s*[:=]\s*[-+]?\d[\d,]*(?:원)?/gi, "")
        .replace(/[{}"]/g, "").replace(/,\s*$/g, "")
        .replace(/\(\s*[-+]?\d[\d,]*원\s*\)/g, "").replace(/\s*[-+]\s*\d[\d,]*원/g, "")
        .replace(/\s{2,}/g, " ").trim();
}

function cleanOptionLine(value: string) {
    return cleanOptionValue(value).replace(/^[A-Z]\.\s*/, "").replace(/^옵션\s*[A-Z0-9가-힣]?\.?\s*/, "").trim();
}
function extractSizeOptions(lines: string[]) {
    return lines.map((line) => line.match(/^([SMLX]{1,3})\s*[:|]\s*/i)?.[1]?.toUpperCase()).filter((o): o is string => Boolean(o));
}
function extractInlineChoiceOptions(lines: string[]) {
    const idx = lines.findIndex((line) => /선택(하여|후)?\s*구매|중\s*선택/.test(line));
    if (idx <= 0) return [];
    return lines[idx - 1].split(/[,，、/]/).map(cleanOptionLine).filter((v) => v.length > 0 && v.length <= 30);
}
function decodeHexUtf8(value: string) {
    const hex = value.replace(/[^0-9a-f]/gi, "");
    if (hex.length < 6 || hex.length % 2 !== 0) return "";
    try {
        const bytes = Uint8Array.from(hex.match(/../g)?.map((p) => parseInt(p, 16)) ?? []);
        return new TextDecoder().decode(bytes).normalize("NFC");
    } catch { return ""; }
}
function getImageNameOptionValues(product: Product) {
    if (!product.title.includes("선택")) return [];
    return product.detailImages
        .flatMap((image) => {
            const filename = decodeURIComponent(image.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
            return [filename, ...(filename.match(/[0-9a-f]{6,}/gi) ?? []).map(decodeHexUtf8)];
        })
        .map((v) => cleanOptionLine(v.replace(/^copy-\d+-/i, "")))
        .filter((v) => /[가-힣]/.test(v) && v.length >= 2 && v.length <= 30)
        .filter((v) => !/(상품|상세|이미지|선택|랜덤|옵션|주의|안내|유의|예약|발매|배송|특전|원본)/.test(v));
}
function getLineOptionValues(line: string) {
    const cleaned = cleanOptionLine(line);
    if (!cleaned || /옵션을 선택|옵션 선택|캐릭터 선택|선택하여 구매|선택 후 구매/.test(cleaned)) return [];
    return cleaned.split(/[,，、/]/).map(cleanOptionLine).filter((v) => v.length > 0 && v.length <= 40);
}
function uniqueOptions(options: unknown[]) {
    return Array.from(new Set(options.map(cleanOptionValue).filter((o) => o && !/^add(?:i)?tional/i.test(o))));
}
function getOptionValues(product: Product): string[] {
    const p = product as ProductWithOptions;
    const direct = p.options ?? p.optionValues ?? p.variants ?? [];
    if (direct.length > 0) return uniqueOptions(direct);
    const lines = product.productdetail.map((l) => l.trim()).filter(Boolean);
    const optionLines = lines.filter((l) => /^옵션\s*[A-Z0-9가-힣]?\.?\s*/.test(l)).flatMap(getLineOptionValues);
    if (optionLines.length > 0) return uniqueOptions(optionLines);
    const inline = extractInlineChoiceOptions(lines);
    if (inline.length > 1) return uniqueOptions(inline);
    if (product.title.includes("사이즈 선택")) { const s = extractSizeOptions(lines); if (s.length > 0) return uniqueOptions(s); }
    const numbered = lines.filter((l) => /^[①-⑳]|^\([0-9]+\)\s/.test(l))
        .map((l) => cleanOptionLine(l.replace(/^[①-⑳]\s*|^\([0-9]+\)\s*/, ""))).filter((l) => l.length > 0 && l.length <= 40);
    if (numbered.length > 1) return uniqueOptions(numbered);
    const imgNames = getImageNameOptionValues(product);
    if (imgNames.length > 1) return uniqueOptions(imgNames);
    return [];
}
function fallbackOptionLabel(product: Product) { return getOptionValues(product)[0] ?? "기본"; }
function isStoredCartItem(value: unknown): value is StoredCartItem {
    return Boolean(value && typeof value === "object" && "productId" in value && typeof (value as StoredCartItem).productId === "string");
}

function CartCheck({ checked }: { checked: boolean }) {
    return (
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${checked ? "border-[#826CFF] bg-[#826CFF]" : "border-[#c4baff] bg-white"}`}>
            {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
        </span>
    );
}

export default function CartPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [optionModal, setOptionModal] = useState<OptionModalState | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [agreeError, setAgreeError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function loadCart() {
            if (!user?.uid) { setCartItems([]); setSelectedKeys(new Set()); setLoading(false); return; }
            setLoading(true);
            const snap = await getDoc(doc(db, "users", user.uid));
            const rawCart = snap.data()?.cart as unknown;
            const rawItems = Array.isArray(rawCart) ? rawCart : [];
            const productsById = new Map(STORE_PRODUCTS.map((p) => [p.productId, p]));
            const nextItems = rawItems.map((raw, index): CartItem | null => {
                const productId = typeof raw === "string" ? raw : isStoredCartItem(raw) ? raw.productId : "";
                const product = productsById.get(productId);
                if (!product) return null;
                const options = getOptionValues(product);
                const storedOption = isStoredCartItem(raw) ? cleanOptionValue(raw.option) : "";
                const option = storedOption && (options.length === 0 || options.includes(storedOption)) ? storedOption : fallbackOptionLabel(product);
                const quantity = isStoredCartItem(raw) && typeof raw.quantity === "number" ? Math.max(1, raw.quantity) : 1;
                return { key: `${productId}:${index}`, product, option, quantity, raw };
            }).filter((item): item is CartItem => Boolean(item));

            const optionEntries = await Promise.all(
                Array.from(new Set(nextItems.map((item) => item.product.productId)))
                    .map(async (productId) => [productId, await fetchProductOptions(productId)] as const),
            );
            const optionsByProductId = new Map(optionEntries.filter(([, o]) => o.length > 0));
            const hydratedItems = nextItems.map((item) => {
                const options = optionsByProductId.get(item.product.productId);
                if (!options) return item;
                const product = { ...item.product, options };
                const storedOption = isStoredCartItem(item.raw) ? cleanOptionValue(item.raw.option) : cleanOptionValue(item.option);
                const option = storedOption && options.includes(storedOption) ? storedOption : options[0] ?? fallbackOptionLabel(product);
                return { ...item, product, option };
            });
            if (cancelled) return;
            setCartItems(hydratedItems);
            setSelectedKeys(new Set(hydratedItems.map((item) => item.key)));
            setLoading(false);
        }
        loadCart().catch(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [user?.uid]);

    const selectedItems = useMemo(() => cartItems.filter((item) => selectedKeys.has(item.key)), [cartItems, selectedKeys]);
    const productTotal = selectedItems.reduce((total, item) => total + parsePrice(item.product.price) * item.quantity, 0);
    const shippingFee = productTotal >= FREE_SHIPPING_THRESHOLD || productTotal === 0 ? 0 : SHIPPING_FEE;
    const discount = user && productTotal > 0 ? MEMBER_DISCOUNT : 0;
    const finalTotal = Math.max(0, productTotal + shippingFee - discount);
    const animProductTotal = useAnimatedNumber(productTotal);
    const animFinalTotal = useAnimatedNumber(finalTotal);
    const allSelected = cartItems.length > 0 && selectedKeys.size === cartItems.length;

    const toggleAll = () => setSelectedKeys(allSelected ? new Set() : new Set(cartItems.map((item) => item.key)));
    const toggleProduct = (key: string) => setSelectedKeys((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

    const updateQuantity = async (key: string, amount: number) => {
        const target = cartItems.find((item) => item.key === key);
        if (!user?.uid || !target) return;
        const quantity = Math.max(1, target.quantity + amount);
        const nextRaw = { productId: target.product.productId, option: target.option, quantity };
        await setDoc(doc(db, "users", user.uid), { cart: arrayRemove(target.raw) }, { merge: true });
        await setDoc(doc(db, "users", user.uid), { cart: arrayUnion(nextRaw) }, { merge: true });
        setCartItems((prev) => prev.map((item) => item.key === key ? { ...item, quantity, raw: nextRaw } : item));
    };

    const removeProducts = async (keys: string[]) => {
        if (!user?.uid || keys.length === 0) return;
        const removeItems = cartItems.filter((item) => keys.includes(item.key));
        await setDoc(doc(db, "users", user.uid), { cart: arrayRemove(...removeItems.map((item) => item.raw)) }, { merge: true });
        setCartItems((prev) => prev.filter((item) => !keys.includes(item.key)));
        setSelectedKeys((prev) => { const next = new Set(prev); keys.forEach((key) => next.delete(key)); return next; });
    };

    const handleCheckout = async () => {
        if (!agreed) { setAgreeError(true); return; }
        if (selectedItems.length === 0 || checkoutLoading) return;
        setCheckoutLoading(true);
        try {
            const items = selectedItems.map((item) => ({
                productId: item.product.productId,
                title: item.product.title,
                price: parsePrice(item.product.price),
                thumbnail: item.product.thumbnail,
                option: item.option,
                qty: item.quantity,
                category: item.product.category,
            }));
            const cartRaws = selectedItems.map((item) => item.raw);  // ← 추가
            router.push(
                `/store/order?items=${encodeURIComponent(JSON.stringify(items))}` +
                `&cartRaws=${encodeURIComponent(JSON.stringify(cartRaws))}`  // ← 추가
            );
        } catch { setCheckoutLoading(false); }
    };

    const openOptionModal = (item: CartItem) => {
        const options = getOptionValues(item.product);
        const cleanCurrentOption = cleanOptionValue(item.option);
        setOptionModal({ item, selectedOption: options.includes(cleanCurrentOption) ? cleanCurrentOption : options[0] ?? "" });
    };

    const saveOption = async () => {
        if (!user?.uid || !optionModal) return;
        const selectedOption = cleanOptionValue(optionModal.selectedOption);
        const options = getOptionValues(optionModal.item.product);
        if (!selectedOption || !options.includes(selectedOption)) return;
        const nextRaw = { productId: optionModal.item.product.productId, option: selectedOption, quantity: optionModal.item.quantity };
        await setDoc(doc(db, "users", user.uid), { cart: arrayRemove(optionModal.item.raw) }, { merge: true });
        await setDoc(doc(db, "users", user.uid), { cart: arrayUnion(nextRaw) }, { merge: true });
        setCartItems((prev) => prev.map((item) => item.key === optionModal.item.key ? { ...item, option: selectedOption, raw: nextRaw } : item));
        setOptionModal(null);
    };

    const optionModalOptions = optionModal ? uniqueOptions(getOptionValues(optionModal.item.product)) : [];

    return (
        <div className="min-h-screen bg-[#f5f3ff] pb-[126px] sm:pb-14">
            {/* 타이틀 */}
            <section className="mx-auto flex max-w-[1480px] flex-col items-center px-5 pb-8 pt-12 text-center md:px-10 md:pb-10 md:pt-14">
                <p className="text-[12px] font-semibold tracking-[0.2em] text-[#826CFF] uppercase mb-1">Laftel Store</p>
                <h1 className="text-[34px] font-extrabold text-[#111018] tracking-tight">CART</h1>
                <p className="text-[16px] text-[#aaa] mt-1">장바구니</p>
            </section>

            <main className="mx-auto grid max-w-[1480px] grid-cols-1 gap-5 px-5 md:px-10 xl:grid-cols-[minmax(0,1fr)_400px]">
                {/* 상품 목록 */}
                <section className="rounded-[20px] border border-[#ebe8ff] bg-white px-5 py-6 md:px-6">
                    <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <button type="button" onClick={toggleAll} className="flex items-center gap-2.5 text-[14px] font-bold text-[#826CFF]">
                            <CartCheck checked={allSelected} />
                            전체선택
                        </button>
                        <button type="button" onClick={() => removeProducts(Array.from(selectedKeys))}
                            className="text-[12px] text-[#9b94b2] underline underline-offset-4 hover:text-[#826CFF] transition-colors">
                            선택삭제
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center rounded-[16px] bg-[#f5f3ff] text-[14px] text-[#9b94b2]">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ebe8ff] border-t-[#826CFF]" />
                                장바구니를 불러오는 중이에요.
                            </div>
                        </div>
                    ) : !user ? (
                        <div className="flex h-[300px] flex-col items-center justify-center rounded-[16px] bg-[#f5f3ff] text-[14px] text-[#777]">
                            <p>로그인 후 장바구니를 확인할 수 있어요.</p>
                            <Link href="/login" className="mt-5 rounded-full bg-[#826CFF] px-7 py-2.5 text-[13px] font-bold text-white hover:bg-[#6B5CE7] transition-colors">
                                로그인하기
                            </Link>
                        </div>
                    ) : cartItems.length === 0 ? (
                        <div className="flex h-[300px] flex-col items-center justify-center rounded-[16px] bg-[#f5f3ff] text-[14px] text-[#777]">
                            <p>장바구니에 담긴 상품이 없어요.</p>
                            <Link href="/store/all" className="mt-5 rounded-full bg-[#826CFF] px-7 py-2.5 text-[13px] font-bold text-white hover:bg-[#6B5CE7] transition-colors">
                                굿즈 보러가기
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cartItems.map((item) => {
                                const { product } = item;
                                const checked = selectedKeys.has(item.key);
                                const options = getOptionValues(product);
                                const canChangeOption = options.length > 0;
                                return (
                                    <article key={item.key}
                                        className="grid grid-cols-[24px_88px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border border-[#ebe8ff] bg-[#f5f3ff] px-3 py-3 md:grid-cols-[28px_110px_minmax(0,1fr)_110px] md:gap-4 md:px-5 md:py-4">
                                        <button type="button" onClick={() => toggleProduct(item.key)} className="justify-self-center">
                                            <CartCheck checked={checked} />
                                        </button>
                                        <Link href={`/store/${product.productId}`} className="block overflow-hidden rounded-[10px] border border-[#ebe8ff] bg-white">
                                            <img src={product.thumbnail} alt={product.title} className="aspect-square w-full object-cover" />
                                        </Link>
                                        <div className="min-w-0 text-left">
                                            <Link href={`/store/series?series=${encodeURIComponent(product.category)}`}
                                                className="text-[11px] text-[#aaa] hover:text-[#826CFF] transition-colors">
                                                {product.category} ›
                                            </Link>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                {product.title.includes("[예약]") && (
                                                    <span className="rounded-[4px] bg-[#826CFF] px-1.5 py-0.5 text-[10px] font-bold text-white">예약</span>
                                                )}
                                                <Link href={`/store/${product.productId}`}
                                                    className="line-clamp-2 text-[14px] font-semibold text-[#111018] hover:text-[#826CFF] transition-colors md:line-clamp-1">
                                                    {cleanTitle(product.title)}
                                                </Link>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[#999]">
                                                <span>옵션 : {item.option}</span>
                                                {canChangeOption && (
                                                    <button type="button" onClick={() => openOptionModal(item)}
                                                        className="rounded-full border border-[#d8d3f2] px-2.5 py-0.5 text-[11px] font-bold text-[#826CFF] hover:bg-white transition-colors">
                                                        옵션변경
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-2.5 inline-grid h-8 grid-cols-3 overflow-hidden rounded-[8px] border border-[#e0daf7] bg-white">
                                                <button type="button" onClick={() => updateQuantity(item.key, -1)}
                                                    className="w-8 text-[15px] text-[#555] hover:bg-[#f5f3ff] transition-colors">-</button>
                                                <span className="flex w-8 items-center justify-center border-x border-[#e0daf7] text-[13px] font-bold text-[#111]">{item.quantity}</span>
                                                <button type="button" onClick={() => updateQuantity(item.key, 1)}
                                                    className="w-8 text-[15px] text-[#555] hover:bg-[#f5f3ff] transition-colors">+</button>
                                            </div>
                                        </div>
                                        <div className="col-span-3 text-right md:col-span-1">
                                            {item.quantity > 1 && (
                                                <p className="mb-0.5 text-[11px] text-[#aaa]">{formatWon(parsePrice(product.price))} × {item.quantity}</p>
                                            )}
                                            <p className="text-[18px] font-black text-[#111018] md:text-[20px]">
                                                {formatWon(parsePrice(product.price) * item.quantity)}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    <p className="mt-5 text-center text-[13px] text-[#aaa]">
                        배송비 {formatWon(SHIPPING_FEE)} ({formatWon(FREE_SHIPPING_THRESHOLD)} 이상 무료배송)
                    </p>
                </section>

                {/* 결제 요약 */}
                <aside className="h-fit rounded-[20px] border border-[#ebe8ff] bg-white px-6 py-7 xl:sticky xl:top-24">
                    <h2 className="text-[20px] font-bold text-[#111018]">최종결제 금액</h2>
                    <dl className="mt-5 space-y-3.5">
                        <div className="flex items-center justify-between text-[14px]">
                            <dt className="text-[#888]">총 상품 금액</dt>
                            <dd className="font-semibold text-[#111]">{formatWon(animProductTotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[14px]">
                            <dt className="text-[#888]">배송비</dt>
                            <dd className="font-semibold text-[#826CFF]">{shippingFee === 0 ? "무료" : formatWon(shippingFee)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[14px]">
                            <dt className="text-[#888]">할인금액</dt>
                            <dd className="font-semibold text-[#ff4d6d]">-{formatWon(discount)}</dd>
                        </div>
                    </dl>
                    <div className="my-5 border-t border-[#f0eeff]" />
                    <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold text-[#111018]">총 결제 금액</span>
                        <strong className="text-[26px] font-extrabold text-[#826CFF] tabular-nums">{formatWon(animFinalTotal)}</strong>
                    </div>

                    <button
                        type="button"
                        onClick={() => { setAgreed(v => !v); setAgreeError(false); }}
                        className={`mt-6 flex items-center gap-2 w-full rounded-[10px] px-3 py-2.5 border transition-colors ${agreeError
                                ? "bg-[#fff0f3] border-[#ffb3c1]"
                                : agreed
                                    ? "bg-[#f0eeff] border-transparent"
                                    : "bg-[#fafafa] border-transparent hover:bg-[#f5f3ff]"
                            }`}
                    >
                        <span className={`w-5 h-5 rounded-[6px] flex-shrink-0 flex items-center justify-center border-2 transition-colors ${agreed
                                ? "bg-[#826CFF] border-[#826CFF]"
                                : agreeError
                                    ? "border-[#ff4d6d]"
                                    : "border-[#d0c9f0]"
                            }`}>
                            {agreed && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </span>

                        <span className={`min-w-0 flex-1 whitespace-nowrap text-left text-[11px] font-semibold tracking-[-0.01em] sm:text-[12px] sm:tracking-normal ${agreed
                                ? "text-[#826CFF]"
                                : agreeError
                                    ? "text-[#ff4d6d]"
                                    : "text-[#9b94b2]"
                            }`}>
                            주문 내용을 확인했으며, 결제 진행에 동의합니다. (필수)
                        </span>
                    </button>
                    {agreeError && (
                        <p className="mt-1.5 text-center text-[11px] text-[#ff4d6d] font-semibold">동의 후 결제를 진행해주세요.</p>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#ebe8ff] bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                        <button
                            type="button"
                            onClick={handleCheckout}
                            disabled={selectedItems.length === 0 || checkoutLoading}
                            className="h-[52px] w-full rounded-full bg-[#826CFF] text-[17px] font-extrabold text-white transition hover:bg-[#6B5CE7] shadow-lg shadow-[#826cff25] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {checkoutLoading ? "이동 중..." : `${formatWon(animFinalTotal)} 결제하기`}
                        </button>
                    </div>
                </aside>
            </main>

            {/* 옵션 변경 모달 */}
            {optionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-5"
                    onClick={() => setOptionModal(null)}>
                    <div className="w-full max-w-[430px] rounded-[20px] bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: "modalIn 0.2s ease" }}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[12px] font-bold text-[#826CFF]">옵션변경</p>
                                <h3 className="mt-1 line-clamp-2 text-[16px] font-black text-[#111018]">{cleanTitle(optionModal.item.product.title)}</h3>
                            </div>
                            <button type="button" onClick={() => setOptionModal(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f3ff] hover:bg-[#ebe8ff] transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="relative mt-5">
                            <select
                                value={optionModal.selectedOption}
                                onChange={(e) => setOptionModal((prev) => prev ? { ...prev, selectedOption: e.target.value } : prev)}
                                className="h-[46px] w-full appearance-none rounded-[12px] border border-[#e0daf7] bg-white px-4 pr-10 text-[14px] font-semibold text-[#222] outline-none focus:border-[#826CFF] transition-colors"
                            >
                                {optionModalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#826CFF]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button type="button" onClick={() => setOptionModal(null)}
                                className="h-[46px] flex-1 rounded-[12px] border-2 border-[#e0daf7] text-[14px] font-bold text-[#888] hover:bg-[#f5f3ff] transition-colors">
                                취소
                            </button>
                            <button type="button" onClick={saveOption} disabled={!optionModal.selectedOption.trim()}
                                className="h-[46px] flex-1 rounded-[12px] bg-[#826CFF] text-[14px] font-bold text-white hover:bg-[#6B5CE7] transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                                변경하기
                            </button>
                        </div>
                    </div>
                    <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
                </div>
            )}
        </div>
    );
}
