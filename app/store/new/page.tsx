// app/store/new/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";
import StoreSidebar from "@/components/store/StoreSliaebar";

const ALL_PRODUCTS = products as StoreProduct[];
const ITEMS_PER_PAGE = 16;
const PAGE_GROUP = 5;

const COLOR_OPTIONS = [
    { label: "보라", value: "purple", hex: "#7865ff" },
    { label: "노랑", value: "yellow", hex: "#FFE135" },
    { label: "핑크", value: "pink", hex: "#FF7EB3" },
    { label: "브라운", value: "brown", hex: "#8B5E3C" },
    { label: "민트", value: "mint", hex: "#3DDBA4" },
    { label: "빨강", value: "red", hex: "#FF2D55" },
];

function parsePrice(priceStr: string): number {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
}

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto w-full max-w-[1770px] px-[75px] ${className}`}>{children}</div>;
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
    const groupIndex = Math.floor((current - 1) / PAGE_GROUP);
    const groupStart = groupIndex * PAGE_GROUP + 1;
    const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, total);
    const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
    return (
        <div className="mt-16 flex items-center justify-center gap-2">
            <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {groupStart > 1 && <button onClick={() => onChange(groupStart - 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            {pages.map((p) => (
                <button key={p} onClick={() => onChange(p)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {groupEnd < total && <button onClick={() => onChange(groupEnd + 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
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

// 랜덤 100개 — 컴포넌트 마운트 시 한 번만 섞음
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const NEW_PRODUCTS = shuffle(ALL_PRODUCTS).slice(0, 100);

export default function NewPage() {
    const { user } = useAuthStore();




    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 300000]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    const filtered = NEW_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = p.soldout || (price >= priceRange[0] && price <= priceRange[1]);
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

            <div className="border-b border-[#ebe8ff] bg-[#f8f6ff] py-10">
                <Inner>
                    <p className="mb-4 text-[12px] text-[#9b94b2]">
                        <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                        <span className="mx-1.5">›</span>
                        <span className="font-medium text-[#7865ff]">신규 입고</span>
                    </p>
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-[32px] font-bold text-[#16121f]">신규 입고</h1>
                            <p className="mt-1 text-[14px] text-[#9b94b2]">새롭게 입고된 굿즈를 만나보세요!</p>
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

            <Inner className="mt-8">
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
                    <div className="grid grid-cols-4 gap-x-6 gap-y-10">
                        {paginated.map((product) => (
                            <StoreProductCard key={product.productId} product={product} />
                        ))}
                    </div>
                )}
                {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
            </Inner>
        </div>
    );
}