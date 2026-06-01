import Link from "next/link";
import products from "@/data/store.json";


// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
    id: string;
    title: string;
    series?: string;
    category?: string;
    price: string;
    imageSrc: string;
    badge?: string;
};

type StoreProduct = {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    soldout: boolean;
};

type Category = {

    name: string;
    imageSrc: string;

};

// ─── Typography System ────────────────────────────────────────────────────────
// title      : 20px  font-semibold
// sub        : 11px / 13px  (상황별 사용)
// section title : 32px  font-bold
// section sub   : 18px  font-medium
// all-btn    : 16px  font-semibold

const STORE_PRODUCTS = products as StoreProduct[];

function toProduct(product: StoreProduct, badge?: string): Product {
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

const recentProducts = STORE_PRODUCTS.slice(0, 4).map((p) => toProduct(p));

const categories: Category[] = [
    { name: "진격의 거인", imageSrc: "/images/store/m1.png" },
    { name: "나의 히어로 아카데미아", imageSrc: "/images/store/m2.png" },
    { name: "귀멸의 말날", imageSrc: "/images/store/m3.png" },
    { name: "하츠네미쿠", imageSrc: "/images/store/m4.png" },
    { name: "에반게리온", imageSrc: "/images/store/m5.png" },
    { name: "하이큐", imageSrc: "/images/store/m6.png" },
    { name: "장송의 프리렌", imageSrc: "/images/store/m7.png" },
    { name: "주술회전", imageSrc: "/images/store/m8.png" },
];

const topProducts = STORE_PRODUCTS.slice(4, 8).map((p, i) =>
    toProduct(p, i === 0 ? "HOT" : i === 2 ? "NEW" : undefined),
);

const arrivalProducts = STORE_PRODUCTS.slice(8, 13).map((p, i) =>
    toProduct(p, i === 0 ? "MEGA" : i === 4 ? "HOT" : undefined),
);

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

// ─── StoreSearch ──────────────────────────────────────────────────────────────

function StoreSearch() {
    return (
        <div className="mx-auto mt-10 w-full max-w-[960px] pt-10">
            {/* Search bar */}
            <div className="flex h-[56px] items-center rounded-full border border-[#ddd8f4] bg-white px-6 shadow-[0_8px_24px_rgba(30,24,70,0.13)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#4f486d]">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                    className="h-full min-w-0 flex-1 bg-transparent px-5 text-[13px] text-[#242130] outline-none placeholder:text-[#8f8a9d]"
                    placeholder="굿즈 또는 작품명으로 검색해 보세요"
                />
                {/* all-btn: 16px */}
                <button className="border-l border-[#ddd8f4] pl-5 text-[16px] font-semibold uppercase  text-[#7865ff]">
                    Search
                </button>
            </div>
            {/* sub: 11px */}
            <p className="mt-3 text-center text-[11px] text-[#6f687d]">
                Trending:{" "}
                <span className="text-[#7865ff]">#귀멸의 칼날</span>{" "}
                <span className="text-[#7865ff]">#마루는 강쥐</span>{" "}
                <span className="text-[#7865ff]">#하이큐</span>{" "}
                <span className="text-[#7865ff]">#주술회전</span>
            </p>
        </div>
    );
}

// ─── MiniProductCard ──────────────────────────────────────────────────────────

function MiniProductCard({ product }: { product: Product }) {
    return (
        <Link href="#" className="block min-w-0">
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
    return (
        <section className="mt-10">
            <Inner>
                <div className="rounded-[28px] border border-[#ebe8ff] bg-[#f8f6ff] px-10 py-8">
                    <div className="mb-7 flex items-center justify-between">
                        {/* title: 20px */}
                        <h2 className="text-[20px] font-semibold text-[#14111c]">최근본상품</h2>
                        {/* all-btn: 16px */}
                        <Link href="#" className="text-[16px] font-semibold text-[#7865ff]">
                            더보기
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 max-w-[680px]">
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
                    {categories.map((category, id) => (
                        <Link key={id} href="#" className="flex flex-col items-center gap-3">
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

function TopProductCard({ product, rank }: { product: Product; rank: number }) {
    return (
        <Link href="#" className="group relative block min-w-0">
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
        </Link>
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
                            BEST-TOP 10
                        </h2>
                        {/* section sub: 18px */}
                        <p className="mt-2 text-[18px] font-medium text-[#8a8494]">
                            지금 가장 많이 찾는 인기 상품
                        </p>
                    </div>
                    {/* all-btn: 16px */}
                    <Link href="#" className="text-[16px] font-semibold text-[#7865ff]">
                        View All →
                    </Link>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
                    {topProducts.map((product, index) => (
                        <TopProductCard key={product.id} product={product} rank={index + 1} />
                    ))}
                </div>
            </Inner>
        </section>
    );
}

// ─── ArrivalCard ─────────────────────────────────────────────────────────────

function ArrivalCard({ product }: { product: Product }) {
    return (
        <Link href="#" className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[10px] bg-[#eeeeef]">
                <ImageSlot
                    src={product.imageSrc}
                    alt={product.title}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {product.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#8b75ff] px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                        {product.badge}
                    </span>
                )}
            </div>
            {/* sub: 11px */}
            <p className="mt-4 text-[11px] text-[#77727f]">{product.series}</p>
            {/* title: 20px */}
            <p className="mt-1 line-clamp-2 text-[20px] font-semibold leading-[1.3] text-[#111018]">
                {product.title}
            </p>
            {/* sub: 11px */}
            <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#7f7a8c]">{product.category}</p>
            {/* sub: 13px */}
            <p className="mt-2 text-[13px] font-bold text-[#111018]">{product.price}</p>
        </Link>
    );
}

// ─── NewArrivalsSection ───────────────────────────────────────────────────────

function NewArrivalsSection() {
    return (
        <section className="py-20">
            <Inner>
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        {/* section title: 32px */}
                        <h2 className="text-[32px] font-bold leading-none text-[#15121d]">
                            NEW ARRIVALS FOR POPULAR SERIES
                        </h2>
                        {/* section sub: 18px */}
                        <p className="mt-2 text-[18px] font-medium text-[#8a8494]">
                            멈추지 않는 신규 드랍과 시리즈별 신상품
                        </p>
                    </div>
                    {/* all-btn: 16px */}
                    <Link href="#" className="text-[16px] font-semibold text-[#7865ff]">
                        View All →
                    </Link>
                </div>
                <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
                    {arrivalProducts.map((product) => (
                        <ArrivalCard key={product.id} product={product} />
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
            {/* Hero Banner */}
            <section>
                {/* <Inner className="relative">
                    <button
                        type="button"
                        aria-label="이전 배너"
                        className="absolute left-[75px] top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#9b9b9b] text-2xl font-light text-white shadow-lg md:flex"
                    >
                        ‹
                    </button>

                 
                    <div className="overflow-hidden rounded-[12px] bg-[#eeeeef] shadow-[0_14px_32px_rgba(17,14,36,0.14)]">
                        <ImageSlot src="" alt="Store main banner" className="aspect-[3/1] w-full object-cover" />
                    </div>

                    <button
                        type="button"
                        aria-label="다음 배너"
                        className="absolute right-[75px] top-1/2 z-10 hidden h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#9b9b9b] text-2xl font-light text-white shadow-lg md:flex"
                    >
                        ›
                    </button>

                    <StoreSearch />
                </Inner> */}
                <>
                    <StoreSearch />
                </>

            </section>

            <FeaturedRecent />
            <CategoryStrip />
            <BestTopSection />
            <NewArrivalsSection />
            <CollectionBanner />
        </div>
    );
}
