"use client";

import { useState, useRef, useEffect } from "react";

const SORT_OPTIONS = ["인기순", "신상품순", "낮은 가격순", "높은 가격순"];

interface SortProduct {
    price: string;
    popular?: boolean;
    isNew?: boolean;
    [key: string]: any;
}

interface SortDropdownProps {
    value: string;
    onChange: (value: string) => void;
}

export function sortProducts<T extends SortProduct>(products: T[], sort: string): T[] {
    return [...products].sort((a, b) => {
        if (sort === "인기순") return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
        if (sort === "신상품순") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        const parsePrice = (s: string) => parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
        if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
        if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
        return 0;
    });
}

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex h-[38px] items-center gap-2 rounded-[8px] border border-[#ddd8f4] bg-white pl-3 pr-8 text-[13px] text-[#3d3755] outline-none hover:border-[#7865ff] transition-colors cursor-pointer relative"
            >
                {value}
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b94b2]"
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-[130px] rounded-[10px] border border-[#e2ddf5] bg-white shadow-[0_8px_24px_rgba(30,24,70,0.1)] overflow-hidden">
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt}
                            onClick={() => { onChange(opt); setOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${value === opt
                                ? "bg-[#f0eeff] text-[#7865ff] font-semibold"
                                : "text-[#3d3755] hover:bg-[#faf9ff] hover:text-[#7865ff]"
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}