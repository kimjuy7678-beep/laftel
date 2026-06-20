"use client";

// app/store/[id]/ProductDetail.tsx
// 클라이언트 인터랙션 전담 컴포넌트 (이미지 슬라이더, 라이트박스, 수량, 탭)

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import CartAlert from "@/components/store/CartAlert";
import LoginAlert from "@/components/store/LoginAlert";
import WishAlert from "@/components/store/WishAlert";
import RestockAlertModal from "@/components/store/RestockAlertModal";
import { RECENT_STORE_PRODUCT_IDS_KEY } from "@/types/store";
import { getLimitedRemainingQuantity, isLimitedStoreProduct } from "@/lib/storeLimitedProducts";
import type { StoreProduct } from "../../store/useStore"; // API 응답 → 정규화된 타입
import { useRouter } from "next/navigation";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const TABS = ["교환/반품 안내", "유의사항", "판매자 정보"];
const THUMBNAIL_VISIBLE = 5;
const SKIP_LINES = new Set(["상품정보 제공고시", "교환/반품 안내", "판매자 정보", "유의사항"]);
const RECENT_STORE_PRODUCTS_UPDATED_EVENT = "laftel:store:recent-products-updated";
const STORE_LIMITED_STOCK_COLLECTION = "storeLimitedStocks";

const RETURN_POLICY = [
    {
        title: "교환 및 반품 기간",
        body: "상품 수령 후 7일 이내에 교환 및 반품이 가능합니다. 단, 상품의 태에나 포장이 훼손되지 않은 경우에 한합니다.",
    },
    {
        title: "교환 및 반품 불가 사항",
        body: "개봉 후 제품의 가치가 훼손된 경우\n포장 및 라벨이 훼손된 경우\n예약 상품의 경우 제작 진행 후에는 취소가 불가능합니다.",
    },
    {
        title: "배송비 안내",
        body: "단순 변심에 의한 반품/교환 시 왕복 배송비는 고객 부담입니다.",
    },
];

const NOTICES = [
    {
        title: "소비자보호법 안내",
        body: "「전자상거래 등에서의 소비자보호에 관한 법률」에 의한 반품 규정이 판매자가 지정한 반품 조건보다 우선하여 적용됩니다.",
    },
    {
        title: "미성년자 구매 안내",
        body: "「전자상거래 등에서의 소비자보호에 관한 법률」에 의거하여 미성년자가 법정대리인의 동의가 없이 물품을 구매하는 경우, 미성년자 본인 또는 법정대리인의 요청에 의해 구매를 취소할 수 있습니다.",
    },
    {
        title: "안전관리대상 품목 안내",
        body: "「전기용품 및 생활용품 안전관리법」 및 「어린이제품 안전특별법」 규정에 의한 안전관리대상 품목인 전기용품, 생활용품, 어린이제품을 구매하실 경우 관련 법률에 따라 허가받은 상품인지 확인하시기 바랍니다.",
    },
    {
        title: "판매자 책임 안내",
        body: "라프텔 스토어에 등록된 판매상품과 상품의 내용은 판매자가 등록한 것으로 (주)라프텔은 직접 등록한 제품을 제외한 나머지 제품의 등록된 내용에 대하여 일체의 책임을 지지 않습니다.",
    },
    {
        title: "피싱 사이트 주의",
        body: "라프텔 공식 스토어(store.laftel.net) 외 피싱 사이트 이용으로 피해가 발생하지 않도록 주의해 주세요.",
    },
];

function seriesHref(series: string) {
    return `/store/series?series=${encodeURIComponent(series)}`;
}



// ─── productdetail 파싱 ───────────────────────────────────────────────────────
type SpecRow = { label: string; value: string; highlight?: boolean; warn?: boolean };
type ParsedDetail = { specs: SpecRow[]; noticelines: string[]; isReservation: boolean; size?: string; material?: string };
type StoredCartItem = {
    productId: string;
    option?: unknown;
    quantity?: number;
};

function isStoredCartItem(value: unknown): value is StoredCartItem {
    return Boolean(
        value &&
        typeof value === "object" &&
        "productId" in value &&
        typeof (value as { productId?: unknown }).productId === "string",
    );
}

function getTodayParts() {
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

function toSerial(date: { year: number; month: number; day: number }) {
    return date.year * 10000 + date.month * 100 + date.day;
}

function normalizeStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseReserveDeadline(lines: string[], fallbackYear: number) {
    const text = lines.join(" ");
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

function splitSpecLine(line: string) {
    const match = line.match(/^(.+?)\s*(?:\||ㅣ|l|:)\s*(.+)$/i);
    if (!match) return null;
    return {
        label: match[1].trim(),
        value: match[2].trim(),
    };
}

function normalizeSpecLabel(label: string) {
    if (label.includes("사이즈")) return "사이즈";
    if (label.includes("소재")) return "소재";
    if (label.includes("사용 연령") || label.includes("사용연령") || label.includes("이용가")) return "사용 연령";
    return label;
}

function parseDetail(lines: string[], title: string): ParsedDetail {
    const specs: SpecRow[] = [];
    const noticelines: string[] = [];
    let isReservation = title.includes("[예약]") || title.includes("예약");
    let size: string | undefined;
    let material: string | undefined;

    for (const raw of lines) {
        const line = raw.trim();
        if (!line || SKIP_LINES.has(line)) continue;

        const spec = splitSpecLine(line);
        if (spec) {
            const label = normalizeSpecLabel(spec.label);
            const value = spec.value;
            if (label.includes("예약 마감일") || label.includes("예약 취소")) {
                isReservation = true;
                specs.push({ label, value, highlight: true });
            } else {
                if (label === "사이즈") size = value;
                if (label === "소재") material = value;
                specs.push({ label, value });
            }
            continue;
        }

        // 최소 수량 경고
        if (line.includes("최소 수량") || line.includes("최소수량")) {
            specs.push({ label: "유의사항", value: line, warn: true });
            isReservation = true;
            noticelines.push(line);
            continue;
        }

        // 예약/배송/정품 안내 문구 → 경고 배너
        if (
            line.includes("예약 제품") ||
            line.includes("발매 이후") ||
            (isReservation && line.includes("순차적으로 배송"))
        ) {
            isReservation = true;
            noticelines.push(line);
            continue;
        }
        // 나머지(상품명 등)는 스킵
    }

    return { specs, noticelines, isReservation, size, material };
}

// ─── 옵션값 추출 ────────────────────────────────────────────────────────────
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

function getOptionValues(product: StoreProduct): string[] {
    const rawOptions = Array.isArray(product.options) ? product.options : [];
    if (rawOptions.length > 0) return uniqueOptions(rawOptions);

    const lines = normalizeStringArray(product.productdetail).map((l) => l.trim()).filter(Boolean);

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
        .filter((l) => /^[①-⑳]|^\([0-9]+\)\s/.test(l))
        .map((l) => cleanOptionLine(l.replace(/^[①-⑳]\s*|^\([0-9]+\)\s*/, "")))
        .filter((l) => l.length > 0 && l.length <= 40);
    if (numberedLines.length > 1) return uniqueOptions(numberedLines);

    const bulletLines = lines
        .filter((l) => /^[-•·]\s+/.test(l))
        .map((l) => cleanOptionLine(l.replace(/^[-•·]\s+/, "")))
        .filter((l) => l.length > 0 && l.length <= 40 && /[가-힣A-Za-z0-9]/.test(l));
    if (bulletLines.length > 1) return uniqueOptions(bulletLines);

    return [];
}

// ─── 라이트박스 ──────────────────────────────────────────────────────────────
function Lightbox({
    images,
    startIndex,
    onClose,
}: {
    images: string[];
    startIndex: number;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(startIndex);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") setCurrent((i) => (i - 1 + images.length) % images.length);
            if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % images.length);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [images.length, onClose]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={onClose}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            <div
                className="relative flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={images[current]}
                    alt=""
                    className="max-w-[90vw] max-h-[88vh] object-contain rounded-[12px] select-none"
                    draggable={false}
                />
                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrent((i) => (i - 1 + images.length) % images.length)}
                            className="fixed left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 sm:left-5"
                            aria-label="이전 이미지"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button
                            onClick={() => setCurrent((i) => (i + 1) % images.length)}
                            className="fixed right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 sm:right-5"
                            aria-label="다음 이미지"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </>
                )}
            </div>

            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[12px] text-white/60 font-medium tabular-nums">
                {current + 1} / {images.length}
            </span>
        </div>
    );
}

// ─── 연관상품 카드 ────────────────────────────────────────────────────────────
function RelatedCard({ product }: { product: StoreProduct }) {
    const today = getTodayParts();
    const detailLines = normalizeStringArray(product.productdetail);
    const reserveDeadline = parseReserveDeadline(detailLines, today.year);
    const isReserveClosed = Boolean(reserveDeadline && toSerial(reserveDeadline) < toSerial(today));
    const isSoldout = product.soldout || product.title.includes("[품절]");
    const isUnavailable = isSoldout || isReserveClosed;
    const displayTitle = product.title.replace("[예약]", "").replace("[품절]", "").trim();
    const displayPrice = isReserveClosed ? "예약 마감" : isSoldout ? "품절" : product.price;

    return (
        <Link href={`/store/${product.productId}`} className="group block w-[150px] flex-shrink-0 sm:w-[170px] lg:w-[180px]">
            <div className="relative overflow-hidden rounded-[14px] bg-[#f5f3ff] aspect-square border border-[#ebe8ff]">
                <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                />
                {product.title.includes("[예약]") && !isUnavailable && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-[#7865ff] px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(120,101,255,0.36)]">
                        예약
                    </span>
                )}
                {isUnavailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-3.5 py-1 text-[12px] font-bold text-[#555]">
                            {isReserveClosed ? "예약 마감" : "품절"}
                        </span>
                    </div>
                )}
            </div>
            <p className="mt-2 text-[11px] text-[#aaa]">{product.category}</p>
            <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-[#111] sm:text-[13px]">{displayTitle}</p>
            <p className={`mt-1 text-[12px] font-bold sm:text-[13px] ${isUnavailable ? "text-[#aaa]" : "text-[#111]"}`}>{displayPrice}</p>
        </Link>
    );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function ProductDetail({
    product,
    images,
    related,
}: {
    product: StoreProduct;
    images: string[];
    related: StoreProduct[];
}) {
    const [activeImg, setActiveImg] = useState(0);
    const [qty, setQty] = useState(1);
    const [activeTab, setActiveTab] = useState(0);
    const [thumbOffset, setThumbOffset] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState("");
    const [optionError, setOptionError] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [wished, setWished] = useState(false);
    const [showWish, setShowWish] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);
    const [restockEnabled, setRestockEnabled] = useState(false);
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [limitedStockOverride, setLimitedStockOverride] = useState<{ productId: string; remainingQuantity: number } | null>(null);
    const swiperRef = useRef<HTMLDivElement>(null);
    const { user } = useAuthStore();
    const router = useRouter();
    const detailLines = normalizeStringArray(product.productdetail);
    const displayImages = images.length > 0 ? images : [product.thumbnail].filter(Boolean);
    const { specs, noticelines, isReservation, size, material } = parseDetail(detailLines, product.title);
    const today = getTodayParts();
    const reserveDeadline = parseReserveDeadline(detailLines, today.year);
    const isReserveClosed = Boolean(reserveDeadline && toSerial(reserveDeadline) < toSerial(today));
    const visibleSpecs = specs.filter((row) => row.label !== "사이즈" && row.label !== "소재");
    const optionValues = getOptionValues(product);
    const showOptionSelect = optionValues.length > 0 || product.title.includes("선택");
    const showSwiper = related.length > 5;
    const displayTitle = product.title.replace("[예약]", "").trim();
    const cartOption = selectedOption || "기본";
    const isLimitedProduct = isLimitedStoreProduct(product.productId);
    const fallbackLimitedRemainingQuantity = getLimitedRemainingQuantity(product.productId);
    const limitedRemainingQuantity = limitedStockOverride?.productId === product.productId
        ? limitedStockOverride.remainingQuantity
        : fallbackLimitedRemainingQuantity;
    const isLimitedSoldOut = isLimitedProduct && limitedRemainingQuantity !== null && limitedRemainingQuantity <= 0;
    const isUnavailable = product.soldout || isReserveClosed || isLimitedSoldOut;
    const exceedsLimitedStock = isLimitedProduct && limitedRemainingQuantity !== null && qty > limitedRemainingQuantity;
    const activeWished = Boolean(user?.uid && wished);

    const handleBuy = async () => {
        if (isUnavailable) return;
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }
        if (exceedsLimitedStock) {
            window.alert("한정판 남은 수량보다 많이 구매할 수 없어요.");
            return;
        }
        if (showOptionSelect && !selectedOption) {
            setOptionError(true);
            document.getElementById("product-option")?.focus();
            return;
        }

        // 중복 주문 체크
        try {
            const { collection, getDocs, query, where } = await import("firebase/firestore");
            const ordersSnap = await getDocs(
                query(
                    collection(db, "users", user.uid, "orders"),
                    where("status", "!=", "주문취소")
                )
            );
            const alreadyOrdered = ordersSnap.docs.some((d) => {
                const items = d.data().items;
                if (!Array.isArray(items)) return false;
                return items.some((item: { productId?: unknown }) => item.productId === product.productId);
            });
            if (alreadyOrdered) {
                const confirmed = window.confirm(
                    "이미 주문한 상품이에요.\n그래도 다시 구매하시겠어요?"
                );
                if (!confirmed) return;
            }
        } catch {
            // 체크 실패 시 그냥 진행
        }

        const params = new URLSearchParams({
            productId: product.productId,
            title: product.title,
            price: product.price,
            thumbnail: product.thumbnail,
            option: selectedOption || "기본",
            qty: String(qty),
            category: product.category,
        });
        router.push(`/store/order?${params.toString()}`);
    };

    const handlePrev = () => setActiveImg((i) => (i - 1 + displayImages.length) % displayImages.length);
    const handleNext = () => setActiveImg((i) => (i + 1) % displayImages.length);

    const showThumbSlider = displayImages.length > THUMBNAIL_VISIBLE;
    const maxThumbOffset = Math.max(0, displayImages.length - THUMBNAIL_VISIBLE);

    const handleThumbClick = (i: number) => {
        setActiveImg(i);
        if (showThumbSlider) {
            if (i < thumbOffset) setThumbOffset(i);
            else if (i >= thumbOffset + THUMBNAIL_VISIBLE) setThumbOffset(i - THUMBNAIL_VISIBLE + 1);
        }
    };

    useEffect(() => {
        if (!isLimitedProduct) return;

        const unsubscribe = onSnapshot(
            doc(db, STORE_LIMITED_STOCK_COLLECTION, product.productId),
            (snap) => {
                const rawQuantity = snap.data()?.remainingQuantity;
                setLimitedStockOverride({
                    productId: product.productId,
                    remainingQuantity: typeof rawQuantity === "number"
                        ? Math.max(0, rawQuantity)
                        : fallbackLimitedRemainingQuantity ?? 0,
                });
            },
        );

        return () => unsubscribe();
    }, [fallbackLimitedRemainingQuantity, isLimitedProduct, product.productId]);

    useEffect(() => {
        if (!product.productId) return;

        try {
            const stored = window.localStorage.getItem(RECENT_STORE_PRODUCT_IDS_KEY);
            const parsed = stored ? (JSON.parse(stored) as unknown) : [];
            const previousIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
            const nextIds = [product.productId, ...previousIds.filter((id) => id !== product.productId)].slice(0, 20);
            window.localStorage.setItem(RECENT_STORE_PRODUCT_IDS_KEY, JSON.stringify(nextIds));
            window.dispatchEvent(new Event(RECENT_STORE_PRODUCTS_UPDATED_EVENT));
        } catch {
            window.localStorage.setItem(RECENT_STORE_PRODUCT_IDS_KEY, JSON.stringify([product.productId]));
            window.dispatchEvent(new Event(RECENT_STORE_PRODUCTS_UPDATED_EVENT));
        }
    }, [product.productId]);

    useEffect(() => {
        if (!user?.uid) return;

        let cancelled = false;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const wishlist: string[] = snap.data()?.wishlist || [];
            if (!cancelled) setWished(wishlist.includes(product.productId));
        })();

        return () => {
            cancelled = true;
        };
    }, [product.productId, user?.uid]);

    const toggleWish = async () => {
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }

        const ref = doc(db, "users", user.uid);
        if (activeWished) {
            await setDoc(ref, { wishlist: arrayRemove(product.productId) }, { merge: true });
            setWished(false);
            return;
        }

        await setDoc(ref, { wishlist: arrayUnion(product.productId) }, { merge: true });
        setWished(true);
        setShowWish(true);
    };

    const addToCart = async () => {
        if (isUnavailable) return;
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }
        if (exceedsLimitedStock) {
            window.alert("한정판 남은 수량보다 많이 담을 수 없어요.");
            return;
        }

        if (showOptionSelect && !selectedOption) {
            setOptionError(true);
            document.getElementById("product-option")?.focus();
            return;
        }

        setCartLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            const nextOption = cleanOptionValue(selectedOption || "기본");
            const snap = await getDoc(userRef);
            const rawCart = snap.data()?.cart as unknown;
            const cartItems = Array.isArray(rawCart) ? rawCart : [];
            const matchedItem = cartItems.find((item) => {
                const productId = typeof item === "string" ? item : isStoredCartItem(item) ? item.productId : "";
                if (productId !== product.productId) return false;

                const option = typeof item === "string"
                    ? "기본"
                    : isStoredCartItem(item)
                        ? cleanOptionValue(item.option || "기본")
                        : "";

                return option === nextOption;
            });
            const matchedQuantity = isStoredCartItem(matchedItem) && typeof matchedItem.quantity === "number"
                ? Math.max(1, matchedItem.quantity)
                : matchedItem
                    ? 1
                    : 0;
            if (isLimitedProduct && limitedRemainingQuantity !== null && matchedQuantity + qty > limitedRemainingQuantity) {
                window.alert("장바구니에 담긴 수량까지 합치면 한정판 남은 수량을 넘어요.");
                return;
            }
            const nextItem = {
                productId: product.productId,
                option: nextOption,
                quantity: matchedQuantity + qty,
            };

            if (matchedItem) {
                await setDoc(userRef, { cart: arrayRemove(matchedItem) }, { merge: true });
            }
            await setDoc(userRef, { cart: arrayUnion(nextItem) }, { merge: true });
            setShowCart(true);
        } finally {
            setCartLoading(false);
        }
    };

    const openRestockAlert = () => {
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }
        if (restockEnabled) return;

        setRestockModalOpen(true);
    };

    useEffect(() => {
        if (!user?.uid || !isReserveClosed) return;
        const uid = user.uid;
        let cancelled = false;

        (async () => {
            const snap = await getDoc(doc(db, "users", uid));
            const restockAlerts = snap.data()?.restockAlerts as unknown;
            const ids = Array.isArray(restockAlerts) ? restockAlerts : [];
            if (!cancelled) setRestockEnabled(ids.includes(product.productId));
        })();

        return () => {
            cancelled = true;
        };
    }, [isReserveClosed, product.productId, user?.uid]);

    return (
        <div className="min-h-screen bg-white">
            {showLogin && <LoginAlert onClose={() => setShowLogin(false)} />}
            {showCart && (
                <CartAlert
                    title={displayTitle}
                    thumbnail={product.thumbnail}
                    option={cartOption}
                    onClose={() => setShowCart(false)}
                />
            )}
            {showWish && (
                <WishAlert
                    title={displayTitle}
                    thumbnail={product.thumbnail}
                    onClose={() => setShowWish(false)}
                />
            )}
            {lightboxOpen && (
                <Lightbox images={displayImages} startIndex={activeImg} onClose={() => setLightboxOpen(false)} />
            )}
            {restockModalOpen && user?.uid && (
                <RestockAlertModal
                    uid={user.uid}
                    productId={product.productId}
                    title={displayTitle}
                    thumbnail={product.thumbnail}
                    onClose={() => setRestockModalOpen(false)}
                    onDone={() => {
                        setRestockEnabled(true);
                        setRestockModalOpen(false);
                    }}
                />
            )}

            <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6 sm:pb-20 md:px-8 md:pt-7 lg:px-10 lg:pt-10 xl:px-12">
                <Link href={seriesHref(product.category)} className="mb-3 inline-block text-[12px] font-semibold text-[#6B5CE7] hover:underline lg:hidden">
                    {product.category}
                </Link>

                {/* 상단: 이미지 + 정보 */}
                <div className="grid grid-cols-1 items-start justify-center gap-6 md:gap-8 lg:grid-cols-[minmax(0,580px)_minmax(340px,500px)] lg:gap-10 xl:grid-cols-[minmax(0,600px)_minmax(380px,520px)] xl:gap-16 2xl:gap-24">

                    {/* 왼쪽: 이미지 */}
                    <div className="min-w-0">
                        <div
                            className="relative overflow-hidden rounded-[20px] bg-[#f5f3ff] border border-[#ebe8ff] cursor-zoom-in group"
                            onClick={() => setLightboxOpen(true)}
                        >
                            <img
                                src={displayImages[activeImg] ?? ""}
                                alt={product.title}
                                className="w-full object-contain aspect-square transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                                </svg>
                            </div>
                            {displayImages.length > 1 && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                    </button>
                                    <span className="absolute bottom-3 right-3 text-[11px] text-white/90 bg-black/40 rounded-full px-2.5 py-0.5 font-medium">
                                        {activeImg + 1} / {displayImages.length}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* 썸네일 슬라이더 */}
                        {showThumbSlider ? (
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={() => setThumbOffset((o) => Math.max(0, o - 1))}
                                    disabled={thumbOffset === 0}
                                    className="w-7 h-7 flex-shrink-0 rounded-full  flex items-center justify-center hover:bg-[#f5f3ff] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <div className="flex flex-1 gap-2 overflow-hidden">
                                    {displayImages.slice(thumbOffset, thumbOffset + THUMBNAIL_VISIBLE).map((img, relIdx) => {
                                        const absIdx = thumbOffset + relIdx;
                                        return (
                                            <button
                                                key={absIdx}
                                                onClick={() => handleThumbClick(absIdx)}
                                                className={`aspect-square flex-1 overflow-hidden rounded-[10px] border-2 transition-all ${activeImg === absIdx ? "border-[#6B5CE7]" : "border-transparent hover:border-[#c4bbff]"}`}
                                            >
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setThumbOffset((o) => Math.min(maxThumbOffset, o + 1))}
                                    disabled={thumbOffset >= maxThumbOffset}
                                    className="w-7 h-7 flex-shrink-0 rounded-full  flex items-center justify-center hover:bg-[#f5f3ff] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {displayImages.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleThumbClick(i)}
                                        className={`h-[56px] w-[56px] flex-shrink-0 overflow-hidden rounded-[10px] border-2 transition-all sm:h-[64px] sm:w-[64px] lg:h-[68px] lg:w-[68px] ${activeImg === i ? "border-[#6B5CE7]" : "border-transparent hover:border-[#c4bbff]"}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 상품 정보 */}
                    <div className="min-w-0 lg:max-w-[520px]">
                        <Link href={seriesHref(product.category)} className="mb-2 hidden text-[13px] text-[#6B5CE7] hover:underline lg:inline-block">
                            {product.category}
                        </Link>

                        <h1 className="text-[19px] font-bold leading-snug text-[#111018] sm:text-[21px] lg:text-[22px]">{product.title}</h1>

                        <p className="mt-3 text-[24px] font-extrabold text-[#111018] sm:text-[28px] lg:mt-4 lg:text-[30px]">
                            {isReserveClosed ? "예약 마감" : product.soldout || isLimitedSoldOut ? "품절" : product.price}
                        </p>

                        {isLimitedProduct && limitedRemainingQuantity !== null && (
                            <div className="mt-3 rounded-[14px] border border-[#ffd06e] bg-[#fffcf0] px-3 py-2.5 text-white shadow-[0_8px_22px_rgba(17,16,24,0.14)] sm:mt-4 sm:px-4 sm:py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd06e] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#a06000] sm:px-3 sm:text-[12px]">

                                        한정판
                                    </span>
                                    <span className="text-[12px] font-bold text-[#a06000] sm:text-[13px]">
                                        남은 수량 <b className="text-[#C14822]">{limitedRemainingQuantity}</b>개
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="my-4 border-t border-[#f0eeff] lg:my-5" />

                        {(size || material) && (
                            <div className="mb-4 rounded-[14px] border border-[#ebe8ff] bg-[#fbfaff] px-3.5 py-3 lg:mb-5 lg:px-4 lg:py-3.5">
                                <p className="mb-2 text-[12px] font-bold text-[#111018] lg:mb-2.5 lg:text-[13px]">상품정보</p>
                                <dl className="space-y-2 text-[12px] lg:text-[13px]">
                                    {size && (
                                        <div className="flex gap-4">
                                            <dt className="w-[62px] shrink-0 text-[#999]">사이즈</dt>
                                            <dd className="min-w-0 flex-1 font-semibold leading-snug text-[#222]">{size}</dd>
                                        </div>
                                    )}
                                    {material && (
                                        <div className="flex gap-4">
                                            <dt className="w-[62px] shrink-0 text-[#999]">소재</dt>
                                            <dd className="min-w-0 flex-1 font-semibold leading-snug text-[#222]">{material}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}

                        {visibleSpecs.length > 0 && (
                            <table className="mb-4 w-full text-[12px] lg:mb-5 lg:text-[13px]">
                                <tbody>
                                    {visibleSpecs.map((row, i) => (
                                        <tr key={i} className="border-b border-[#f5f3ff] last:border-0">
                                            <td className="w-[78px] whitespace-nowrap py-2 pr-3 align-top leading-snug text-[#aaa] lg:w-[90px] lg:py-2.5 lg:pr-4">{row.label}</td>
                                            <td className={`py-2.5 font-semibold leading-snug ${row.highlight ? "text-[#6B5CE7]" : row.warn ? "text-[#c05c00]" : "text-[#222]"}`}>
                                                {row.value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {showOptionSelect && (
                            <div className="mb-4 lg:mb-5">
                                <label htmlFor="product-option" className="mb-2 block text-[12px] font-semibold text-[#666] lg:text-[13px]">
                                    옵션 선택
                                </label>
                                <div className="relative">
                                    <select
                                        id="product-option"
                                        value={selectedOption}
                                        onChange={(e) => {
                                            setSelectedOption(e.target.value);
                                            setOptionError(false);
                                        }}
                                        disabled={isUnavailable}
                                        className={`h-[44px] w-full appearance-none rounded-[12px] border bg-white px-4 pr-10 text-[12px] font-semibold text-[#222] outline-none transition-colors hover:border-[#c4bbff] focus:border-[#6B5CE7] disabled:cursor-not-allowed disabled:bg-[#f5f3ff] disabled:text-[#aaa] lg:h-[46px] lg:text-[13px] ${optionError ? "border-[#ff5c7a]" : "border-[#e0daf7]"}`}
                                    >
                                        <option value="">옵션을 선택해주세요</option>
                                        {optionValues.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <svg
                                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B5CE7]"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                                {optionError && (
                                    <p className="mt-2 text-[12px] font-semibold text-[#ff4d6d]">옵션을 선택해주세요.</p>
                                )}
                            </div>
                        )}

                        {!isUnavailable && (
                            <div className="mb-5 flex items-center gap-3 lg:mb-6 lg:gap-4">
                                <span className="w-[60px] text-[12px] text-[#aaa] lg:w-[90px] lg:text-[13px]">수량</span>
                                <div className="flex items-center border border-[#e0daf7] rounded-full overflow-hidden">
                                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center text-[#555] transition-colors hover:bg-[#f5f3ff] lg:h-10 lg:w-10">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
                                    </button>
                                    <span className="w-9 text-center text-[14px] font-bold text-[#111] lg:w-10 lg:text-[15px]">{qty}</span>
                                    <button
                                        onClick={() => setQty((q) => limitedRemainingQuantity === null ? q + 1 : Math.min(limitedRemainingQuantity, q + 1))}
                                        disabled={limitedRemainingQuantity !== null && qty >= limitedRemainingQuantity}
                                        className="flex h-9 w-9 items-center justify-center text-[#555] transition-colors hover:bg-[#f5f3ff] disabled:cursor-not-allowed disabled:opacity-30 lg:h-10 lg:w-10"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 예약 경고 배너 — 예약 상품에 안내 문구가 있을 때만 */}
                        {isReservation && noticelines.length > 0 && (
                            <div className="mb-4 flex items-start gap-3 rounded-[12px] border border-[#ffd06e] bg-[#fffcf0] px-3.5 py-3 lg:px-4 lg:py-3.5">
                                <svg className="flex-shrink-0 mt-[2px]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c08000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <div className="space-y-0.5 text-[11px] leading-relaxed text-[#7a5500] lg:text-[12px]">
                                    <p className="font-bold text-[#a06000] mb-1">예약 상품 안내</p>
                                    {noticelines.map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            </div>
                        )}

                        {isReserveClosed ? (
                            <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                                <button
                                    type="button"
                                    onClick={openRestockAlert}
                                    disabled={restockEnabled}
                                    className={`flex h-[48px] min-w-[180px] flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-bold text-white transition-colors lg:h-[52px] lg:text-[15px] ${restockEnabled
                                        ? "cursor-not-allowed bg-[#7865ff] shadow-[0_4px_14px_rgba(120,101,255,0.28)]"
                                        : "bg-[#826CFF] hover:bg-[#5a4dd6]"
                                        }`}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={restockEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    {restockEnabled ? "재입고 알림 설정됨" : "재입고 알림설정"}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleWish}
                                    aria-label="위시리스트"
                                    className={`flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border-2 transition-all lg:h-[52px] lg:w-[52px] ${activeWished
                                        ? "border-[#ff4d6d] bg-[#ff4d6d] text-white shadow-[0_4px_14px_rgba(255,77,109,0.28)]"
                                        : "border-[#f0d8df] bg-white text-[#b0aabb] hover:border-[#ff4d6d] hover:text-[#ff4d6d]"
                                        }`}
                                >
                                    <svg width="19" height="19" viewBox="0 0 24 24" fill={activeWished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                                <button onClick={handleBuy} disabled={isUnavailable || exceedsLimitedStock} className="h-[48px] min-w-[120px] flex-1 rounded-full bg-[#826CFF] text-[13px] font-bold text-white transition-colors hover:bg-[#5a4dd6] disabled:cursor-not-allowed disabled:opacity-40 lg:h-[52px] lg:text-[15px]">
                                    {product.soldout || isLimitedSoldOut ? "품절" : "구매하기"}
                                </button>
                                <button
                                    type="button"
                                    onClick={addToCart}
                                    disabled={isUnavailable || exceedsLimitedStock || cartLoading}
                                    className="flex h-[48px] items-center gap-1.5 rounded-full border-2 border-[#826CFF] px-3 text-[12px] font-bold text-[#6B5CE7] transition-colors hover:bg-[#f5f3ff] disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 lg:h-[52px] lg:gap-2 lg:px-5 lg:text-[14px]"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                    </svg>
                                    {cartLoading ? "담는 중" : "장바구니"}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleWish}
                                    aria-label="위시리스트"
                                    className={`flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border-2 transition-all lg:h-[52px] lg:w-[52px] ${activeWished
                                        ? "border-[#ff4d6d] bg-[#ff4d6d] text-white shadow-[0_4px_14px_rgba(255,77,109,0.28)]"
                                        : "border-[#ff4d6d] bg-white text-[#ff4d6d] hover:border-[#ff4d6d] hover:text-[#ff4d6d]"
                                        }`}
                                >
                                    <svg width="19" height="19" viewBox="0 0 24 24" fill={activeWished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 탭 */}
                <div className="mt-10 lg:mt-16">
                    <div className="flex overflow-x-auto border-b border-[#ebe8ff] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {TABS.map((tab, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`relative shrink-0 px-4 py-3 text-[12px] font-semibold transition-colors sm:px-5 lg:px-7 lg:py-3.5 lg:text-[14px] ${activeTab === i ? "text-[#6B5CE7]" : "text-[#bbb] hover:text-[#888]"}`}
                            >
                                {tab}
                                {activeTab === i && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6B5CE7] rounded-t-full" />}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 rounded-[16px] border border-[#ebe8ff] bg-[#faf9ff] p-5 lg:mt-6 lg:rounded-[20px] lg:p-10">
                        {activeTab === 0 && (
                            <div className="space-y-5 lg:space-y-7">
                                {RETURN_POLICY.map((s, i) => (
                                    <div key={i}>
                                        <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#222] lg:mb-2.5 lg:text-[14px]">
                                            <span className="w-1 h-[18px] rounded-full bg-[#6B5CE7] inline-block flex-shrink-0" />{s.title}
                                        </h3>
                                        <p className="whitespace-pre-line pl-4 text-[12px] leading-relaxed text-[#666] lg:text-[13px]">{s.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 1 && (
                            <div className="space-y-5 lg:space-y-7">
                                {NOTICES.map((s, i) => (
                                    <div key={i}>
                                        <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#222] lg:mb-2.5 lg:text-[14px]">
                                            <span className="w-1 h-[18px] rounded-full bg-[#6B5CE7] inline-block flex-shrink-0" />{s.title}
                                        </h3>
                                        <p className="pl-4 text-[12px] leading-relaxed text-[#666] lg:text-[13px]">{s.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 2 && <p className="text-[12px] text-[#999] lg:text-[13px]">공급사 | Laftel Store</p>}
                    </div>
                </div>

                {/* 연관상품 */}
                {related.length > 0 && (
                    <section className="mt-20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[22px] font-bold text-[#111018]">연관상품</h2>
                            <div className="flex items-center gap-3">
                                <Link href={seriesHref(product.category)} className="text-[13px] text-[#6B5CE7] hover:underline flex items-center gap-1">
                                    전체보기
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                </Link>
                                {/* {showSwiper && (
                                    <div className="flex gap-2 ml-2">
                                        <button onClick={() => scrollRelated("left")} className="w-8 h-8 rounded-full border border-[#e0daf7] flex items-center justify-center hover:bg-[#f5f3ff] transition-colors">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                        </button>
                                        <button onClick={() => scrollRelated("right")} className="w-8 h-8 rounded-full border border-[#e0daf7] flex items-center justify-center hover:bg-[#f5f3ff] transition-colors">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                        </button>
                                    </div>
                                )} */}
                            </div>
                        </div>
                        {showSwiper ? (
                            <div ref={swiperRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "none" }}>
                                {related.map((p) => <RelatedCard key={p.productId} product={p} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                                {related.map((p) => <RelatedCard key={p.productId} product={p} />)}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
