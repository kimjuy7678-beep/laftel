"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { arrayRemove, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import products from "@/data/store.json";
import type { Product } from "@/types/store";

const ALL_PRODUCTS = products as Product[];

type RestockMethods = Record<string, string[]>;

const METHOD_LABEL: Record<string, string> = {
    app: "앱 알림",
    sms: "SMS · 카카오 알림톡",
    email: "이메일",
};

function cleanTitle(title: string) {
    return title.replace("[예약]", "").trim();
}

function methodText(methods: string[]) {
    if (methods.length === 0) return "앱 알림";
    return methods.map((method) => METHOD_LABEL[method] ?? method).join(", ");
}

export default function RestockAlertsPage() {
    const { user } = useAuthStore();
    const [ids, setIds] = useState<string[]>([]);
    const [methods, setMethods] = useState<RestockMethods>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const uid = user.uid;

        (async () => {
            const snap = await getDoc(doc(db, "users", uid));
            const data = snap.data() ?? {};
            setIds(Array.isArray(data.restockAlerts) ? data.restockAlerts : []);
            setMethods((data.restockAlertMethods ?? {}) as RestockMethods);
            setLoading(false);
        })();
    }, [user?.uid]);

    const items = useMemo(() => {
        const productsById = new Map(ALL_PRODUCTS.map((product) => [product.productId, product]));
        return ids
            .map((id) => productsById.get(id))
            .filter((product): product is Product => Boolean(product));
    }, [ids]);

    const removeAlert = async (productId: string) => {
        if (!user?.uid) return;
        const uid = user.uid;

        await setDoc(doc(db, "users", uid), {
            restockAlerts: arrayRemove(productId),
        }, { merge: true });
        setIds((prev) => prev.filter((id) => id !== productId));
    };

    return (
        <>
            <div className="mb-6 flex items-center gap-2">
                <h2 className="text-[20px] font-bold text-[#16121f]">재입고 알림</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7865ff] text-[12px] font-bold text-white">
                    {items.length}
                </span>
            </div>

            {!user ? (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-[14px] bg-[#faf9ff] text-[14px] text-[#9b94b2]">
                    <p>로그인 후 재입고 알림을 확인할 수 있어요.</p>
                    <Link href="/login" className="mt-5 rounded-full bg-[#7865ff] px-6 py-2.5 text-[13px] font-bold text-white">
                        로그인하기
                    </Link>
                </div>
            ) : loading ? (
                <div className="flex h-[300px] items-center justify-center text-[14px] text-[#9b94b2]">
                    불러오는 중...
                </div>
            ) : items.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-[14px] bg-[#faf9ff] text-[14px] text-[#9b94b2]">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-35">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    재입고 알림을 설정한 상품이 없어요.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((product) => (
                        <article key={product.productId} className="flex items-center gap-4 rounded-[14px] border border-[#ebe8ff] bg-white p-4">
                            <Link href={`/store/${product.productId}`} className="block h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[10px] bg-[#f0eeff]">
                                <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
                            </Link>

                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] text-[#8a8494]">{product.category}</p>
                                <Link href={`/store/${product.productId}`} className="mt-1 line-clamp-2 text-[14px] font-bold text-[#17151f] hover:text-[#7865ff]">
                                    {cleanTitle(product.title)}
                                </Link>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-[#f0eeff] px-2.5 py-1 text-[11px] font-bold text-[#7865ff]">
                                        재입고 대기
                                    </span>
                                    <span className="text-[12px] text-[#9b94b2]">
                                        {methodText(methods[product.productId] ?? [])}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => removeAlert(product.productId)}
                                className="h-9 rounded-full border border-[#ddd8f4] px-4 text-[12px] font-bold text-[#6b647a] transition hover:border-[#ff4d6d] hover:text-[#ff4d6d]"
                            >
                                알림 해제
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
}
