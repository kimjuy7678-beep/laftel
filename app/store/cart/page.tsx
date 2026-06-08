"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from "firebase/firestore";
import products from "@/data/store.json";
import { db } from "@/firebase/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Product } from "@/types/store";

const STORE_PRODUCTS = products as Product[];
const SHIPPING_FEE = 3000;
const FREE_SHIPPING_THRESHOLD = 100000;
const MEMBER_DISCOUNT = 3000;

type StoredCartItem = {
    productId: string;
    option?: unknown;
    quantity?: number;
};

type CartItem = {
    key: string;
    product: Product;
    option: string;
    quantity: number;
    raw: string | StoredCartItem;
};

type OptionModalState = {
    item: CartItem;
    selectedOption: string;
};

type ProductWithOptions = Product & {
    options?: unknown[];
    optionValues?: unknown[];
    variants?: unknown[];
};

async function fetchProductOptions(productId: string) {
    try {
        const response = await fetch(`/api/store/products/${productId}/options`);
        if (!response.ok) return [];
        const data = await response.json() as { options?: unknown[] };
        return uniqueOptions(data.options ?? []);
    } catch {
        return [];
    }
}

function parsePrice(price: string) {
    return Number(price.replace(/[^0-9]/g, "")) || 0;
}

function formatWon(value: number) {
    return `${value.toLocaleString()}원`;
}

function cleanTitle(title: string) {
    return title.replace("[예약]", "").trim();
}

function cleanOptionValue(value: unknown) {
    const stringValue = typeof value === "string" ? value.trim() : "";
    let parsedValue: unknown = value;

    if (stringValue.startsWith("{") || stringValue.startsWith("[")) {
        try {
            parsedValue = JSON.parse(stringValue) as unknown;
        } catch {
            parsedValue = value;
        }
    }

    const raw = typeof parsedValue === "string"
        ? parsedValue
        : parsedValue && typeof parsedValue === "object"
            ? String(
                (parsedValue as { optionValue?: unknown; optionName?: unknown; name?: unknown; value?: unknown; label?: unknown; title?: unknown }).optionValue ??
                (parsedValue as { optionName?: unknown }).optionName ??
                (parsedValue as { name?: unknown }).name ??
                (parsedValue as { value?: unknown }).value ??
                (parsedValue as { label?: unknown }).label ??
                (parsedValue as { title?: unknown }).title ??
                "",
            )
            : "";

    return raw
        .replace(/[,{\s]*["']?add(?:i)?tional\w*["']?\s*:\s*["']?[-+]?\d[\d,]*(?:원)?["']?\s*[,}]*/gi, " ")
        .replace(/["{,]\s*add(?:i)?tionalAmou?n?t?\s*["]?\s*:\s*[-+]?\d[\d,]*(?:원)?\s*[,}]?/gi, "")
        .replace(/add(?:i)?tionalAmou?n?t?\s*[:=]\s*[-+]?\d[\d,]*(?:원)?/gi, "")
        .replace(/add(?:i)?tional[A-Za-z]*\s*[:=]\s*[-+]?\d[\d,]*(?:원)?/gi, "")
        .replace(/[{}"]/g, "")
        .replace(/,\s*$/g, "")
        .replace(/\(\s*[-+]?\d[\d,]*원\s*\)/g, "")
        .replace(/\s*[-+]\s*\d[\d,]*원/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function cleanOptionLine(value: string) {
    return cleanOptionValue(value)
        .replace(/^[A-Z]\.\s*/, "")
        .replace(/^옵션\s*[A-Z0-9가-힣]?\.?\s*/, "")
        .trim();
}

function extractSizeOptions(lines: string[]) {
    return lines
        .map((line) => line.match(/^([SMLX]{1,3})\s*[:|]\s*/i)?.[1]?.toUpperCase())
        .filter((option): option is string => Boolean(option));
}

function extractInlineChoiceOptions(lines: string[]) {
    const selectIdx = lines.findIndex((line) => /선택(하여|후)?\s*구매|중\s*선택/.test(line));
    if (selectIdx <= 0) return [];

    return lines[selectIdx - 1]
        .split(/[,，、/]/)
        .map(cleanOptionLine)
        .filter((value) => value.length > 0 && value.length <= 30);
}

function decodeHexUtf8(value: string) {
    const hex = value.replace(/[^0-9a-f]/gi, "");
    if (hex.length < 6 || hex.length % 2 !== 0) return "";

    try {
        const bytes = Uint8Array.from(hex.match(/../g)?.map((pair) => parseInt(pair, 16)) ?? []);
        return new TextDecoder().decode(bytes).normalize("NFC");
    } catch {
        return "";
    }
}

function getImageNameOptionValues(product: Product) {
    if (!product.title.includes("선택")) return [];

    return product.detailImages
        .flatMap((image) => {
            const filename = decodeURIComponent(image.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
            const hexCandidates = filename.match(/[0-9a-f]{6,}/gi) ?? [];
            const decodedHexOptions = hexCandidates.map(decodeHexUtf8);
            return [filename, ...decodedHexOptions];
        })
        .map((value) => cleanOptionLine(value.replace(/^copy-\d+-/i, "")))
        .filter((value) => /[가-힣]/.test(value))
        .filter((value) => value.length >= 2 && value.length <= 30)
        .filter((value) => !/(상품|상세|이미지|선택|랜덤|옵션|주의|안내|유의|예약|발매|배송|특전|원본)/.test(value));
}

function getLineOptionValues(line: string) {
    const cleaned = cleanOptionLine(line);
    if (!cleaned || /옵션을 선택|옵션 선택|캐릭터 선택|선택하여 구매|선택 후 구매/.test(cleaned)) return [];

    return cleaned
        .split(/[,，、/]/)
        .map(cleanOptionLine)
        .filter((value) => value.length > 0 && value.length <= 40);
}

function uniqueOptions(options: unknown[]) {
    return Array.from(new Set(
        options
            .map(cleanOptionValue)
            .filter((option) => option && !/^add(?:i)?tional/i.test(option)),
    ));
}

function getOptionValues(product: Product): string[] {
    const productWithOptions = product as ProductWithOptions;
    const directOptions = productWithOptions.options ?? productWithOptions.optionValues ?? productWithOptions.variants ?? [];
    if (directOptions.length > 0) return uniqueOptions(directOptions);

    const lines = product.productdetail.map((line) => line.trim()).filter(Boolean);

    const optionLines = lines
        .filter((line) => /^옵션\s*[A-Z0-9가-힣]?\.?\s*/.test(line))
        .flatMap(getLineOptionValues);
    if (optionLines.length > 0) return uniqueOptions(optionLines);

    const inlineOptions = extractInlineChoiceOptions(lines);
    if (inlineOptions.length > 1) return uniqueOptions(inlineOptions);

    if (product.title.includes("사이즈 선택")) {
        const sizeOptions = extractSizeOptions(lines);
        if (sizeOptions.length > 0) return uniqueOptions(sizeOptions);
    }

    const numberedLines = lines
        .filter((line) => /^[①-⑳]|^\([0-9]+\)\s/.test(line))
        .map((line) => cleanOptionLine(line.replace(/^[①-⑳]\s*|^\([0-9]+\)\s*/, "")))
        .filter((line) => line.length > 0 && line.length <= 40);
    if (numberedLines.length > 1) return uniqueOptions(numberedLines);

    const imageNameOptions = getImageNameOptionValues(product);
    if (imageNameOptions.length > 1) return uniqueOptions(imageNameOptions);

    return [];
}

function fallbackOptionLabel(product: Product) {
    return getOptionValues(product)[0] ?? "기본";
}

function isStoredCartItem(value: unknown): value is StoredCartItem {
    return Boolean(
        value &&
        typeof value === "object" &&
        "productId" in value &&
        typeof (value as StoredCartItem).productId === "string",
    );
}

function CartCheck({ checked }: { checked: boolean }) {
    return (
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${checked ? "border-[#826CFF] bg-[#826CFF]" : "border-[#bcb6df] bg-white"}`}>
            {checked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            )}
        </span>
    );
}

export default function CartPage() {
    const { user } = useAuthStore();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [optionModal, setOptionModal] = useState<OptionModalState | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadCart() {
            if (!user?.uid) {
                setCartItems([]);
                setSelectedKeys(new Set());
                setLoading(false);
                return;
            }

            setLoading(true);
            const snap = await getDoc(doc(db, "users", user.uid));
            const rawCart = snap.data()?.cart as unknown;
            const rawItems = Array.isArray(rawCart) ? rawCart : [];
            const productsById = new Map(STORE_PRODUCTS.map((product) => [product.productId, product]));

            const nextItems = rawItems
                .map((raw, index): CartItem | null => {
                    const productId = typeof raw === "string" ? raw : isStoredCartItem(raw) ? raw.productId : "";
                    const product = productsById.get(productId);
                    if (!product) return null;

                    const options = getOptionValues(product);
                    const storedOption = isStoredCartItem(raw) ? cleanOptionValue(raw.option) : "";
                    const option = storedOption && (options.length === 0 || options.includes(storedOption))
                        ? storedOption
                        : fallbackOptionLabel(product);
                    const quantity = isStoredCartItem(raw) && typeof raw.quantity === "number"
                        ? Math.max(1, raw.quantity)
                        : 1;

                    return {
                        key: `${productId}:${index}`,
                        product,
                        option,
                        quantity,
                        raw,
                    };
                })
                .filter((item): item is CartItem => Boolean(item));

            const optionEntries = await Promise.all(
                Array.from(new Set(nextItems.map((item) => item.product.productId)))
                    .map(async (productId) => [productId, await fetchProductOptions(productId)] as const),
            );
            const optionsByProductId = new Map(optionEntries.filter(([, options]) => options.length > 0));
            const hydratedItems = nextItems.map((item) => {
                const options = optionsByProductId.get(item.product.productId);
                if (!options) return item;

                const product = { ...item.product, options };
                const storedOption = isStoredCartItem(item.raw) ? cleanOptionValue(item.raw.option) : cleanOptionValue(item.option);
                const option = storedOption && options.includes(storedOption)
                    ? storedOption
                    : options[0] ?? fallbackOptionLabel(product);

                return { ...item, product, option };
            });

            if (cancelled) return;
            setCartItems(hydratedItems);
            setSelectedKeys(new Set(hydratedItems.map((item) => item.key)));
            setLoading(false);
        }

        loadCart().catch(() => {
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    const selectedItems = useMemo(
        () => cartItems.filter((item) => selectedKeys.has(item.key)),
        [cartItems, selectedKeys],
    );

    const productTotal = selectedItems.reduce((total, item) => {
        return total + parsePrice(item.product.price) * item.quantity;
    }, 0);
    const shippingFee = productTotal >= FREE_SHIPPING_THRESHOLD || productTotal === 0 ? 0 : SHIPPING_FEE;
    const discount = user && productTotal > 0 ? MEMBER_DISCOUNT : 0;
    const finalTotal = Math.max(0, productTotal + shippingFee - discount);
    const allSelected = cartItems.length > 0 && selectedKeys.size === cartItems.length;

    const toggleAll = () => {
        setSelectedKeys(allSelected ? new Set() : new Set(cartItems.map((item) => item.key)));
    };

    const toggleProduct = (key: string) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

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
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            keys.forEach((key) => next.delete(key));
            return next;
        });
    };

    const openOptionModal = (item: CartItem) => {
        const options = getOptionValues(item.product);
        const cleanCurrentOption = cleanOptionValue(item.option);
        const selectedOption = options.includes(cleanCurrentOption)
            ? cleanCurrentOption
            : options[0] ?? "";
        setOptionModal({ item, selectedOption });
    };

    const saveOption = async () => {
        if (!user?.uid || !optionModal) return;
        const selectedOption = cleanOptionValue(optionModal.selectedOption);
        const options = getOptionValues(optionModal.item.product);
        if (!selectedOption || !options.includes(selectedOption)) return;
        const nextRaw = {
            productId: optionModal.item.product.productId,
            option: selectedOption,
            quantity: optionModal.item.quantity,
        };

        await setDoc(doc(db, "users", user.uid), { cart: arrayRemove(optionModal.item.raw) }, { merge: true });
        await setDoc(doc(db, "users", user.uid), { cart: arrayUnion(nextRaw) }, { merge: true });
        setCartItems((prev) => prev.map((item) => item.key === optionModal.item.key ? { ...item, option: selectedOption, raw: nextRaw } : item));
        setOptionModal(null);
    };

    const optionModalOptions = optionModal ? uniqueOptions(getOptionValues(optionModal.item.product)) : [];

    return (
        <div className="min-h-screen bg-white pb-14">
            <section className="mx-auto flex max-w-[1480px] flex-col items-center px-5 pb-8 pt-12 text-center md:px-10 md:pb-10 md:pt-18">
                <h1 className="text-[34px] font-black leading-none text-[#826CFF] md:text-[42px]">CART</h1>
                <p className="mt-3 text-[20px] font-light text-[#555] md:text-[24px]">장바구니</p>
            </section>

            <main className="mx-auto grid max-w-[1480px] grid-cols-1 gap-5 px-5 md:px-10 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="rounded-[18px] border border-[#dedde4] bg-white px-4 py-5 md:px-6 md:py-6">
                    <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <button type="button" onClick={toggleAll} className="flex items-center gap-3 text-[15px] font-bold text-[#826CFF]">
                            <CartCheck checked={allSelected} />
                            전체선택
                        </button>
                        <button type="button" onClick={() => removeProducts(Array.from(selectedKeys))} className="text-[12px] text-[#9b94b2] underline underline-offset-4">
                            선택삭제
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center rounded-[16px] bg-[#f7f7f8] text-[14px] text-[#9b94b2]">
                            장바구니를 불러오는 중이에요.
                        </div>
                    ) : !user ? (
                        <div className="flex h-[300px] flex-col items-center justify-center rounded-[16px] bg-[#f7f7f8] text-[14px] text-[#777]">
                            <p>로그인 후 장바구니를 확인할 수 있어요.</p>
                            <Link href="/login" className="mt-5 rounded-full bg-[#826CFF] px-7 py-2.5 text-[13px] font-bold text-white">
                                로그인하기
                            </Link>
                        </div>
                    ) : cartItems.length === 0 ? (
                        <div className="flex h-[300px] flex-col items-center justify-center rounded-[16px] bg-[#f7f7f8] text-[14px] text-[#777]">
                            <p>장바구니에 담긴 상품이 없어요.</p>
                            <Link href="/store/all" className="mt-5 rounded-full bg-[#826CFF] px-7 py-2.5 text-[13px] font-bold text-white">
                                굿즈 보러가기
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cartItems.map((item) => {
                                const { product } = item;
                                const checked = selectedKeys.has(item.key);
                                const options = getOptionValues(product);
                                const canChangeOption = options.length > 0;

                                return (
                                    <article key={item.key} className="grid grid-cols-[24px_92px_minmax(0,1fr)] items-center gap-3 rounded-[14px] bg-[#f6f6f7] px-3 py-3 md:grid-cols-[32px_126px_minmax(0,1fr)_120px] md:gap-5 md:px-5 md:py-4">
                                        <button type="button" onClick={() => toggleProduct(item.key)} aria-label={`${product.title} 선택`} className="justify-self-center">
                                            <CartCheck checked={checked} />
                                        </button>

                                        <Link href={`/store/${product.productId}`} className="block overflow-hidden rounded-[9px] bg-white">
                                            <img src={product.thumbnail} alt={product.title} className="aspect-square w-full object-cover" />
                                        </Link>

                                        <div className="min-w-0 text-left">
                                            <Link href={`/store/series?series=${encodeURIComponent(product.category)}`} className="text-[12px] text-[#777] hover:text-[#826CFF]">
                                                {product.category} ›
                                            </Link>
                                            <div className="mt-2 flex items-center gap-2">
                                                {product.title.includes("[예약]") && (
                                                    <span className="rounded-[4px] bg-[#826CFF] px-1.5 py-0.5 text-[10px] font-bold text-white">예약</span>
                                                )}
                                                <Link href={`/store/${product.productId}`} className="line-clamp-2 text-[14px] font-semibold text-[#222] hover:text-[#826CFF] md:line-clamp-1">
                                                    {cleanTitle(product.title)}
                                                </Link>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#777]">
                                                <span>옵션 : {item.option}</span>
                                                {canChangeOption && (
                                                    <button type="button" onClick={() => openOptionModal(item)} className="rounded-full border border-[#d8d3f2] px-2.5 py-1 text-[11px] font-bold text-[#826CFF] hover:bg-white">
                                                        옵션변경
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-3 inline-grid h-8 grid-cols-3 overflow-hidden rounded-[4px] border border-[#c7c7cd] bg-white">
                                                <button type="button" onClick={() => updateQuantity(item.key, -1)} className="w-9 text-[15px] text-[#333] hover:bg-[#f1efff]">-</button>
                                                <span className="flex w-9 items-center justify-center border-x border-[#c7c7cd] text-[14px] font-bold text-[#222]">{item.quantity}</span>
                                                <button type="button" onClick={() => updateQuantity(item.key, 1)} className="w-9 text-[15px] text-[#333] hover:bg-[#f1efff]">+</button>
                                            </div>
                                        </div>

                                        <div className="col-span-3 text-right md:col-span-1">
                                            {item.quantity > 1 && <p className="mb-1 text-[12px] text-[#999]">{formatWon(parsePrice(product.price))} x {item.quantity}</p>}
                                            <p className="text-[20px] font-black text-black md:text-[22px]">{formatWon(parsePrice(product.price) * item.quantity)}</p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <p className="mt-6 text-center text-[14px] text-[#555]">
                        배송비 {formatWon(SHIPPING_FEE)} ({formatWon(FREE_SHIPPING_THRESHOLD)}이상 무료배송)
                    </p>
                </section>

                <aside className="h-fit rounded-[18px] border border-[#dedde4] bg-white px-6 py-7 xl:sticky xl:top-24">
                    <h2 className="text-[24px] font-black text-[#222]">최종결제 금액</h2>

                    <dl className="mt-7 space-y-5">
                        <div className="flex items-center justify-between text-[16px]">
                            <dt className="text-[#888]">총 상품 금액</dt>
                            <dd className="font-bold text-[#333]">{formatWon(productTotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[16px]">
                            <dt className="text-[#888]">배송비</dt>
                            <dd className="font-bold text-[#826CFF]">{shippingFee === 0 ? "무료" : formatWon(shippingFee)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[16px]">
                            <dt className="text-[#888]">할인금액</dt>
                            <dd className="font-bold text-[#333]">-{formatWon(discount)}</dd>
                        </div>
                    </dl>

                    <div className="my-7 border-t border-[#eeeeef]" />

                    <div className="flex items-center justify-between">
                        <span className="text-[17px] text-[#888]">총 결제 금액</span>
                        <strong className="text-[30px] text-[#826CFF]">{formatWon(finalTotal)}</strong>
                    </div>

                    <label className="mt-7 flex items-center justify-center gap-2 text-[12px] text-[#9b94b2]">
                        <input type="checkbox" className="h-4 w-4 accent-[#826CFF]" />
                        주문 내용을 확인했으며, 결제 진행에 동의합니다. (필수)
                    </label>

                    <button
                        type="button"
                        disabled={selectedItems.length === 0}
                        className="mt-5 h-[56px] w-full rounded-[16px] bg-[#826CFF] text-[20px] font-bold text-white transition hover:bg-[#6f5af2] disabled:cursor-not-allowed disabled:bg-[#d8d5ee]"
                    >    <Link href="/store/order">
                            {formatWon(finalTotal)} 결제하기</Link>
                    </button>
                </aside>
            </main>

            {optionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5" onClick={() => setOptionModal(null)}>
                    <div className="w-full max-w-[430px] rounded-[18px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[13px] font-bold text-[#826CFF]">옵션변경</p>
                                <h3 className="mt-1 line-clamp-2 text-[18px] font-black text-[#222]">{cleanTitle(optionModal.item.product.title)}</h3>
                            </div>
                            <button type="button" onClick={() => setOptionModal(null)} aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f1f4] text-[#666]">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <select
                            value={optionModal.selectedOption}
                            onChange={(event) => setOptionModal((prev) => prev ? { ...prev, selectedOption: event.target.value } : prev)}
                            className="mt-6 h-[46px] w-full appearance-none rounded-[12px] border border-[#ddd8f4] bg-white px-4 text-[14px] font-semibold text-[#222] outline-none focus:border-[#826CFF]"
                        >
                            {optionModalOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>

                        <div className="mt-6 flex gap-2">
                            <button type="button" onClick={() => setOptionModal(null)} className="h-[46px] flex-1 rounded-[12px] border border-[#ddd8f4] text-[14px] font-bold text-[#777]">
                                취소
                            </button>
                            <button type="button" onClick={saveOption} disabled={!optionModal.selectedOption.trim()} className="h-[46px] flex-1 rounded-[12px] bg-[#826CFF] text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d8d5ee]">
                                변경하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
