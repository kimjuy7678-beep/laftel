"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";
import StoreSidebar from "@/components/store/StoreSliaebar";
import StoreCategoryToggle from "@/components/store/StoreCategoryToggle";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";
import FilterDropdown from "@/components/store/FilterDropdown";
import SortDropdown, { sortProducts } from "@/components/store/SortDropdown";

const ALL_PRODUCTS = products as StoreProduct[];
const ITEMS_PER_PAGE = 20;
const PAGE_GROUP = 5;
const SERIES_LIST = ["전체", ...Array.from(new Set(ALL_PRODUCTS.map((p) => p.category)))];

function parsePrice(s: string) { return parseInt(s.replace(/[^0-9]/g, ""), 10) || 0; }
function normalizeSearch(value: string) {
    return value.toLowerCase().replace(/[\s()[\]{}·.,/\\|:;'"!?_\-+~]+/g, "");
}

function matchesSearch(product: StoreProduct, search: string) {
    const query = normalizeSearch(search);
    if (!query) return true;
    const text = normalizeSearch([
        product.title,
        product.category,
        ...(product.productdetail ?? []),
    ].join(" "));
    return text.includes(query);
}

function Inner({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
    return <div id={id} className={`mx-auto w-full max-w-[1770px] px-4 sm:px-8 lg:px-[75px] ${className}`}>{children}</div>;
}

function SeriesTab({ selected, onSelect }: { selected: string; onSelect: (s: string) => void }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
        setScrollLeft(scrollRef.current?.scrollLeft || 0);
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - (scrollRef.current.offsetLeft || 0);
        scrollRef.current.scrollLeft = scrollLeft - (x - startX);
    };
    const onMouseUp = () => setIsDragging(false);
    const scrollBy = (dir: "left" | "right") => {
        scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
    };

    return (
        <div className="relative flex items-center gap-2">
            <button onClick={() => scrollBy("left")}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e2ddf5] bg-white text-[#7865ff] shadow-sm transition hover:bg-[#f0eeff] sm:flex">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div ref={scrollRef}
                className="flex flex-1 items-center gap-1 overflow-x-auto pb-1 cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: "none" }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                {SERIES_LIST.map((s) => (
                    <button key={s} onClick={() => onSelect(s)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${selected === s
                            ? "bg-[#7865ff] text-white shadow-[0_2px_8px_rgba(120,101,255,0.3)]"
                            : "bg-white text-[#6b647a] border border-[#e2ddf5] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                        {s}
                    </button>
                ))}
            </div>
            <button onClick={() => scrollBy("right")}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e2ddf5] bg-white text-[#7865ff] shadow-sm transition hover:bg-[#f0eeff] sm:flex">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
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
        <div className="mt-12 flex flex-wrap items-center justify-center gap-1.5 sm:mt-16 sm:gap-2">
            <button onClick={() => handleChange(Math.max(1, current - 1))} disabled={current === 1}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed sm:h-10 sm:w-10">
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
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed sm:h-10 sm:w-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

const PRICE_INITIAL: [number, number] = [0, 300000];

function SeriesPageInner({ initialSeries, initialSearch }: { initialSeries: string; initialSearch: string }) {
    const { user } = useAuthStore();
    const [selectedSeries, setSelectedSeries] = useState(initialSeries);
    const [search, setSearch] = useState(initialSearch);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_INITIAL);
    const [onlyInStock, setOnlyInStock] = useState(false);
    const [onlyReserve, setOnlyReserve] = useState(false);

    const filtered = ALL_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const isReserve = p.title.includes("[예약]");
        const matchSeries = selectedSeries === "전체" || p.category === selectedSeries;
        const matchSearch = matchesSearch(p, search);
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchStock = !onlyInStock || !p.soldout;
        const matchReserve = !onlyReserve || isReserve;
        return matchSeries && matchSearch && matchPrice && matchStock && matchReserve;
    });

    // ✅ sortProducts 컴포넌트 사용
    const sorted = sortProducts(filtered, sort);

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => {
        if (user) console.log("👤 [Auth]", { uid: user.uid, name: user.name, email: user.email, membership: user.membership, points: user.points });
        else console.log("👻 [Auth] 비로그인 상태");
    }, [user]);

    const handleReset = () => {
        setPriceRange(PRICE_INITIAL);
        setOnlyInStock(false);
        setOnlyReserve(false);
        setPage(1);
    };

    const activeFilterCount = [
        priceRange[0] > PRICE_INITIAL[0] || priceRange[1] < PRICE_INITIAL[1],
        onlyInStock,
        onlyReserve,
    ].filter(Boolean).length;

    const handleSeriesSelect = (s: string) => {
        setSelectedSeries(s);
        setPage(1);
        document.getElementById("series-tab")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleSearchChange = (value: string) => { setSearch(value); setPage(1); };
    const handleClearSearch = () => { setSearch(""); setPage(1); };

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
                        <span className="font-medium text-[#7865ff]">시리즈별</span>
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-[24px] font-bold text-[#16121f] sm:text-[32px]">시리즈 별</h1>
                            <p className="mt-1 text-[15px] text-[#9b94b2]">좋아하는 애니메이션 굿즈를 찾아보세요!</p>
                        </div>
                        <div className="flex h-[44px] w-full items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_4px_14px_rgba(30,24,70,0.08)] sm:w-[340px]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#9b94b2]">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#242130] outline-none placeholder:text-[#b0aabb]"
                                placeholder="찾으시는 상품을 검색하세요"
                            />
                            {search && (
                                <button onClick={handleClearSearch} className="text-[#b0aabb] hover:text-[#7865ff]" aria-label="검색어 지우기">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </Inner>
            </div>

            <div id="series-tab" className="sticky top-0 z-20 border-b border-[#ebe8ff] bg-[#f8f6ff] py-4">
                <Inner>
                    <SeriesTab selected={selectedSeries} onSelect={handleSeriesSelect} />
                </Inner>
            </div>

            <Inner id="store-products" className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-[14px] text-[#6b647a]">
                        총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품
                        {selectedSeries !== "전체" && <span className="ml-2 font-semibold text-[#7865ff]">· {selectedSeries}</span>}
                        {search && <span className="ml-2 font-semibold text-[#7865ff]">· {search}</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* ✅ SortDropdown 컴포넌트 연결 */}
                        <SortDropdown value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
                        <div className="relative">
                            <button onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition ${activeFilterCount > 0 || filterOpen ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]" : "border-[#ddd8f4] bg-white text-[#3d3755] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                <img src="/store/product_list/lyra-icon-Icon_filter_hor_outline.png" alt=""
                                    className="h-[15px] w-[15px] object-contain opacity-50" />
                                필터
                                {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">{activeFilterCount}</span>}
                            </button>
                            <FilterDropdown
                                onClose={() => setFilterOpen(false)}
                                open={filterOpen}
                                priceRange={priceRange}
                                onPriceRange={(v) => { setPriceRange(v); setPage(1); }}
                                onlyInStock={onlyInStock}
                                onOnlyInStock={(v) => { setOnlyInStock(v); setPage(1); }}
                                onlyReserve={onlyReserve}
                                onOnlyReserve={(v) => { setOnlyReserve(v); setPage(1); }}
                                onReset={handleReset}
                            />
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
                        {(activeFilterCount > 0 || search) && (
                            <button onClick={() => { handleReset(); handleClearSearch(); }} className="text-[13px] text-[#7865ff] underline">검색/필터 초기화</button>
                        )}
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

function SeriesPageFromParams() {
    const searchParams = useSearchParams();
    const initialSeries = searchParams.get("series") ?? "전체";
    const initialSearch = searchParams.get("search") ?? "";

    return (
        <SeriesPageInner
            key={`${initialSeries}::${initialSearch}`}
            initialSeries={initialSeries}
            initialSearch={initialSearch}
        />
    );
}

export default function SeriesPage() {
    return (
        <Suspense fallback={null}>
            <SeriesPageFromParams />
        </Suspense>
    );
}