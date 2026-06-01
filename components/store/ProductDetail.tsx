"use client";

// app/store/[id]/ProductDetail.tsx
// 클라이언트 인터랙션 전담 컴포넌트 (이미지 슬라이더, 라이트박스, 수량, 탭)

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { StoreProduct } from "../../store/useStore"; // API 응답 → 정규화된 타입

// ─── 상수 ────────────────────────────────────────────────────────────────────
const TABS = ["교환/반품 안내", "유의사항", "판매자 정보"];
const THUMBNAIL_VISIBLE = 5;
const SKIP_LINES = new Set(["상품정보 제공고시", "교환/반품 안내", "판매자 정보", "유의사항"]);

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

// ─── productdetail 파싱 ───────────────────────────────────────────────────────
type SpecRow = { label: string; value: string; highlight?: boolean; warn?: boolean };
type ParsedDetail = { specs: SpecRow[]; noticelines: string[]; isReservation: boolean; size?: string; material?: string };

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

// ─── 옵션값 추출 (5단계 fallback) ────────────────────────────────────────────
function getOptionValues(product: StoreProduct): string[] {
    // 1순위: API에서 받은 options
    if (product.options.length > 0) return product.options;

    const lines = product.productdetail.map((l) => l.trim()).filter(Boolean);

    // 2순위: "옵션" 접두사 라인
    const optionLines = lines
        .filter((line) => /^옵션\s*[A-Z0-9가-힣]?\.?\s*/.test(line))
        .map((line) => line.replace(/^옵션\s*[A-Z0-9가-힣]?\.?\s*/, "").trim())
        .filter(Boolean);
    if (optionLines.length > 0) return optionLines;

    // 3순위: "선택하여 구매" / "선택 후 구매" 앞 줄 쉼표 분리
    const selectIdx = lines.findIndex((l) => /선택(하여|후)\s*구매/.test(l));
    if (selectIdx > 0) {
        const candidate = lines[selectIdx - 1];
        const values = candidate
            .split(/[,，、]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.length <= 30);
        if (values.length > 1) return values;
    }

    // 4순위: "① ② ③ ..." 또는 "(1) (2) (3) ..." 형태 번호 목록
    const numberedLines = lines
        .filter((l) => /^[①-⑳]|^\([0-9]+\)\s/.test(l))
        .map((l) => l.replace(/^[①-⑳]\s*|^\([0-9]+\)\s*/, "").trim())
        .filter((l) => l.length > 0 && l.length <= 40);
    if (numberedLines.length > 1) return numberedLines;

    // 5순위: "- " 또는 "• " bullet 목록
    const bulletLines = lines
        .filter((l) => /^[-•·]\s+/.test(l))
        .map((l) => l.replace(/^[-•·]\s+/, "").trim())
        .filter((l) => l.length > 0 && l.length <= 40 && /[가-힣A-Za-z0-9]/.test(l));
    if (bulletLines.length > 1) return bulletLines;

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
                            className="absolute left-[-56px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button
                            onClick={() => setCurrent((i) => (i + 1) % images.length)}
                            className="absolute right-[-56px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
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
    return (
        <Link href={`/store/${product.productId}`} className="group block flex-shrink-0" style={{ width: 180 }}>
            <div className="overflow-hidden rounded-[14px] bg-[#f5f3ff] aspect-square border border-[#ebe8ff]">
                <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                />
            </div>
            <p className="mt-2 text-[11px] text-[#aaa]">{product.category}</p>
            <p className="mt-0.5 text-[13px] font-semibold text-[#111] line-clamp-2 leading-snug">{product.title}</p>
            <p className="mt-1 text-[13px] font-bold text-[#111]">{product.soldout ? "품절" : product.price}</p>
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
    const swiperRef = useRef<HTMLDivElement>(null);

    const handlePrev = () => setActiveImg((i) => (i - 1 + images.length) % images.length);
    const handleNext = () => setActiveImg((i) => (i + 1) % images.length);

    const showThumbSlider = images.length > THUMBNAIL_VISIBLE;
    const maxThumbOffset = Math.max(0, images.length - THUMBNAIL_VISIBLE);

    const handleThumbClick = (i: number) => {
        setActiveImg(i);
        if (showThumbSlider) {
            if (i < thumbOffset) setThumbOffset(i);
            else if (i >= thumbOffset + THUMBNAIL_VISIBLE) setThumbOffset(i - THUMBNAIL_VISIBLE + 1);
        }
    };

    const scrollRelated = (dir: "left" | "right") => {
        swiperRef.current?.scrollBy({ left: dir === "right" ? 580 : -580, behavior: "smooth" });
    };

    const { specs, noticelines, isReservation, size, material } = parseDetail(product.productdetail, product.title);
    const visibleSpecs = specs.filter((row) => row.label !== "사이즈" && row.label !== "소재");
    const optionValues = getOptionValues(product);
    const showOptionSelect = optionValues.length > 0 || product.title.includes("선택");
    const showSwiper = related.length > 5;

    return (
        <div className="min-h-screen bg-white">
            {lightboxOpen && (
                <Lightbox images={images} startIndex={activeImg} onClose={() => setLightboxOpen(false)} />
            )}

            <main className="mx-auto max-w-[1600px] px-6 pt-[88px] pb-24">

                {/* 상단: 이미지 + 정보 */}
                <div className="flex flex-col gap-10 md:flex-row md:gap-16">

                    {/* 왼쪽: 이미지 */}
                    <div className="flex-shrink-0 md:w-[480px]">
                        <div
                            className="relative overflow-hidden rounded-[20px] bg-[#f5f3ff] border border-[#ebe8ff] cursor-zoom-in group"
                            onClick={() => setLightboxOpen(true)}
                        >
                            <img
                                src={images[activeImg]}
                                alt={product.title}
                                className="w-full object-contain aspect-square transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                                </svg>
                            </div>
                            {images.length > 1 && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                    </button>
                                    <span className="absolute bottom-3 right-3 text-[11px] text-white/90 bg-black/40 rounded-full px-2.5 py-0.5 font-medium">
                                        {activeImg + 1} / {images.length}
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
                                    className="w-7 h-7 flex-shrink-0 rounded-full border border-[#e0daf7] flex items-center justify-center hover:bg-[#f5f3ff] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <div className="flex gap-2 flex-1 overflow-hidden">
                                    {images.slice(thumbOffset, thumbOffset + THUMBNAIL_VISIBLE).map((img, relIdx) => {
                                        const absIdx = thumbOffset + relIdx;
                                        return (
                                            <button
                                                key={absIdx}
                                                onClick={() => handleThumbClick(absIdx)}
                                                className={`flex-1 aspect-square rounded-[10px] overflow-hidden border-2 transition-all ${activeImg === absIdx ? "border-[#6B5CE7]" : "border-transparent hover:border-[#c4bbff]"}`}
                                            >
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setThumbOffset((o) => Math.min(maxThumbOffset, o + 1))}
                                    disabled={thumbOffset >= maxThumbOffset}
                                    className="w-7 h-7 flex-shrink-0 rounded-full border border-[#e0daf7] flex items-center justify-center hover:bg-[#f5f3ff] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="mt-3 flex gap-2 flex-wrap">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleThumbClick(i)}
                                        className={`w-[68px] h-[68px] rounded-[10px] overflow-hidden border-2 transition-all flex-shrink-0 ${activeImg === i ? "border-[#6B5CE7]" : "border-transparent hover:border-[#c4bbff]"}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 상품 정보 */}
                    <div className="flex-1 min-w-0 max-w-[460px]">
                        <Link href="/store" className="inline-block text-[13px] text-[#6B5CE7] hover:underline mb-2">
                            {product.category}
                        </Link>

                        <h1 className="text-[22px] font-bold text-[#111018] leading-snug">{product.title}</h1>

                        <p className="mt-4 text-[30px] font-extrabold text-[#111018]">
                            {product.soldout ? "품절" : product.price}
                        </p>

                        <div className="my-5 border-t border-[#f0eeff]" />

                        {(size || material) && (
                            <div className="mb-5 rounded-[14px] border border-[#ebe8ff] bg-[#fbfaff] px-4 py-3.5">
                                <p className="mb-2.5 text-[13px] font-bold text-[#111018]">상품정보</p>
                                <dl className="space-y-2 text-[13px]">
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
                            <table className="w-full text-[13px] mb-5">
                                <tbody>
                                    {visibleSpecs.map((row, i) => (
                                        <tr key={i} className="border-b border-[#f5f3ff] last:border-0">
                                            <td className="py-2.5 pr-4 text-[#aaa] whitespace-nowrap w-[90px] align-top leading-snug">{row.label}</td>
                                            <td className={`py-2.5 font-semibold leading-snug ${row.highlight ? "text-[#6B5CE7]" : row.warn ? "text-[#c05c00]" : "text-[#222]"}`}>
                                                {row.value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {showOptionSelect && (
                            <div className="mb-5">
                                <label htmlFor="product-option" className="mb-2 block text-[13px] font-semibold text-[#666]">
                                    옵션 선택
                                </label>
                                <div className="relative">
                                    <select
                                        id="product-option"
                                        value={selectedOption}
                                        onChange={(e) => setSelectedOption(e.target.value)}
                                        disabled={product.soldout || optionValues.length === 0}
                                        className="h-[46px] w-full appearance-none rounded-[12px] border border-[#e0daf7] bg-white px-4 pr-10 text-[13px] font-semibold text-[#222] outline-none transition-colors hover:border-[#c4bbff] focus:border-[#6B5CE7] disabled:cursor-not-allowed disabled:bg-[#f5f3ff] disabled:text-[#aaa]"
                                    >
                                        <option value="">
                                            {optionValues.length > 0 ? "옵션을 선택해주세요" : "옵션 정보를 불러오지 못했습니다"}
                                        </option>
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
                            </div>
                        )}

                        {!product.soldout && (
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-[13px] text-[#aaa] w-[90px]">수량</span>
                                <div className="flex items-center border border-[#e0daf7] rounded-xl overflow-hidden">
                                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-[#f5f3ff] transition-colors text-[#555]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
                                    </button>
                                    <span className="w-10 text-center text-[15px] font-bold text-[#111]">{qty}</span>
                                    <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-[#f5f3ff] transition-colors text-[#555]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 예약 경고 배너 — 예약 상품에 안내 문구가 있을 때만 */}
                        {isReservation && noticelines.length > 0 && (
                            <div className="mb-4 rounded-[12px] border border-[#ffd06e] bg-[#fffcf0] px-4 py-3.5 flex gap-3 items-start">
                                <svg className="flex-shrink-0 mt-[2px]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c08000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <div className="text-[12px] text-[#7a5500] leading-relaxed space-y-0.5">
                                    <p className="font-bold text-[#a06000] mb-1">예약 상품 안내</p>
                                    {noticelines.map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button disabled={product.soldout} className="flex-1 h-[52px] rounded-[14px] bg-[#6B5CE7] text-white text-[15px] font-bold hover:bg-[#5a4dd6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                {product.soldout ? "품절" : "구매하기"}
                            </button>
                            <button disabled={product.soldout} className="h-[52px] px-5 rounded-[14px] border-2 border-[#6B5CE7] text-[#6B5CE7] text-[14px] font-bold hover:bg-[#f5f3ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                                장바구니
                            </button>
                        </div>
                    </div>
                </div>

                {/* 탭 */}
                <div className="mt-16">
                    <div className="flex border-b border-[#ebe8ff]">
                        {TABS.map((tab, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`px-7 py-3.5 text-[14px] font-semibold transition-colors relative ${activeTab === i ? "text-[#6B5CE7]" : "text-[#bbb] hover:text-[#888]"}`}
                            >
                                {tab}
                                {activeTab === i && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6B5CE7] rounded-t-full" />}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 rounded-[20px] border border-[#ebe8ff] bg-[#faf9ff] p-10">
                        {activeTab === 0 && (
                            <div className="space-y-7">
                                {RETURN_POLICY.map((s, i) => (
                                    <div key={i}>
                                        <h3 className="text-[14px] font-bold text-[#222] flex items-center gap-2 mb-2.5">
                                            <span className="w-1 h-[18px] rounded-full bg-[#6B5CE7] inline-block flex-shrink-0" />{s.title}
                                        </h3>
                                        <p className="text-[13px] text-[#666] leading-relaxed whitespace-pre-line pl-4">{s.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 1 && (
                            <div className="space-y-7">
                                {NOTICES.map((s, i) => (
                                    <div key={i}>
                                        <h3 className="text-[14px] font-bold text-[#222] flex items-center gap-2 mb-2.5">
                                            <span className="w-1 h-[18px] rounded-full bg-[#6B5CE7] inline-block flex-shrink-0" />{s.title}
                                        </h3>
                                        <p className="text-[13px] text-[#666] leading-relaxed pl-4">{s.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 2 && <p className="text-[13px] text-[#999]">판매자 정보가 없습니다.</p>}
                    </div>
                </div>

                {/* 연관상품 */}
                {related.length > 0 && (
                    <section className="mt-20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[22px] font-bold text-[#111018]">연관상품</h2>
                            <div className="flex items-center gap-3">
                                <Link href="/store" className="text-[13px] text-[#6B5CE7] hover:underline flex items-center gap-1">
                                    전체보기
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                </Link>
                                {showSwiper && (
                                    <div className="flex gap-2 ml-2">
                                        <button onClick={() => scrollRelated("left")} className="w-8 h-8 rounded-full border border-[#e0daf7] flex items-center justify-center hover:bg-[#f5f3ff] transition-colors">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                        </button>
                                        <button onClick={() => scrollRelated("right")} className="w-8 h-8 rounded-full border border-[#e0daf7] flex items-center justify-center hover:bg-[#f5f3ff] transition-colors">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                        </button>
                                    </div>
                                )}
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
