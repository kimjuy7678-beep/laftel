// components/store/StoreProductCard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import LoginAlert from "@/components/store/LoginAlert";
import CartAlert from "@/components/store/CartAlert";
import WishAlert from "@/components/store/WishAlert";
import RestockAlertButton from "@/components/store/RestockAlertButton";

export type StoreProduct = {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    soldout: boolean;
    productdetail?: string[];
    detailImages?: string[];
    options?: unknown[];
    optionValues?: unknown[];
    variants?: unknown[];
};

type DateParts = {
    year: number;
    month: number;
    day: number;
};

function getTodayParts(): DateParts {
    const parts = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(new Date());
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

    return {
        year: value("year"),
        month: value("month"),
        day: value("day"),
    };
}

function toSerial(date: DateParts) {
    return date.year * 10000 + date.month * 100 + date.day;
}

function parseReserveDeadline(product: StoreProduct, fallbackYear: number): DateParts | null {
    const text = (product.productdetail ?? []).join(" ");
    const fullDate = text.match(/예약 마감일\s*\|?\s*(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (fullDate) {
        return {
            year: Number(fullDate[1]),
            month: Number(fullDate[2]),
            day: Number(fullDate[3]),
        };
    }

    const shortDate = text.match(/예약 마감일\s*\|?\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (shortDate) {
        return {
            year: fallbackYear,
            month: Number(shortDate[1]),
            day: Number(shortDate[2]),
        };
    }

    return null;
}

function isReserveClosed(product: StoreProduct) {
    if (!product.title.includes("[예약]")) return false;
    const today = getTodayParts();
    const deadline = parseReserveDeadline(product, today.year);
    return Boolean(deadline && toSerial(deadline) < toSerial(today));
}

function ImageSlot({ src, alt, className }: { src: string; alt: string; className: string }) {
    if (!src) return <div className={`${className} bg-[#eeeeef]`} aria-label={alt} />;
    return (
        <div className={className} role="img" aria-label={alt}
            style={{ backgroundImage: `url(${src})`, backgroundPosition: "center", backgroundSize: "cover" }} />
    );
}

export function WishButton({
    productId,
    title,
    thumbnail,
    disabled = false,
}: {
    productId: string;
    title: string;
    thumbnail: string;
    disabled?: boolean;
}) {
    const { user } = useAuthStore();
    const [wished, setWished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showWish, setShowWish] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const wishlist: string[] = snap.data()?.wishlist || [];
            setWished(wishlist.includes(productId));
        })();
    }, [user?.uid, productId]);

    const activeWished = Boolean(user?.uid && wished);

    const toggleWish = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (disabled) return;
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }
        setLoading(true);
        try {
            const ref = doc(db, "users", user.uid!);
            if (wished) {
                await setDoc(ref, { wishlist: arrayRemove(productId) }, { merge: true });
                setWished(false);
            } else {
                await setDoc(ref, { wishlist: arrayUnion(productId) }, { merge: true });
                setWished(true);
                setShowWish(true);
                setTimeout(() => setShowWish(false), 4000);
            }
        } catch (err) { console.error("🔥 [Wishlist ERROR]", err); }
        finally { setLoading(false); }
    };

    if (disabled) {
        return (
            <button disabled aria-label="찜하기 불가"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c8c4d4] text-[#8a8494] shadow-none cursor-not-allowed">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>
        );
    }

    return (
        <>
            <button onClick={toggleWish} disabled={loading} aria-label="찜하기"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${activeWished
                    ? "bg-[#ff4d6d] text-white shadow-[0_4px_14px_rgba(255,77,109,0.28)]"
                    : "bg-white text-[#b0aabb] shadow-[0_4px_14px_rgba(30,24,70,0.16)] hover:text-[#ff4d6d]"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={activeWished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>
            {showLogin && <LoginAlert onClose={() => setShowLogin(false)} />}
            {showWish && <WishAlert title={title} thumbnail={thumbnail} onClose={() => setShowWish(false)} />}
        </>
    );
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

function isReadableOption(option: string) {
    if (!option || option.includes("\uFFFD") || option.includes("�")) return false;
    if (/^[0-9a-f]{8,}$/i.test(option)) return false;
    if (!/[가-힣A-Za-z0-9]/.test(option)) return false;
    return true;
}

function uniqueOptions(options: unknown[]) {
    return Array.from(new Set(
        options
            .map(cleanOptionValue)
            .filter((option) => isReadableOption(option) && !/^add(?:i)?tional/i.test(option)),
    ));
}

function decodeHexUtf8(value: string) {
    const hex = value.replace(/[^0-9a-f]/gi, "");
    if (hex.length < 6 || hex.length % 2 !== 0) return "";

    try {
        const bytes = Uint8Array.from(hex.match(/../g)?.map((part) => parseInt(part, 16)) ?? []);
        const decoded = new TextDecoder().decode(bytes).normalize("NFC");
        return decoded.includes("\uFFFD") ? "" : decoded;
    } catch {
        return "";
    }
}

function getImageNameOptionValues(product: StoreProduct) {
    if (!product.title.includes("선택")) return [];

    return (product.detailImages ?? [])
        .flatMap((image) => {
            const filename = decodeURIComponent(image.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
            return [filename, ...(filename.match(/[0-9a-f]{6,}/gi) ?? []).map(decodeHexUtf8)];
        })
        .map((value) => cleanOptionLine(value.replace(/^copy-\d+-/i, "")))
        .filter((value) => isReadableOption(value) && /[가-힣]/.test(value) && value.length >= 2 && value.length <= 30)
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

function getCardOptionValues(product: StoreProduct): string[] {
    const direct = product.options ?? product.optionValues ?? product.variants ?? [];
    if (direct.length > 0) return uniqueOptions(direct);

    const lines = (product.productdetail ?? []).map((line) => line.trim()).filter(Boolean);
    const optionLines = lines
        .filter((line) => /^옵션\s*[A-Z0-9가-힣]?\.?\s*/.test(line))
        .flatMap(getLineOptionValues);
    if (optionLines.length > 0) return uniqueOptions(optionLines);

    const selectIdx = lines.findIndex((line) => /선택(하여|후)?\s*구매|중\s*선택/.test(line));
    if (selectIdx > 0) {
        const values = lines[selectIdx - 1]
            .split(/[,，、/]/)
            .map(cleanOptionLine)
            .filter((value) => value.length > 0 && value.length <= 30);
        if (values.length > 1) return uniqueOptions(values);
    }

    const sizeOptions = lines
        .map((line) => line.match(/^([SMLX]{1,3})\s*[:|]\s*/i)?.[1]?.toUpperCase())
        .filter((option): option is string => Boolean(option));
    if (product.title.includes("사이즈 선택") && sizeOptions.length > 0) return uniqueOptions(sizeOptions);

    const numberedLines = lines
        .filter((line) => /^[①-⑳]|^\([0-9]+\)\s/.test(line))
        .map((line) => cleanOptionLine(line.replace(/^[①-⑳]\s*|^\([0-9]+\)\s*/, "")))
        .filter((line) => line.length > 0 && line.length <= 40);
    if (numberedLines.length > 1) return uniqueOptions(numberedLines);

    const imageNameOptions = getImageNameOptionValues(product);
    if (imageNameOptions.length > 1) return uniqueOptions(imageNameOptions);

    return [];
}

function isCartItemForProduct(item: unknown, productId: string) {
    if (typeof item === "string") return item === productId;
    return Boolean(
        item &&
        typeof item === "object" &&
        "productId" in item &&
        (item as { productId?: unknown }).productId === productId,
    );
}

export function CartButton({
    productId,
    title,
    thumbnail,
    requiresOption = false,
    optionValues = [],
    disabled = false,
}: {
    productId: string;
    title: string;
    thumbnail: string;
    requiresOption?: boolean;
    optionValues?: string[];
    disabled?: boolean;
}) {
    const { user } = useAuthStore();
    const [inCart, setInCart] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [showOptionModal, setShowOptionModal] = useState(false);
    const [selectedOption, setSelectedOption] = useState("");
    const [modalOptions, setModalOptions] = useState<string[]>([]);
    const [optionLoading, setOptionLoading] = useState(false);
    const [cartRawItems, setCartRawItems] = useState<unknown[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // ✅ 추가

    const normalizedOptions = Array.from(new Set(optionValues.map((option) => option.trim()).filter(Boolean)));

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current); // ✅ 언마운트 시 타이머 정리
        };
    }, []);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const cart = snap.data()?.cart as unknown;
            const cartItems = Array.isArray(cart) ? cart : [];
            setCartRawItems(cartItems);
            setInCart(cartItems.some((item) => isCartItemForProduct(item, productId)));
        })();
    }, [user?.uid, productId]);

    const activeInCart = Boolean(user?.uid && inCart);

    const removeCurrentProductFromCart = async () => {
        if (!user?.uid) return;

        const ref = doc(db, "users", user.uid);
        const removeItems = cartRawItems.filter((item) => isCartItemForProduct(item, productId));

        if (removeItems.length > 0) {
            await setDoc(ref, { cart: arrayRemove(...removeItems) }, { merge: true });
            setCartRawItems((items) => items.filter((item) => !isCartItemForProduct(item, productId)));
        } else {
            await setDoc(ref, { cart: arrayRemove(productId) }, { merge: true });
            setCartRawItems((items) => items.filter((item) => item !== productId));
        }

        setInCart(false);
        setShowCart(false);
        setShowOptionModal(false);
        setSelectedOption("");
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const addToCart = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (disabled) return;

        if (!user?.uid) {
            setShowLogin(true);
            return;
        }

        if (inCart) {
            try {
                await removeCurrentProductFromCart();
            } catch (err) {
                console.error("🔥 [Cart Remove ERROR]", err);
            }
            return;
        }

        if (requiresOption) {
            setModalOptions(normalizedOptions);
            setSelectedOption((option) => option || normalizedOptions[0] || "");
            setShowOptionModal(true);
            if (normalizedOptions.length === 0) {
                setOptionLoading(true);
                try {
                    const response = await fetch(`/api/store/products/${productId}/options`);
                    const data = await response.json() as { options?: unknown[] };
                    const fetchedOptions = uniqueOptions(data.options ?? []);
                    setModalOptions(fetchedOptions);
                    setSelectedOption(fetchedOptions[0] ?? "");
                } catch (err) {
                    console.error("🔥 [Cart Option Load ERROR]", err);
                    setModalOptions([]);
                } finally {
                    setOptionLoading(false);
                }
            }
            return;
        }

        try {
            const ref = doc(db, "users", user.uid!);
            await setDoc(ref, { cart: arrayUnion(productId) }, { merge: true });
            setCartRawItems((items) => [...items, productId]);
            setInCart(true);
            setShowCart(true);
            timerRef.current = setTimeout(() => {
                setShowCart(false);
            }, 4000);
        } catch (err) { console.error("🔥 [Cart ERROR]", err); }
    };

    const addSelectedOptionToCart = async () => {
        if (!user?.uid || !selectedOption.trim()) return;

        try {
            const ref = doc(db, "users", user.uid);
            const nextItem = {
                productId,
                option: selectedOption.trim(),
                quantity: 1,
            };
            await setDoc(
                ref,
                {
                    cart: arrayUnion(nextItem),
                },
                { merge: true },
            );
            setCartRawItems((items) => [...items, nextItem]);
            setInCart(true);
            setShowOptionModal(false);
            setShowCart(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setShowCart(false);
            }, 4000);
        } catch (err) {
            console.error("🔥 [Cart Option ERROR]", err);
        }
    };

    if (disabled) {
        return (
            <button disabled aria-label="장바구니 담기 불가"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c8c4d4] text-[#8a8494] shadow-none cursor-not-allowed">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            </button>
        );
    }

    return (
        <>
            <button onClick={addToCart} aria-label="장바구니 담기"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${activeInCart
                    ? "bg-[#7865ff] text-white shadow-[0_4px_14px_rgba(120,101,255,0.28)]"
                    : "bg-white text-[#b0aabb] shadow-[0_4px_14px_rgba(30,24,70,0.16)] hover:text-[#7865ff]"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            </button>
            {showLogin && <LoginAlert onClose={() => setShowLogin(false)} />}
            {showCart && <CartAlert title={title} thumbnail={thumbnail} option={selectedOption || undefined} onClose={() => setShowCart(false)} />}
            {showOptionModal && typeof document !== "undefined" && createPortal((
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/10 px-4 backdrop-blur-[3px]"
                    onClick={() => setShowOptionModal(false)}
                >
                    <div
                        className="w-full max-w-[480px] overflow-hidden rounded-[20px] bg-white shadow-[0_12px_48px_rgba(0,0,0,0.25)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="relative flex flex-col items-center gap-3 px-8 pb-5 pt-7 text-center">
                            <button
                                type="button"
                                onClick={() => setShowOptionModal(false)}
                                aria-label="닫기"
                                className="absolute right-5 top-5 text-[#c0bcd0] transition hover:text-[#7865ff]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                            <span className="rounded-full bg-[#826CFF] px-3 py-1 text-[12px] font-bold text-white">옵션 선택</span>
                            <div
                                className="h-[64px] w-[64px] rounded-[12px] bg-[#f3f1ff] bg-cover bg-center"
                                style={{ backgroundImage: `url(${thumbnail})` }}
                                aria-label={title}
                            />
                            <p className="text-[22px] font-bold text-[#16121f]">옵션을 선택해주세요</p>
                            <p className="line-clamp-1 text-[13px] text-[#9b94b2]">{title}</p>
                        </div>

                        <div className="px-8 pb-6">
                            <label htmlFor={`card-option-${productId}`} className="mb-2 block text-[12px] font-bold text-[#6b647a]">
                                옵션
                            </label>
                            <select
                                id={`card-option-${productId}`}
                                value={selectedOption}
                                onChange={(event) => setSelectedOption(event.target.value)}
                                disabled={optionLoading || modalOptions.length === 0}
                                className="h-12 w-full rounded-[12px] border border-[#e3dff0] bg-white px-4 text-[14px] font-semibold text-[#16121f] outline-none transition focus:border-[#826CFF] disabled:bg-[#f8f6ff] disabled:text-[#b0aabb]"
                            >
                                {modalOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                            {optionLoading && (
                                <p className="mt-2 text-[12px] font-semibold text-[#9b94b2]">옵션을 불러오는 중이에요.</p>
                            )}
                            {!optionLoading && modalOptions.length === 0 && (
                                <p className="mt-2 text-[12px] font-semibold text-[#ff5f7c]">옵션 정보를 찾지 못했어요. 상품 상세에서 옵션을 확인해주세요.</p>
                            )}
                        </div>

                        <div className="flex border-t border-[#f0edf8]">
                            <button
                                type="button"
                                onClick={() => setShowOptionModal(false)}
                                className="h-[56px] flex-1 border-r border-[#f0edf8] text-[15px] font-semibold text-[#6b647a] transition hover:bg-[#f8f6ff]"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={addSelectedOptionToCart}
                                disabled={!selectedOption.trim() || optionLoading || modalOptions.length === 0}
                                className="h-[56px] flex-1 bg-[#826CFF] text-[15px] font-bold text-white transition hover:bg-[#6552ee] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                담기
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </>
    );
}

export default function StoreProductCard({ product, badgeLabel }: { product: StoreProduct; badgeLabel?: string }) {
    const isReserve = product.title.includes("[예약]");
    const reserveClosed = isReserveClosed(product);
    const isSoldout = product.title.includes("[품절]") || product.soldout;
    const isUnavailable = isSoldout || reserveClosed;
    const displayPrice = reserveClosed ? "예약 마감" : isSoldout ? "품절" : product.price;
    const displayTitle = product.title.replace("[예약]", "").replace("[품절]", "").trim();
    const optionValues = getCardOptionValues(product);
    const requiresOption = optionValues.length > 0 || product.title.includes("선택");

    return (
        <div className="group block min-w-0">
            {/* 이미지 영역 — 버튼은 Link 밖 */}
            <div className="relative overflow-hidden rounded-[12px] bg-[#f3f1ff]">
                <Link href={`/store/${product.productId}`} className="block">
                    <ImageSlot src={product.thumbnail} alt={product.title}
                        className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]" />
                    {isReserve && !isUnavailable && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#7865ff] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(120,101,255,0.36)]">예약</span>
                    )}
                    {badgeLabel && (
                        <span className={`absolute ${isReserve && !isUnavailable ? "left-3 top-10" : "left-3 top-3"} rounded-full bg-[#826CFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(17,16,24,0.2)]`}>
                            {badgeLabel}
                        </span>
                    )}
                    {isUnavailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">
                                {reserveClosed ? "예약 마감" : "품절"}
                            </span>
                        </div>
                    )}
                </Link>

                {/* ✅ Link 완전히 밖 — 이벤트 충돌 없음 */}
                <div className="absolute bottom-3 right-3 flex gap-1.5 z-5">
                    <WishButton productId={product.productId} title={displayTitle} thumbnail={product.thumbnail} disabled={isSoldout} />
                    {reserveClosed ? (
                        <RestockAlertButton productId={product.productId} title={displayTitle} thumbnail={product.thumbnail} />
                    ) : (
                        <CartButton productId={product.productId} title={displayTitle} thumbnail={product.thumbnail} requiresOption={requiresOption} optionValues={optionValues} disabled={isUnavailable} />
                    )}
                </div>
            </div>

            {/* 텍스트 영역 — 별도 Link */}
            <Link href={`/store/${product.productId}`} className="block mt-3">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[#17151f]">{displayTitle}</p>
                <p className={`mt-1.5 text-[17px] font-extrabold ${isUnavailable ? "text-[#aaa]" : "text-[#111018]"}`}>{displayPrice}</p>
            </Link>
        </div>
    );
}
