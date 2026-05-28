"use client"
import { useState } from "react"
import products from "@/data/store.json"

// ─── 타입 ───────────────────────────────────────────────
interface Product {
    productId: string
    category: string
    title: string
    price: string
    thumbnail: string
    soldout: boolean
    isNew?: boolean
    badge?: string
}

const PRODUCTS = products as Product[]

const CATEGORIES = ["전체", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))]

const ANIMES = ["전체", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))]

const BANNERS = [
    { id: 1, label: "2026 여름 한정", title: "썸머\n컬렉션", sub: "지금만 만날 수 있는 시즌 굿즈", color: "from-[#1a0a3a] to-[#3d1080]", accent: "#a78bff" },
    { id: 2, label: "신규 입고", title: "신작\n굿즈 입고", sub: "새로 들어온 따끈따끈한 굿즈", color: "from-[#0a1a3a] to-[#104080]", accent: "#60a5fa" },
    { id: 3, label: "커스텀 제작", title: "나만의\n굿즈 만들기", sub: "좋아하는 장면으로 직접 제작", color: "from-[#1a0a1a] to-[#3a0860]", accent: "#f472b6" },
]

// ─── 카드 컴포넌트 ────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
    const [wished, setWished] = useState(false)

    return (
        <div className="group relative flex flex-col bg-[#16161f] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/20">
            <div className="relative aspect-square overflow-hidden bg-[#0d0d16]">
                <img
                    src={product.thumbnail}
                    alt={product.title}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${product.soldout ? "brightness-40 grayscale" : ""}`}
                />
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                    {product.isNew && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500 text-white tracking-wider">NEW</span>
                    )}
                    {product.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500 text-white tracking-wider">{product.badge}</span>
                    )}
                    {product.soldout && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-white/60 tracking-wider">품절</span>
                    )}
                </div>
                <button
                    onClick={() => setWished(!wished)}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <span className={`text-sm ${wished ? "text-pink-400" : "text-white/40"}`}>
                        {wished ? "♥" : "♡"}
                    </span>
                </button>
            </div>
            <div className="p-3.5 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-purple-400 tracking-wider uppercase">{product.category}</span>
                <p className="text-xs text-white/80 leading-snug line-clamp-2 font-medium">{product.title}</p>
                <div className="flex items-center justify-between mt-1">
                    <span className={`text-sm font-bold ${product.soldout ? "text-white/30" : "text-white"}`}>
                        {product.soldout ? "품절" : product.price}
                    </span>
                    {!product.soldout && (
                        <button className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 transition-colors font-medium">
                            담기
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function StorePage() {
    const [bannerIdx, setBannerIdx] = useState(0)
    const [activeCategory, setActiveCategory] = useState("전체")
    const [activeAnime, setActiveAnime] = useState("전체")
    const [sort, setSort] = useState("최신순")

    const banner = BANNERS[bannerIdx]

    const filtered = PRODUCTS
        .filter((p) => activeCategory === "전체" || p.category === activeCategory)
        .filter((p) => activeAnime === "전체" || p.category === activeAnime)
        .sort((a, b) => {
            if (sort === "낮은 가격순") return parseInt(a.price) - parseInt(b.price)
            if (sort === "높은 가격순") return parseInt(b.price) - parseInt(a.price)
            return 0
        })

    return (
        <div className="min-h-screen bg-[#0d0d12] text-white">

            {/* 히어로 배너 */}
            <section className="relative h-64 md:h-80 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${banner.color} transition-all duration-700`} />
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse 50% 70% at 70% 50%, ${banner.accent}22 0%, transparent 60%)` }}
                />
                <div className="relative z-10 h-full flex items-center px-8 md:px-16">
                    <div className="flex-1">
                        <span
                            className="inline-block text-[10px] font-bold tracking-widest px-3 py-1 rounded-full mb-4 border"
                            style={{ color: banner.accent, borderColor: `${banner.accent}66`, background: `${banner.accent}15` }}
                        >
                            {banner.label}
                        </span>
                        <h2
                            className="text-4xl md:text-5xl font-black leading-tight mb-3 whitespace-pre-line"
                            style={{ color: banner.accent }}
                        >
                            {banner.title}
                        </h2>
                        <p className="text-white/50 text-sm">{banner.sub}</p>
                        <button
                            className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                            style={{ background: `${banner.accent}33`, border: `1px solid ${banner.accent}66` }}
                        >
                            지금 보기 →
                        </button>
                    </div>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {BANNERS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setBannerIdx(i)}
                            className={`rounded-full transition-all ${i === bannerIdx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30"}`}
                        />
                    ))}
                </div>
            </section>

            {/* 공지 */}
            <div className="bg-[#13131a] border-y border-white/5 px-8 py-2.5 flex items-center gap-3 text-xs">
                <span className="shrink-0 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold tracking-wider">공지</span>
                <p className="text-white/40 truncate">예약 상품은 발매 이후 순차 배송됩니다. 예약 마감일 전에 취소 가능합니다.</p>
            </div>

            <div className="flex">
                {/* 사이드바 */}
                <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/5 bg-[#0f0f18] sticky top-0 h-screen overflow-y-auto py-8 px-4 gap-8">
                    <div>
                        <p className="text-[10px] font-bold tracking-widest text-white/30 mb-3 px-2">CATEGORY</p>
                        <ul className="flex flex-col gap-0.5">
                            {CATEGORIES.map((cat, id) => (
                                <li key={id}>
                                    <button
                                        onClick={() => setActiveCategory(cat)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${activeCategory === cat
                                            ? "bg-purple-600/20 text-purple-300 font-semibold"
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        {cat}
                                        {cat !== "전체" && (
                                            <span className="ml-1.5 text-[10px] opacity-50">
                                                {PRODUCTS.filter((p) => p.category === cat).length}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold tracking-widest text-white/30 mb-3 px-2">ANIME</p>
                        <ul className="flex flex-col gap-0.5">
                            {ANIMES.map((anime) => (
                                <li key={anime}>
                                    <button
                                        onClick={() => setActiveAnime(anime)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${activeAnime === anime
                                            ? "bg-pink-600/15 text-pink-300 font-semibold"
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        {anime}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mx-1 p-4 rounded-xl border border-pink-500/20 bg-pink-500/5 text-center">
                        <p className="text-xl mb-2">✏️</p>
                        <p className="text-xs font-bold text-pink-300 mb-1">커스텀 굿즈</p>
                        <p className="text-[10px] text-white/30 leading-relaxed mb-3">직접 고른 장면으로<br />나만의 굿즈를 만들어요</p>
                        <button className="w-full py-1.5 rounded-lg text-[11px] font-bold border border-pink-500/40 text-pink-300 hover:bg-pink-500/10 transition-colors">
                            제작하기 →
                        </button>
                    </div>
                </aside>

                {/* 컨텐츠 */}
                <main className="flex-1 px-6 md:px-10 py-8">

                    {/* 모바일 필터 */}
                    <div className="lg:hidden mb-6 flex flex-col gap-3">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${activeCategory === cat
                                        ? "bg-purple-600 border-purple-600 text-white"
                                        : "border-white/10 text-white/40 hover:text-white"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {ANIMES.map((anime) => (
                                <button
                                    key={anime}
                                    onClick={() => setActiveAnime(anime)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${activeAnime === anime
                                        ? "bg-pink-600 border-pink-600 text-white"
                                        : "border-white/10 text-white/40 hover:text-white"
                                        }`}
                                >
                                    {anime}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold">
                                {activeAnime !== "전체" ? activeAnime : activeCategory !== "전체" ? activeCategory : "전체 굿즈"}
                            </h2>
                            <span className="text-sm text-white/30">{filtered.length}개</span>
                        </div>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="text-xs bg-[#16161f] border border-white/10 rounded-lg px-3 py-1.5 text-white/50 outline-none"
                        >
                            <option>최신순</option>
                            <option>낮은 가격순</option>
                            <option>높은 가격순</option>
                        </select>
                    </div>

                    {/* 그리드 */}
                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filtered.map((p, id) => (
                                <ProductCard key={id} product={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-white/20">
                            <p className="text-4xl mb-4">🎌</p>
                            <p className="text-sm">해당하는 굿즈가 없어요</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}