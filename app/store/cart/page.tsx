"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { arrayRemove, doc, getDoc, setDoc } from "firebase/firestore";
import products from "@/data/store.json";
import { db } from "@/firebase/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Product } from "@/types/store";

const STORE_PRODUCTS = products as Product[];
const SHIPPING_FEE = 3000;
const FREE_SHIPPING_THRESHOLD = 100000;
const MEMBER_DISCOUNT = 3000;

function parsePrice(price: string) {
    return Number(price.replace(/[^0-9]/g, "")) || 0;
}

function formatWon(value: number) {
    return `${value.toLocaleString()}원`;
}

function optionLabel(product: Product) {
    const optionLine = product.productdetail.find((line) => line.includes("옵션"));
    if (!optionLine) return "기본";
    return optionLine.replace(/^옵션\s*[A-Z0-9가-힣]?\.?\s*/, "").trim() || "기본";
}

function CartCheck({ checked }: { checked: boolean }) {
    return (
        <span className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${checked ? "border-[#826CFF] bg-[#826CFF]" : "border-[#826CFF] bg-white"}`}>
            {checked && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            )}
        </span>
    );
}

export default function CartPage() {
    const { user } = useAuthStore();
    const [cartProducts, setCartProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadCart() {
            if (!user?.uid) {
                setCartProducts([]);
                setSelectedIds(new Set());
                setQuantities({});
                setLoading(false);
                return;
            }

            setLoading(true);
            const snap = await getDoc(doc(db, "users", user.uid));
            const rawCart = snap.data()?.cart as unknown;
            const ids = Array.isArray(rawCart) ? rawCart.filter((id): id is string => typeof id === "string") : [];
            const productsById = new Map(STORE_PRODUCTS.map((product) => [product.productId, product]));
            const nextProducts: Product[] = ids
                .map((id: string) => productsById.get(id))
                .filter((product): product is Product => Boolean(product));

            if (cancelled) return;
            setCartProducts(nextProducts);
            setSelectedIds(new Set(nextProducts.map((product) => product.productId)));
            setQuantities(Object.fromEntries(nextProducts.map((product) => [product.productId, 1])));
            setLoading(false);
        }

        loadCart().catch(() => {
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    const selectedProducts = useMemo(
        () => cartProducts.filter((product) => selectedIds.has(product.productId)),
        [cartProducts, selectedIds],
    );

    const productTotal = selectedProducts.reduce((total, product) => {
        return total + parsePrice(product.price) * (quantities[product.productId] ?? 1);
    }, 0);
    const shippingFee = productTotal >= FREE_SHIPPING_THRESHOLD || productTotal === 0 ? 0 : SHIPPING_FEE;
    const discount = user && productTotal > 0 ? MEMBER_DISCOUNT : 0;
    const finalTotal = Math.max(0, productTotal + shippingFee - discount);
    const allSelected = cartProducts.length > 0 && selectedIds.size === cartProducts.length;

    const toggleAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(cartProducts.map((product) => product.productId)));
    };

    const toggleProduct = (productId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const changeQuantity = (productId: string, amount: number) => {
        setQuantities((prev) => ({
            ...prev,
            [productId]: Math.max(1, (prev[productId] ?? 1) + amount),
        }));
    };

    const removeProducts = async (ids: string[]) => {
        if (!user?.uid || ids.length === 0) return;
        await setDoc(doc(db, "users", user.uid), { cart: arrayRemove(...ids) }, { merge: true });
        setCartProducts((prev) => prev.filter((product) => !ids.includes(product.productId)));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-white pb-16 md:pb-24">
            <section className="mx-auto flex max-w-[1770px] flex-col items-center px-5 pb-10 pt-16 text-center md:px-[75px] md:pb-16 md:pt-28">
                <h1 className="text-[42px] font-black leading-none text-[#826CFF] md:text-[52px]">CART</h1>
                <p className="mt-4 text-[24px] font-light text-[#555] md:mt-5 md:text-[30px]">장바구니</p>
            </section>

            <main className="mx-auto grid max-w-[1770px] grid-cols-1 gap-6 px-5 xl:grid-cols-[minmax(0,1fr)_540px] md:px-[75px]">
                <section className="rounded-[22px] border border-[#dedde4] bg-white px-4 py-6 md:rounded-[28px] md:px-9 md:py-8">
                    <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 md:mb-8">
                        <button type="button" onClick={toggleAll} className="flex items-center gap-4 text-[16px] font-bold text-[#826CFF] md:text-[18px]">
                            <CartCheck checked={allSelected} />
                            전체선택
                        </button>
                        <button type="button" onClick={() => removeProducts(Array.from(selectedIds))} className="text-[13px] text-[#9b94b2] underline underline-offset-4">
                            선택삭제
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex h-[420px] items-center justify-center rounded-[20px] bg-[#f7f7f8] text-[15px] text-[#9b94b2]">
                            장바구니를 불러오는 중이에요.
                        </div>
                    ) : !user ? (
                        <div className="flex h-[420px] flex-col items-center justify-center rounded-[20px] bg-[#f7f7f8] text-[15px] text-[#777]">
                            <p>로그인 후 장바구니를 확인할 수 있어요.</p>
                            <Link href="/login" className="mt-5 rounded-full bg-[#826CFF] px-8 py-3 text-[14px] font-bold text-white">
                                로그인하기
                            </Link>
                        </div>
                    ) : cartProducts.length === 0 ? (
                        <div className="flex h-[420px] flex-col items-center justify-center rounded-[20px] bg-[#f7f7f8] text-[15px] text-[#777]">
                            <p>장바구니에 담긴 상품이 없어요.</p>
                            <Link href="/store" className="mt-5 rounded-full bg-[#826CFF] px-8 py-3 text-[14px] font-bold text-white">
                                굿즈 보러가기
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cartProducts.map((product) => {
                                const checked = selectedIds.has(product.productId);
                                const quantity = quantities[product.productId] ?? 1;

                                return (
                                    <article key={product.productId} className="grid grid-cols-[28px_minmax(92px,130px)_minmax(0,1fr)] items-center gap-4 rounded-[18px] bg-[#f6f6f7] px-4 py-4 lg:grid-cols-[48px_200px_minmax(0,1fr)_150px] xl:grid-cols-[48px_240px_minmax(0,1fr)_170px] lg:gap-6 xl:gap-8 md:px-7 md:py-5">
                                        <button type="button" onClick={() => toggleProduct(product.productId)} aria-label={`${product.title} 선택`} className="justify-self-center">
                                            <CartCheck checked={checked} />
                                        </button>

                                        <Link href={`/store/${product.productId}`} className="block overflow-hidden rounded-[10px] bg-white">
                                            <img src={product.thumbnail} alt={product.title} className="aspect-square w-full object-cover" />
                                        </Link>

                                        <div className="min-w-0 text-left">
                                            <Link href={`/store/series?series=${encodeURIComponent(product.category)}`} className="text-[13px] text-[#777] hover:text-[#826CFF]">
                                                {product.category} ›
                                            </Link>
                                            <div className="mt-4 flex items-center gap-2">
                                                {product.title.includes("[예약]") ? (
                                                    <span className="rounded-[4px] bg-[#826CFF] px-1.5 py-0.5 text-[11px] font-bold text-white">예약</span>
                                                ) : (
                                                    <span className="rounded-[4px] bg-[#826CFF] px-1.5 py-0.5 text-[11px] font-bold text-white"></span>
                                                )}
                                                <Link href={`/store/${product.productId}`} className="line-clamp-2 text-[14px] font-semibold text-[#222] hover:text-[#826CFF] md:text-[18px] lg:line-clamp-1">
                                                    {product.title.replace("[예약]", "").trim()}
                                                </Link>
                                            </div>
                                            <p className="mt-3 text-[14px] text-[#777]">옵션 : {optionLabel(product)}</p>

                                            <div className="mt-5 inline-grid h-10 grid-cols-3 overflow-hidden rounded-[4px] border border-[#c7c7cd] bg-white md:mt-7 md:h-11">
                                                <button type="button" onClick={() => changeQuantity(product.productId, -1)} className="w-11 text-[18px] text-[#333] hover:bg-[#f1efff] md:w-14">-</button>
                                                <span className="flex w-11 items-center justify-center border-x border-[#c7c7cd] text-[16px] font-bold text-[#222] md:w-14 md:text-[18px]">{quantity}</span>
                                                <button type="button" onClick={() => changeQuantity(product.productId, 1)} className="w-11 text-[18px] text-[#333] hover:bg-[#f1efff] md:w-14">+</button>
                                            </div>
                                        </div>

                                        <div className="col-span-3 text-right lg:col-span-1">
                                            {quantity > 1 && <p className="mb-1 text-[13px] text-[#999]">{formatWon(parsePrice(product.price))} x {quantity}</p>}
                                            <p className="text-[22px] font-black text-black md:text-[28px]">{formatWon(parsePrice(product.price) * quantity)}</p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <p className="mt-8 text-center text-[16px] text-[#555]">
                        배송비 {formatWon(SHIPPING_FEE)} ({formatWon(FREE_SHIPPING_THRESHOLD)}이상 무료배송)
                    </p>
                </section>

                <aside className="h-fit rounded-[22px] border border-[#dedde4] bg-white px-5 py-7 md:rounded-[28px] md:px-12 md:py-11 xl:sticky xl:top-24">
                    <h2 className="text-[24px] font-black text-[#222] md:text-[30px]">최종결제 금액</h2>

                    <dl className="mt-9 space-y-7">
                        <div className="flex items-center justify-between text-[20px]">
                            <dt className="text-[#888]">총 상품 금액</dt>
                            <dd className="font-bold text-[#333]">{formatWon(productTotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[20px]">
                            <dt className="text-[#888]">배송비</dt>
                            <dd className="font-bold text-[#826CFF]">{shippingFee === 0 ? "멤버십 회원은 무료!" : formatWon(shippingFee)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[20px]">
                            <dt className="text-[#888]">할인금액</dt>
                            <dd className="font-bold text-[#333]">-{formatWon(discount)}</dd>
                        </div>
                    </dl>

                    <div className="my-9 border-t border-[#eeeeef]" />

                    <div className="flex items-center justify-between">
                        <span className="text-[20px] text-[#888]">총 결제 금액</span>
                        <strong className="text-[30px]  text-[#826CFF] md:text-[40px]">{formatWon(finalTotal)}</strong>
                    </div>

                    <label className="mt-9 flex items-center justify-center gap-2 text-[13px] text-[#9b94b2]">
                        <input type="checkbox" className="h-4 w-4 accent-[#826CFF]" />
                        주문 내용을 확인했으며, 결제 진행에 동의합니다. (필수)
                    </label>

                    <button
                        type="button"
                        disabled={selectedProducts.length === 0}
                        className="mt-6 h-[62px] w-full rounded-[18px] bg-[#826CFF] text-[22px] font-bold text-white transition hover:bg-[#6f5af2] disabled:cursor-not-allowed disabled:bg-[#d8d5ee] md:h-[78px] md:rounded-[20px] md:text-[28px]"
                    >
                        {formatWon(finalTotal)} 결제하기
                    </button>
                </aside>
            </main>
        </div>
    );
}
