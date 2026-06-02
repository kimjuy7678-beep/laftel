import Link from "next/link";
import { notFound } from "next/navigation";
import products from "@/data/store.json";
import type { Product, StoreCategory } from "@/types/store";

const CATEGORIES: StoreCategory[] = [
    { name: "진격의 거인", slug: "attack-on-titan", imageSrc: "/images/store/m1.png" },
    { name: "나의 히어로 아카데미아", slug: "my-hero-academia", imageSrc: "/images/store/m2.png" },
    { name: "귀멸의 칼날", slug: "demon-slayer", imageSrc: "/images/store/m3.png" },
    { name: "하츠네미쿠", slug: "hatsune-miku", imageSrc: "/images/store/m4.png" },
    { name: "에반게리온", slug: "evangelion", imageSrc: "/images/store/m5.png" },
    { name: "하이큐", slug: "haikyu", imageSrc: "/images/store/m6.png" },
    { name: "장송의 프리렌", slug: "frieren", imageSrc: "/images/store/m7.png" },
    { name: "주술회전", slug: "jujutsu-kaisen", imageSrc: "/images/store/m8.png" },
];

const STORE_PRODUCTS = products as Product[];
const ALL_CATEGORY_NAMES = Array.from(new Set(STORE_PRODUCTS.map((product) => product.category))).filter(Boolean);
const CATEGORY_ALIASES = new Map(CATEGORIES.map((category) => [category.slug, category.name]));

function slugifyCategory(category: string) {
    return encodeURIComponent(category);
}

function resolveCategory(slug: string) {
    const aliasName = CATEGORY_ALIASES.get(slug);
    if (aliasName) return aliasName;

    const decoded = decodeURIComponent(slug);
    return ALL_CATEGORY_NAMES.find((category) => category === decoded) ?? null;
}

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mx-auto w-full max-w-[1770px] px-[75px] ${className}`}>
            {children}
        </div>
    );
}

function ProductCard({ product }: { product: Product }) {
    const displayTitle = product.title.replace("[예약]", "").trim();
    const isReserve = product.title.includes("[예약]");

    return (
        <Link href={`/store/${product.productId}`} className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#eeeeef]">
                <div
                    className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]"
                    role="img"
                    aria-label={product.title}
                    style={{
                        backgroundImage: `url(${product.thumbnail})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                    }}
                />
                {isReserve && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#ff6b35] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(255,107,53,0.4)]">
                        예약
                    </span>
                )}
                {product.soldout && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">품절</span>
                    </div>
                )}
            </div>
            <div className="mt-3">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-[1.4] text-[#17151f]">{displayTitle}</p>
                <p className={`mt-1.5 text-[15px] font-bold ${product.soldout ? "text-[#aaa]" : "text-[#111018]"}`}>
                    {product.soldout ? "품절" : product.price}
                </p>
            </div>
        </Link>
    );
}

export function generateStaticParams() {
    const params = [
        ...CATEGORIES.map((category) => category.slug),
        ...ALL_CATEGORY_NAMES.map((category) => slugifyCategory(category)),
    ];
    return Array.from(new Set(params)).map((slug) => ({ slug }));
}

export default async function StoreCategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const categoryName = resolveCategory(slug);
    if (!categoryName) return notFound();

    const categoryProducts = STORE_PRODUCTS.filter((product) => product.category === categoryName);

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="border-b border-[#ebe8ff] bg-[#f8f6ff] py-10">
                <Inner>
                    <p className="mb-4 text-[12px] text-[#9b94b2]">
                        <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                        <span className="mx-1.5">›</span>
                        <Link href="/store/all" className="hover:text-[#7865ff]">전체굿즈</Link>
                        <span className="mx-1.5">›</span>
                        <span className="font-medium text-[#7865ff]">{categoryName}</span>
                    </p>
                    <div className="flex items-end justify-between gap-6">
                        <div>
                            <h1 className="text-[32px] font-bold text-[#16121f]">{categoryName}</h1>
                            <p className="mt-2 text-[15px] text-[#8a8494]">
                                {categoryName} 관련 굿즈를 모아봤어요.
                            </p>
                        </div>
                        <Link href="/store/all" className="text-[16px] font-semibold text-[#7865ff]">
                            전체 굿즈 보기 →
                        </Link>
                    </div>
                </Inner>
            </div>

            <Inner className="mt-8">
                <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#6b647a]">
                        총 <span className="font-semibold text-[#16121f]">{categoryProducts.length}</span>개의 상품
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        {ALL_CATEGORY_NAMES.map((item) => (
                            <Link
                                key={item}
                                href={`/store/category/${slugifyCategory(item)}`}
                                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${item === categoryName
                                    ? "border-[#7865ff] bg-[#7865ff] text-white"
                                    : "border-[#ddd8f4] bg-white text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"
                                    }`}
                            >
                                {item}
                            </Link>
                        ))}
                    </div>
                </div>
            </Inner>

            <Inner className="mt-6">
                {categoryProducts.length === 0 ? (
                    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[15px] text-[#9b94b2]">
                        아직 등록된 상품이 없어요.
                        <Link href="/store/all" className="text-[13px] text-[#7865ff] underline">
                            전체 굿즈에서 다른 상품 보기
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-x-6 gap-y-10">
                        {categoryProducts.map((product) => (
                            <ProductCard key={product.productId} product={product} />
                        ))}
                    </div>
                )}
            </Inner>
        </div>
    );
}
