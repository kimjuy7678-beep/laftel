"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";
import StoreProductCard, { StoreProduct } from "@/components/store/StoreProductCard";
import SortDropdown, { sortProducts } from "@/components/store/SortDropdown";
import StoreSidebar from "@/components/store/StoreSliaebar";
import StoreCategoryToggle from "@/components/store/StoreCategoryToggle";
import FilterDropdown from "@/components/store/FilterDropdown";

const ALL_PRODUCTS = products as StoreProduct[];
const ITEMS_PER_PAGE = 20;
const PAGE_GROUP = 5;

const HERO_SLIDES_BASE = [
    { series: "하이큐", tag: "NEW ARRIVAL", title: "하이큐!!", desc: "배구에 매료되어 중학생 시절 최초이자 마지막 공식전에 출전한 히나타 쇼요\n하지만 \'코트 위의 제왕\'이라는 별명을 가진 천재 선수 카게야마에게 처참히 패하고 만다.", bg: "#f5a623", image: "/store/product_list/haikyuu.png", textColor: "#fff", tagColor: "#7865ff", btnBorder: "#7865ff", textAlign: "right" as const },
    { series: "용한소녀", tag: "FEATURED", title: "용한 소녀", desc: "정략결혼을 피해 용궁에서 지상으로 도망친 용왕의 딸 김용만\n성공을 목표로 전교 1등의 꿈을 품고 고등학교에 입학한다.", bg: "#b8e4f0", image: "/store/product_list/girl.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "right" as const },
    { series: "장송의 프리렌", tag: "POPULAR", title: "장송의 프리렌", desc: "엘프 마법사 프리렌의 여정\n공식 굿즈 모음", bg: "#c8a87a", image: "/store/product_list/frieren.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "right" as const },
    { series: "마루는 강쥐", tag: "FEATURED", title: "마루는 강쥐", desc: "우리 집 강아지 마루가 사람이 되었다, 그것도 5살 아이로!!\n마루야~! 또 어디가!!! 유쾌한 이웃들과 우당탕탕 즐거운 마루의 나날들", bg: "#c8e6a0", image: "/store/product_list/maru.png", textColor: "#ffffff", tagColor: "#7865ff", btnBorder: "#7865ff", textAlign: "right" as const },
    { series: "사카모토 데이즈", tag: "NEW", title: "사카모토 데이즈", desc: "은퇴후 평화로운 일상을 보내고있는 전설의 킬러,사카모토\n그의 일상을 위협하는 무리들", bg: "#5bb8c4", image: "/store/product_list/SAKA.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
    { series: "에반게리온", tag: "POPULAR", title: "신세계\n에반게리온", desc: "대재앙 이후 \'사도\'라 불리는 미지의 괴물들에 맞서\n생체 병기 \'에반게리온\'을 조종하는 14세 소년소녀 파일럿들의 이야기", bg: "#7a7fbe", image: "/store/product_list/EVA.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#7865ff", textAlign: "left" as const },
    { series: "나의 히어로 아카데미아", tag: "FEATURED", title: "나의 히어로\n아카데미아", desc: "\'개성\'이라는 초능력을 갖고 태어나는 게 당연한 세계,\n주인공 미도리야 이즈쿠도 히어로를 동경하고 있다.\n하지만 무개성인 이즈쿠는 히어로가 될 수 없는데 ....", bg: "#5ab6e8", image: "/store/product_list/academy.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
    { series: "짱구는 못말려", tag: "POPULAR", title: "짱구는 못말려", desc: "사고뭉치 짱구의 엉뚱한 행동과 이를 수습하는 가족들의 끈끈한 사랑,\n떡잎마을 친구들과의 유쾌한 일상", bg: "#7ecb5a", image: "/store/product_list/JJANG.png", textColor: "#ffffff", tagColor: "#3a7d00", btnBorder: "#3a7d00", textAlign: "left" as const },
    { series: "하츠네미쿠", tag: "FEATURED", title: "하츠네 미쿠", desc: "일본의 크립톤 퓨처 미디어 사가 2007년에 발매한\n음성 합성 소프트웨어(보컬로이드)이자,\n이를 대표하는 가상의 캐릭터(가상 아이돌)", bg: "#4ecdc4", image: "/store/product_list/MIKU.png", textColor: "#fff", tagColor: "#ff69b4", btnBorder: "#ff69b4", textAlign: "left" as const },
    { series: "명탐정 코난", tag: "POPULAR", title: "명탐정 코난", desc: "고등학생 탐정이 의문의 조직에 의해 몸이 작아진 후,\n정체를 숨긴 채 사건을 해결하며 그 조직을 추적하는 이야기", bg: "#2a2a2a", image: "/store/product_list/SHLOCK.png", textColor: "#fff", tagColor: "#e0b84b", btnBorder: "#e0b84b", textAlign: "left" as const },
    { series: "블루록", tag: "NEW", title: "블루록", desc: "일본이 월드컵에서 우승하기 위해\n세계 최고의 \'이기적인 스트라이커\'를 육성하는 극단적인 프로젝트에\n고등학생 축구 선수들이 참여하며 벌어지는 서바이벌 이야기", bg: "#3355cc", image: "/store/product_list/BLUELOCK.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "right" as const },
    { series: "문호 스트레이독스", tag: "FEATURED", title: "문호 스트레이독스", desc: "고아원에서 쫓겨난 소년 나카지마 아쓰시가 이능력 무효화 능력을 가진 다자이 오사무를 만나\n\'무장탐정사\'에 입단하게 되면서 요코하마를 위협하는 거대한 악의 조직들에\n맞서 싸우는 스타일리시 이능력 배틀물", bg: "#b5a080", image: "/store/product_list/DOGS.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
    { series: "진격의 거인", tag: "POPULAR", title: "진격의거인", desc: "거인 전멸을 맹세하고 조사병단에 입단한 주인공 에렌 예거가\n거인의 정체와 세계의 잔혹한 진실을 마주하며 인류의 자유를 찾기 위해\n전 세계와 처절한 사투를 벌이는 다크 판타지 액션 만화", bg: "#3a1a0a", image: "/store/product_list/BIGHUMAN.png", textColor: "#fff", tagColor: "#e05a00", btnBorder: "#e05a00", textAlign: "left" as const },
    { series: "재배소년", tag: "FEATURED", title: "재배소년", desc: "마법의 화원에서 씨앗을 심어 식물의 요정인 \'맨드레이크\'를 수확하고\n수집하는 방치형 육성 시뮬레이션 게임", bg: "#a05090", image: "/store/product_list/FLOLAR.png", textColor: "#fff", tagColor: "#ffc0e0", btnBorder: "#ffc0e0", textAlign: "left" as const },
    { series: "홀로라이브", tag: "NEW", title: "홀로 라이브", desc: "현실 세계와 이세계에서 모인 개성 넘치는 가상 인형·요정·신적 존재들이\n버추얼 아이돌로 데뷔하여 다채로운 예능과 음악 활동을 통해\n글로벌 팬들과 소통하며 함께 성장해 나가는 거대 멀티버스 세계관", bg: "#e8b0d8", image: "/store/product_list/IDOL.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
    { series: "치이카와", tag: "FEATURED", title: "치이카와", desc: "\'먼지 같고 작고 귀여운 녀석\'의 줄임말로,\n주인공 치이카와와 친구들이 가혹한 현실 속에서 살아가는 일상을 다룬 만화", bg: "#e8a0b8", image: "/store/product_list/HACHI.png", textColor: "#fff", tagColor: "#fff", btnBorder: "#fff", textAlign: "left" as const },
    { series: "포켓몬", tag: "NEW", title: "포켓몬", desc: "포켓몬스터는 다양한 포켓몬과 인간이 공존하는 세계를 배경으로,\n트레이너들이 각자의 꿈을 향해 모험을 떠나는 이야기입니다.\n\n최애 포켓몬 굿즈를 만나보세요.", bg: "#dbce52", image: "/store/product_list/poket.png", textColor: "#ffffff", tagColor: "#37af00", btnBorder: "#37af00", textAlign: "left" as const },
    { series: "다이아몬드 에이스", tag: "FEATURED", title: "다이아몬드 에이스", desc: "치열한 경쟁과 뜨거운 승부,\n그리고 팀원들과 함께 성장해 나가는 우정과 열정이\n가득 담긴 대표 청춘 스포츠 시리즈입니다.", bg: "#8bbaff", image: "/store/product_list/baseball.png", textColor: "#ffffff", tagColor: "#76b7ec", btnBorder: "#76b7ec", textAlign: "right" as const }
];

// ✅ 매 로딩마다 슬라이드 순서 랜덤화
function shuffleSlides<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function parsePrice(priceStr: string): number {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
}

function Inner({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
    return <div id={id} className={`mx-auto w-full max-w-[1770px] px-4 sm:px-8 lg:px-[75px] ${className}`}>{children}</div>;
}

function HeroBanner({ onSeriesSelect }: { onSeriesSelect: (s: string) => void }) {
    // ✅ useState 초기값에서 랜덤 셔플
    const [slides] = useState(() => shuffleSlides(HERO_SLIDES_BASE));
    const [current, setCurrent] = useState(0);
    const [startX, setStartX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setCurrent((v) => (v + 1) % slides.length), 4000);
    }, [slides.length]);

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startTimer]);

    const goTo = (idx: number) => { setCurrent(idx); startTimer(); };
    const onMouseDown = (e: React.MouseEvent) => { setIsDragging(false); setStartX(e.clientX); };
    const onMouseMove = (e: React.MouseEvent) => { if (Math.abs(e.clientX - startX) > 5) setIsDragging(true); };
    const onMouseUp = (e: React.MouseEvent) => {
        const diff = e.clientX - startX;
        if (isDragging && Math.abs(diff) > 50) {
            if (diff < 0) goTo((current + 1) % slides.length);
            else goTo((current - 1 + slides.length) % slides.length);
        }
        setIsDragging(false);
    };
    const onTouchStart = (e: React.TouchEvent) => setStartX(e.touches[0].clientX);
    const onTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (diff < -50) goTo((current + 1) % slides.length);
        else if (diff > 50) goTo((current - 1 + slides.length) % slides.length);
    };

    const slide = slides[current];
    const isLeft = slide.textAlign === "left";

    return (
        <div className="relative min-h-[430px] w-full cursor-grab select-none overflow-hidden rounded-[16px] active:cursor-grabbing sm:min-h-[500px] sm:rounded-[20px] lg:min-h-[620px]"
            style={{ backgroundColor: slide.bg }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => setIsDragging(false)}
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="hidden md:block">
                {slides.map((s, i) => (
                    <div key={i} className="absolute inset-0 transition-opacity duration-700"
                        style={{ opacity: i === current ? 1 : 0, backgroundImage: `url(${s.image})`, backgroundSize: "cover", backgroundPosition: s.textAlign === "left" ? "center right" : "center left" }} />
                ))}
            </div>
            <div className="absolute inset-0 md:hidden" style={{ backgroundColor: slide.bg }} />
            <div className="absolute inset-0 hidden md:block"
                style={{
                    background: isLeft
                        ? "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)"
                        : "linear-gradient(to left, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)"
                }} />
            {/* 모바일 안내 문구 */}
            <div className="absolute right-3 top-3 z-20 md:hidden" style={{ animation: "pulse 3s ease-in-out infinite" }}>
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white/90 backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-[12px]">
                    더 큰 화면에서 이미지를 확인하세요
                </span>
            </div>
            {/* 텍스트 콘텐츠 */}
            <div className="relative z-10 flex min-h-[430px] flex-col justify-center px-5 py-12 sm:min-h-[500px] sm:px-8 md:px-14 md:py-14 lg:min-h-[620px]">
                <div className="flex flex-col w-full" style={{
                    alignItems: isMobile ? "flex-start" : (isLeft ? "flex-start" : "flex-end"),
                    textAlign: isMobile ? "left" : (isLeft ? "left" : "right"),
                }}>
                    <span className="mb-3 text-[10px] font-bold uppercase tracking-widest opacity-80 md:text-[13px]" style={{ color: slide.tagColor }}>{slide.tag}</span>
                    <h2 className="mb-3 whitespace-pre-line text-[30px] font-extrabold leading-tight drop-shadow-lg sm:text-[38px] md:text-[58px]" style={{ color: slide.textColor }}>{slide.title}</h2>
                    <p className="mb-6 max-w-[92%] whitespace-pre-line text-[12px] leading-[1.75] opacity-90 sm:mb-8 sm:max-w-[480px] sm:text-[13px] md:max-w-[540px] md:text-[15px] md:leading-[1.9]" style={{ color: slide.textColor }}>{slide.desc}</p>
                    <button
                        onClick={() => { if (!isDragging) onSeriesSelect(slide.series); }}
                        className="inline-flex w-fit items-center gap-2 rounded-full border-2 px-5 py-2.5 text-[12px] font-semibold transition hover:opacity-80 md:px-7 md:py-3 md:text-[14px]"
                        style={{ borderColor: slide.btnBorder, color: slide.textColor }}>
                        굿즈보러가기
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                </div>
            </div>
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((_, i) => (
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
    // ✅ 페이지 변경 + 최상단 이동
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
            {groupStart > 1 && <button onClick={() => handleChange(groupStart - 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            {pages.map((p) => (
                <button key={p} onClick={() => handleChange(p)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${p === current ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]" : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {groupEnd < total && <button onClick={() => handleChange(groupEnd + 1)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>}
            <button onClick={() => handleChange(Math.min(total, current + 1))} disabled={current === total}
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
    const [onlyReserve, setOnlyReserve] = useState(false);

    const filtered = ALL_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchStock = !onlyInStock || !p.soldout;
        const matchReserve = !onlyReserve || p.title.includes("[예약]");
        return matchSearch && matchPrice && matchStock && matchReserve;
    });

    const sorted = sortProducts(filtered, sort);
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => {
        if (user) console.log("👤 [Auth]", { uid: user.uid, name: user.name, email: user.email, membership: user.membership, points: user.points });
        else console.log("👻 [Auth] 비로그인 상태");
    }, [user]);

    const handleReset = () => { setPriceRange(PRICE_INITIAL); setOnlyInStock(false); setOnlyReserve(false); setPage(1); };
    const handleSearchChange = (value: string) => { setSearch(value); setPage(1); };
    const handlePriceRange = (value: [number, number]) => { setPriceRange(value); setPage(1); };
    const handleOnlyInStock = (value: boolean) => { setOnlyInStock(value); setPage(1); };
    const handleOnlyReserve = (value: boolean) => { setOnlyReserve(value); setPage(1); };
    const handleClearSearch = () => { setSearch(""); setPage(1); };

    const activeFilterCount = [priceRange[0] > PRICE_INITIAL[0] || priceRange[1] < PRICE_INITIAL[1], onlyInStock, onlyReserve].filter(Boolean).length;
    const handleSeriesSelect = (series: string) => { router.push(`/store/series?series=${encodeURIComponent(series)}`); };

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
                        <span className="font-medium text-[#7865ff]">전체굿즈</span>
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <h1 className="text-[24px] sm:text-[32px] font-bold text-[#16121f]">전체 굿즈</h1>
                        <div className="flex h-[44px] w-full sm:w-[340px] items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_4px_14px_rgba(30,24,70,0.08)]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#9b94b2]"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            <input className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#242130] outline-none placeholder:text-[#b0aabb]"
                                placeholder="찾으시는 상품을 검색하세요" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
                            {search && <button onClick={handleClearSearch} className="text-[#b0aabb] hover:text-[#7865ff]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>}
                        </div>
                    </div>
                </Inner>
            </div>

            {/* 히어로 배너 */}
            <Inner className="mt-6 hidden md:block">
                <HeroBanner onSeriesSelect={handleSeriesSelect} />
            </Inner>

            <Inner id="store-products" className="mt-8">
                <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#6b647a]">총 <span className="font-semibold text-[#16121f]">{sorted.length}</span>개의 상품</p>
                    <div className="flex items-center gap-2">
                        <SortDropdown value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
                        <div className="relative">
                            <button onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition ${activeFilterCount > 0 || filterOpen ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]" : "border-[#ddd8f4] bg-white text-[#3d3755] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                <img src="/store/product_list/lyra-icon-Icon_filter_hor_outline.png" alt="" className="h-[15px] w-[15px] object-contain opacity-50" />
                                필터
                                {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">{activeFilterCount}</span>}
                            </button>
                            <FilterDropdown open={filterOpen} onClose={() => setFilterOpen(false)} priceRange={priceRange} onPriceRange={handlePriceRange} onlyInStock={onlyInStock} onOnlyInStock={handleOnlyInStock} onReset={handleReset} onlyReserve={onlyReserve} onOnlyReserve={handleOnlyReserve} />
                        </div>
                    </div>
                </div>
            </Inner>

            <Inner className="mt-6">
                {paginated.length === 0 ? (
                    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[15px] text-[#9b94b2]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        검색 결과가 없어요.
                        {(search || activeFilterCount > 0) && <button onClick={() => { handleClearSearch(); handleReset(); }} className="text-[13px] text-[#7865ff] underline">필터 초기화</button>}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-10">
                        {paginated.map((product) => <StoreProductCard key={product.productId} product={product} />)}
                    </div>
                )}
                {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
            </Inner>
        </div>
    );
}
