// app/store/layout.tsx
"use client";

import Header from "@/components/store/StoreHeader";
import Footer from "@/components/Footer";
import StoreScrollTopButton from "@/components/store/StoreScrollTopButton";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function StoreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="bg-white min-h-auto">
            <Header />
            <AnimatePresence mode="wait" initial={false}>
                <motion.main
                    key={pathname}
                    className="bg-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                    {children}
                </motion.main>
            </AnimatePresence>
            <StoreScrollTopButton />
            <Footer variant="store" />
        </div>
    );
}
