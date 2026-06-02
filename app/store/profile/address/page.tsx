// app/store/profile/address/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

type Address = { id: string; label: string; name: string; phone: string; address: string; detail: string; zip: string; };

const MOCK: Address[] = [{
    id: "mock1", label: "우리집", name: "라프텔", phone: "010-5959-5959",
    address: "서울특별시 영등포구 국제금융로 10,(여의도동, 서울국제 금융센터 투아이에프씨) 13층, 주식회사 라프텔",
    detail: "", zip: "03706",
}];

export default function AddressPage() {
    const { user } = useAuthStore();
    const [addresses, setAddresses] = useState<Address[]>([]);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            const snap = await getDocs(collection(db, "users", user.uid!, "addresses"));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Address));
            setAddresses(data.length > 0 ? data : MOCK);
        })();
    }, [user?.uid]);

    const remove = async (id: string) => {
        if (!user?.uid || id === "mock1") return;
        await deleteDoc(doc(db, "users", user.uid, "addresses", id));
        setAddresses(prev => prev.filter(a => a.id !== id));
    };

    return (
        <>
            <h2 className="mb-5 text-[20px] font-bold text-[#16121f]">배송지 관리</h2>
            <div className="flex flex-col gap-3">
                {addresses.map(a => (
                    <div key={a.id} className="rounded-[12px] border border-[#ebe8ff] p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[14px] font-bold text-[#16121f]">{a.label}</p>
                            <div className="flex gap-2">
                                <button onClick={() => remove(a.id)} className="rounded-[6px] border border-[#ddd8f4] px-3 py-1 text-[11px] text-[#9b94b2] hover:border-[#ff4d6d] hover:text-[#ff4d6d]">삭제</button>
                                <button className="rounded-[6px] border border-[#ddd8f4] px-3 py-1 text-[11px] text-[#9b94b2] hover:border-[#7865ff] hover:text-[#7865ff]">수정</button>
                            </div>
                        </div>
                        <p className="text-[14px] font-medium text-[#16121f]">{a.name}</p>
                        <p className="text-[12px] text-[#9b94b2]">{a.phone}</p>
                        <p className="text-[12px] text-[#9b94b2]">{a.address}</p>
                        <p className="text-[12px] text-[#9b94b2]">({a.zip})</p>
                    </div>
                ))}
            </div>
        </>
    );
}