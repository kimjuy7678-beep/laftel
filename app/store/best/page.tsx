// app/store/best/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import StoreProductCard from "@/components/store/StoreProductCard";
import StoreSidebar from "@/components/store/StoreSliaebar";
import { BEST_PRODUCT_LIMIT, BEST_PRODUCTS } from "@/lib/storeBestRanking";

const ITEMS_PER_PAGE = 20;
const PAGE_GROUP = 5;
const BEST_RANK_BY_ID = new Map(BEST_PRODUCTS.map((product, index) => [product.productId, index + 1]));

const COLOR_OPTIONS = [
    { label: "보라", value: "purple", hex: "#7865ff" },
    { label: "노랑", value: "yellow", hex: "#FFE135" },
    { label: "핑크", value: "pink", hex: "#FF7EB3" },
    { label: "브라운", value: "brown", hex: "#8B5E3C" },
    { label: "민트", value: "mint", hex: "#3DDBA4" },
    { label: "빨강", value: "red", hex: "#FF2D55" },
];

function parsePrice(s: string) { return parseInt(s.replace(/[^0-9]/g, ""), 10) || 0; }
function Inner({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
    return <div id={id} className={`mx-auto w-full max-w-[1770px] px-[75px] ${className}`}>{children}</div>;
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
    const groupIndex = Math.floor((current - 1) / PAGE_GROUP);
    const groupStart = groupIndex * PAGE_GROUP + 1;
    const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, total);
    const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
    const hasPrevGroup = groupStart > 1;
    const hasNextGroup = groupEnd < total;

    const handleChange = (p: number) => {
        onChange(p);
        document.getElementById("store-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="mt-16 flex items-center justify-center gap-2">
            <button onClick={() => handleChange(Math.max(1, current - 1))} disabled={current === 1}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {hasPrevGroup && <button onClick={() => handleChange(groupStart - 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            {pages.map((p) => (
                <button key={p} onClick={() => handleChange(p)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {hasNextGroup && <button onClick={() => handleChange(groupEnd + 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            <button onClick={() => handleChange(Math.min(total, current + 1))} disabled={current === total}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

const PRICE_MIN = 0;
const PRICE_MAX = 350000;

function FilterDropdown({ open, priceRange, onPriceRange, selectedColor, onColor, onReset }: {
    open: boolean; priceRange: [number, number]; onPriceRange: (v: [number, number]) => void;
    selectedColor: string | null; onColor: (v: string | null) => void; onReset: () => void;
}) {
    const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
    const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => { onPriceRange([Math.min(Number(e.target.value), priceRange[1] - 1000), priceRange[1]]); };
    const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => { onPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 1000)]); };
    if (!open) return null;
    return (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-[16px] border border-[#e2ddf5] bg-white p-5 shadow-[0_8px_32px_rgba(30,24,70,0.14)]">
            <p className="text-[13px] font-semibold text-[#16121f]">가격별로 보기</p>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-[#ddd8f4] bg-[#faf9ff] text-[11px] font-medium text-[#3d3755]">₩{priceRange[0].toLocaleString()}</div>
                <span className="text-[10px] text-[#c0bcd0]">—</span>
                <div className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-[#ddd8f4] bg-[#faf9ff] text-[11px] font-medium text-[#3d3755]">₩{priceRange[1].toLocaleString()}</div>
            </div>
            <div className="relative mt-4 h-[6px] w-full">
                <div className="absolute inset-0 rounded-full bg-[#e2ddf5]" />
                <div className="absolute h-full rounded-full bg-[#7865ff]" style={{ left: `${pct(priceRange[0])}%`, right: `${100 - pct(priceRange[1])}%` }} />
                <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={1000} value={priceRange[0]} onChange={handleMin}
                    className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7865ff] [&::-webkit-slider-thumb]:cursor-pointer" />
                <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={1000} value={priceRange[1]} onChange={handleMax}
                    className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7865ff] [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
            <div className="my-4 border-t border-[#f0edf8]" />
            <p className="text-[13px] font-semibold text-[#16121f]">색상</p>
            <div className="mt-3 flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                    <button key={c.value} onClick={() => onColor(selectedColor === c.value ? null : c.value)} title={c.label}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 ${selectedColor === c.value ? "ring-2 ring-offset-2 ring-[#7865ff]" : ""}`}
                        style={{ backgroundColor: c.hex }}>
                        {selectedColor === c.value && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                    </button>
                ))}
            </div>
            <button onClick={onReset} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#ddd8f4] py-2 text-[12px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                초기화
            </button>
        </div>
    );
}

export default function BestPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 300000]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    const filtered = BEST_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchColor = !selectedColor || p.title.toLowerCase().includes(COLOR_OPTIONS.find(c => c.value === selectedColor)?.label.toLowerCase() ?? "");
        return matchSearch && matchPrice && matchColor;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
        if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const handleReset = () => { setPriceRange([0, 300000]); setSelectedColor(null); };
    const activeFilterCount = [priceRange[0] > 0 || priceRange[1] < 300000, selectedColor !== null].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-white pb-20">
            <StoreSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="border-b border-[#ebe8ff] bg-white py-3">
                <Inner>
                    <button onClick={() => setSidebarOpen(true)}
                        className="flex items-center gap-2 text-[14px] text-[#3d3755] transition hover:text-[#7865ff]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                        전체 카테고리
                    </button>
                </Inner>
            </div>

            {/* 헤더 */}
            <div className="border-b border-[#ebe8ff] bg-[#f8f6ff] py-10">
                <Inner>
                    <p className="mb-4 text-[12px] text-[#9b94b2]">
                        <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                        <span className="mx-1.5">›</span>
                        <span className="font-medium text-[#7865ff]">BEST</span>
                    </p>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-[32px] font-bold text-[#16121f]">BEST 굿즈</h1>
                                <span className="rounded-full bg-[#7865ff] px-3 py-1 text-[12px] font-bold text-white">TOP {BEST_PRODUCT_LIMIT}</span>
                            </div>
                            <p className="mt-1 text-[14px] text-[#9b94b2]">가장 많이 사랑받는 인기 굿즈 모음이에요.</p>
                        </div>
                        <div className="flex h-[44px] w-[340px] items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_4px_14px_rgba(30,24,70,0.08)]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#9b94b2]">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#242130] outline-none placeholder:text-[#b0aabb]"
                                placeholder="찾으시는 상품을 검색하세요" value={search} onChange={(e) => setSearch(e.target.value)} />
                            {search && (
                                <button onClick={() => setSearch("")} className="text-[#b0aabb] hover:text-[#7865ff]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </Inner>
            </div>


            {/* TOP 3 하이라이트 */}
            {page === 1 && search === "" && activeFilterCount === 0 && (
                <Inner className="mt-8">
                    <div className="flex gap-4">
                        {[1, 0, 2].map((i) => {
                            const p = BEST_PRODUCTS[i];
                            const isFirst = i === 0;
                            const medals = [
                                { emoji: "🥇", color: "#FFB800", bg: "#FFF8E1", label: "1st", shadow: "rgba(255,184,0,0.3)" },
                                { emoji: "🥈", color: "#9EA7B3", bg: "#F5F6F8", label: "2nd", shadow: "rgba(158,167,179,0.3)" },
                                { emoji: "🥉", color: "#C87D4A", bg: "#FDF3EC", label: "3rd", shadow: "rgba(200,125,74,0.3)" },
                            ];
                            const medal = medals[i];
                            return (
                                <Link key={p.productId} href={`/store/${p.productId}`}
                                    className={`group relative flex-1 overflow-hidden rounded-[20px] border transition-all duration-300 ${isFirst
                                        ? "border-[#7865ff]/30 shadow-[0_8px_32px_rgba(120,101,255,0.12)] hover:border-[#7865ff] hover:shadow-[0_12px_40px_rgba(120,101,255,0.25)] hover:scale-[1.01]"
                                        : "border-[#e2ddf5] hover:border-[#7865ff]/50 hover:shadow-[0_8px_24px_rgba(120,101,255,0.15)] hover:scale-[1.01]"} bg-white`}>

                                    {/* 상단 배너 */}
                                    <div className={`flex items-center gap-4 px-5 py-4 ${isFirst ? "bg-[#f0eeff]" : "bg-[#f8f7fc]"}`}>
                                        {/* 메달 */}
                                        <div className="flex flex-col items-center justify-center rounded-[14px] px-3 py-2.5 shrink-0"
                                            style={{ backgroundColor: medal.bg, boxShadow: `0 4px 12px ${medal.shadow}` }}>
                                            <span className="text-[28px] leading-none">{medal.emoji}</span>
                                            <span className="mt-1 text-[11px] font-black tracking-widest" style={{ color: medal.color }}>{medal.label}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-[#9b94b2]">{p.category}</p>
                                            <p className={`mt-0.5 font-bold text-[#16121f] line-clamp-2 ${isFirst ? "text-[15px]" : "text-[13px]"}`}>{p.title}</p>
                                            <p className={`mt-1 font-extrabold ${isFirst ? "text-[17px] text-[#7865ff]" : "text-[14px] text-[#7865ff]"}`}>{p.price}</p>
                                        </div>
                                    </div>

                                    {/* 이미지 */}
                                    <div className={`overflow-hidden bg-[#f3f1ff] ${isFirst ? "aspect-[3/2]" : "aspect-[4/3]"}`}>
                                        {p.thumbnail && (
                                            <img
                                                src={p.thumbnail}
                                                alt={p.title}
                                                className="h-full w-full object-cover transition-opacity duration-300"
                                                onMouseEnter={(e) => {
                                                    const next = p.detailImages?.[1];
                                                    if (next) (e.target as HTMLImageElement).src = next;
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.target as HTMLImageElement).src = p.thumbnail;
                                                }}
                                            />
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </Inner>
            )}

            {/* 정렬 */}
            <Inner id="store-products" className="mt-8">
                <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#6b647a]">총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품</p>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select value={sort} onChange={(e) => setSort(e.target.value)}
                                className="h-[38px] appearance-none rounded-[8px] border border-[#ddd8f4] bg-white pl-3 pr-8 text-[13px] text-[#3d3755] outline-none focus:border-[#7865ff] cursor-pointer">
                                <option>인기순</option><option>신상품순</option><option>낮은 가격순</option><option>높은 가격순</option>
                            </select>
                            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                        </div>
                        <div className="relative">
                            <button onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition ${activeFilterCount > 0 || filterOpen ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]" : "border-[#ddd8f4] bg-white text-[#3d3755] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                <img src="/store/product_list/lyra-icon-Icon_filter_hor_outline.png" alt=""
                                    className="h-[15px] w-[15px] object-contain opacity-50" />
                                필터
                                {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">{activeFilterCount}</span>}
                            </button>
                            <FilterDropdown open={filterOpen} priceRange={priceRange} onPriceRange={setPriceRange}
                                selectedColor={selectedColor} onColor={setSelectedColor} onReset={handleReset} />
                        </div>
                    </div>
                </div>
            </Inner>

            {/* 상품 그리드 — 순위 배지 포함 */}
            <Inner className="mt-6">
                {paginated.length === 0 ? (
                    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[15px] text-[#9b94b2]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        검색 결과가 없어요.
                        {(search || activeFilterCount > 0) && (
                            <button onClick={() => { setSearch(""); handleReset(); }} className="text-[13px] text-[#7865ff] underline">필터 초기화</button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 xl:grid-cols-5">
                        {paginated.map((product) => {
                            const rank = BEST_RANK_BY_ID.get(product.productId);
                            return (
                                <div key={product.productId} className="relative">
                                    {rank && rank <= BEST_PRODUCT_LIMIT && (
                                        <div className={`absolute left-2 top-2 z-10 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow ${rank <= 3 ? "bg-[#7865ff]" : "bg-[#b0aabb]"}`}>
                                            {rank}
                                        </div>
                                    )}
                                    <StoreProductCard product={product} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
            </Inner>
        </div>
    );
}
