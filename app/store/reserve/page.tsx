import products from "@/data/store.json";
import ReservePageClient from "@/components/store/ReservePageClient";
import type { Product } from "@/types/store";

const STORE_PRODUCTS = products as Product[];
const RESERVE_PRODUCTS = STORE_PRODUCTS.filter((product) => product.title.includes("[예약]"));
const INITIAL_PRODUCT_COUNT = 20;

export default async function StoreReservePage({
    searchParams,
}: {
    searchParams?: Promise<{ limit?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    const requestedLimit = Number(resolvedSearchParams?.limit);
    const productLimit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, INITIAL_PRODUCT_COUNT), RESERVE_PRODUCTS.length)
        : INITIAL_PRODUCT_COUNT;

    return <ReservePageClient products={RESERVE_PRODUCTS} productLimit={productLimit} />;
}
