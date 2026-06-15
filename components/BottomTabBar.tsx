'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { useState } from 'react'
import HeaderSearch from './HeaderSearch'

export default function BottomTabBar() {
    const pathname = usePathname()
    const { resolvedTheme, setTheme } = useTheme()
    const [searchOpen, setSearchOpen] = useState(false)
    const isDark = resolvedTheme === 'dark'

    const tabs = [
        {
            label: '홈',
            path: '/',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10.5 12 4l8 6.5" />
                    <path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" />
                </svg>
            ),
        },
        {
            label: '검색',
            path: null,
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
            ),
        },
        {
            label: '보관함',
            path: '/library',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7h18v13H3z" />
                    <path d="m7 7 2-4h6l2 4" />
                </svg>
            ),
        },
    ]

    return (
        <>
            {searchOpen && <HeaderSearch onClose={() => setSearchOpen(false)} />}
            <nav id="bottom-tab-bar" className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-xl md:hidden">
                <div className="flex h-[64px] items-center justify-around px-2 pb-[max(4px,env(safe-area-inset-bottom))]">
                    {tabs.map((tab) => {
                        const isActive = tab.path === '/'
                            ? pathname === '/'
                            : tab.path
                                ? pathname.startsWith(tab.path)
                                : searchOpen

                        if (!tab.path) {
                            return (
                                <button
                                    key={tab.label}
                                    type="button"
                                    onClick={() => setSearchOpen(true)}
                                    className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 py-1"
                                    style={{ color: isActive ? '#6c63ff' : 'var(--text-subtle)' }}
                                    aria-label="검색"
                                >
                                    {tab.icon(isActive)}
                                    <span className="text-[10px] font-medium">{tab.label}</span>
                                </button>
                            )
                        }

                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 py-1"
                                style={{ color: isActive ? '#6c63ff' : 'var(--text-subtle)' }}
                            >
                                {tab.icon(isActive)}
                                <span className="text-[10px] font-medium">{tab.label}</span>
                            </Link>
                        )
                    })}
                <button
                    type="button"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 py-1"
                    style={{ color: 'var(--text-subtle)' }}
                    aria-label="테마 변경"
                >
                    {isDark ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    )}
                    <span className="text-[10px] font-medium">테마변경</span>
                </button>
                </div>
            </nav>
        </>
    )
}
