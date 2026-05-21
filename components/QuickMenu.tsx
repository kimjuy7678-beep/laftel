"use client"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function QuickMenu() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // 하이드레이션 오류 방지
    useEffect(() => setMounted(true), [])
    if (!mounted) return null

    const isDark = theme === "dark"

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center gap-3">
            {/* 다크/라이트 토글 */}
            <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="테마 변경"
            >
                {isDark ? (
                    // 라이트모드로 전환 아이콘 (해)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                        <circle cx="12" cy="12" r="4"/>
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                    </svg>
                ) : (
                    // 다크모드로 전환 아이콘 (달)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                )}
            </button>

            {/* 맨 위로 버튼 */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="맨 위로"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black dark:text-white">
                    <path d="m18 15-6-6-6 6"/>
                </svg>
            </button>
        </div>
    )
}
