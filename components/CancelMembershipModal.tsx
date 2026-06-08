'use client'
import { useEffect } from 'react'

interface Props {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    membershipName: string
}

export default function CancelMembershipModal({ isOpen, onClose, onConfirm, membershipName }: Props) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-[#141414] rounded-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* 경고 아이콘 */}
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>

                {/* 텍스트 */}
                <div className="text-center">
                    <h3 className="text-white font-black text-xl mb-2">멤버십을 해지할까요?</h3>
                    <p className="text-[var(--text-subtle)] text-sm leading-relaxed">
                        <span className="text-[var(--text-muted)] font-semibold">{membershipName}</span>을 해지하면<br />
                        다음 결제일부터 이용이 중단돼요.<br />
                        현재 기간은 끝까지 이용할 수 있어요.
                    </p>
                </div>

                <div className="w-full h-px bg-white/[0.06]" />

                {/* 버튼 */}
                <div className="w-full flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-white/15 text-[var(--text-muted)] font-bold text-sm hover:border-white/30 hover:text-white transition-colors cursor-pointer"
                    >
                        취소
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                        style={{ background: '#f87171' }}
                    >
                        해지하기
                    </button>
                </div>
            </div>
        </div>
    )
}