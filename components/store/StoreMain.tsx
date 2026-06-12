"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import Link from "next/link";
import type { StoreCategory, StoreMainProduct, StoreMainSourceProduct } from "@/types/store";
import { RECENT_STORE_PRODUCT_IDS_KEY } from "@/types/store";
import { StoreSearchBar } from "@/components/store/StoreSearch";
import { BEST_PRODUCTS } from "@/lib/storeBestRanking";
import products from "@/data/store.json";

const STORE_PRODUCTS = products as StoreMainSourceProduct[];

function toProduct(product: StoreMainSourceProduct, badge?: string): StoreMainProduct {
    return {
        id: product.productId,
        series: product.category,
        title: product.title,
        category: product.category,
        price: product.soldout ? "품절" : product.price,
        imageSrc: product.thumbnail,
        badge,
    };
}

const categories: StoreCategory[] = [
    { name: "진격의 거인", slug: "attack-on-titan", imageSrc: "/images/store/m1.png" },
    { name: "나의 히어로 아카데미아", slug: "my-hero-academia", imageSrc: "/images/store/m2.png" },
    { name: "귀멸의 칼날", slug: "demon-slayer", imageSrc: "/images/store/m3.png" },
    { name: "하츠네미쿠", slug: "hatsune-miku", imageSrc: "/images/store/m4.png" },
    { name: "에반게리온", slug: "evangelion", imageSrc: "/images/store/m5.png" },
    { name: "하이큐", slug: "haikyu", imageSrc: "/images/store/m6.png" },
    { name: "장송의 프리렌", slug: "frieren", imageSrc: "/images/store/m7.png" },
    { name: "주술회전", slug: "jujutsu-kaisen", imageSrc: "/images/store/m8.png" },
];

function seriesHref(series: string) {
    return `/store/series?series=${encodeURIComponent(series)}`;
}

function characterHref(series: string, character: string) {
    return `/store/series?series=${encodeURIComponent(series)}&search=${encodeURIComponent(character)}`;
}

const topProducts = BEST_PRODUCTS.slice(0, 5).map((p, i) =>
    toProduct(p, i === 0 ? "HOT" : i === 2 ? "NEW" : undefined),
);

function isPokemonProduct(product: StoreMainSourceProduct) {
    return product.category.includes("포켓몬") || product.title.includes("포켓몬");
}

function isHololiveProduct(product: StoreMainSourceProduct) {
    return product.category.includes("홀로라이브") ||
        product.title.includes("홀로라이브") ||
        product.title.toLowerCase().includes("hololive");
}

const pokemonProducts = STORE_PRODUCTS
    .filter(isPokemonProduct)
    .slice(0, 5)
    .map((product, index) => toProduct(product, index < 2 ? "POKEMON" : undefined));

const hololiveProducts = STORE_PRODUCTS
    .filter(isHololiveProduct)
    .slice(0, 5)
    .map((product, index) => toProduct(product, index < 2 ? "HOLOLIVE" : undefined));

const characterCollections = [
    { name: "히나타 쇼요", keyword: "히나타", series: "하이큐", imageSrc: "/images/store/characters/hinata.png", accent: "#f5a623" },
    { name: "고죠 사토루", keyword: "고죠", series: "주술회전", imageSrc: "/images/store/characters/gojo.png", accent: "#74b9ff" },
    { name: "카마도 탄지로", keyword: "탄지로", series: "귀멸의 칼날", imageSrc: "/images/store/characters/tanjiro.png", accent: "#2fbf71" },
    { name: "프리렌", keyword: "프리렌", series: "장송의 프리렌", imageSrc: "/images/store/characters/frieren.png", accent: "#c8a87a" },
    { name: "하츠네 미쿠", keyword: "미쿠", series: "하츠네미쿠", imageSrc: "/images/store/characters/miku.png", accent: "#31c7c7" },
];

const RECENT_STORE_PRODUCTS_UPDATED_EVENT = "laftel:store:recent-products-updated";
const EMPTY_RECENT_PRODUCTS: StoreMainProduct[] = [];
let cachedRecentStorage: string | null = null;
let cachedRecentProducts: StoreMainProduct[] = EMPTY_RECENT_PRODUCTS;

function getRecentProducts() {
    if (typeof window === "undefined") return EMPTY_RECENT_PRODUCTS;
    try {
        const stored = window.localStorage.getItem(RECENT_STORE_PRODUCT_IDS_KEY);
        if (stored === cachedRecentStorage) return cachedRecentProducts;
        const ids = stored ? (JSON.parse(stored) as unknown) : [];
        if (!Array.isArray(ids)) {
            cachedRecentStorage = stored;
            cachedRecentProducts = EMPTY_RECENT_PRODUCTS;
            return cachedRecentProducts;
        }
        const productsById = new Map(STORE_PRODUCTS.map((product) => [product.productId, product]));
        cachedRecentStorage = stored;
        cachedRecentProducts = ids
            .filter((id): id is string => typeof id === "string")
            .map((id) => productsById.get(id))
            .filter((product): product is StoreMainSourceProduct => Boolean(product))
            .slice(0, 7)
            .map((product) => toProduct(product));
        return cachedRecentProducts;
    } catch {
        cachedRecentStorage = null;
        cachedRecentProducts = EMPTY_RECENT_PRODUCTS;
        return cachedRecentProducts;
    }
}

function subscribeRecentProducts(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(RECENT_STORE_PRODUCTS_UPDATED_EVENT, onStoreChange);
    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(RECENT_STORE_PRODUCTS_UPDATED_EVENT, onStoreChange);
    };
}

function ImageSlot({ src, alt, className }: { src: string; alt: string; className: string }) {
    if (!src) return <div className={`${className} bg-[#eeeeef]`} aria-label={alt} />;
    return (
        <div
            className={className}
            role="img"
            aria-label={alt}
            style={{ backgroundImage: `url(${src})`, backgroundPosition: "center", backgroundSize: "cover" }}
        />
    );
}

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mx-auto w-full max-w-[1770px] px-4 sm:px-6 lg:px-[75px] ${className}`}>
            {children}
        </div>
    );
}

function MiniProductCard({ product }: { product: StoreMainProduct }) {
    return (
        <Link href={`/store/${product.id}`} className="block min-w-0">
            <ImageSlot
                src={product.imageSrc}
                alt={product.title}
                className="aspect-square w-full rounded-[8px]"
            />
            <p className="mt-2 truncate text-[13px] text-[#17151f]">{product.title}</p>
            <p className="text-[11px] font-bold text-[#7865ff]">{product.price}</p>
        </Link>
    );
}

// ─── OTT 최근 시청 기반 굿즈 추천 섹션 ──────────────────────────────────────

function getOttRecentAnime(): string[] {
    try {
        // watch-progress-storage (Zustand persist)
        const s = localStorage.getItem('watch-progress-storage')
        if (s) {
            const items = JSON.parse(s)?.state?.items || []
            return items
                .slice(0, 10)
                .map((item: any) => item.animeName || item.title || item.name || '')
                .filter(Boolean)
        }
    } catch { }
    return []
}

function matchAnimeToCategory(animeName: string, category: string): boolean {
    const a = animeName.replace(/\s/g, '').toLowerCase()
    const c = category.replace(/\s/g, '').toLowerCase()
    // 2글자 이상 공통 부분 있으면 매칭
    if (a.includes(c) || c.includes(a)) return true
    // 앞 2글자 매칭 (귀멸의칼날 → 귀멸)
    if (a.slice(0, 2) === c.slice(0, 2)) return true
    return false
}

function OttRecommendSection() {
    const [sections, setSections] = useState<{ animeName: string; products: StoreMainProduct[] }[]>([])

    useEffect(() => {
        const recentAnime = getOttRecentAnime()
        if (recentAnime.length === 0) return

        const result: { animeName: string; products: StoreMainProduct[] }[] = []

        recentAnime.forEach(animeName => {
            const matched = STORE_PRODUCTS
                .filter(p => matchAnimeToCategory(animeName, p.category))
                .slice(0, 5)
                .map(p => toProduct(p))

            if (matched.length > 0) {
                // 이미 같은 카테고리 추가됐으면 스킵
                const alreadyAdded = result.some(r =>
                    r.products[0]?.category === matched[0]?.category
                )
                if (!alreadyAdded) {
                    result.push({ animeName, products: matched })
                }
            }
        })

        setSections(result.slice(0, 2)) // 최대 3개 시리즈
    }, [])

    if (sections.length === 0) return null

    return (
        <section className="mt-8 sm:mt-10">
            <Inner>
                <div className="rounded-[16px] border border-[#ebe8ff] bg-gradient-to-br from-[#f3f0ff] to-[#faf8ff] px-4 py-5 sm:rounded-[24px] sm:px-8 sm:py-7 lg:rounded-[28px] lg:px-10 lg:py-8">
                    {/* 헤더 */}
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7865ff]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[18px] font-bold text-[#14111c] sm:text-[20px]">
                                최근 시청한 작품의 굿즈
                            </h2>
                            <p className="text-[11px] text-[#8a8494]">라프텔에서 본 애니 굿즈를 바로 만나보세요</p>
                        </div>
                    </div>

                    {/* 시리즈별 */}
                    <div className="flex flex-col gap-8">
                        {sections.map(({ animeName, products: sectionProducts }) => (
                            <div key={animeName}>
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-[#7865ff]/10 px-3 py-1 text-[12px] font-bold text-[#7865ff]">
                                            {sectionProducts[0]?.category}
                                        </span>
                                    </div>
                                    <Link
                                        href={seriesHref(sectionProducts[0]?.category || '')}
                                        className="text-[12px] font-semibold text-[#7865ff]"
                                    >
                                        전체보기 →
                                    </Link>
                                </div>
                                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-0">
                                    {sectionProducts.map(product => (
                                        <div key={product.id} className="w-[132px] shrink-0 snap-start sm:w-[150px] lg:w-auto">
                                            <MiniProductCard product={product} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Inner>
        </section>
    )
}

// ─── FeaturedRecent ───────────────────────────────────────────────────────────

function FeaturedRecent() {
    const recentProducts = useSyncExternalStore(
        subscribeRecentProducts,
        getRecentProducts,
        () => EMPTY_RECENT_PRODUCTS,
    );

    if (recentProducts.length === 0) return null;

    return (
        <section className="mt-8 sm:mt-10">
            <Inner>
                <div className="rounded-[16px] border border-[#ebe8ff] bg-[#f8f6ff] px-4 py-5 sm:rounded-[24px] sm:px-8 sm:py-7 lg:rounded-[28px] lg:px-10 lg:py-8">
                    <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
                        <h2 className="text-[18px] font-semibold text-[#14111c] sm:text-[20px]">최근본상품</h2>
                        <Link href="/store/recent" className="shrink-0 text-[13px] font-semibold text-[#7865ff] sm:text-[16px]">
                            더보기
                        </Link>
                    </div>
                    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-6 lg:overflow-visible lg:px-0">
                        {recentProducts.map((product) => (
                            <div key={product.id} className="w-[132px] shrink-0 snap-start sm:w-[150px] lg:w-auto">
                                <MiniProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            </Inner>
        </section>
    );
}

// ─── CategoryStrip ────────────────────────────────────────────────────────────

function CategoryStrip() {
    return (
        <section className="mt-10 sm:mt-14 lg:mt-20">
            <Inner>
                <div className="grid grid-cols-4 gap-x-3 gap-y-6 sm:grid-cols-6 sm:gap-6 lg:grid-cols-8 lg:gap-8">
                    {categories.map((category) => (
                        <Link key={category.slug} href={seriesHref(category.name)} className="flex flex-col items-center gap-3">
                            <div className="relative flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full shadow-[0_8px_20px_rgba(20,16,44,0.22)] sm:h-[78px] sm:w-[78px] lg:h-[88px] lg:w-[88px]">
                                <ImageSlot
                                    src={category.imageSrc}
                                    alt={category.name}
                                    className="h-full w-full rounded-full object-cover"
                                />
                                {!category.imageSrc && (
                                    <span className="absolute text-[11px] font-black text-white drop-shadow">
                                        LAFTEL
                                    </span>
                                )}
                            </div>
                            <span className="max-w-full text-center text-[11px] font-semibold leading-tight text-[#15121d] sm:text-[12px] lg:text-[13px]">{category.name}</span>
                        </Link>
                    ))}
                </div>
            </Inner>
        </section>
    );
}

function TopProductCard({ product, rank }: { product: StoreMainProduct; rank: number }) {
    return (
        <Link href={`/store/${product.id}`} className="group relative block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#eeeeef]">
                <ImageSlot
                    src={product.imageSrc}
                    alt={product.title}
                    className="aspect-[4/5.25] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {product.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#7865ff] px-2.5 py-1 text-[11px] font-bold text-white">
                        {product.badge}
                    </span>
                )}
            </div>
            <span className="pointer-events-none absolute -bottom-0.5 left-[-2px] text-[52px] font-light leading-none text-transparent [-webkit-text-stroke:1px_#8f7cff] sm:text-[64px] lg:-bottom-1 lg:text-[88px]">
                {rank}
            </span>
            <div className="relative mt-2 pl-7 sm:pl-9 lg:mt-3 lg:pl-12">
                <p className="truncate text-[12px] font-semibold text-[#111018] sm:text-[15px] lg:text-[20px]">{product.title}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#7865ff] sm:text-[12px] lg:mt-1 lg:text-[13px]">{product.price}</p>
            </div>
        </Link>
    );
}

function ProductFeatureCard({ product }: { product: StoreMainProduct }) {
    const displayTitle = product.title.replace("[예약]", "").replace("[품절]", "").trim();
    const isReserve = product.title.includes("[예약]");
    const isSoldout = product.price === "품절";

    return (
        <Link href={`/store/${product.id}`} className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#eeeeef]">
                <ImageSlot
                    src={product.imageSrc}
                    alt={displayTitle}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
                {isReserve && !isSoldout && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#7865ff] px-2.5 py-1 text-[11px] font-bold text-white">
                        예약
                    </span>
                )}
                {isSoldout && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">
                            품절
                        </span>
                    </div>
                )}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-[#7865ff]">{product.category}</p>
            <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-[#111018]">{displayTitle}</p>
            <p className={`mt-1.5 text-[14px] font-bold ${isSoldout ? "text-[#aaa]" : "text-[#111018]"}`}>{product.price}</p>
        </Link>
    );
}

function ProductSeriesSection({
    title, subtitle, series, products,
}: {
    title: string; subtitle: string; series: string; products: StoreMainProduct[];
}) {
    if (products.length === 0) return null;
    return (
        <section className="py-10 sm:py-12 lg:py-16">
            <Inner>
                <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
                    <div>
                        <h2 className="text-[22px] font-bold leading-tight text-[#15121d] sm:text-[28px] lg:text-[32px]">{title}</h2>
                        <p className="mt-2 whitespace-pre-line text-[13px] font-medium leading-relaxed text-[#8a8494] sm:text-[16px] lg:text-[18px]">{subtitle}</p>
                    </div>
                    <Link href={seriesHref(series)} className="shrink-0 text-[12px] font-semibold text-[#7865ff] sm:text-[15px] lg:text-[16px]">
                        전체보기 →
                    </Link>
                </div>
                <div className="flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:grid lg:grid-cols-5 lg:gap-8 lg:overflow-visible lg:pb-0">
                    {products.map((product) => (
                        <div key={product.id} className="w-[140px] shrink-0 snap-start sm:w-[180px] lg:w-auto">
                            <ProductFeatureCard product={product} />
                        </div>
                    ))}
                </div>
            </Inner>
        </section>
    );
}

function BestTopSection() {
    return (
        <section className="relative left-1/2 mt-12 w-screen -translate-x-1/2 bg-[#fafafa] py-12 sm:mt-16 sm:py-16 lg:mt-24 lg:py-20">
            <Inner>
                <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-[24px] font-bold leading-tight tracking-wide text-[#16121f] sm:text-[30px] lg:text-[32px]">
                            BEST-TOP 50
                        </h2>
                        <p className="mt-2 text-[13px] font-medium text-[#8a8494] sm:text-[16px] lg:text-[18px]">
                            팬들이 가장 사랑한 굿즈
                        </p>
                    </div>
                    <Link href="/store/best" className="shrink-0 text-right text-[12px] font-semibold text-[#7865ff] sm:text-[15px] lg:text-[16px]">
                        베스트 굿즈 전체보기 →
                    </Link>
                </div>
                <div className="mt-7 flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:mt-10 lg:grid lg:grid-cols-5 lg:gap-8 lg:overflow-visible lg:pb-0">
                    {topProducts.map((product, index) => (
                        <div key={product.id} className="w-[122px] shrink-0 snap-start sm:w-[170px] lg:w-auto">
                            <TopProductCard product={product} rank={index + 1} />
                        </div>
                    ))}
                </div>
            </Inner>
        </section>
    );
}

function CharacterCard({ character }: { character: (typeof characterCollections)[number] }) {
    return (
        <Link href={characterHref(character.series, character.keyword)} className="group block min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] border border-[#ebe8ff] bg-[#f5f3ff] sm:rounded-[12px] lg:rounded-[14px]">
                <div
                    className="absolute inset-0 bg-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    role="img"
                    aria-label={character.name}
                    style={{ backgroundImage: `url(${character.imageSrc})`, backgroundPosition: "center top" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-bold text-white sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px] lg:left-4 lg:top-4 lg:px-3 lg:text-[11px]"
                    style={{ backgroundColor: character.accent }}
                >
                    {character.series}
                </span>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 lg:bottom-4 lg:left-4 lg:right-4">
                    <p className="text-[15px] font-bold leading-tight text-white sm:text-[18px] lg:text-[22px]">{character.name}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-white/75 sm:mt-1 sm:text-[11px] lg:text-[12px]">굿즈 모아보기</p>
                </div>
            </div>
        </Link>
    );
}

function CharacterCollectionSection() {
    return (
        <section className="py-12 sm:py-16 lg:py-20">
            <Inner>
                <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
                    <div>
                        <h2 className="text-[22px] font-bold leading-tight text-[#15121d] sm:text-[28px] lg:text-[32px]">
                            최애를 만나러 가는길
                        </h2>
                        <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#8a8494] sm:text-[16px] lg:text-[18px]">
                            좋아하는 캐릭터의 굿즈만 골라서 만나보세요
                        </p>
                    </div>
                    <Link href="/store/series" className="shrink-0 text-right text-[12px] font-semibold text-[#7865ff] sm:text-[15px] lg:text-[16px]">
                        전체 시리즈 보기 →
                    </Link>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 lg:gap-8">
                    {characterCollections.map((character) => (
                        <CharacterCard key={character.name} character={character} />
                    ))}
                </div>
            </Inner>
        </section>
    );
}

function CollectionBanner() {
    return (
        <section className="pb-14 sm:pb-18 lg:pb-24 pt-[80px]">
            <Inner>
                <div className="relative overflow-hidden rounded-[16px] bg-[#dedede] sm:rounded-[24px]">
                    <ImageSlot
                        src="images/store/store-main-rare.png"
                        alt="Hololive Anniversary Set"
                        className="h-[280px] w-full object-cover sm:h-[340px] lg:h-[400px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
                    <div className="absolute left-5 right-5 top-1/2 max-w-[560px] -translate-y-1/2 sm:left-10 sm:right-auto lg:left-20">
                        <h2 className="text-[24px] font-bold leading-tight text-white sm:text-[28px] lg:text-[32px]">
                            지금만 만날 수 있는 한정판 굿즈
                        </h2>
                        <p className="mt-3 text-[13px] font-medium leading-relaxed text-white/80 sm:text-[16px] lg:text-[18px]">
                            수량 한정! 지금 바로 만나보세요
                            망설이는 순간 품절될지도 몰라요
                        </p>
                        <button className="mt-6 rounded-[10px] bg-white px-5 py-3 text-[13px] font-semibold text-[#7865ff] shadow-[0_10px_24px_rgba(0,0,0,0.15)] sm:mt-8 sm:px-8 sm:py-3.5 sm:text-[15px] lg:px-10 lg:py-4 lg:text-[16px]">
                            <Link href="/store/rare">한정판 보러가기</Link>
                        </button>
                    </div>
                </div>
            </Inner>
        </section>
    );
}

export default function StoreBanner() {
    return (
        <div className="inner">
            <StoreSearchBar />
            {/* OTT 최근 시청 기반 굿즈 — 최상단 */}
            <OttRecommendSection />
            <FeaturedRecent />
            <CategoryStrip />
            <BestTopSection />
            <ProductSeriesSection
                title="포켓몬 굿즈"
                subtitle={`지금 가장 사랑받는 포켓몬 굿즈\n피카츄부터 이브이까지, 인기 아이템 한곳에`}
                series="포켓몬"
                products={pokemonProducts}
            />
            <ProductSeriesSection
                title="홀로라이브 굿즈"
                subtitle="오늘도 최애를 가장 가까이"
                series="홀로라이브"
                products={hololiveProducts}
            />
            <CharacterCollectionSection />
            <CollectionBanner />
        </div>
    );
}