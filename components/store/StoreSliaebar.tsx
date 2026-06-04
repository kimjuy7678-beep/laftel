// components/store/StoreSidebar.tsx
"use client";

import Link from "next/link";

const STORE_MENU = [
    { label: "전체 굿즈", path: "/store/all", icon: "/store/ham/all.png" },
    { label: "신규 입고", path: "/store/new", icon: "/store/ham/star.png" },
    { label: "예약 굿즈", path: "/store/reserve", icon: "/store/ham/lyra-icon-endocrine.png" },
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
    if (!open) return null;

    return (
        <>
            {/* 딤 */}
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

            {/* 패널 */}
            <div className="fixed left-0 top-0 z-50 h-full w-[420px] bg-white shadow-[4px_0_32px_rgba(20,16,44,0.13)]">
                <div className="h-full overflow-y-auto px-5 pb-8 pt-6"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "#7865ff transparent" }}>

                    <div className="mb-6 flex items-center justify-between">
                        <p className="text-[20px] font-extrabold tracking-wider text-[#7865ff]">STORE</p>
                        <button onClick={onClose} className="text-[#9b94b2] hover:text-[#3d3755]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <Link href="/store/all" onClick={onClose}
                        className="mb-1 flex items-center gap-3 rounded-[10px] bg-[#f0eeff] px-3 py-2.5">
                        <span className="flex h-7 w-7 items-center justify-center">
                            <img src="/store/ham/all.png" alt="" className="h-5 w-5 object-contain" />
                        </span>
                        <span className="text-[14px] font-semibold tsext-[#7865ff]">전체 굿즈</span>
                    </Link>

                    <Link href="/store/series" onClick={onClose}
                        className="mb-1 flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition hover:bg-[#f8f6ff]">
                        <span className="flex h-7 w-7 items-center justify-center">
                            <img src="/store/ham/seri.png" alt="" className="h-5 w-5 object-contain" />
                        </span>
                        <span className="text-[14px] text-[#7865ff]">시리즈별</span>
                        <span className="ml-auto rounded-full bg-[#7865ff] px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                    </Link>

                    {STORE_MENU.slice(1).map((m) => (
                        <Link key={m.label} href={m.path} onClick={onClose}
                            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition hover:bg-[#f8f6ff]">
                            <span className="flex h-7 w-7 items-center justify-center">
                                <img src={m.icon} alt="" className="h-5 w-5 object-contain" />
                            </span>
                            <span className="text-[14px] text-[#7865ff]">{m.label}</span>
                        </Link>
                    ))}

                    <div className="my-5 border-t border-[#f0edf8]" />

                    <p className="mb-3 text-[11px] font-extrabold tracking-[0.12em] text-[#7865ff]">CATEGORY</p>
                    {CATEGORY_MENU.map((c) => (
                        <Link key={c.label} href={c.path} onClick={onClose}
                            className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition hover:bg-[#f8f6ff]">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0eeff]">
                                <img src={c.icon} alt="" className="h-4 w-4 object-contain" />
                            </span>
                            <span className="text-[13px] text-[#3d3755]">{c.label}</span>
                        </Link>
                    ))}

                    <div className="my-5 border-t border-[#f0edf8]" />

                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[13px] font-bold text-[#16121f]">최신업데이트</p>
                        <Link href="/store/series" onClick={onClose} className="flex items-center gap-1">
                            <span className="rounded-full bg-[#7865ff] px-2 py-0.5 text-[9px] font-bold text-white">NEW</span>
                            <span className="text-[12px] text-[#9b94b2]">›</span>
                        </Link>
                    </div>
                    {RECENT_SERIES.map((s) => (
                        <Link key={s.label} href={`/store/series?series=${encodeURIComponent(s.series)}`} onClick={onClose}
                            className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 transition hover:bg-[#f8f6ff]">
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

                    <div className="my-5 border-t border-[#f0edf8]" />

                    <Link href="/store/series" onClick={onClose}
                        className="flex items-center gap-3 rounded-[14px] bg-[#ede9ff] px-4 py-3 transition hover:bg-[#e0daff]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7865ff]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-[12px] font-bold text-[#3d2fa0]">전체 시리즈 보러가기</p>
                            <p className="text-[10px] text-[#7865ff]">236개 시리즈의 모든 굿즈를 확인해보세요.</p>
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7865ff] text-[12px] text-white">›</span>
                    </Link>

                    <Link href="#" onClick={onClose}
                        className="mt-2.5 flex items-center gap-3 rounded-[14px] bg-[#f5f3ff] px-4 py-3 transition hover:bg-[#ede9ff]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8e4f8]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7865ff" strokeWidth="2">
                                <path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
                                <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="mb-0.5">
                                <span className="rounded-full bg-[#e8e4f8] px-2 py-0.5 text-[9px] font-bold text-[#7865ff]">진행중</span>
                            </div>
                            <p className="text-[12px] font-bold text-[#3d2fa0]">이벤트 진행 중!</p>
                            <p className="text-[10px] text-[#7865ff]">다양한 할인과 특별 혜택을 놓치지 마세요</p>
                        </div>
                        <span className="text-[12px] text-[#9b94b2]">›</span>
                    </Link>
                </div>
            </div>
        </>
    );
}