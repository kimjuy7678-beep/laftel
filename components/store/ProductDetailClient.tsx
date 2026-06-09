"use client";

import dynamic from "next/dynamic";
import type { StoreProduct } from "@/store/useStore";

const ProductDetail = dynamic(
    () => import("@/components/store/ProductDetail").then((mod) => mod.ProductDetail),
    {
        ssr: false,
        loading: () => (
            <div className="flex min-h-[420px] items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2ddf5] border-t-[#7865ff]" />
                    <p className="text-[13px] text-[#8a8494]">상품 정보를 불러오는 중...</p>
                </div>
            </div>
        ),
    },
);

export default function ProductDetailClient({
    product,
    images,
    related,
}: {
    product: StoreProduct;
    images: string[];
    related: StoreProduct[];
}) {
    return <ProductDetail product={product} images={images} related={related} />;
}
