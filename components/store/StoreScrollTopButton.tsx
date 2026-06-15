"use client";

import { useEffect, useState } from "react";

export default function StoreScrollTopButton() {
    const [visible, setVisible] = useState(false);
    const [rightOffset, setRightOffset] = useState(32);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 360);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const paddingRight = parseInt(document.body.style.paddingRight || "0", 10);
            setRightOffset(32 + paddingRight);
        });

        observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
        return () => observer.disconnect();
    }, []);

    return (
        <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="맨 위로"
            className={`fixed bottom-8 z-[9999] hidden h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-all duration-200 hover:scale-110 md:flex ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
            style={{ right: rightOffset }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 15-6-6-6 6" />
            </svg>
        </button>
    );
}
