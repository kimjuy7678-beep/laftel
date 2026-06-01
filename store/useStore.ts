// lib/store.ts
// Store product data helpers.

import products from "@/data/store.json";

// ─── API 응답 타입 ────────────────────────────────────────────────────────────
export type StoreProductAPI = {
    id?: number | string;
    name?: string;
    productId?: string;
    title?: string;
    category: string;
    price: number | string;
    original_price?: number;
    images?: string[];
    thumbnail?: string;
    detail_images?: string[];
    detailImages?: string[];
    description?: string[];
    productdetail?: string[];
    options?: string[];
    optionValues?: string[];
    variants?: string[];
    is_sold_out?: boolean;
    soldout?: boolean;
    [key: string]: unknown;
};

// 앱 내부에서 사용하는 정규화된 타입
export type StoreProduct = {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    detailImages: string[];
    productdetail: string[];
    options: string[];
    soldout: boolean;
    raw?: StoreProductAPI;
};

// ─── 가격 포맷 헬퍼 ──────────────────────────────────────────────────────────
function formatPrice(price: number): string {
    return price.toLocaleString("ko-KR") + "원";
}

// ─── API 응답 → StoreProduct 정규화 ─────────────────────────────────────────
function normalize(raw: StoreProductAPI): StoreProduct {
    const images = raw.images ?? (raw.thumbnail ? [raw.thumbnail] : []);
    const detailImages = raw.detailImages?.length
        ? raw.detailImages
        : raw.detail_images?.length
            ? raw.detail_images
            : images;

    return {
        productId: String(raw.productId ?? raw.id),
        category: raw.category ?? "",
        title: raw.title ?? raw.name ?? "",
        price: typeof raw.price === "number" ? formatPrice(raw.price) : String(raw.price),
        thumbnail: raw.thumbnail ?? images[0] ?? "",
        detailImages,
        productdetail: raw.productdetail ?? raw.description ?? [],
        options: raw.options ?? raw.optionValues ?? raw.variants ?? [],
        soldout: raw.soldout ?? raw.is_sold_out ?? false,
        raw,
    };
}

const STORE_PRODUCTS = (products as StoreProductAPI[]).map(normalize);

type RscModel = unknown;

function collectReferencedIds(value: RscModel, ids = new Set<number>()) {
    if (typeof value === "number") {
        ids.add(value);
        return ids;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectReferencedIds(item, ids);
        return ids;
    }
    if (!value || typeof value !== "object") return ids;
    for (const [key, item] of Object.entries(value)) {
        if (key.startsWith("_") && typeof item === "number") ids.add(item);
        collectReferencedIds(item, ids);
    }
    return ids;
}

// ─── RSC idMap + rawChunks 동시 구축 ─────────────────────────────────────────
// 핵심 문제: buildRscIdMap이 P{n}: 배열의 [0]만 저장하고 나머지를 버림.
// 예) P112:[[120,133], {...}, "optionValue", "네코마", ...]
//     → idMap.set(112, [120,133]) 만 저장 → "네코마" 유실
// rawChunks에 전체 배열을 따로 보존해서 플랫 스캔에 사용.
function buildRscIdMap(text: string): { idMap: Map<number, RscModel>; rawChunks: unknown[][] } {
    const idMap = new Map<number, RscModel>();
    const rawChunks: unknown[][] = [];

    for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;

        const payload = line.match(/^P(\d+):(.+)$/);
        if (payload) {
            const chunkId = Number(payload[1]);
            let values: RscModel[];
            try { values = JSON.parse(payload[2]) as RscModel[]; } catch { continue; }
            if (values.length === 0) continue;

            // 전체 배열 보존 (플랫 스캔용)
            rawChunks.push(values);

            idMap.set(chunkId, values[0]);

            const refs = collectReferencedIds(values[0]);
            const remainingStart = Math.min(
                ...Array.from(refs).filter((id) => id > chunkId && !idMap.has(id)),
            );
            if (Number.isFinite(remainingStart)) {
                values.slice(1).forEach((value, index) => {
                    idMap.set(remainingStart + index, value);
                });
            }
            continue;
        }

        if (line.startsWith("[")) {
            let values: RscModel[];
            try { values = JSON.parse(line) as RscModel[]; } catch { continue; }
            rawChunks.push(values);
            values.forEach((value, index) => { idMap.set(index, value); });
        }
    }

    return { idMap, rawChunks };
}

function resolveRscValue(value: RscModel, idMap: Map<number, RscModel>, seen = new Set<number>()): RscModel {
    if (Array.isArray(value)) {
        if (value[0] === "P" && typeof value[1] === "number") {
            return resolveRscId(value[1], idMap, seen);
        }
        return value.map((item) => {
            if (typeof item === "number" && idMap.has(item)) {
                const resolved = resolveRscId(item, idMap, new Set(seen));
                return typeof resolved === "string" ? resolved : item;
            }
            return resolveRscValue(item, idMap, seen);
        });
    }
    if (!value || typeof value !== "object") return value;
    const result: Record<string, RscModel> = {};
    for (const [key, item] of Object.entries(value)) {
        const resolvedKey = key.startsWith("_")
            ? resolveRscId(Number(key.slice(1)), idMap, new Set(seen))
            : key;
        const outputKey = typeof resolvedKey === "string" ? resolvedKey : key;
        result[outputKey] = typeof item === "number" && idMap.has(item)
            ? resolveRscId(item, idMap, new Set(seen))
            : resolveRscValue(item, idMap, seen);
    }
    return result;
}

function resolveRscId(id: number, idMap: Map<number, RscModel>, seen: Set<number>): RscModel {
    if (seen.has(id)) return undefined;
    seen.add(id);
    return resolveRscValue(idMap.get(id), idMap, seen);
}

// ─── 옵션값 필터 ─────────────────────────────────────────────────────────────
function isLikelyOption(v: string): boolean {
    if (!v || v.length > 80) return false;
    if (v.startsWith("http") || v.startsWith("/")) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return false;
    if (v.includes("\n")) return false;
    return /[가-힣A-Za-z0-9]/.test(v);
}

// ─── 방법 1: rawChunks 플랫 스캔 ─────────────────────────────────────────────
// P{n}: 배열 전체를 순차 탐색. "optionValue" 문자열 바로 뒤 값이 실제 옵션.
// "optionValues" 뒤 숫자 배열은 idMap으로 resolve.
function scanFlatChunk(arr: unknown[], idMap: Map<number, RscModel>, results: Set<string>) {
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];

        if (typeof item === "string" && item === "optionValue") {
            const next = arr[i + 1];
            if (typeof next === "string" && next.trim()) {
                results.add(next.trim());
            } else if (typeof next === "number" && idMap.has(next)) {
                const r = idMap.get(next);
                if (typeof r === "string" && r.trim()) results.add(r.trim());
            }
        }

        if (typeof item === "string" && item === "optionValues") {
            const next = arr[i + 1];
            const ids = Array.isArray(next) ? next : [];
            for (const id of ids) {
                if (typeof id === "number" && idMap.has(id)) {
                    const r = idMap.get(id);
                    if (typeof r === "string" && r.trim()) results.add(r.trim());
                }
            }
        }

        if (Array.isArray(item)) scanFlatChunk(item, idMap, results);
    }
}

// ─── 방법 2: 객체 트리 탐색 (resolve 후) ─────────────────────────────────────
const OPTION_OBJ_KEYS = new Set([
    "optionValue", "optionValues",
    "variants", "variant",
    "productOptions", "productVariants",
    "optionGroups", "selects", "choices",
]);

function scanObjectTree(value: RscModel, options: Set<string>) {
    if (Array.isArray(value)) {
        for (const item of value) scanObjectTree(item, options);
        return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, RscModel>;
    for (const key of OPTION_OBJ_KEYS) {
        const v = record[key];
        if (typeof v === "string" && v.trim()) options.add(v.trim());
        else if (Array.isArray(v)) {
            for (const item of v) {
                if (typeof item === "string" && item.trim()) options.add(item.trim());
                else if (item && typeof item === "object") scanObjectTree(item, options);
            }
        }
    }
    for (const item of Object.values(record)) scanObjectTree(item, options);
}

// ─── 방법 3: 텍스트 정규식 직접 추출 ────────────────────────────────────────
// RSC가 JSON 객체 형식으로 직렬화된 경우 커버
function scanRegex(text: string): Set<string> {
    const results = new Set<string>();
    for (const m of text.matchAll(/"optionValue"\s*:\s*"([^"]{1,80})"/g)) {
        results.add(m[1].trim());
    }
    return results;
}

// ─── RSC payload에서 옵션 추출 ───────────────────────────────────────────────
async function fetchRemoteOptions(id: string): Promise<string[]> {
    try {
        const res = await fetch(`https://store.laftel.net/products/${id}.data`, {
            next: { revalidate: 60 * 60 },
        });
        if (!res.ok) return [];

        const text = await res.text();
        const { idMap, rawChunks } = buildRscIdMap(text);

        // 방법 1: rawChunks 플랫 스캔 — 가장 정확
        const r1 = new Set<string>();
        for (const chunk of rawChunks) scanFlatChunk(chunk, idMap, r1);
        const out1 = Array.from(r1).filter(isLikelyOption);
        if (out1.length > 0) return out1;

        // 방법 2: resolve 후 객체 트리 탐색
        const r2 = new Set<string>();
        for (const value of idMap.values()) scanObjectTree(value, r2);
        const out2 = Array.from(r2).filter(isLikelyOption);
        if (out2.length > 0) return out2;

        // 방법 3: 텍스트 정규식 추출
        const out3 = Array.from(scanRegex(text)).filter(isLikelyOption);
        if (out3.length > 0) return out3;

        return [];
    } catch (err) {
        console.error("[fetchRemoteOptions]", err);
        return [];
    }
}

// ─── 단일 상품 fetch ─────────────────────────────────────────────────────────
export async function fetchProduct(id: string): Promise<StoreProduct | null> {
    const product = STORE_PRODUCTS.find((item) => item.productId === id);
    if (!product) return null;

    const options = await fetchRemoteOptions(id);
    return options.length > 0 ? { ...product, options } : product;
}

// ─── 목록 fetch ───────────────────────────────────────────────────────────────
export async function fetchProducts(params?: {
    category?: string;
    page?: number;
    limit?: number;
}): Promise<StoreProduct[]> {
    let list = STORE_PRODUCTS;

    if (params?.category) {
        list = list.filter((product) => product.category === params.category);
    }

    if (params?.page || params?.limit) {
        const page = params.page ?? 1;
        const limit = params.limit ?? list.length;
        const start = (page - 1) * limit;
        list = list.slice(start, start + limit);
    }

    return list;
}
