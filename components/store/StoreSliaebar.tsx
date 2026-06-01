"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── 메뉴 데이터 ──────────────────────────────────────────────────────────────

const STORE_MENU = [
    { label: "전체 굿즈", path: "/store/all", icon: "/images/store/icons/lyra-icon-box3838.png", active: true },
    { label: "신규 입고", path: "/store/new", icon: "/images/store/icons/lyra-icon-magic-line.png" },
    { label: "인기 상품", path: "/store/best", icon: "/images/store/icons/lyra-icon-endocrine.png" },
    { label: "한정판", path: "/store/limited", icon: "/images/store/icons/lyra-icon-star-circle.png" },
    { label: "위시리스트( 마이페이지 있으면 제외!)", path: "/store/wishlist", icon: "/images/store/icons/lyra-icon-letter.png" },
];

const CATEGORY_MENU = [
    { label: "아크릴 스탠드", path: "/store/all?category=acrylic", icon: "/images/store/icons/lyra-icon-box3838.png" },
    { label: "클리어 파일", path: "/store/all?category=clearfile", icon: "/images/store/icons/lyra-icon-file-line.png" },
    { label: "뱃지·핀", path: "/store/all?category=badge", icon: "/images/store/icons/lyra-icon-face-id-02.png" },
    { label: "포스터", path: "/store/all?category=poster", icon: "/images/store/icons/lyra-icon-letter.png" },
    { label: "스티커·엽서", path: "/store/all?category=sticker", icon: "/images/store/icons/lyra-icon-magic-line.png" },
    { label: "키링", path: "/store/all?category=keyring", icon: "/images/store/icons/lyra-icon-star-circle.png" },
];

const RECENT_SERIES = [
    { label: "사카모토 데이즈", badge: "NEW", badgeColor: "#7865ff", dot: "#ff4d6d", thumb: "" },
    { label: "주술회전", badge: "+2", badgeColor: "#e8e4f8", badgeText: "#6b64a0", dot: "#7865ff", thumb: "" },
    { label: "귀멸의 칼날", badge: "NEW", badgeColor: "#7865ff", dot: "#22c55e", thumb: "" },
    { label: "나의 히어로 아카데미아", badge: "+1", badgeColor: "#e8e4f8", badgeText: "#6b64a0", dot: "#f59e0b", thumb: "" },
];

// ─── StoreSidebar ─────────────────────────────────────────────────────────────

export default function StoreSidebar() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // 바깥 클릭 시 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            {/* ── 햄버거 버튼 ── */}
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="스토어 메뉴"
                className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-[8px] transition hover:bg-white/10"
            >
                <span className={`block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
                <span className={`block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ${open ? "opacity-0" : ""}`} />
                <span className={`block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </button>

            {/* ── 드롭다운 패널 ── */}
            {open && (
                <div className="absolute left-0 top-[calc(100%+10px)] z-[100] w-[300px] overflow-hidden rounded-[20px] bg-white shadow-[0_16px_48px_rgba(20,16,44,0.18)]">
                    <div className="max-h-[80vh] overflow-y-auto px-5 py-6">

                        {/* STORE */}
                        <p className="mb-3 text-[18px] font-extrabold tracking-wider text-[#7865ff]">STORE</p>

                        {/* 하이라이트 행 (전체 굿즈) */}
                        <Link
                            href="/store/all"
                            onClick={() => setOpen(false)}
                            className="mb-1 flex items-center gap-3 rounded-[10px] bg-[#f0eeff] px-3 py-2.5"
                        >
                            <span className="flex h-7 w-7 items-center justify-center">
                                <img src="/images/store/icons/lyra-icon-box3838.png" alt="" className="h-5 w-5 object-contain" />
                            </span>
                            <span className="text-[14px] font-semibold text-[#7865ff]">전체 굿즈</span>
                        </Link>

                        {STORE_MENU.slice(1).map((m) => (
                            <Link
                                key={m.label}
                                href={m.path}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition hover:bg-[#f8f6ff]"
                            >
                                <span className="flex h-7 w-7 items-center justify-center">
                                    <img src={m.icon} alt="" className="h-5 w-5 object-contain" />
                                </span>
                                <span className="text-[14px] text-[#7865ff]">{m.label}</span>
                            </Link>
                        ))}

                        {/* 구분선 */}
                        <div className="my-4 border-t border-[#f0edf8]" />

                        {/* CATEGORY */}
                        <p className="mb-3 text-[13px] font-extrabold tracking-widest text-[#7865ff]">CATEGORY</p>

                        {CATEGORY_MENU.map((c) => (
                            <Link
                                key={c.label}
                                href={c.path}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition hover:bg-[#f8f6ff]"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eeff]">
                                    <img src={c.icon} alt="" className="h-4 w-4 object-contain" />
                                </span>
                                <span className="text-[13px] text-[#3d3755]">{c.label}</span>
                            </Link>
                        ))}

                        {/* 구분선 */}
                        <div className="my-4 border-t border-[#f0edf8]" />

                        {/* 최신 업데이트 */}
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[14px] font-bold text-[#16121f]">최신업데이트</p>
                            <div className="flex items-center gap-1">
                                <span className="rounded-full bg-[#7865ff] px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                                <span className="text-[#9b94b2]">›</span>
                            </div>
                        </div>

                        {RECENT_SERIES.map((s) => (
                            <Link
                                key={s.label}
                                href="#"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-[#f8f6ff]"
                            >
                                {/* 썸네일 자리 */}
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[8px] bg-[#e8e4f8]" />
                                {/* dot */}
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
                                <span className="flex-1 truncate text-[13px] text-[#3d3755]">{s.label}</span>
                                {/* 배지 */}
                                <span
                                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                    style={{
                                        backgroundColor: s.badgeColor,
                                        color: s.badge === "NEW" ? "white" : (s.badgeText ?? "#6b64a0"),
                                    }}
                                >
                                    {s.badge}
                                </span>
                                <span className="text-[11px] text-[#c0bcd0]">›</span>
                            </Link>
                        ))}

                        {/* 구분선 */}
                        <div className="my-4 border-t border-[#f0edf8]" />

                        {/* 전체 시리즈 배너 */}
                        <Link
                            href="/store"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-[14px] bg-[#ede9ff] px-4 py-3 transition hover:bg-[#e0daff]"
                        >
                            <img src="/images/store/icons/Object.png" alt="" className="h-9 w-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-[#3d2fa0]">전체 시리즈 보러가기</p>
                                <p className="text-[11px] text-[#7865ff]">236개 시리즈의 모든 굿즈를 확인해보세요.</p>
                            </div>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7865ff] text-white">›</span>
                        </Link>

                        {/* 이벤트 배너 */}
                        <Link
                            href="#"
                            onClick={() => setOpen(false)}
                            className="mt-3 flex items-center gap-3 rounded-[14px] bg-[#f5f3ff] px-4 py-3 transition hover:bg-[#ede9ff]"
                        >
                            <img src="/images/store/icons/Object-1.png" alt="" className="h-9 w-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div className="flex-1">
                                <div className="mb-0.5 flex items-center gap-1.5">
                                    <span className="rounded-full bg-[#e8e4f8] px-2 py-0.5 text-[9px] font-bold text-[#7865ff]">진행중</span>
                                </div>
                                <p className="text-[12px] font-bold text-[#3d2fa0]">이벤트 진행 중!</p>
                                <p className="text-[11px] text-[#7865ff]">다양한 할인과 특별 혜택을 놓치지 마세요</p>
                            </div>
                            <span className="text-[#9b94b2]">›</span>
                        </Link>

                    </div>
                </div>
            )}
        </div>
    );
}