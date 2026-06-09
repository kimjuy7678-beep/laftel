'use client'

type PlanId = 'anime' | 'ost' | 'allinone'

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onCloseAll: () => void
    planId: PlanId
}

export default function PaymentModal({ isOpen, onClose, onCloseAll, planId }: PaymentModalProps) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 w-[360px] border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                <p className="text-white font-bold text-lg mb-4">결제</p>
                <p className="text-[var(--text-muted)] text-sm mb-6">멤버십 결제 준비 중이에요.</p>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/20 text-[var(--text-muted)] text-sm hover:text-white transition-colors">취소</button>
                    <button onClick={onCloseAll} className="flex-1 py-2 rounded-xl bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">확인</button>
                </div>
            </div>
        </div>
    )
}