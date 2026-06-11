// components/store/StoreSidebar.tsx  (StoreSliaebar.tsx)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STORE_MENU = [
    { label: "전체 굿즈", path: "/store/all", icon: "/store/ham/all.png" },
    { label: "한정 굿즈", path: "/store/rare", icon: "/store/ham/star.png" },
    { label: "인기 상품", path: "/store/best", icon: "/store/ham/lyra-icon-endocrine.png" },
];

const CATEGORY_MENU = [
    { label: "아크릴 스탠드", path: "/store/category/acrylic", icon: "/store/ham/lyra-icon-box3838.png" },
    { label: "클리어 파일", path: "/store/category/clearfile", icon: "/store/ham/lyra-icon-file-line.png" },
    { label: "뱃지·핀", path: "/store/category/badge", icon: "/store/ham/lyra-icon-face-id-02.png" },
    { label: "포스터", path: "/store/category/poster", icon: "/store/ham/lyra-icon-letter.png" },
    { label: "스티커·엽서", path: "/store/category/sticker", icon: "/store/ham/lyra-icon-magic-line.png" },
    { label: "키링", path: "/store/category/keyring", icon: "/store/ham/lyra-icon-star-circle.png" },
];

const RECENT_SERIES = [
    { label: "귀멸의 칼날", series: "귀멸의 칼날", badge: "NEW", badgeColor: "#7865ff", badgeText: "white", dot: "#ff4d6d", img: "/store/ham/ghost.png" },
    { label: "나의 히어로 아카데미아", series: "나의 히어로 아카데미아", badge: "+1", badgeColor: "#e8e4f8", badgeText: "#6b64a0", dot: "#f59e0b", img: "/store/ham/hero.png" },
    { label: "사카모토 데이즈", series: "사카모토 데이즈", badge: "NEW", badgeColor: "#7865ff", badgeText: "white", dot: "#22c55e", img: "/store/ham/sakamoto.png" },
    { label: "주술회전", series: "주술회전", badge: "+2", badgeColor: "#e8e4f8", badgeText: "#6b64a0", dot: "#7865ff", img: "/store/ham/jusule.png" },
];

export default function StoreSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

    // 액티브: 보라 배경 + 흰글씨 / 비액티브 호버: 채도낮은 보라 배경 + 흰글씨
    const linkCls = (path: string) =>
        isActive(path)
            ? "bg-[#7865ff] text-white [&_img]:brightness-0 [&_img]:invert"
            : "hover:bg-[#7865ff]/15";

    const quickLinks = [
        STORE_MENU[0],
        STORE_MENU[1],
        { label: "시리즈별", path: "/store/series", icon: "/store/ham/seri.png" },
        ...CATEGORY_MENU.slice(0, 3),
    ];

    const linkText = (path: string, activeColor = "text-[#3d3755]") =>
        isActive(path) ? "font-semibold text-white" : activeColor;

    const menuContent = (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
            <div>
                <p className="mb-3 text-[11px] font-extrabold tracking-[0.12em] text-[#7865ff]">STORE</p>
                <div className="grid gap-1 sm:grid-cols-2">
                    <Link href="/store/all" onClick={onClose}
                        className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition ${linkCls("/store/all")}`}>
                        <span className="flex h-7 w-7 items-center justify-center">
                            <img src="/store/ham/all.png" alt="" className="h-5 w-5 object-contain" />
                        </span>
                        <span className={`text-[14px] ${linkText("/store/all", "font-semibold text-[#7865ff]")}`}>전체 굿즈</span>
                    </Link>
                    <Link href="/store/series" onClick={onClose}
                        className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition ${linkCls("/store/series")}`}>
                        <span className="flex h-7 w-7 items-center justify-center">
                            <img src="/store/ham/seri.png" alt="" className="h-5 w-5 object-contain" />
                        </span>
                        <span className={`text-[14px] ${linkText("/store/series", "text-[#7865ff]")}`}>시리즈별</span>
                        {!isActive("/store/series") && (
                            <span className="ml-auto rounded-full bg-[#7865ff] px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                        )}
                    </Link>
                    {STORE_MENU.slice(1).map((m) => (
                        <Link key={m.label} href={m.path} onClick={onClose}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition ${linkCls(m.path)}`}>
                            <span className="flex h-7 w-7 items-center justify-center">
                                <img src={m.icon} alt="" className="h-5 w-5 object-contain" />
                            </span>
                            <span className={`text-[14px] ${linkText(m.path, "text-[#7865ff]")}`}>{m.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="my-5 border-t border-[#f0edf8]" />

                <p className="mb-3 text-[11px] font-extrabold tracking-[0.12em] text-[#7865ff]">CATEGORY</p>
                <div className="grid gap-1 sm:grid-cols-2">
                    {CATEGORY_MENU.map((c) => (
                        <Link key={c.label} href={c.path} onClick={onClose}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2 transition ${linkCls(c.path)}`}>
                            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isActive(c.path) ? "bg-white/20" : "bg-[#f0eeff]"}`}>
                                <img src={c.icon} alt="" className="h-4 w-4 object-contain" />
                            </span>
                            <span className={`text-[13px] ${linkText(c.path)}`}>{c.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="border-t border-[#f0edf8] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-bold text-[#16121f]">최신업데이트</p>
                    <Link href="/store/series" onClick={onClose} className="flex items-center gap-1">
                        <span className="rounded-full bg-[#7865ff] px-2 py-0.5 text-[9px] font-bold text-white">NEW</span>
                        <span className="text-[12px] text-[#9b94b2]">›</span>
                    </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    {RECENT_SERIES.map((s) => (
                        <Link key={s.label} href={`/store/series?series=${encodeURIComponent(s.series)}`} onClick={onClose}
                            className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 transition hover:bg-[#7865ff]/15">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-[#e8e4f8]">
                                <img src={s.img} alt={s.label} className="h-full w-full object-cover" />
                            </div>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
                            <span className="flex-1 truncate text-[12px] text-[#3d3755]">{s.label}</span>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
                                style={{ backgroundColor: s.badgeColor, color: s.badgeText }}>{s.badge}</span>
                            <span className="text-[11px] text-[#c0bcd0]">›</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="mt-3 hidden overflow-hidden border-t border-[#ebe8ff] pt-3 md:block">
                <div className="relative">
                    <div className="flex gap-2 overflow-hidden">
                        {quickLinks.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={onClose}
                                className={`flex h-10 shrink-0 items-center gap-2 rounded-[10px] border px-3 text-[12px] transition ${isActive(item.path)
                                    ? "border-[#7865ff] bg-[#7865ff] text-white [&_img]:brightness-0 [&_img]:invert"
                                    : "border-[#e4def7] bg-[#faf9ff] text-[#5f5870] hover:border-[#7865ff]/50 hover:text-[#7865ff]"
                                    }`}
                            >
                                <img src={item.icon} alt="" className="h-4 w-4 object-contain" />
                                <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                    {!open && <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-20 bg-gradient-to-l from-white to-white/0" />}
                </div>

                <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="min-h-0 overflow-hidden">
                        <div className="mt-4 rounded-[16px] border border-[#e4def7] bg-white p-4 shadow-[0_10px_28px_rgba(30,24,70,0.08)]">
                            {menuContent}
                        </div>
                    </div>
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <button
                        type="button"
                        aria-label="카테고리 닫기"
                        className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
                        onClick={onClose}
                    />
                    <div className="absolute left-0 top-0 h-full w-[min(86vw,360px)] overflow-y-auto bg-white px-5 pb-8 pt-6 shadow-[18px_0_50px_rgba(30,24,70,0.18)]">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-[20px] font-extrabold tracking-wider text-[#7865ff]">STORE</p>
                                <p className="mt-0.5 text-[12px] text-[#9b94b2]">카테고리 전체보기</p>
                            </div>
                            <button onClick={onClose} aria-label="카테고리 닫기" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f3ff] text-[#9b94b2]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {menuContent}
                    </div>
                </div>
            )}
        </>
    );
}
