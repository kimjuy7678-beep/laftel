'use client'
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import QuickMenu from "@/components/QuickMenu"
import BottomTabBar from "@/components/BottomTabBar"
import { Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import AnimePreviewModal from "./anime/[id]/AnimePreviewModal"
import OnboardingModal from "@/components/OnboardingModal"
import { useAuthStore } from "@/store/useAuthStore"


export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const hideLayout = pathname === '/profile'
    const { user, isNewUser, clearNewUser } = useAuthStore()

    return (
        <>
            {isNewUser && user?.uid && (
                <OnboardingModal
                    uid={user.uid}
                    onComplete={clearNewUser}
                />
            )}

            {!hideLayout && <Header />}
            <AnimatePresence mode="wait" initial={false}>
                <motion.main
                    key={pathname}
                    className={!hideLayout ? 'pb-[76px] md:pb-0' : undefined}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                    {children}
                </motion.main>
            </AnimatePresence>

            {/* 푸터 - 데스크탑만 */}
            {!hideLayout && (
                <div className="hidden min-[1281px]:block">
                    <Footer />
                </div>
            )}

            {!hideLayout && <QuickMenu />}

            {/* 하단 탭바 - Capacitor 앱에서만 자동 렌더링 */}
            {!hideLayout && <BottomTabBar />}

            <AnimePreviewModal />
            <Toaster
                position="top-center"
                expand={false}
                richColors={false}
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: 'rgba(18, 17, 28, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(108,99,255,.25)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 14,
                        padding: '14px 18px',
                        boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(108,99,255,.1)',
                        minWidth: 280,
                    },
                    classNames: {
                        toast: 'group',
                        title: 'text-white font-bold',
                        description: 'text-white text-xs mt-0.5',
                    },
                }}
            />
        </>
    )
}
