// app/store/layout.tsx
"use client";

import Header from "@/components/store/StoreHeader";
import Footer from "@/components/Footer";

export default function StoreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>

            <div>
                {/* 헤더 바 */}
                <Header />
                <main className="bg-white">{children}</main>
                <Footer variant="store" />

            </div>


        </>
    );
}
