'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'

interface Props {
    isOpen: boolean
    onClose: () => void
    onLoginSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: Props) {
    const router = useRouter()

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

    if (!isOpen) return null

    const handleLogin = async () => {
        try {
            router.push("/login")
        } catch (e) {
            console.error('로그인 실패:', e)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-[#141414] rounded-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* 아이콘 */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </div>

                <div className="text-center">
                    <h3 className="text-white font-black text-xl mb-2">로그인이 필요해요</h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                        영상을 시청하려면<br />먼저 로그인해 주세요
                    </p>
                </div>

                {/* 구분선 */}
                <div className="w-full h-px bg-white/[0.06]" />

                {/* 구글 로그인 버튼 */}
                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                    로그인 하러가기
                </button>

                <button
                    onClick={onClose}
                    className="text-white/25 text-xs hover:text-white/50 transition-colors cursor-pointer"
                >
                    나중에 하기
                </button>
            </div>
        </div>
    )
}