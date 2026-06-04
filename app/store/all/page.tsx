"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";
import StoreSidebar from "@/components/store/StoreSliaebar";
import FilterDropdown from "@/components/store/FilterDropdown";

const ALL_PRODUCTS = products as StoreProduct[];
const STORE_PRODUCTS = ALL_PRODUCTS.filter((p) => !p.title.includes("[예약]"));
const ITEMS_PER_PAGE = 16;
const PAGE_GROUP = 5;

const HERO_SLIDES = [
    { series: "하이큐", tag: "NEW ARRIVAL", title: "하이큐!!", desc: "배구에 매료되어 중학생 시절 최초이자 마지막 공식전에 출전한 히나타 쇼요\n하지만 '코트 위의 제왕'이라는 별명을 가진 천재 선수 카게야마에게 처참히 패하고 만다.", bg: "#f5a623", image: "/store/product_list/haikyuu.png", textColor: "#fff", tagColor: "#7865ff", btnBorder: "#7865ff", textAlign: "right" as const },
    { series: "용한소녀", tag: "FEATURED", title: "용한 소녀", desc: "정략결혼을 피해 용궁에서 지상으로 도망친 용왕의 딸 김용만\n성공을 목표로 전교 1등의 꿈을 품고 고등학교에 입학한다.", bg: "#b8e4f0", image: "/store/product_list/girl.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "right" as const },
    { series: "장송의 프리렌", tag: "POPULAR", title: "장송의 프리렌", desc: "엘프 마법사 프리렌의 여정\n공식 굿즈 모음", bg: "#c8a87a", image: "/store/product_list/frieren.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "right" as const },
    { series: "마루는 강쥐", tag: "FEATURED", title: "마루는 강쥐", desc: "우리 집 강아지 마루가 사람이 되었다, 그것도 5살 아이로!!\n마루야~! 또 어디가!!! 유쾌한 이웃들과 우당탕탕 즐거운 마루의 나날들", bg: "#c8e6a0", image: "/store/product_list/maru.png", textColor: "#ffffff", tagColor: "#7865ff", btnBorder: "#7865ff", textAlign: "right" as const },
    { series: "사카모토 데이즈", tag: "NEW", title: "사카모토 데이즈", desc: "은퇴후 평화로운 일상을 보내고있는 전설의 킬러,사카모토\n그의 일상을 위협하는 무리들", bg: "#5bb8c4", image: "/store/product_list/SAKA.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
    { series: "에반게리온", tag: "POPULAR", title: "신세계\n에반게리온", desc: "대재앙 이후 '사도'라 불리는 미지의 괴물들에 맞서\n생체 병기 '에반게리온'을 조종하는 14세 소년소녀 파일럿들의 이야기", bg: "#7a7fbe", image: "/store/product_list/EVA.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#7865ff", textAlign: "left" as const },
    { series: "나의 히어로 아카데미아", tag: "FEATURED", title: "나의 히어로\n아카데미아", desc: "'개성'이라는 초능력을 갖고 태어나는 게 당연한 세계,\n주인공 미도리야 이즈쿠도 히어로를 동경하고 있다.\n하지만 무개성인 이즈쿠는 히어로가 될 수 없는데 ....", bg: "#5ab6e8", image: "/store/product_list/academy.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
];

function parsePrice(priceStr: string): number {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
}

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto w-full max-w-[1770px] px-[75px] ${className}`}>{children}</div>;
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
    const isLeft = slide.textAlign === "left";
    return (
        <div className="relative w-full overflow-hidden rounded-[20px] cursor-grab active:cursor-grabbing select-none"
            style={{ backgroundColor: slide.bg, minHeight: 620 }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => setIsDragging(false)}
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {HERO_SLIDES.map((s, i) => (
                <div key={i} className="absolute inset-0 transition-opacity duration-700"
                    style={{
                        opacity: i === current ? 1 : 0,
                        backgroundImage: `url(${s.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: s.textAlign === "left" ? "center right" : "center left",
                    }} />
            ))}
            <div className="absolute inset-0"
                style={{
                    background: isLeft
                        ? "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)"
                        : "linear-gradient(to left, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)"
                }} />
            <div className={`relative z-10 flex min-h-[620px] flex-col justify-center px-14 py-14 ${isLeft ? "items-start text-left" : "items-end text-right"}`}>
                <span className="mb-4 text-[13px] font-bold uppercase tracking-widest" style={{ color: slide.tagColor }}>{slide.tag}</span>
                <h2 className="mb-4 text-[58px] font-extrabold leading-tight whitespace-pre-line" style={{ color: slide.textColor }}>{slide.title}</h2>
                <p className="mb-10 max-w-[540px] whitespace-pre-line text-[15px] leading-[1.9]" style={{ color: slide.textColor, opacity: 0.9 }}>{slide.desc}</p>
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
            {hasPrevGroup && (
                <button onClick={() => onChange(groupStart - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">
                    ···
                </button>
            )}
            {pages.map((p) => (
                <button key={p} onClick={() => onChange(p)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"
                        }`}>
                    {p}
                </button>
            ))}
            {hasNextGroup && (
                <button onClick={() => onChange(groupEnd + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">
                    ···
                </button>
            )}
            <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

const PRICE_INITIAL: [number, number] = [0, 300000];

export default function StoreListPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>(PRICE_INITIAL);
    const [onlyInStock, setOnlyInStock] = useState(false);

    const filtered = STORE_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSearch =
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchStock = !onlyInStock || !p.soldout;
        return matchSearch && matchPrice && matchStock;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
        if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [search, priceRange, onlyInStock, sort]);
    useEffect(() => {
        if (user) console.log("👤 [Auth]", { uid: user.uid, name: user.name, email: user.email, membership: user.membership, points: user.points });
        else console.log("👻 [Auth] 비로그인 상태");
    }, [user]);

    const handleReset = () => {
        setPriceRange(PRICE_INITIAL);
        setOnlyInStock(false);
    };

    const activeFilterCount = [
        priceRange[0] > PRICE_INITIAL[0] || priceRange[1] < PRICE_INITIAL[1],
        onlyInStock,
    ].filter(Boolean).length;

    // 히어로 배너에서 시리즈 선택 → 시리즈 페이지로 이동
    const handleSeriesSelect = (series: string) => {
        router.push(`/store/series?series=${encodeURIComponent(series)}`);
    };

    return (
        <div className="min-h-screen bg-white pb-20 w-[">
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
                        <span className="font-medium text-[#7865ff]">전체굿즈</span>
                    </p>
                    <div className="flex items-end justify-between">
                        <h1 className="text-[32px] font-bold text-[#16121f]">전체 굿즈</h1>
                        <div className="flex h-[44px] w-[340px] items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_4px_14px_rgba(30,24,70,0.08)]">
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

            {/* 히어로 배너 */}
            <Inner className="mt-6">
                <HeroBanner onSeriesSelect={handleSeriesSelect} />
            </Inner>

            <Inner className="mt-8">
                <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#6b647a]">
                        총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select value={sort} onChange={(e) => setSort(e.target.value)}
                                className="h-[38px] appearance-none rounded-[8px] border border-[#ddd8f4] bg-white pl-3 pr-8 text-[13px] text-[#3d3755] outline-none focus:border-[#7865ff] cursor-pointer">
                                <option>인기순</option>
                                <option>신상품순</option>
                                <option>낮은 가격순</option>
                                <option>높은 가격순</option>
                            </select>
                            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition ${activeFilterCount > 0 || filterOpen
                                    ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]"
                                    : "border-[#ddd8f4] bg-white text-[#3d3755] hover:border-[#7865ff] hover:text-[#7865ff]"
                                    }`}>
                                <img src="/store/product_list/lyra-icon-Icon_filter_hor_outline.png" alt=""
                                    className="h-[15px] w-[15px] object-contain opacity-50" />
                                필터
                                {activeFilterCount > 0 && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
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
                        {(search || activeFilterCount > 0) && (
                            <button onClick={() => { setSearch(""); handleReset(); }}
                                className="text-[13px] text-[#7865ff] underline">
                                필터 초기화
                            </button>
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