"use client";

import { useState } from "react";
import Link from "next/link";
import products from "@/data/store.json";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";
import StoreSidebar from "@/components/store/StoreSliaebar";
import StoreCategoryToggle from "@/components/store/StoreCategoryToggle";
import FilterDropdown from "@/components/store/FilterDropdown";
import SortDropdown, { sortProducts } from "@/components/store/SortDropdown";

const ALL_PRODUCTS = products as StoreProduct[];
const ITEMS_PER_PAGE = 20;
const PAGE_GROUP = 6;

function parsePrice(priceStr: string): number {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
}

function Inner({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
    return <div id={id} className={`mx-auto w-full max-w-[1770px] px-4 sm:px-8 lg:px-[75px] ${className}`}>{children}</div>;
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
    const groupIndex = Math.floor((current - 1) / PAGE_GROUP);
    const groupStart = groupIndex * PAGE_GROUP + 1;
    const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, total);
    const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
    const handleChange = (p: number) => {
        onChange(p);
        document.getElementById("store-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-1.5 sm:mt-16 sm:gap-2">
            <button onClick={() => handleChange(Math.max(1, current - 1))} disabled={current === 1}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {groupStart > 1 && <button onClick={() => handleChange(groupStart - 1)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]">···</button>}
            {pages.map((p) => (
                <button key={p} onClick={() => handleChange(p)}
                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-medium transition sm:h-10 sm:w-10 sm:text-[14px] ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {groupEnd < total && <button onClick={() => handleChange(groupEnd + 1)} className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]">···</button>}
            <button onClick={() => handleChange(Math.min(total, current + 1))} disabled={current === total}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

const PRICE_INITIAL: [number, number] = [0, 300000];

type CategoryPageProps = {
    title: string;
    keywords: string[];
    desc?: string;
};

export default function CategoryPageClient({ title, keywords, desc }: CategoryPageProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_INITIAL);
    const [onlyInStock, setOnlyInStock] = useState(false);
    const [onlyReserve, setOnlyReserve] = useState(false);

    const CATEGORY_PRODUCTS = ALL_PRODUCTS.filter((p) =>
        keywords.some((kw) => p.title.toLowerCase().includes(kw.toLowerCase()))
    );

    const filtered = CATEGORY_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const isReserve = p.title.includes("[예약]");
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchStock = !onlyInStock || !p.soldout;
        const matchReserve = !onlyReserve || isReserve;
        return matchSearch && matchPrice && matchStock && matchReserve;
    });

    const sorted = sortProducts(filtered, sort);
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const handleReset = () => { setPriceRange(PRICE_INITIAL); setOnlyInStock(false); setOnlyReserve(false); };
    const activeFilterCount = [
        priceRange[0] > PRICE_INITIAL[0] || priceRange[1] < PRICE_INITIAL[1],
        onlyInStock, onlyReserve,
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="border-b border-[#ebe8ff] bg-white py-3">
                <Inner>
                    <StoreCategoryToggle open={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)} />
                    <StoreSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                </Inner>
            </div>

            <div className="border-b border-[#ebe8ff] bg-[#f8f6ff] py-8 sm:py-10">
                <Inner>
                    <p className="mb-4 text-[14px] text-[#9b94b2]">
                        <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                        <span className="mx-1.5">›</span>
                        <Link href="/store/all" className="hover:text-[#7865ff]">전체굿즈</Link>
                        <span className="mx-1.5">›</span>
                        <span className="font-medium text-[#7865ff]">{title}</span>
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-[24px] font-bold text-[#16121f] sm:text-[32px]">{title}</h1>
                            {desc && <p className="mt-1 text-[14px] text-[#9b94b2]">{desc}</p>}
                        </div>
                        <div className="flex h-[44px] w-full items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_4px_14px_rgba(30,24,70,0.08)] sm:w-[340px]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#9b94b2]">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#242130] outline-none placeholder:text-[#b0aabb]"
                                placeholder="찾으시는 상품을 검색하세요"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="text-[#b0aabb] hover:text-[#7865ff]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </Inner>
            </div>

            <Inner id="store-products" className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-[14px] text-[#6b647a]">총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품</p>
                    <div className="flex items-center gap-2">
                        <SortDropdown value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
                        <div className="relative">
                            <button onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-2 rounded-[10px] border px-3 text-[13px] font-semibold transition ${activeFilterCount > 0 || filterOpen ? "border-[#7865ff]/50 bg-[#f0eeff] text-[#7865ff]" : "border-[#ddd8f4] bg-white text-[#7865ff] hover:border-[#7865ff]/50 hover:bg-[#f5f3ff]"}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="7" y1="12" x2="17" y2="12" />
                                    <line x1="10" y1="18" x2="14" y2="18" />
                                </svg>
                                {filterOpen ? "필터 닫기" : "필터 열기"}
                                {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">{activeFilterCount}</span>}
                            </button>
                            <FilterDropdown
                                open={filterOpen}
                                onClose={() => setFilterOpen(false)}
                                priceRange={priceRange}
                                onPriceRange={setPriceRange}
                                onlyInStock={onlyInStock}
                                onOnlyInStock={setOnlyInStock}
                                onlyReserve={onlyReserve}
                                onOnlyReserve={setOnlyReserve}
                                onReset={handleReset}
                            />
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
