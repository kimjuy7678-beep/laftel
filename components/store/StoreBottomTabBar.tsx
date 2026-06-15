'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { StoreSearchModal } from '@/components/store/StoreSearch'
import HeaderLoginAlert from '@/components/store/HeaderLoginAlert'

function getCartItemCount(cart: unknown) {
    if (!Array.isArray(cart)) return 0

    return cart.reduce((total, item) => {
        if (typeof item === 'string') return total + 1
        if (!item || typeof item !== 'object') return total

        const quantity = Number((item as { quantity?: unknown }).quantity)
        if (!Number.isFinite(quantity)) return total + 1

        return total + Math.max(1, quantity)
    }, 0)
}

export default function StoreBottomTabBar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user } = useAuthStore()
    const [searchOpen, setSearchOpen] = useState(false)
    const [loginAlertOpen, setLoginAlertOpen] = useState(false)
    const [cartCount, setCartCount] = useState(0)

    useEffect(() => {
        if (!user?.uid) return

        return onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => setCartCount(getCartItemCount(snap.data()?.cart)),
            () => setCartCount(0),
        )
    }, [user?.uid])

    const guardedPush = (path: string) => {
        if (!user) {
            setLoginAlertOpen(true)
            return
        }
        router.push(path)
    }

    const visibleCartCount = user ? cartCount : 0

    const tabs = [
        {
            label: '스토어',
            path: '/store',
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10h16l-1-5H5l-1 5z" />
                    <path d="M5 10v10h14V10" />
                    <path d="M9 20v-5h6v5" />
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
            label: '장바구니',
            path: '/store/cart',
            guarded: true,
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            ),
        },
        {
            label: '마이',
            path: '/store/profile',
            guarded: true,
            icon: (active: boolean) => (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
                </svg>
            ),
        },
    ]

    return (
        <>
            <StoreSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
            {loginAlertOpen && <HeaderLoginAlert onClose={() => setLoginAlertOpen(false)} />}
            <nav className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-[#ece8f4] bg-white/95 text-[#5f5968] backdrop-blur-xl md:hidden">
                <div className="flex h-[64px] items-center justify-around px-2 pb-[max(4px,env(safe-area-inset-bottom))]">
                    {tabs.map((tab) => {
                        const isActive = tab.path
                            ? tab.path === '/store'
                                ? pathname.startsWith('/store')
                                && !pathname.startsWith('/store/cart')
                                && !pathname.startsWith('/store/profile')
                                && !pathname.startsWith('/store/order')
                                : pathname.startsWith(tab.path)
                            : searchOpen
                        const color = isActive ? '#826CFF' : '#8a8494'

                        if (!tab.path) {
                            return (
                                <button
                                    key={tab.label}
                                    type="button"
                                    onClick={() => setSearchOpen(true)}
                                    className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 py-1"
                                    style={{ color }}
                                    aria-label="상품 검색"
                                >
                                    {tab.icon(isActive)}
                                    <span className="text-[10px] font-semibold">{tab.label}</span>
                                </button>
                            )
                        }

                        if (tab.guarded) {
                            return (
                                <button
                                    key={tab.path}
                                    type="button"
                                    onClick={() => guardedPush(tab.path)}
                                    className="relative flex min-w-[60px] flex-col items-center justify-center gap-0.5 py-1"
                                    style={{ color }}
                                    aria-label={tab.label}
                                >
                                    {tab.icon(isActive)}
                                    {tab.path === '/store/cart' && visibleCartCount > 0 && (
                                        <span className="absolute right-3 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                                            {visibleCartCount > 99 ? '99+' : visibleCartCount}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-semibold">{tab.label}</span>
                                </button>
                            )
                        }

                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className="flex min-w-[60px] flex-col items-center justify-center gap-0.5 py-1"
                                style={{ color }}
                            >
                                {tab.icon(isActive)}
                                <span className="text-[10px] font-semibold">{tab.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
