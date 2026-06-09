"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import products from "@/data/store.json";
import type { Product } from "@/types/store";

const STORE_PRODUCTS = products as Product[];
const STORE_CATEGORIES = Array.from(new Set(STORE_PRODUCTS.map((product) => product.category))).filter(Boolean);
const CHOSEONG = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function normalize(value: string) {
    return value.toLowerCase().replace(/[\s()[\]{}·.,/\\|:;'"!?_\-+~]+/g, "");
}

function toChoseong(value: string) {
    return Array.from(value).map((char) => {
        const code = char.charCodeAt(0);
        if (code < 0xac00 || code > 0xd7a3) return normalize(char);
        return CHOSEONG[Math.floor((code - 0xac00) / 588)];
    }).join("");
}

function isChoseongQuery(query: string) {
    return /^[ㄱ-ㅎ]+$/.test(normalize(query));
}

function searchableText(product: Product) {
    return [
        product.title,
        product.category,
        ...product.productdetail,
    ].join(" ");
}

function matchesQuery(text: string, query: string) {
    const compactQuery = normalize(query);
    if (!compactQuery) return false;
    const normalizedText = normalize(text);
    const choseongText = toChoseong(text);

    if (normalizedText.includes(compactQuery)) return true;
    if (isChoseongQuery(compactQuery) && choseongText.includes(compactQuery)) return true;

    const terms = query.split(/\s+/).map(normalize).filter((term) => term.length >= 2);
    if (terms.length < 2) return false;

    return terms.every((term) => normalizedText.includes(term) || (isChoseongQuery(term) && choseongText.includes(term)));
}

const INDEXED_PRODUCTS = STORE_PRODUCTS.map((product) => ({
    product,
    text: searchableText(product),
}));

function uniqueProducts(products: Product[]) {
    const seen = new Set<string>();
    return products.filter((product) => {
        if (seen.has(product.productId)) return false;
        seen.add(product.productId);
        return true;
    });
}

function searchProducts(query: string) {
    if (!normalize(query)) return [];

    const directMatches = INDEXED_PRODUCTS
        .filter(({ text }) => matchesQuery(text, query))
        .map(({ product }) => product);

    const inferredCategories = new Set(directMatches.map((product) => product.category));
    const categoryMatches = STORE_PRODUCTS.filter((product) => inferredCategories.has(product.category));

    return uniqueProducts([...directMatches, ...categoryMatches]).slice(0, 10);
}

function categoryMatches(query: string) {
    if (!normalize(query)) return STORE_CATEGORIES.slice(0, 6);

    const directCategories = STORE_CATEGORIES.filter((category) => matchesQuery(category, query));
    const inferredCategories = INDEXED_PRODUCTS
        .filter(({ text }) => matchesQuery(text, query))
        .map(({ product }) => product.category);

    return Array.from(new Set([...directCategories, ...inferredCategories])).slice(0, 6);
}

function autocompleteSuggestions(query: string) {
    if (!normalize(query)) return ["하이큐", "히나타", "고죠", "탄지로", "아크릴", "프리렌"];

    const categorySuggestions = categoryMatches(query);
    const productSuggestions = INDEXED_PRODUCTS
        .filter(({ text }) => matchesQuery(text, query))
        .map(({ product }) => cleanTitle(product.title))
        .filter((title) => title.length <= 34)
        .slice(0, 8);

    return Array.from(new Set([...categorySuggestions, ...productSuggestions])).slice(0, 8);
}

function categoryHref(category: string) {
    return `/store/series?series=${encodeURIComponent(category)}`;
}

function cleanTitle(title: string) {
    return title.replace(/\[예약\]/g, "").trim();
}

function SearchIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
    );
}

function ProductResult({ product, onSelect }: { product: Product; onSelect?: () => void }) {
    return (
        <Link href={`/store/${product.productId}`} onClick={onSelect} className="flex min-w-0 items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-[#f6f3ff]">
            <div
                className="h-14 w-14 shrink-0 rounded-[8px] bg-[#f1eff8] bg-cover bg-center"
                style={{ backgroundImage: `url(${product.thumbnail})` }}
                aria-label={product.title}
                role="img"
            />
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#7865ff]">{product.category}</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-[#17151f]">{cleanTitle(product.title)}</p>
                <p className="mt-1 text-[12px] font-bold text-[#111018]">{product.soldout ? "품절" : product.price}</p>
            </div>
        </Link>
    );
}

function SearchResults({
    query,
    onSelect,
    onSuggest,
}: {
    query: string;
    onSelect?: () => void;
    onSuggest?: (value: string) => void;
}) {
    const results = useMemo(() => searchProducts(query), [query]);
    const categories = useMemo(() => categoryMatches(query), [query]);
    const suggestions = useMemo(() => autocompleteSuggestions(query), [query]);
    const hasQuery = query.trim().length > 0;

    return (
        <div className="space-y-5">
            {suggestions.length > 0 && (
                <div>
                    <p className="mb-2 text-[12px] font-bold text-[#8a8494]">자동완성</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => onSuggest?.(suggestion)}
                                className="rounded-full border border-[#ddd8f4] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4f486d] transition hover:border-[#7865ff] hover:text-[#7865ff]"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {categories.length > 0 && (
                <div>
                    <p className="mb-2 text-[12px] font-bold text-[#8a8494]">작품 카테고리</p>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <Link
                                key={category}
                                href={categoryHref(category)}
                                onClick={onSelect}
                                className="rounded-full bg-[#f0eeff] px-3 py-1.5 text-[12px] font-bold text-[#7865ff] transition hover:bg-[#e4dfff]"
                            >
                                #{category}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <p className="mb-2 text-[12px] font-bold text-[#8a8494]">상품</p>
                {results.length > 0 ? (
                    <div className="space-y-1">
                        {results.map((product) => (
                            <ProductResult key={product.productId} product={product} onSelect={onSelect} />
                        ))}
                    </div>
                ) : (
                    <div className="flex h-[110px] items-center justify-center rounded-[12px] bg-[#f8f6ff] text-[13px] text-[#9b94b2]">
                        {hasQuery ? "검색 결과가 없어요." : "굿즈 또는 작품명을 입력해 보세요."}
                    </div>
                )}
            </div>
        </div>
    );
}

export function StoreSearchModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [query, setQuery] = useState("");

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/45 px-3 pt-[76px] sm:px-4 sm:pt-[96px]" onClick={onClose}>
            <div className="w-full max-w-[720px] rounded-[16px] bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:rounded-[20px] sm:p-5" onClick={(event) => event.stopPropagation()}>
                <div className="flex h-[48px] items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_8px_24px_rgba(30,24,70,0.12)] sm:h-[52px] sm:px-5">
                    <span className="text-[#7865ff]"><SearchIcon /></span>
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[#242130] outline-none placeholder:text-[#9b94b2] sm:px-4 sm:text-[14px]"
                        placeholder="굿즈 또는 작품명으로 검색해 보세요"
                    />
                    <button type="button" onClick={onClose} aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f1f4] text-[#4d5260]">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mt-4 max-h-[68vh] overflow-y-auto pr-1 sm:mt-5 sm:max-h-[62vh]">
                    <SearchResults query={query} onSelect={onClose} onSuggest={setQuery} />
                </div>
            </div>
        </div>
    );
}

export function StoreSearchBar() {
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const showResults = focused;

    return (
        <div className="relative mx-auto mt-6 w-full max-w-[960px] px-4 pt-4 sm:mt-8 sm:px-6 sm:pt-8 lg:mt-10 lg:px-0 lg:pt-10">
            <div className="flex h-[48px] items-center rounded-full border border-[#ddd8f4] bg-white px-4 shadow-[0_8px_24px_rgba(30,24,70,0.13)] sm:h-[56px] sm:px-6">
                <span className="shrink-0 text-[#4f486d]"><SearchIcon /></span>
                <input
                    value={query}
                    onFocus={() => setFocused(true)}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-[12px] text-[#242130] outline-none placeholder:text-[#8f8a9d] sm:px-5 sm:text-[13px]"
                    placeholder="굿즈 또는 작품명으로 검색해 보세요"
                />
                <button type="button" onClick={() => setFocused(true)} className="border-l border-[#ddd8f4] pl-3 text-[12px] font-semibold uppercase text-[#7865ff] sm:pl-5 sm:text-[16px]">
                    Search
                </button>
            </div>

            {showResults && (
                <div className="absolute left-4 right-4 top-[calc(100%+12px)] z-30 max-h-[72vh] overflow-y-auto rounded-[16px] border border-[#ebe8ff] bg-white p-4 shadow-[0_18px_54px_rgba(30,24,70,0.16)] sm:left-6 sm:right-6 sm:rounded-[18px] sm:p-5 lg:left-0 lg:right-0">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[12px] font-bold text-[#8a8494]">검색 결과</p>
                        <button type="button" onClick={() => setFocused(false)} className="text-[12px] font-semibold text-[#7865ff]">
                            닫기
                        </button>
                    </div>
                    <SearchResults query={query} onSelect={() => setFocused(false)} onSuggest={(value) => {
                        setQuery(value);
                        setFocused(true);
                    }} />
                </div>
            )}

            <p className="mx-auto mt-3 max-w-[92vw] text-center text-[11px] leading-relaxed text-[#6f687d]">
                Trending:{" "}
                <Link href={categoryHref("귀멸의 칼날")} className="text-[#7865ff]">#귀멸의 칼날</Link>{" "}
                <Link href={categoryHref("하이큐")} className="text-[#7865ff]">#하이큐</Link>{" "}
                <Link href={categoryHref("주술회전")} className="text-[#7865ff]">#주술회전</Link>{" "}
                <Link href={categoryHref("장송의 프리렌")} className="text-[#7865ff]">#장송의 프리렌</Link>
            </p>
        </div>
    );
}
