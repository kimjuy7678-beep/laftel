// app/store/profile/wishlist/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { doc, getDoc, setDoc, arrayRemove } from "firebase/firestore";
import Link from "next/link";
import products from "@/data/store.json";

type StoreProduct = { productId: string; category: string; title: string; price: string; thumbnail: string; soldout: boolean; };
const ALL_PRODUCTS = products as StoreProduct[];

export default function WishlistPage() {
    const { user } = useAuthStore();
    const [wishlist, setWishlist] = useState<StoreProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) { setLoading(false); return; }
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const ids: string[] = snap.data()?.wishlist || [];
            setWishlist(ALL_PRODUCTS.filter(p => ids.includes(p.productId)));
            setLoading(false);
        })();
    }, [user?.uid]);

    const removeWish = async (productId: string) => {
        if (!user?.uid) return;
        await setDoc(doc(db, "users", user.uid), { wishlist: arrayRemove(productId) }, { merge: true });
        setWishlist(prev => prev.filter(p => p.productId !== productId));
    };

    return (
        <>
            <div className="mb-6 flex items-center gap-2">
                <h2 className="text-[20px] font-bold text-[#16121f]">위시 리스트</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7865ff] text-[12px] font-bold text-white">{wishlist.length}</span>
            </div>

            {loading ? (
                <div className="flex h-[300px] items-center justify-center text-[14px] text-[#9b94b2]">불러오는 중...</div>
            ) : wishlist.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[14px] text-[#9b94b2]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    찜한 상품이 없어요.
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-5">
                    {wishlist.map(p => (
                        <div key={p.productId} className="group relative">
                            <Link href={`/store/${p.productId}`}>
                                <div className="relative overflow-hidden rounded-[12px] bg-[#f0eeff]">
                                    {p.thumbnail
                                        ? <img src={p.thumbnail} alt={p.title} className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                        : <div className="aspect-square w-full bg-[#e8e4f8]" />
                                    }
                                </div>
                                <div className="mt-2">
                                    <p className="text-[11px] text-[#8a8494]">{p.category}</p>
                                    <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-[#17151f]">{p.title}</p>
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <p className="text-[14px] font-bold text-[#111018]">{p.price}</p>
                                        <button onClick={(e) => { e.preventDefault(); removeWish(p.productId); }}
                                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff4d6d] text-white shadow">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}