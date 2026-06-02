"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";

import StoreSidebar from "@/components/store/StoreSliaebar";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";

const ALL_PRODUCTS = products as StoreProduct[];
const STORE_PRODUCTS = ALL_PRODUCTS.filter((p) => !p.title.includes("[예약]"));
const ITEMS_PER_PAGE = 16;
const PAGE_GROUP = 5;
const SERIES_LIST = ["전체", ...Array.from(new Set(STORE_PRODUCTS.map((p) => p.category)))];

const HERO_SLIDES = [
    { series: "하이큐", tag: "NEW ARRIVAL", title: "하이큐!!", desc: "배구에 매료되어 중학생 시절 최초이자 마지막 공식전에 출전한 히나타 쇼요\n하지만 '코트 위의 제왕'이라는 별명을 가진 천재 선수 카게야마에게 처참히 패하고 만다.", bg: "#f5a623", image: "/store/product_list/haikyuu.png", textColor: "#fff", tagColor: "#7865ff", btnBorder: "#7865ff" },
    { series: "용한 소녀", tag: "FEATURED", title: "용한 소녀", desc: "정략결혼을 피해 용궁에서 지상으로 도망친 용왕의 딸 김용만\n성공을 목표로 전교 1등의 꿈을 품고 고등학교에 입학한다.", bg: "#b8e4f0", image: "/store/product_list/girl.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff" },
    { series: "장송의 프리렌", tag: "POPULAR", title: "장송의 프리렌", desc: "엘프 마법사 프리렌의 여정\n공식 굿즈 모음", bg: "#c8a87a", image: "/store/product_list/frieren.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff" },
    { series: "마루는 강쥐", tag: "FEATURED", title: "마루는 강쥐", desc: "우리 집 강아지 마루가 사람이 되었다, 그것도 5살 아이로!!\n마루야~! 또 어디가!!! 유쾌한 이웃들과 우당탕탕 즐거운 마루의 나날들", bg: "#c8e6a0", image: "/store/product_list/maru.png", textColor: "#ffffff", tagColor: "#7865ff", btnBorder: "#7865ff" },
];

const COLOR_OPTIONS = [
    { label: "보라", value: "purple", hex: "#7865ff" },
    { label: "노랑", value: "yellow", hex: "#FFE135" },
    { label: "핑크", value: "pink", hex: "#FF7EB3" },
    { label: "브라운", value: "brown", hex: "#8B5E3C" },
    { label: "민트", value: "mint", hex: "#3DDBA4" },
    { label: "빨강", value: "red", hex: "#FF2D55" },
];

function parsePrice(s: string) { return parseInt(s.replace(/[^0-9]/g, ""), 10) || 0; }

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto w-full max-w-[1680px] px-[75px] ${className}`}>{children}</div>;
}

function HeroBanner({ onSeriesSelect }: { onSeriesSelect: (s: string) => void }) {
    const [current, setCurrent] = useState(0);
    const [startX, setStartX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setCurrent((v) => (v + 1) % HERO_SLIDES.length), 4000);
    };
    useEffect(() => { startTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

    const goTo = (idx: number) => { setCurrent(idx); startTimer(); };
    const onMouseDown = (e: React.MouseEvent) => { setIsDragging(false); setStartX(e.clientX); };
    const onMouseMove = (e: React.MouseEvent) => { if (Math.abs(e.clientX - startX) > 5) setIsDragging(true); };
    const onMouseUp = (e: React.MouseEvent) => {
        const diff = e.clientX - startX;
        if (Math.abs(diff) > 50) {
            if (diff < 0) goTo((current + 1) % HERO_SLIDES.length);
            else goTo((current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
        }
        setIsDragging(false);
    };
    const onTouchStart = (e: React.TouchEvent) => setStartX(e.touches[0].clientX);
    const onTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (diff < -50) goTo((current + 1) % HERO_SLIDES.length);
        else if (diff > 50) goTo((current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    };

    const slide = HERO_SLIDES[current];
    return (
        <div className="relative w-full overflow-hidden rounded-[20px] cursor-grab active:cursor-grabbing select-none"
            style={{ backgroundColor: slide.bg, minHeight: 560 }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => setIsDragging(false)}
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="absolute inset-0 transition-all duration-700"
                style={{ backgroundImage: `url(${slide.image})`, backgroundSize: "cover", backgroundPosition: "center left" }} />
            <div className="absolute inset-0"
                style={{ background: "linear-gradient(to left, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)" }} />
            <div className="relative z-10 flex min-h-[560px] flex-col items-end justify-center px-12 py-12 text-right">
                <span className="mb-3 text-[12px] font-bold uppercase tracking-widest" style={{ color: slide.tagColor }}>{slide.tag}</span>
                <h2 className="mb-3 text-[48px] font-extrabold leading-tight" style={{ color: slide.textColor }}>{slide.title}</h2>
                <p className="mb-8 max-w-[500px] whitespace-pre-line text-[14px] leading-[1.8]" style={{ color: slide.textColor, opacity: 0.9 }}>{slide.desc}</p>
                <button
                    onClick={() => { if (!isDragging) onSeriesSelect(slide.series); }}
                    className="inline-flex w-fit items-center gap-2 rounded-full border-2 px-7 py-3 text-[14px] font-semibold transition hover:opacity-80"
                    style={{ borderColor: slide.btnBorder, color: slide.textColor }}>
                    굿즈보러가기
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                </button>
            </div>
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                {HERO_SLIDES.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)}
                        className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2.5 bg-[#7865ff]" : "w-2.5 h-2.5 bg-white/50"}`} />
                ))}
            </div>
        </div>
    );
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

export default function SeriesPage() {
    const { user } = useAuthStore();
    const [selectedSeries, setSelectedSeries] = useState("전체");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 300000]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const series = params.get("series");
        if (series) setSelectedSeries(series);
    }, []);

    const filtered = STORE_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSeries = selectedSeries === "전체" || p.category === selectedSeries;
        const matchPrice = p.soldout || (price >= priceRange[0] && price <= priceRange[1]);
        const matchColor = !selectedColor || p.title.toLowerCase().includes(COLOR_OPTIONS.find(c => c.value === selectedColor)?.label.toLowerCase() ?? "");
        return matchSeries && matchPrice && matchColor;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
        if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [selectedSeries, sort, priceRange, selectedColor]);
    useEffect(() => {
        if (user) console.log("👤 [Auth]", { uid: user.uid, name: user.name, email: user.email, membership: user.membership, points: user.points });
        else console.log("👻 [Auth] 비로그인 상태");
    }, [user]);

    const handleReset = () => { setPriceRange([0, 300000]); setSelectedColor(null); };
    const activeFilterCount = [priceRange[0] > 0 || priceRange[1] < 300000, selectedColor !== null].filter(Boolean).length;
    const handleSeriesSelect = (s: string) => {
        setSelectedSeries(s);
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

            <Inner className="mt-8">
                <HeroBanner onSeriesSelect={handleSeriesSelect} />
            </Inner>

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
                    </p>
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