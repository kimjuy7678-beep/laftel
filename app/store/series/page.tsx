"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";
import StoreSidebar from "@/components/store/StoreSliaebar";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";
import FilterDropdown from "@/components/store/FilterDropdown";

type SeriesProduct = StoreProduct & { productdetail?: string[] };

const ALL_PRODUCTS = products as SeriesProduct[];
const STORE_PRODUCTS = ALL_PRODUCTS.filter((p) => !p.title.includes("[예약]"));
const ITEMS_PER_PAGE = 16;
const PAGE_GROUP = 5;
const SERIES_LIST = ["전체", ...Array.from(new Set(STORE_PRODUCTS.map((p) => p.category)))];

function parsePrice(s: string) { return parseInt(s.replace(/[^0-9]/g, ""), 10) || 0; }

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto w-full max-w-[1680px] px-[75px] ${className}`}>{children}</div>;
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
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ddf5] bg-white text-[#7865ff] shadow-sm transition hover:bg-[#f0eeff]">
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
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#e2ddf5] bg-white text-[#7865ff] shadow-sm transition hover:bg-[#f0eeff]">
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
    return (
        <div className="mt-16 flex items-center justify-center gap-2">
            <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {hasPrevGroup && <button onClick={() => onChange(groupStart - 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            {pages.map((p) => (
                <button key={p} onClick={() => onChange(p)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {hasNextGroup && <button onClick={() => onChange(groupEnd + 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

const PRICE_INITIAL: [number, number] = [0, 300000];

function SeriesPageInner() {
    const searchParams = useSearchParams();
    const { user } = useAuthStore();
    const searchParams = useSearchParams();
    const [manualSeries, setManualSeries] = useState<string | null>(null);
    const [manualCharacter, setManualCharacter] = useState<string | null>(null);
    const [selectedSeries, setSelectedSeries] = useState(() => searchParams.get("series") ?? "전체");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_INITIAL);
    const [onlyInStock, setOnlyInStock] = useState(false);

    const selectedSeries = manualSeries ?? searchParams.get("series") ?? "전체";
    const selectedCharacter = manualCharacter ?? searchParams.get("character") ?? "";
    useEffect(() => {
        const series = searchParams.get("series");
        setSelectedSeries(series ?? "전체");
    }, [searchParams]);

    const filtered = STORE_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSeries = selectedSeries === "전체" || p.category === selectedSeries;
        const characterText = [p.title, ...(p.productdetail ?? [])].join(" ").toLowerCase();
        const matchCharacter = !selectedCharacter || characterText.includes(selectedCharacter.toLowerCase());
        const matchPrice = p.soldout || (price >= priceRange[0] && price <= priceRange[1]);
        const matchColor = !selectedColor || p.title.toLowerCase().includes(COLOR_OPTIONS.find(c => c.value === selectedColor)?.label.toLowerCase() ?? "");
        return matchSeries && matchCharacter && matchPrice && matchColor;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
        if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [selectedSeries, sort, priceRange, onlyInStock]);
    useEffect(() => {
        if (user) console.log("👤 [Auth]", { uid: user.uid, name: user.name, email: user.email, membership: user.membership, points: user.points });
        else console.log("👻 [Auth] 비로그인 상태");
    }, [user]);

    const handleReset = () => { setPriceRange(PRICE_INITIAL); setOnlyInStock(false); };
    const activeFilterCount = [
        priceRange[0] > PRICE_INITIAL[0] || priceRange[1] < PRICE_INITIAL[1],
        onlyInStock,
    ].filter(Boolean).length;

    const handleSeriesSelect = (s: string) => {
        setManualSeries(s);
        setManualCharacter("");
        setPage(1);
        document.getElementById("series-tab")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

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
                        <span className="font-medium text-[#7865ff]">시리즈별</span>
                    </p>
                    <div>
                        <h1 className="text-[32px] font-bold text-[#16121f]">시리즈 별</h1>
                        <p className="mt-1 text-[15px] text-[#9b94b2]">좋아하는 애니메이션 굿즈를 찾아보세요!</p>
                    </div>
                </Inner>
            </div>

            <div id="series-tab" className="sticky top-0 z-20 border-b border-[#ebe8ff] bg-[#f8f6ff] py-4">
                <Inner>
                    <SeriesTab selected={selectedSeries} onSelect={handleSeriesSelect} />
                </Inner>
            </div>

            <Inner className="mt-8">
                <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#6b647a]">
                        총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품
                        {selectedSeries !== "전체" && <span className="ml-2 font-semibold text-[#7865ff]">· {selectedSeries}</span>}
                        {selectedCharacter && <span className="ml-2 font-semibold text-[#7865ff]">· {selectedCharacter}</span>}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select value={sort} onChange={(e) => handleSortChange(e.target.value)}
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
                            <FilterDropdown
                                open={filterOpen}
                                priceRange={priceRange}
                                onPriceRange={setPriceRange}
                                onlyInStock={onlyInStock}
                                onOnlyInStock={setOnlyInStock}
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
                        {activeFilterCount > 0 && (
                            <button onClick={handleReset} className="text-[13px] text-[#7865ff] underline">필터 초기화</button>
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

export default function SeriesPage() {
    return (
        <Suspense fallback={null}>
            <SeriesPageInner />
        </Suspense>
    );
}
