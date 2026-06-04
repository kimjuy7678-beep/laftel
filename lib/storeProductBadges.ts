import type { Product } from "@/types/store";

type BadgeProduct = Pick<Product, "productId" | "title" | "category">;

function hashString(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function isReserveProduct(product: BadgeProduct) {
    return product.title.includes("[예약]") || product.title.includes("예약");
}

export function isLimitedProduct(product: BadgeProduct) {
    if (isReserveProduct(product)) return false;
    return hashString(`${product.category}:${product.productId}:${product.title}`) % 4 === 0;
}

export function getStoreProductBadge(product: BadgeProduct) {
    if (isReserveProduct(product)) return "예약";
    if (isLimitedProduct(product)) return "한정판";
    return null;
}
