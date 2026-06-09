// app/store/[id]/page.tsx
// Store product detail page

import { notFound } from "next/navigation";
import { fetchProduct, fetchProducts } from "../../../store/useStore";
import ProductDetailClient from "../../../components/store/ProductDetailClient";


const RELATED_COUNT = 10;

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const product = await fetchProduct(id);
    if (!product) return notFound();

    const allInCategory = await fetchProducts({ category: product.category });
    const related = allInCategory
        .filter((p) => p.productId !== product.productId)
        .slice(0, RELATED_COUNT);

    const images = product.detailImages.length
        ? product.detailImages
        : [product.thumbnail];

    return <ProductDetailClient product={product} images={images} related={related} />;
}
