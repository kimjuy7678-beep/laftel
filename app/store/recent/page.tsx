"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import products from "@/data/store.json";
import StoreProductCard, { type StoreProduct } from "@/components/store/StoreProductCard";
import { RECENT_STORE_PRODUCT_IDS_KEY } from "@/types/store";

const STORE_PRODUCTS = products as StoreProduct[];
const RECENT_STORE_PRODUCTS_UPDATED_EVENT = "laftel:store:recent-products-updated";

function loadRecentIds() {
    if (typeof window === "undefined") return [];

    try {
        const stored = window.localStorage.getItem(RECENT_STORE_PRODUCT_IDS_KEY);
        const ids = stored ? (JSON.parse(stored) as unknown) : [];
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
    } catch {
        return [];
    }
}

export default function RecentStorePage() {
    const [recentIds, setRecentIds] = useState<string[]>([]);

    useEffect(() => {
        const sync = () => setRecentIds(loadRecentIds());

        sync();
        window.addEventListener("storage", sync);
        window.addEventListener(RECENT_STORE_PRODUCTS_UPDATED_EVENT, sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener(RECENT_STORE_PRODUCTS_UPDATED_EVENT, sync);
        };
    }, []);

    const recentProducts = useMemo(() => {
        const byId = new Map(STORE_PRODUCTS.map((product) => [product.productId, product]));
        return recentIds
            .map((id) => byId.get(id))
            .filter((product): product is StoreProduct => Boolean(product));
    }, [recentIds]);

    const clearRecent = () => {
        window.localStorage.removeItem(RECENT_STORE_PRODUCT_IDS_KEY);
        window.dispatchEvent(new Event(RECENT_STORE_PRODUCTS_UPDATED_EVENT));
        setRecentIds([]);
    };

    return (
        <main className="bg-white">
            <section className="mx-auto w-full max-w-[1770px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-[75px] lg:pb-28">
                <div className="rounded-[18px] border border-[#ebe8ff] bg-[#faf9ff] px-5 py-6 sm:rounded-[24px] sm:px-8 sm:py-8 lg:px-10">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#7865ff]">Recent View</p>
                            <h1 className="mt-2 text-[26px] font-extrabold leading-tight text-[#16121f] sm:text-[34px]">
                                최근본상품
                            </h1>
                            <p className="mt-2 text-[13px] leading-relaxed text-[#8a8494] sm:text-[15px]">
                                방금 둘러본 굿즈를 다시 확인하고, 찜이나 장바구니에 바로 담아보세요.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/store"
                                className="flex h-10 items-center justify-center rounded-[10px] border border-[#ddd8f4] px-4 text-[13px] font-semibold text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]"
                            >
                                스토어 홈
                            </Link>
                            {recentProducts.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearRecent}
                                    className="flex h-10 items-center justify-center rounded-[10px] bg-[#16121f] px-4 text-[13px] font-semibold text-white transition hover:bg-[#2a2438]"
                                >
                                    전체 삭제
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-2 text-[12px] text-[#8a8494]">
                        <span className="rounded-full bg-white px-3 py-1 font-bold text-[#7865ff] shadow-sm">
                            {recentProducts.length}개 상품
                        </span>
                        <span>최근에 본 순서대로 정리했어요.</span>
                    </div>
                </div>

                {recentProducts.length > 0 ? (
                    <section className="mt-8">
                        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-x-8 lg:gap-y-12 lg:overflow-visible lg:px-0 xl:grid-cols-6">
                            {recentProducts.map((product, index) => (
                                <div key={product.productId} className="w-[142px] shrink-0 snap-start sm:w-[168px] lg:w-auto">
                                    <StoreProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="mt-8 flex min-h-[360px] items-center justify-center rounded-[18px] border border-dashed border-[#d8d4ee] bg-[#faf9ff] px-5 text-center">
                        <div>
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0eeff] text-[#7865ff]">
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 7v5l3 2" />
                                </svg>
                            </div>
                            <h2 className="mt-4 text-[18px] font-bold text-[#16121f]">최근 본 상품이 없어요</h2>
                            <p className="mt-2 text-[13px] leading-relaxed text-[#8a8494]">
                                상품 상세 페이지를 열면 이곳에 자동으로 저장됩니다.
                            </p>
                            <Link
                                href="/store/all"
                                className="mt-5 inline-flex h-10 items-center justify-center rounded-[10px] bg-[#7865ff] px-5 text-[13px] font-bold text-white transition hover:bg-[#6b55f0]"
                            >
                                전체 굿즈 보러가기
                            </Link>
                        </div>
                    </section>
                )}

                {recentProducts.length > 0 && (
                    <section className="mt-10 rounded-[16px] border border-[#ebe8ff] bg-white px-5 py-5 sm:px-6">
                        <h2 className="text-[15px] font-bold text-[#16121f]">최근본상품 이용 팁</h2>
                        <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed text-[#8a8494] sm:grid-cols-3">
                            <li>상품 상세를 볼 때마다 최신 순서로 앞으로 이동합니다.</li>
                            <li>모바일에서는 카드를 옆으로 밀어서 빠르게 훑어볼 수 있어요.</li>
                            <li>찜 버튼과 장바구니 버튼으로 바로 보관할 수 있습니다.</li>
                        </ul>
                    </section>
                )}
            </section>
        </main>
    );
}
