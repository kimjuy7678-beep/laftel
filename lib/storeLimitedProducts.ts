export const LIMITED_PRODUCT_IDS: string[] = [
    "3190", "974", "1935", "37", "55",
    "1008", "786", "547", "2614", "3274",
    "3273", "1119", "3208", "461", "3140",
    "705", "1931", "2829", "2723", "2615",
    "120", "1927", "1150", "1078", "2671",
];

const LIMITED_PRODUCT_ID_SET = new Set(LIMITED_PRODUCT_IDS);
export const LIMITED_STOCK_COLLECTION = "storeLimitedStocks";

function normalizeProductId(productId: string | number) {
    return String(productId).trim();
}

function hashString(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function isLimitedStoreProduct(productId: string | number) {
    return LIMITED_PRODUCT_ID_SET.has(normalizeProductId(productId));
}

export function getLimitedInitialQuantity(productId: string | number) {
    if (!isLimitedStoreProduct(productId)) return null;
    return (hashString(normalizeProductId(productId)) % 18) + 3;
}

export function getLimitedRemainingQuantity(productId: string | number) {
    return getLimitedInitialQuantity(productId);
}
//2912  1092 1083
