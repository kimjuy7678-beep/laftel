// components/store/StoreProductCard.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import LoginAlert from "@/components/store/LoginAlert";
import CartAlert from "@/components/store/CartAlert";

export type StoreProduct = {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    soldout: boolean;
};

function ImageSlot({ src, alt, className }: { src: string; alt: string; className: string }) {
    if (!src) return <div className={`${className} bg-[#eeeeef]`} aria-label={alt} />;
    return (
        <div className={className} role="img" aria-label={alt}
            style={{ backgroundImage: `url(${src})`, backgroundPosition: "center", backgroundSize: "cover" }} />
    );
}

export function WishButton({ productId }: { productId: string }) {
    const { user } = useAuthStore();
    const [wished, setWished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

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
        if (!user?.uid) {
            setShowLogin(true);
            setTimeout(() => setShowLogin(false), 3000);
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
            }
        } catch (err) { console.error("🔥 [Wishlist ERROR]", err); }
        finally { setLoading(false); }
    };

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
        </>
    );
}

export function CartButton({ productId, title, thumbnail }: { productId: string; title: string; thumbnail: string }) {
    const { user } = useAuthStore();
    const [inCart, setInCart] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showCart, setShowCart] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const cart: string[] = snap.data()?.cart || [];
            setInCart(cart.includes(productId));
        })();
    }, [user?.uid, productId]);

    const activeInCart = Boolean(user?.uid && inCart);

    const addToCart = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user?.uid) {
            setShowLogin(true);
            setTimeout(() => setShowLogin(false), 3000);
            return;
        }
        try {
            const ref = doc(db, "users", user.uid!);
            await setDoc(ref, { cart: arrayUnion(productId) }, { merge: true });
            setInCart(true);
            setShowCart(true);
            setTimeout(() => setShowCart(false), 4000);
        } catch (err) { console.error("🔥 [Cart ERROR]", err); }
    };

    return (
        <>
            <button onClick={addToCart} aria-label="장바구니 담기"
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(30,24,70,0.16)] transition-all duration-200 hover:bg-[#f8f6ff] ${activeInCart ? "text-[#7865ff]" : "text-[#b0aabb] hover:text-[#7865ff]"}`}>
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
    const displayTitle = product.title.replace("[예약]", "").trim();
    return (
        <Link href={`/store/${product.productId}`} className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#f3f1ff]">
                <ImageSlot src={product.thumbnail} alt={product.title}
                    className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]" />
                {isReserve && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#7865ff] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(120,101,255,0.36)]">예약</span>
                )}
                {product.soldout && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">품절</span>
                    </div>
                )}
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                    <WishButton productId={product.productId} />
                    <CartButton productId={product.productId} title={displayTitle} thumbnail={product.thumbnail} />
                </div>
            </div>
            <div className="mt-3">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[#17151f]">{displayTitle}</p>
                <p className={`mt-1.5 text-[17px] font-extrabold ${product.soldout ? "text-[#aaa]" : "text-[#111018]"}`}>{displayPrice}</p>
            </div>
        </Link>
    );
}
