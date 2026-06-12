'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useState } from 'react'

function isCapacitorApp() {
    return typeof window !== 'undefined' && !!(window as any).Capacitor
}

export default function BottomTabBar() {
    const pathname = usePathname()
    const { user } = useAuthStore()
    const [isApp, setIsApp] = useState(false)

    useEffect(() => {
        setIsApp(isCapacitorApp())
    }, [])

    if (!isApp) return null

    const tabs = [
        {
            label: '홈',
            path: '/',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                    <path d="M9 21V12h6v9" />
                </svg>
            ),
        },
        {
            label: '검색',
            path: '/tag-search',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
            ),
        },
        {
            label: '찜',
            path: '/library',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            ),
        },
        {
            label: '마이',
            path: user ? '/mypage' : '/login',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
                </svg>
            ),
        },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-[var(--border)] bg-[var(--bg-primary)]">
            <div className="flex h-[60px] items-center justify-around px-2">
                {tabs.map((tab) => {
                    const isActive = tab.path === '/'
                        ? pathname === '/'
                        : pathname.startsWith(tab.path)
                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1"
                            style={{ color: isActive ? '#6c63ff' : 'var(--text-subtle)' }}
                        >
                            {tab.icon(isActive)}
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}