'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
    isOpen: boolean
    onClose: () => void
    type?: 'anime' | 'ost'
}

export default function MembershipRequiredModal({ isOpen, onClose, type = 'anime' }: Props) {
    const router = useRouter()

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

    if (!isOpen) return null

    const isOst = type === 'ost'

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
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* 아이콘 */}
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{
                        background: isOst ? 'rgba(236,72,153,0.12)' : 'rgba(108,99,255,0.12)',
                        border: `1px solid ${isOst ? 'rgba(236,72,153,0.3)' : 'rgba(108,99,255,0.3)'}`,
                    }}
                >
                    {isOst ? '🎵' : '🎬'}
                </div>

                <div className="text-center">
                    <h3 className="text-white font-black text-xl mb-2">멤버십이 필요해요</h3>
                    <p className="text-[var(--text-subtle)] text-sm leading-relaxed">
                        {isOst
                            ? 'OST를 감상하려면\nOST 또는 올인원 멤버십이 필요해요'
                            : '영상을 시청하려면\n애니 또는 올인원 멤버십이 필요해요'}
                    </p>
                </div>

                {/* 구분선 */}
                <div className="w-full h-px bg-white/[0.06]" />

                {/* 멤버십 페이지로 이동 버튼 */}
                <button
                    onClick={() => { onClose(); router.push('/membership') }}
                    className="w-full py-3.5 rounded-xl font-black text-white text-base transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                    style={{ background: isOst ? '#ec4899' : '#6c63ff' }}
                >
                    멤버십 시작하기
                </button>

                <button
                    onClick={onClose}
                    className="text-[var(--text-faint)] text-xs hover:text-[var(--text-muted)] transition-colors cursor-pointer"
                >
                    나중에 하기
                </button>
            </div>
        </div>
    )
}