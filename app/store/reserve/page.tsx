import products from "@/data/store.json";
import ReservePageClient from "@/components/store/ReservePageClient";
import type { Product } from "@/types/store";

const STORE_PRODUCTS = products as Product[];
const RESERVE_PRODUCTS = STORE_PRODUCTS.filter((product) => product.title.includes("[예약]"));

export default function StoreReservePage() {
    return <ReservePageClient products={RESERVE_PRODUCTS} />;
}
