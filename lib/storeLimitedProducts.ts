export const LIMITED_PRODUCT_IDS = [
    "3190", "974", "907", "37", "55",
    "337", "812", "547", "2614", "597",
    "2798", "229", "142", "2912", "461",
    "1083", "1092", "705", "854", "3041",
    "120", "986", "1077", "1078", "2671",
];

const LIMITED_PRODUCT_ID_SET = new Set(LIMITED_PRODUCT_IDS);

function hashString(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function isLimitedStoreProduct(productId: string) {
    return LIMITED_PRODUCT_ID_SET.has(productId);
}

export function getLimitedRemainingQuantity(productId: string) {
    if (!isLimitedStoreProduct(productId)) return null;
    return (hashString(productId) % 18) + 3;
}
