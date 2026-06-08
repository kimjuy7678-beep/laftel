"use client";

import React, { useState, useEffect, useRef } from "react";

const PRICE_MIN = 0;
const PRICE_MAX = 350000;

interface FilterDropdownProps {
    open: boolean;
    onClose: () => void; // 추가
    priceRange: [number, number];
    onPriceRange: (v: [number, number]) => void;
    onlyInStock: boolean;
    onOnlyInStock: (v: boolean) => void;
    onReset: () => void;
    onlyReserve?: boolean;
    onOnlyReserve?: (v: boolean) => void;
}

export default function FilterDropdown({
    open,
    onClose,
    priceRange,
    onPriceRange,
    onlyInStock,
    onOnlyInStock,
    onReset,
    onlyReserve: onlyReserveProp,
    onOnlyReserve,
}: FilterDropdownProps) {
    const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

    const [localRange, setLocalRange] = useState<[number, number]>(priceRange);
    const [onlyReserve, setOnlyReserve] = useState(onlyReserveProp ?? false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setLocalRange(priceRange); }, [priceRange]);
    useEffect(() => { setOnlyReserve(onlyReserveProp ?? false); }, [onlyReserveProp]);

    // 외부 클릭 감지
    useEffect(() => {
        if (!open) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, [open, onClose]);

    const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalRange([Math.min(Number(e.target.value), localRange[1] - 1000), localRange[1]]);
    };
    const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalRange([localRange[0], Math.max(Number(e.target.value), localRange[0] + 1000)]);
    };

    const handleConfirm = () => onPriceRange(localRange);

    const handleReset = () => {
        setLocalRange([PRICE_MIN, PRICE_MAX]);
        setOnlyReserve(false);
        onOnlyReserve?.(false);
        onReset();
    };

    const handleToggleReserve = () => {
        const next = !onlyReserve;
        setOnlyReserve(next);
        onOnlyReserve?.(next);
    };

    const isPriceChanged = localRange[0] !== priceRange[0] || localRange[1] !== priceRange[1];

    if (!open) return null;

    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[280px] rounded-[16px] border border-[#e2ddf5] bg-white p-5 shadow-[0_8px_32px_rgba(30,24,70,0.14)]"
        >
            {/* 헤더 + X 버튼 */}
            <div className="flex items-center justify-end mb-2">
                <button
                    onClick={onClose}
                    className="flex h-[24px] w-[24px] items-center justify-center rounded-full text-[#9e98b0] transition hover:bg-[#f0edf8] hover:text-[#3d3755]"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 가격 */}
            <p className="text-[13px] font-semibold text-[#16121f]">가격별로 보기</p>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-[#ddd8f4] bg-[#faf9ff] text-[11px] font-medium text-[#3d3755]">
                    ₩{localRange[0].toLocaleString()}
                </div>
                <span className="text-[10px] text-[#c0bcd0]">—</span>
                <div className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-[#ddd8f4] bg-[#faf9ff] text-[11px] font-medium text-[#3d3755]">
                    ₩{localRange[1].toLocaleString()}
                </div>
            </div>
            <div className="relative mt-4 h-[6px] w-full">
                <div className="absolute inset-0 rounded-full bg-[#e2ddf5]" />
                <div
                    className="absolute h-full rounded-full bg-[#7865ff]"
                    style={{ left: `${pct(localRange[0])}%`, right: `${100 - pct(localRange[1])}%` }}
                />
                <input
                    type="range" min={PRICE_MIN} max={PRICE_MAX} step={1000}
                    value={localRange[0]} onChange={handleMin}
                    className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7865ff] [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <input
                    type="range" min={PRICE_MIN} max={PRICE_MAX} step={1000}
                    value={localRange[1]} onChange={handleMax}
                    className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7865ff] [&::-webkit-slider-thumb]:cursor-pointer"
                />
            </div>
            <button
                onClick={handleConfirm}
                disabled={!isPriceChanged}
                className={`mt-3 flex w-full items-center justify-center rounded-[10px] py-2 text-[13px] font-semibold transition ${isPriceChanged
                    ? "bg-[#7865ff] text-white hover:bg-[#6754e8] cursor-pointer"
                    : "bg-[#f0edf8] text-[#c0bcd0] cursor-default"
                    }`}
            >
                가격 적용
            </button>

            <div className="my-4 border-t border-[#f0edf8]" />

            {/* 재고 */}
            <p className="text-[13px] font-semibold text-[#16121f]">재고</p>
            <button
                onClick={() => onOnlyInStock(!onlyInStock)}
                className={`mt-3 flex w-full items-center justify-between rounded-[10px] border px-3 py-2.5 text-[13px] font-medium transition ${onlyInStock
                    ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]"
                    : "border-[#ddd8f4] bg-white text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"
                    }`}
            >
                <span>품절 제외</span>
                <div className={`relative h-[20px] w-[36px] rounded-full transition-colors ${onlyInStock ? "bg-[#7865ff]" : "bg-[#ddd8f4]"}`}>
                    <div className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${onlyInStock ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                </div>
            </button>

            <div className="my-4 border-t border-[#f0edf8]" />

            {/* 예약 굿즈 */}
            <p className="text-[13px] font-semibold text-[#16121f]">예약 굿즈</p>
            <button
                onClick={handleToggleReserve}
                className={`mt-3 flex w-full items-center justify-between rounded-[10px] border px-3 py-2.5 text-[13px] font-medium transition ${onlyReserve
                    ? "border-[#7865ff] bg-[#f0eeff] text-[#7865ff]"
                    : "border-[#ddd8f4] bg-white text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"
                    }`}
            >
                <span>예약 굿즈만 보기</span>
                <div className={`relative h-[20px] w-[36px] rounded-full transition-colors ${onlyReserve ? "bg-[#7865ff]" : "bg-[#ddd8f4]"}`}>
                    <div className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${onlyReserve ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                </div>
            </button>

            {/* 초기화 */}
            <button
                onClick={handleReset}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#ddd8f4] py-2 text-[12px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
                초기화
            </button>
        </div>
    );
}