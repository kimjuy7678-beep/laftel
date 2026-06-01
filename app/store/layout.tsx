// app/store/layout.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/store/StoreHeader";

export default function StoreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>

            <div>
                {/* 헤더 바 */}
                <Header />


            </div>

            <main className="bg-white">{children}</main>
        </>
    );
}