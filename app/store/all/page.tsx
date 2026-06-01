"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import products from "@/data/store.json";
import { useAuthStore } from "@/store/useAuthStore";
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/firebase/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoreProduct = {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    soldout: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_PRODUCTS = products as StoreProduct[];
const STORE_PRODUCTS = ALL_PRODUCTS.filter((p) => !p.title.includes("[예약]"));
const ITEMS_PER_PAGE = 8;
const PAGE_GROUP = 5;

const COLOR_OPTIONS = [
    { label: "보라", value: "purple", hex: "#7865ff" },
    { label: "노랑", value: "yellow", hex: "#FFE135" },
    { label: "핑크", value: "pink", hex: "#FF7EB3" },
    { label: "브라운", value: "brown", hex: "#8B5E3C" },
    { label: "민트", value: "mint", hex: "#3DDBA4" },
    { label: "빨강", value: "red", hex: "#FF2D55" },
];

const STORE_MENU = [
    { label: "전체 굿즈", path: "/store/all", icon: "grid" },
    { label: "신규 입고", path: "/store/new", icon: "sparkle" },
    { label: "인기 상품", path: "/store/best", icon: "fire" },
    { label: "한정판", path: "/store/limited", icon: "star" },
    { label: "위시리스트", path: "/store/wishlist", icon: "heart" },
];

const CATEGORY_MENU = [
    { label: "아크릴 스탠드", path: "/store/all?category=acrylic", icon: "box" },
    { label: "클리어 파일", path: "/store/all?category=clearfile", icon: "file" },
    { label: "뱃지·핀", path: "/store/all?category=badge", icon: "badge" },
    { label: "포스터", path: "/store/all?category=poster", icon: "image" },
    { label: "스티커·엽서", path: "/store/all?category=sticker", icon: "tag" },
    { label: "키링", path: "/store/all?category=keyring", icon: "key" },
];

const RECENT_SERIES = [
    { label: "사카모토 데이즈", badge: "NEW", badgeBg: "#7865ff", badgeColor: "white", dot: "#ff4d6d" },
    { label: "주술회전", badge: "+2", badgeBg: "#e8e4f8", badgeColor: "#6b64a0", dot: "#7865ff" },
    { label: "귀멸의 칼날", badge: "NEW", badgeBg: "#7865ff", badgeColor: "white", dot: "#22c55e" },
    { label: "나의 히어로 아카데미아", badge: "+1", badgeBg: "#e8e4f8", badgeColor: "#6b64a0", dot: "#f59e0b" },
];

function parsePrice(priceStr: string): number {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
}

// ─── SVG 아이콘 ───────────────────────────────────────────────────────────────

function Icon({ name, size = 16 }: { name: string; size?: number }) {
    const icons: Record<string, React.ReactNode> = {
        grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
        sparkle: <><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" /><path d="M19 16l.75 2.25L22 19l-2.25.75L19 22l-.75-2.25L16 19l2.25-.75z" /></>,
        fire: <path d="M12 2c0 0-5 4-5 9a5 5 0 0010 0c0-3-2-6-2-6s-1 2-2 2c-1 0-1-5-1-5z" />,
        star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
        heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
        box: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
        file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
        badge: <><circle cx="12" cy="12" r="10" /><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" /></>,
        image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
        tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
        key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></>,
    };
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {icons[name]}
        </svg>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ImageSlot({ src, alt, className }: { src: string; alt: string; className: string }) {
    if (!src) return <div className={`${className} bg-[#eeeeef]`} aria-label={alt} />;
    return (
        <div className={className} role="img" aria-label={alt}
            style={{ backgroundImage: `url(${src})`, backgroundPosition: "center", backgroundSize: "cover" }} />
    );
}

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mx-auto w-full max-w-[1770px] px-[75px] ${className}`}>
            {children}
        </div>
    );
}

// ─── StoreSidebar ─────────────────────────────────────────────────────────────

function StoreSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <>
            {/* 딤 */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                    onClick={onClose}
                />
            )}
            {/* 패널 */}
            <div className={`fixed left-0 top-0 z-50 h-full w-[420px] overflow-y-auto bg-white shadow-[4px_0_32px_rgba(20,16,44,0.13)] transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="px-5 pb-8 pt-6">

                    {/* 헤더 */}
                    <div className="mb-6 flex items-center justify-between">
                        <p className="text-[20px] font-extrabold tracking-wider text-[#7865ff]">STORE</p>
                        <button onClick={onClose} className="text-[#9b94b2] hover:text-[#3d3755]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* STORE 메뉴 */}
                    <Link href="/store/all" onClick={onClose}
                        className="mb-1 flex items-center gap-3 rounded-[10px] bg-[#f0eeff] px-3 py-2.5">
                        <span className="text-[#7865ff]"><Icon name="grid" size={16} /></span>
                        <span className="text-[14px] font-semibold text-[#7865ff]">전체 굿즈</span>
                    </Link>
                    {STORE_MENU.slice(1).map((m) => (
                        <Link key={m.label} href={m.path} onClick={onClose}
                            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[#7865ff] transition hover:bg-[#f8f6ff]">
                            <Icon name={m.icon} size={16} />
                            <span className="text-[14px]">{m.label}</span>
                        </Link>
                    ))}

                    {/* 구분선 */}
                    <div className="my-5 border-t border-[#f0edf8]" />

                    {/* CATEGORY */}
                    <p className="mb-3 text-[11px] font-extrabold tracking-[0.12em] text-[#7865ff]">CATEGORY</p>
                    {CATEGORY_MENU.map((c) => (
                        <Link key={c.label} href={c.path} onClick={onClose}
                            className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition hover:bg-[#f8f6ff]">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0eeff] text-[#7865ff]">
                                <Icon name={c.icon} size={14} />
                            </span>
                            <span className="text-[13px] text-[#3d3755]">{c.label}</span>
                        </Link>
                    ))}

                    {/* 구분선 */}
                    <div className="my-5 border-t border-[#f0edf8]" />

                    {/* 최신 업데이트 */}
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[13px] font-bold text-[#16121f]">최신업데이트</p>
                        <div className="flex items-center gap-1">
                            <span className="rounded-full bg-[#7865ff] px-2 py-0.5 text-[9px] font-bold text-white">NEW</span>
                            <span className="text-[12px] text-[#9b94b2]">›</span>
                        </div>
                    </div>
                    {RECENT_SERIES.map((s) => (
                        <Link key={s.label} href="#" onClick={onClose}
                            className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 transition hover:bg-[#f8f6ff]">
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[6px] bg-[#e8e4f8]" />
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
                            <span className="flex-1 truncate text-[12px] text-[#3d3755]">{s.label}</span>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
                                style={{ backgroundColor: s.badgeBg, color: s.badgeColor }}>
                                {s.badge}
                            </span>
                            <span className="text-[11px] text-[#c0bcd0]">›</span>
                        </Link>
                    ))}

                    {/* 구분선 */}
                    <div className="my-5 border-t border-[#f0edf8]" />

                    {/* 시리즈 배너 */}
                    <Link href="/store" onClick={onClose}
                        className="flex items-center gap-3 rounded-[14px] bg-[#ede9ff] px-4 py-3 transition hover:bg-[#e0daff]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7865ff]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-[12px] font-bold text-[#3d2fa0]">전체 시리즈 보러가기</p>
                            <p className="text-[10px] text-[#7865ff]">236개 시리즈의 모든 굿즈를 확인해보세요.</p>
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7865ff] text-[12px] text-white">›</span>
                    </Link>

                    {/* 이벤트 배너 */}
                    <Link href="#" onClick={onClose}
                        className="mt-2.5 flex items-center gap-3 rounded-[14px] bg-[#f5f3ff] px-4 py-3 transition hover:bg-[#ede9ff]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8e4f8]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7865ff" strokeWidth="2">
                                <path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="mb-0.5">
                                <span className="rounded-full bg-[#e8e4f8] px-2 py-0.5 text-[9px] font-bold text-[#7865ff]">진행중</span>
                            </div>
                            <p className="text-[12px] font-bold text-[#3d2fa0]">이벤트 진행 중!</p>
                            <p className="text-[10px] text-[#7865ff]">다양한 할인과 특별 혜택을 놓치지 마세요</p>
                        </div>
                        <span className="text-[12px] text-[#9b94b2]">›</span>
                    </Link>

                </div>
            </div>
        </>
    );
}

// ─── WishButton ───────────────────────────────────────────────────────────────

function WishButton({ productId }: { productId: string }) {
    const { user } = useAuthStore();
    const [wished, setWished] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const data = snap.data();
            const wishlist: string[] = data?.wishlist || [];
            if (wishlist.includes(productId)) setWished(true);
        })();
    }, [user?.uid, productId]);

    const toggleWish = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user?.uid) {
            console.log("🚫 [Wishlist] 로그인이 필요합니다.");
            alert("찜하기는 로그인 후 이용할 수 있어요!");
            return;
        }
        setLoading(true);
        try {
            const ref = doc(db, "users", user.uid!);
            if (wished) {
                await setDoc(ref, { wishlist: arrayRemove(productId) }, { merge: true });
                setWished(false);
                console.log(`💔 [Wishlist REMOVE] uid=${user.uid} | productId=${productId}`);
            } else {
                await setDoc(ref, { wishlist: arrayUnion(productId) }, { merge: true });
                setWished(true);
                console.log(`❤️  [Wishlist ADD] uid=${user.uid} | productId=${productId} | user=${user.name || user.email}`);
            }
        } catch (err) {
            console.error("🔥 [Wishlist ERROR]", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button onClick={toggleWish} disabled={loading} aria-label="찜하기"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${wished
                ? "bg-[#ff4d6d] text-white shadow-[0_2px_8px_rgba(255,77,109,0.45)]"
                : "bg-white text-[#b0aabb] hover:text-[#ff4d6d] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        </button>
    );
}

// ─── CartButton ───────────────────────────────────────────────────────────────

function CartButton({ productId }: { productId: string }) {
    const { user } = useAuthStore();

    const addToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user?.uid) {
            console.log("🚫 [Cart] 로그인이 필요합니다.");
            alert("장바구니는 로그인 후 이용할 수 있어요!");
            return;
        }
        try {
            const ref = doc(db, "users", user.uid!);
            await setDoc(ref, { cart: arrayUnion(productId) }, { merge: true });
            console.log(`🛒 [Cart ADD] uid=${user.uid} | productId=${productId} | user=${user.name || user.email}`);
            alert("장바구니에 담겼어요!");
        } catch (err) {
            console.error("🔥 [Cart ERROR]", err);
        }
    };

    return (
        <button onClick={addToCart} aria-label="장바구니 담기"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#b0aabb] shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-all duration-200 hover:text-[#7865ff]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
        </button>
    );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: StoreProduct }) {
    const displayPrice = product.soldout ? "품절" : product.price;
    const isReserve = product.title.includes("[예약]");
    const displayTitle = product.title.replace("[예약]", "").trim();

    return (
        <Link href={`/store/${product.productId}`} className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#eeeeef]">
                <ImageSlot src={product.thumbnail} alt={product.title}
                    className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]" />
                {isReserve && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#ff6b35] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(255,107,53,0.4)]">예약</span>
                )}
                {product.soldout && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">품절</span>
                    </div>
                )}
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                    <WishButton productId={product.productId} />
                    <CartButton productId={product.productId} />
                </div>
            </div>
            <div className="mt-3">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-[1.4] text-[#17151f]">{displayTitle}</p>
                <p className={`mt-1.5 text-[15px] font-bold ${product.soldout ? "text-[#aaa]" : "text-[#111018]"}`}>{displayPrice}</p>
            </div>
        </Link>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>
            )}
            {pages.map((p) => (
                <button key={p} onClick={() => onChange(p)}
                    className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${p === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "bg-white border border-[#d8d4ee] text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                    {p}
                </button>
            ))}
            {hasNextGroup && (
                <button onClick={() => onChange(groupEnd + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">···</button>
            )}
            <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

const PRICE_MIN = 0;
const PRICE_MAX = 350000;

function FilterDropdown({ open, priceRange, onPriceRange, selectedColor, onColor, onReset }: {
    open: boolean;
    priceRange: [number, number];
    onPriceRange: (v: [number, number]) => void;
    selectedColor: string | null;
    onColor: (v: string | null) => void;
    onReset: () => void;
}) {
    const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
    const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
        onPriceRange([Math.min(Number(e.target.value), priceRange[1] - 1000), priceRange[1]]);
    };
    const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
        onPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 1000)]);
    };

    if (!open) return null;

    return (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-[16px] border border-[#e2ddf5] bg-white p-5 shadow-[0_8px_32px_rgba(30,24,70,0.14)]">
            <p className="text-[13px] font-semibold text-[#16121f]">가격별로 보기</p>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-[#ddd8f4] bg-[#faf9ff] text-[11px] font-medium text-[#3d3755]">
                    ₩{priceRange[0].toLocaleString()}
                </div>
                <span className="text-[10px] text-[#c0bcd0]">—</span>
                <div className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-[#ddd8f4] bg-[#faf9ff] text-[11px] font-medium text-[#3d3755]">
                    ₩{priceRange[1].toLocaleString()}
                </div>
            </div>
            <div className="relative mt-4 h-[6px] w-full">
                <div className="absolute inset-0 rounded-full bg-[#e2ddf5]" />
                <div className="absolute h-full rounded-full bg-[#7865ff]"
                    style={{ left: `${pct(priceRange[0])}%`, right: `${100 - pct(priceRange[1])}%` }} />
                <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={1000} value={priceRange[0]} onChange={handleMin}
                    className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7865ff] [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(120,101,255,0.4)] [&::-webkit-slider-thumb]:cursor-pointer" />
                <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={1000} value={priceRange[1]} onChange={handleMax}
                    className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7865ff] [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(120,101,255,0.4)] [&::-webkit-slider-thumb]:cursor-pointer" />
            </div>
            <div className="my-4 border-t border-[#f0edf8]" />
            <p className="text-[13px] font-semibold text-[#16121f]">색상</p>
            <div className="mt-3 flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                    <button key={c.value} onClick={() => onColor(selectedColor === c.value ? null : c.value)} title={c.label}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 ${selectedColor === c.value ? "ring-2 ring-offset-2 ring-[#7865ff]" : ""}`}
                        style={{ backgroundColor: c.hex }}>
                        {selectedColor === c.value && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                    </button>
                ))}
            </div>
            <button onClick={onReset}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#ddd8f4] py-2 text-[12px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                </svg>
                초기화
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StoreListPage() {
    const { user } = useAuthStore();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("인기순");
    const [filterOpen, setFilterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 300000]);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    const filtered = STORE_PRODUCTS.filter((p) => {
        const price = parsePrice(p.price);
        const matchSearch =
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase());
        const matchPrice = p.soldout || (price >= priceRange[0] && price <= priceRange[1]);
        const matchColor = !selectedColor ||
            p.title.toLowerCase().includes(COLOR_OPTIONS.find(c => c.value === selectedColor)?.label.toLowerCase() ?? "") ||
            p.category.toLowerCase().includes(COLOR_OPTIONS.find(c => c.value === selectedColor)?.label.toLowerCase() ?? "");
        return matchSearch && matchPrice && matchColor;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
        if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [search, priceRange, selectedColor, sort]);

    useEffect(() => {
        if (user) {
            console.log("👤 [Auth] 로그인 유저 정보:", { uid: user.uid, name: user.name, email: user.email, membership: user.membership, points: user.points });
        } else {
            console.log("👻 [Auth] 비로그인 상태");
        }
    }, [user]);

    const handleReset = () => {
        setPriceRange([0, 300000]);
        setSelectedColor(null);
    };

    const activeFilterCount = [
        priceRange[0] > 0 || priceRange[1] < 300000,
        selectedColor !== null,
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* 사이드바 */}
            <StoreSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* ── 전체 카테고리 바 ── */}
            <div className="border-b border-[#ebe8ff] bg-white py-3">
                <Inner>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex items-center gap-2 text-[14px] text-[#3d3755] transition hover:text-[#7865ff]"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                        전체 카테고리
                    </button>
                </Inner>
            </div>

            {/* ── 페이지 헤더 ── */}
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
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </Inner>
            </div>

            {/* ── 상품 수 + 정렬 ── */}
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
                            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>
                        <div className="relative">
                            <button onClick={() => setFilterOpen((v) => !v)}
                                className={`relative flex h-[38px] items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition ${activeFilterCount > 0 || filterOpen
                                    ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]"
                                    : "border-[#ddd8f4] bg-white text-[#3d3755] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                                </svg>
                                필터
                                {activeFilterCount > 0 && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7865ff] text-[10px] font-bold text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                            <FilterDropdown open={filterOpen} priceRange={priceRange} onPriceRange={setPriceRange}
                                selectedColor={selectedColor} onColor={setSelectedColor} onReset={handleReset} />
                        </div>
                    </div>
                </div>
            </Inner>

            {/* ── 상품 그리드 ── */}
            <Inner className="mt-6">
                {paginated.length === 0 ? (
                    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[15px] text-[#9b94b2]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        검색 결과가 없어요.
                        {(search || activeFilterCount > 0) && (
                            <button onClick={() => { setSearch(""); handleReset(); }} className="text-[13px] text-[#7865ff] underline">
                                필터 초기화
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-x-6 gap-y-10">
                        {paginated.map((product) => (
                            <ProductCard key={product.productId} product={product} />
                        ))}
                    </div>
                )}
                {totalPages > 1 && (
                    <Pagination current={page} total={totalPages} onChange={setPage} />
                )}
            </Inner>
        </div>
    );
}