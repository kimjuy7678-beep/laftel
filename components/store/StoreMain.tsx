"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { StoreCategory, StoreMainProduct, StoreMainSourceProduct } from "@/types/store";
import { RECENT_STORE_PRODUCT_IDS_KEY } from "@/types/store";
import { StoreSearchBar } from "@/components/store/StoreSearch";
import { BEST_PRODUCTS } from "@/lib/storeBestRanking";
import products from "@/data/store.json";

// ─── Typography System ────────────────────────────────────────────────────────
// title      : 20px  font-semibold
// sub        : 11px / 13px  (상황별 사용)
// section title : 32px  font-bold
// section sub   : 18px  font-medium
// all-btn    : 16px  font-semibold

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

const characterCollections = [
    { name: "히나타 쇼요", keyword: "히나타", series: "하이큐", imageSrc: "/images/store/characters/hinata.png", accent: "#f5a623" },
    { name: "고죠 사토루", keyword: "고죠", series: "주술회전", imageSrc: "/images/store/characters/gojo.png", accent: "#74b9ff" },
    { name: "카마도 탄지로", keyword: "탄지로", series: "귀멸의 칼날", imageSrc: "/images/store/characters/tanjiro.png", accent: "#2fbf71" },
    { name: "프리렌", keyword: "프리렌", series: "장송의 프리렌", imageSrc: "/images/store/characters/frieren.png", accent: "#c8a87a" },
    { name: "하츠네 미쿠", keyword: "미쿠", series: "하츠네미쿠", imageSrc: "/images/store/characters/miku.png", accent: "#31c7c7" },
];

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
    return () => window.removeEventListener("storage", onStoreChange);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// inner 래퍼: max-w-[1770px]
function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mx-auto w-full max-w-[1770px] px-[75px] ${className}`}>
            {children}
        </div>
    );
}

// ─── MiniProductCard ──────────────────────────────────────────────────────────

function MiniProductCard({ product }: { product: StoreMainProduct }) {
    return (
        <Link href={`/store/${product.id}`} className="block min-w-0">
            <ImageSlot
                src={product.imageSrc}
                alt={product.title}
                className="aspect-square w-full rounded-[8px]"
            />
            {/* sub: 13px */}
            <p className="mt-2 truncate text-[13px] text-[#17151f]">{product.title}</p>
            {/* sub: 11px */}
            <p className="text-[11px] font-bold text-[#7865ff]">{product.price}</p>
        </Link>
    );
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
        <section className="mt-10">
            <Inner>
                <div className="rounded-[28px] border border-[#ebe8ff] bg-[#f8f6ff] px-10 py-8">
                    <div className="mb-7 flex items-center justify-between">
                        {/* title: 20px */}
                        <h2 className="text-[20px] font-semibold text-[#14111c]">최근본상품</h2>
                        {/* all-btn: 16px */}
                        <Link href="/store" className="text-[16px] font-semibold text-[#7865ff]">
                            더보기
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-7">
                        {recentProducts.map((product) => (
                            <MiniProductCard key={product.id} product={product} />
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
        <section className="mt-20">
            <Inner>
                <div className="grid grid-cols-4 gap-8 sm:grid-cols-8">
                    {categories.map((category) => (
                        <Link key={category.slug} href={seriesHref(category.name)} className="flex flex-col items-center gap-3">
                            <div
                                className={`relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full  shadow-[0_8px_20px_rgba(20,16,44,0.22)]`}
                            >
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
                            {/* sub: 13px */}
                            <span className="text-[13px] font-semibold text-[#15121d]">{category.name}</span>
                        </Link>
                    ))}
                </div>
            </Inner>
        </section>
    );
}

// ─── TopProductCard ───────────────────────────────────────────────────────────

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
            <span className="pointer-events-none absolute -bottom-1 left-[-2px] text-[88px] font-light leading-none text-transparent [-webkit-text-stroke:1px_#8f7cff]">
                {rank}
            </span>
            <div className="relative mt-3 pl-12">
                {/* title: 20px */}
                <p className="truncate text-[20px] font-semibold text-[#111018]">{product.title}</p>
                {/* sub: 13px */}
                <p className="mt-1 text-[13px] font-medium text-[#7865ff]">{product.price}</p>
            </div>
        </Link >
    );
}

// ─── BestTopSection ───────────────────────────────────────────────────────────

function BestTopSection() {
    return (
        <section className="mt-24 bg-[#fafafa] py-20">
            <Inner>
                <div className="mb-3 flex items-end justify-between">
                    <div>
                        {/* section title: 32px */}
                        <h2 className="text-[32px] font-bold leading-none tracking-wide text-[#16121f]">
                            BEST-TOP 50
                        </h2>
                        {/* section sub: 18px */}
                        <p className="mt-2 text-[18px] font-medium text-[#8a8494]">
                            팬들이 가장 사랑한 굿즈
                        </p>
                    </div>
                    {/* all-btn: 16px */}
                    <Link href="/store/best" className="text-[16px] font-semibold text-[#7865ff]">
                        베스트 굿즈 전체보기 →
                    </Link>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-5">
                    {topProducts.map((product, index) => (
                        <TopProductCard key={product.id} product={product} rank={index + 1} />
                    ))}
                </div>
            </Inner>
        </section>
    );
}

// ─── CharacterSection ────────────────────────────────────────────────────────

function CharacterCard({ character }: { character: (typeof characterCollections)[number] }) {
    return (
        <Link href={characterHref(character.series, character.keyword)} className="group block min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] border border-[#ebe8ff] bg-[#f5f3ff]">
                <div
                    className="absolute inset-0 bg-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    role="img"
                    aria-label={character.name}
                    style={{
                        backgroundImage: `url(${character.imageSrc})`,
                        backgroundPosition: "center top",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span
                    className="absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: character.accent }}
                >
                    {character.series}
                </span>
                <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-[22px] font-bold leading-tight text-white">{character.name}</p>
                    <p className="mt-1 text-[12px] font-semibold text-white/75">굿즈 모아보기</p>
                </div>
            </div>
        </Link>
    );
}

function CharacterCollectionSection() {
    return (
        <section className="py-20">
            <Inner>
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        {/* section title: 32px */}
                        <h2 className="text-[32px] font-bold leading-none text-[#15121d]">
                            최애를 만나러 가는길
                        </h2>
                        {/* section sub: 18px */}
                        <p className="mt-2 text-[18px] font-medium text-[#8a8494]">
                            좋아하는 캐릭터의 굿즈만 골라서 만나보세요
                        </p>
                    </div>
                    {/* all-btn: 16px */}
                    <Link href="/store/series" className="text-[16px] font-semibold text-[#7865ff]">
                        전체 시리즈 보기 →
                    </Link>
                </div>
                <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
                    {characterCollections.map((character) => (
                        <CharacterCard key={character.name} character={character} />
                    ))}
                </div>
            </Inner>
        </section>
    );
}

// ─── CollectionBanner ─────────────────────────────────────────────────────────

function CollectionBanner() {
    return (
        <section className="pb-24">
            <Inner>
                <div className="relative overflow-hidden rounded-[24px] bg-[#dedede]">
                    <ImageSlot
                        src=""
                        alt="Hololive Anniversary Set"
                        className="h-[400px] w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                    <div className="absolute left-12 top-1/2 max-w-[560px] -translate-y-1/2 sm:left-20">
                        {/* section title: 32px */}
                        <h2 className="text-[32px] font-bold leading-tight text-white">
                            Complete Your Collection with the Hololive Anniversary Set
                        </h2>
                        {/* section sub: 18px */}
                        <p className="mt-3 text-[18px] font-medium text-white/80">
                            한정판 굿즈를 지금 바로 만나보세요
                        </p>
                        {/* all-btn: 16px */}
                        <button className="mt-8 rounded-[10px] bg-white px-10 py-4 text-[16px] font-semibold text-[#7865ff] shadow-[0_10px_24px_rgba(0,0,0,0.15)]">
                            Explore Collection
                        </button>
                    </div>
                </div>
            </Inner>
        </section>
    );
}

// ─── Main Banner ──────────────────────────────────────────────────────────────

export default function StoreBanner() {
    return (
        <div className="inner">
            <StoreSearchBar />
            <FeaturedRecent />
            <CategoryStrip />
            <BestTopSection />
            <CharacterCollectionSection />
            <CollectionBanner />
        </div>
    );
}
