"use client";

import { useState } from "react";
import Link from "next/link";
import StoreProductCard from "@/components/store/StoreProductCard";
import StoreSidebar from "@/components/store/StoreSliaebar";
import StoreCategoryToggle from "@/components/store/StoreCategoryToggle";
import FilterDropdown from "@/components/store/FilterDropdown";
import { BEST_PRODUCT_LIMIT, BEST_PRODUCTS } from "@/lib/storeBestRanking";

const ITEMS_PER_PAGE = 20;
const PAGE_GROUP = 6;
const BEST_RANK_BY_ID = new Map(BEST_PRODUCTS.map((product, index) => [product.productId, index + 1]));

function parsePrice(s: string) { return parseInt(s.replace(/[^0-9]/g, ""), 10) || 0; }
function Inner({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
    return <div id={id} className={`mx-auto w-full max-w-[1770px] px-4 sm:px-8 lg:px-[75px] ${className}`}>{children}</div>;
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
        window.setTimeout(() => {
            document.getElementById("store-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
    };
    return (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-1.5 sm:mt-16 sm:gap-2">
            <button onClick={() => handleChange(Math.max(1, current - 1))} disabled={current === 1}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {hasPrevGroup && <button onClick={() => handleChange(groupStart - 1)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]">···</button>}
            {pages.map((p) => (
                <button key={p} onClick={() => handleChange(p)}
                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-medium transition sm:h-10 sm:w-10 sm:text-[14px] ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {hasNextGroup && <button onClick={() => handleChange(groupEnd + 1)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]">···</button>}
            <button onClick={() => handleChange(Math.min(total, current + 1))} disabled={current === total}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

export default function BestPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 300000]);
    const [onlyInStock, setOnlyInStock] = useState(false);

    const filtered = BEST_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchStock = !onlyInStock || !p.soldout;
        return matchSearch && matchPrice && matchStock;
    });

    const sorted = filtered; // 베스트 순위 고정
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const handleReset = () => { setPriceRange([0, 300000]); setOnlyInStock(false); };
    const activeFilterCount = [priceRange[0] > 0 || priceRange[1] < 300000, onlyInStock].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="border-b border-[#ebe8ff] bg-white py-3">
                <Inner>
                    <StoreCategoryToggle open={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)} />
                    <StoreSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                </Inner>
            </div>

            {/* 헤더 */}
            <div className="border-b border-[#ebe8ff] bg-[#f8f6ff] py-8 sm:py-10">
                <Inner>
                    <p className="mb-4 text-[14px] text-[#9b94b2]">
                        <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                        <span className="mx-1.5">›</span>
                        <span className="font-medium text-[#7865ff]">BEST</span>
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <h1 className="text-[24px] font-bold text-[#16121f] sm:text-[32px]">BEST 굿즈</h1>
                                <span className="rounded-full bg-[#7865ff] px-3 py-1 text-[12px] font-bold text-white">TOP {BEST_PRODUCT_LIMIT}</span>
                            </div>
                            <p className="mt-1 text-[14px] text-[#9b94b2]">가장 많이 사랑받는 인기 굿즈 모음이에요.</p>
                        </div>
                        <div className="flex h-[44px] w-full items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_4px_14px_rgba(30,24,70,0.08)] sm:w-[340px]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#9b94b2]">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#242130] outline-none placeholder:text-[#b0aabb]"
                                placeholder="찾으시는 상품을 검색하세요" value={search} onChange={(e) => setSearch(e.target.value)} />
                            {search && <button onClick={() => setSearch("")} className="text-[#b0aabb] hover:text-[#7865ff]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>}
                        </div>
                    </div>
                </Inner>
            </div>

            {page === 1 && search === "" && (
                <Inner className="mt-8">
                    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
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
                                    className={`group relative w-[260px] shrink-0 snap-start overflow-hidden rounded-[16px] border transition-all duration-300 sm:w-auto sm:rounded-[20px] ${isFirst
                                        ? "border-[#7865ff]/30 shadow-[0_8px_32px_rgba(120,101,255,0.12)] hover:border-[#7865ff] hover:shadow-[0_12px_40px_rgba(120,101,255,0.25)] hover:scale-[1.01]"
                                        : "border-[#e2ddf5] hover:border-[#7865ff]/50 hover:shadow-[0_8px_24px_rgba(120,101,255,0.15)] hover:scale-[1.01]"} bg-white`}>

                                    {/* 상단 배너 */}
                                    <div className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 ${isFirst ? "bg-[#f0eeff]" : "bg-[#f8f7fc]"}`}>
                                        {/* 메달 */}
                                        <div className="flex flex-col items-center justify-center rounded-[14px] px-3 py-2.5 shrink-0"
                                            style={{ backgroundColor: medal.bg, boxShadow: `0 4px 12px ${medal.shadow}` }}>
                                            <span className="text-[24px] leading-none sm:text-[28px]">{medal.emoji}</span>
                                            <span className="mt-1 text-[11px] font-black tracking-widest" style={{ color: medal.color }}>{medal.label}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-[#9b94b2]">{p.category}</p>
                                            <p className={`mt-0.5 font-bold text-[#16121f] line-clamp-2 ${isFirst ? "text-[15px]" : "text-[13px]"}`}>{p.title}</p>
                                            <p className={`mt-1 font-extrabold ${isFirst ? "text-[17px] text-[#7865ff]" : "text-[14px] text-[#7865ff]"}`}>{p.price}</p>
                                        </div>
                                    </div>
                                    <div className={`overflow-hidden bg-[#f3f1ff] ${isFirst ? "aspect-[3/2]" : "aspect-[4/3]"}`}>
                                        {p.thumbnail && (
                                            <img src={p.thumbnail} alt={p.title} className="h-full w-full object-cover transition-opacity duration-300"
                                                onMouseEnter={(e) => { const next = p.detailImages?.[1]; if (next) (e.target as HTMLImageElement).src = next; }}
                                                onMouseLeave={(e) => { (e.target as HTMLImageElement).src = p.thumbnail; }} />
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </Inner>
            )}

            <Inner id="store-products" className="mt-8">
                <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#6b647a]">총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품</p>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition ${activeFilterCount > 0 || filterOpen ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]" : "border-[#ddd8f4] bg-white text-[#3d3755] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                <img src="/store/product_list/lyra-icon-Icon_filter_hor_outline.png" alt="" className="h-[15px] w-[15px] object-contain opacity-50" />
                                필터
                                {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">{activeFilterCount}</span>}
                            </button>
                            <FilterDropdown onClose={() => setFilterOpen(false)} open={filterOpen} priceRange={priceRange} onPriceRange={setPriceRange} onlyInStock={onlyInStock} onOnlyInStock={setOnlyInStock} onReset={handleReset} />
                        </div>
                    </div>
                </div>
            </Inner>

            <Inner className="mt-6">
                {paginated.length === 0 ? (
                    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[15px] text-[#9b94b2]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        검색 결과가 없어요.
                        {(search || activeFilterCount > 0) && <button onClick={() => { setSearch(""); handleReset(); }} className="text-[13px] text-[#7865ff] underline">필터 초기화</button>}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-10">
                        {paginated.map((product) => {
                            const rank = BEST_RANK_BY_ID.get(product.productId);
                            return (
                                <div key={product.productId} className="relative">
                                    {rank && rank <= BEST_PRODUCT_LIMIT && (
                                        <div className={`absolute left-2 top-2 z-10 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow ${rank <= 3 ? "bg-[#7865ff]" : "bg-[#b0aabb]"}`}>{rank}</div>
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
