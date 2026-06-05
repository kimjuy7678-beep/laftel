// components/store/StoreProductCard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import LoginAlert from "@/components/store/LoginAlert";
import CartAlert from "@/components/store/CartAlert";
import WishAlert from "@/components/store/WishAlert";

export type StoreProduct = {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    soldout: boolean;
    productdetail?: string[];
};

function ImageSlot({ src, alt, className }: { src: string; alt: string; className: string }) {
    if (!src) return <div className={`${className} bg-[#eeeeef]`} aria-label={alt} />;
    return (
        <div className={className} role="img" aria-label={alt}
            style={{ backgroundImage: `url(${src})`, backgroundPosition: "center", backgroundSize: "cover" }} />
    );
}

export function WishButton({
    productId,
    title,
    thumbnail,
    disabled = false,
}: {
    productId: string;
    title: string;
    thumbnail: string;
    disabled?: boolean;
}) {
    const { user } = useAuthStore();
    const [wished, setWished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showWish, setShowWish] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const wishlist: string[] = snap.data()?.wishlist || [];
            setWished(wishlist.includes(productId));
        })();
    }, [user?.uid, productId]);

    const activeWished = Boolean(user?.uid && wished);

    const toggleWish = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (disabled) return;
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }
        setLoading(true);
        try {
            const ref = doc(db, "users", user.uid!);
            if (wished) {
                await setDoc(ref, { wishlist: arrayRemove(productId) }, { merge: true });
                setWished(false);
            } else {
                await setDoc(ref, { wishlist: arrayUnion(productId) }, { merge: true });
                setWished(true);
                setShowWish(true);
                setTimeout(() => setShowWish(false), 4000);
            }
        } catch (err) { console.error("🔥 [Wishlist ERROR]", err); }
        finally { setLoading(false); }
    };

    if (disabled) {
        return (
            <button disabled aria-label="찜하기 불가"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c8c4d4] text-[#8a8494] shadow-none cursor-not-allowed">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>
        );
    }

    return (
        <>
            <button onClick={toggleWish} disabled={loading} aria-label="찜하기"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${activeWished
                    ? "bg-[#ff4d6d] text-white shadow-[0_4px_14px_rgba(255,77,109,0.28)]"
                    : "bg-white text-[#b0aabb] shadow-[0_4px_14px_rgba(30,24,70,0.16)] hover:text-[#ff4d6d]"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={activeWished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>
            {showLogin && <LoginAlert onClose={() => setShowLogin(false)} />}
            {showWish && <WishAlert title={title} thumbnail={thumbnail} onClose={() => setShowWish(false)} />}
        </>
    );
}

function getCardOptionValues(product: StoreProduct): string[] {
    const lines = (product.productdetail ?? []).map((line) => line.trim()).filter(Boolean);
    const optionLines = lines
        .filter((line) => /^옵션\s*[A-Z0-9가-힣]?\.?\s*/.test(line))
        .map((line) => line.replace(/^옵션\s*[A-Z0-9가-힣]?\.?\s*/, "").trim())
        .filter(Boolean);
    if (optionLines.length > 0) return optionLines;

    const selectIdx = lines.findIndex((line) => /선택(하여|후)\s*구매/.test(line));
    if (selectIdx > 0) {
        const values = lines[selectIdx - 1]
            .split(/[,，、]/)
            .map((value) => value.trim())
            .filter((value) => value.length > 0 && value.length <= 30);
        if (values.length > 1) return values;
    }

    return [];
}

export function CartButton({
    productId,
    title,
    thumbnail,
    requiresOption = false,
    disabled = false,
}: {
    productId: string;
    title: string;
    thumbnail: string;
    requiresOption?: boolean;
    disabled?: boolean;
}) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [inCart, setInCart] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // ✅ 추가

    // ✅ 페이지 재진입 시(뒤로가기 포함) 알럿 상태 초기화
    useEffect(() => {
        setShowCart(false);
        setShowLogin(false);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current); // ✅ 언마운트 시 타이머 정리
        };
    }, []);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const cart = snap.data()?.cart as unknown;
            const cartItems = Array.isArray(cart) ? cart : [];
            setInCart(cartItems.some((item) => {
                if (typeof item === "string") return item === productId;
                return Boolean(
                    item &&
                    typeof item === "object" &&
                    "productId" in item &&
                    (item as { productId?: unknown }).productId === productId,
                );
            }));
        })();
    }, [user?.uid, productId]);

    const activeInCart = Boolean(user?.uid && inCart);

    const addToCart = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (disabled) return;

        if (!user?.uid) {
            setShowLogin(true);
            return;
        }

        //if (requiresOption) { router.push(`/store/${productId}`); return; }

        try {
            const ref = doc(db, "users", user.uid!);
            await setDoc(ref, { cart: arrayUnion(productId) }, { merge: true });
            setInCart(true);
            setShowCart(true);

            // ✅ useRef로 타이머 관리 → 언마운트 시 clearTimeout으로 안전하게 정리
            timerRef.current = setTimeout(() => {
                setShowCart(false);
            }, 4000);
        } catch (err) { console.error("🔥 [Cart ERROR]", err); }
    };

    if (disabled) {
        return (
            <button disabled aria-label="장바구니 담기 불가"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c8c4d4] text-[#8a8494] shadow-none cursor-not-allowed">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            </button>
        );
    }

    return (
        <>
            <button onClick={addToCart} aria-label="장바구니 담기"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${activeInCart
                    ? "bg-[#7865ff] text-white shadow-[0_4px_14px_rgba(120,101,255,0.28)]"
                    : "bg-white text-[#b0aabb] shadow-[0_4px_14px_rgba(30,24,70,0.16)] hover:text-[#7865ff]"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            </button>
            {showLogin && <LoginAlert onClose={() => setShowLogin(false)} />}
            {showCart && <CartAlert title={title} thumbnail={thumbnail} onClose={() => setShowCart(false)} />}
        </>
    );
}

export default function StoreProductCard({ product }: { product: StoreProduct }) {
    const displayPrice = product.soldout ? "품절" : product.price;
    const isReserve = product.title.includes("[예약]");
    const isSoldout = product.title.includes("[품절]") || product.soldout;
    const displayTitle = product.title.replace("[예약]", "").replace("[품절]", "").trim();
    const requiresOption = getCardOptionValues(product).length > 0 || product.title.includes("선택");

    return (
        <div className="group block min-w-0">
            {/* 이미지 영역 — 버튼은 Link 밖 */}
            <div className="relative overflow-hidden rounded-[12px] bg-[#f3f1ff]">
                <Link href={`/store/${product.productId}`} className="block">
                    <ImageSlot src={product.thumbnail} alt={product.title}
                        className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]" />
                    {isReserve && !isSoldout && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#7865ff] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(120,101,255,0.36)]">예약</span>
                    )}
                    {isSoldout && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">품절</span>
                        </div>
                    )}
                </Link>

                {/* ✅ Link 완전히 밖 — 이벤트 충돌 없음 */}
                <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
                    <WishButton productId={product.productId} title={displayTitle} thumbnail={product.thumbnail} disabled={isSoldout} />
                    <CartButton productId={product.productId} title={displayTitle} thumbnail={product.thumbnail} requiresOption={requiresOption} disabled={isSoldout} />
                </div>
            </div>

            {/* 텍스트 영역 — 별도 Link */}
            <Link href={`/store/${product.productId}`} className="block mt-3">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[#17151f]">{displayTitle}</p>
                <p className={`mt-1.5 text-[17px] font-extrabold ${isSoldout ? "text-[#aaa]" : "text-[#111018]"}`}>{displayPrice}</p>
            </Link>
        </div>
    );
}