import products from "@/data/store.json";
import type { Product } from "@/types/store";

export const BEST_PRODUCT_LIMIT = 50;

const STORE_PRODUCTS = products as Product[];

function hashString(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function rankingScore(product: Product) {
    return hashString(`${product.category}:${product.productId}:${product.title}`);
}

function createBestProducts() {
    const groups = new Map<string, Product[]>();

    STORE_PRODUCTS
        .filter((product) => !product.title.includes("[예약]") && !product.soldout)
        .forEach((product) => {
            const group = groups.get(product.category) ?? [];
            group.push(product);
            groups.set(product.category, group);
        });

    const categoryOrder = Array.from(groups.keys()).sort((a, b) => hashString(a) - hashString(b));
    const sortedGroups = new Map(
        categoryOrder.map((category) => [
            category,
            [...(groups.get(category) ?? [])].sort((a, b) => rankingScore(a) - rankingScore(b)),
        ]),
    );

    const ranked: Product[] = [];
    let round = 0;

    while (ranked.length < BEST_PRODUCT_LIMIT) {
        let added = false;

        categoryOrder.forEach((category) => {
            const product = sortedGroups.get(category)?.[round];
            if (!product || ranked.length >= BEST_PRODUCT_LIMIT) return;
            ranked.push(product);
            added = true;
        });

        if (!added) break;
        round += 1;
    }

    return ranked;
}

export const BEST_PRODUCTS = createBestProducts();
