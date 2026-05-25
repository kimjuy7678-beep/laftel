"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useRouter } from 'next/navigation'

const pointOptions = [
    { label: "1,000 포인트", amount: 1000, price: "1,000원" },
    { label: "5,000 포인트", amount: 5000, price: "5,000원" },
    { label: "10,000 포인트", amount: 10000, price: "10,000원" },
    { label: "20,000 포인트", amount: 20000, price: "20,000원" },
    { label: "30,000 포인트", amount: 30000, price: "30,000원" },
]

const payMethods = [
    { id: "card", label: "카드", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { id: "toss", label: "토스페이", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#0064FF"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" fill="none"/></svg> },
    { id: "naverpay", label: "네이버페이", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#03C75A"><rect width="24" height="24" rx="4"/><text x="5" y="17" fontSize="12" fontWeight="bold" fill="white">N</text></svg> },
    { id: "transfer", label: "계좌이체", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
    { id: "phone", label: "휴대폰", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg> },
    { id: "smart", label: "스마트 문상", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { id: "culture", label: "컬처랜드 상품권", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> },
]

const notices = [
    "라프텔 포인트로 애니메이션을 소장 하거나 대여할 수 있습니다.",
    "100 포인트는 라프텔에서 100원으로 사용할 수 있습니다.",
    "충전한 포인트는 충전 후 사용내역이 없는 경우 충전 결제 단위로 7일 이내에 라프텔 고객센터를 통해 결제취소 및 환불이 가능합니다.",
    "사용 후 남은 포인트는 환불되지 않습니다. 남은 포인트는 라프텔 홈페이지에서 대여, 소장 구매 시 부분 결제로 사용이 가능합니다.",
    "미성년 회원의 결제는 원칙적으로 법정대리인의 명의 또는 동의 하에 이루어져야 하고, 법정대리인은 본인 동의 없이 체결된 자녀(미성년자)의 계약을 취소할 수 있습니다.",
    "이용에 관한 기타 문의 사항은 1:1 문의로 연락주세요.",
]

export default function Point() {
    const { user } = useAuthStore()
    const { points, loading, fetchPoints, chargePoints } = usePointStore()
    const router = useRouter()
    const [selectedOption, setSelectedOption] = useState<typeof pointOptions[0] | null>(null)
    const [selectedPay, setSelectedPay] = useState('card')
    const [agreed, setAgreed] = useState(false)
    const [charging, setCharging] = useState(false)

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        fetchPoints(user.uid)
    }, [user])

   const handleCharge = async () => {
    if (!user || !selectedOption || !agreed) return
    setCharging(true)
    try {
        await chargePoints(user.uid, selectedOption.amount)
        setSelectedOption(null)
        setAgreed(false)
        alert(`${selectedOption.amount.toLocaleString()} 포인트가 충전되었습니다!`)
    } catch (err) {
        console.error(err)
        alert('충전 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
        setCharging(false)
    }
}

    return (
        <div className="min-h-screen pt-20">
            <div className="inner px-6 py-10 max-w-4xl">
                <h1 className="text-xl font-bold mb-1">내 포인트</h1>
                <p className="text-sm text-white/50 mb-8">포인트로 애니메이션을 소장하거나 대여할 수 있어요.</p>

                <div className="flex items-center gap-2 mb-6">
                    <span className="text-base font-bold">내 포인트</span>
                    <span className="text-[#6c63ff] font-bold">
                        {loading ? '...' : `${points.toLocaleString()}P`}
                    </span>
                </div>

                <div className="flex flex-col gap-3 mb-10">
                    {pointOptions.map((opt) => (
                        <div
                            key={opt.amount}
                            className="flex items-center justify-between px-6 py-5 bg-[#1a1a1a] rounded-xl border border-white/5"
                        >
                            <span className="text-sm font-medium">{opt.label}</span>
                            <button
                                onClick={() => { setSelectedOption(opt); setAgreed(false) }}
                                className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-sm font-medium rounded-lg transition-colors"
                            >
                                {opt.price}
                            </button>
                        </div>
                    ))}
                </div>

                <div>
                    <h2 className="text-sm font-bold mb-3">포인트 구매 안내</h2>
                    <ul className="flex flex-col gap-1.5">
                        {notices.map((n, i) => (
                            <li key={i} className="text-xs text-white/40 leading-relaxed flex gap-1">
                                <span>•</span>{n}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* 결제 모달 */}
            {selectedOption && (
                <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedOption(null)} />
                    <div className="relative w-full max-w-[420px] bg-[#111] rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[90vh]">

                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <h2 className="font-bold text-lg">결제</h2>
                            <button onClick={() => setSelectedOption(null)} className="text-white/50 hover:text-white">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>

                        <div className="px-5 py-4 flex flex-col gap-5">
                            {/* 포인트 정보 */}
                            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                                    </svg>
                                    <span className="font-bold text-lg">{selectedOption.amount.toLocaleString()}P</span>
                                </div>
                                <p className="text-white/40 text-xs">라프텔 포인트로 애니메이션을 소장 하거나 대여할 수 있어요!</p>
                            </div>

                            {/* 금액 */}
                            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">판매금액</span>
                                    <span>{selectedOption.price}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-white/60">최종 결제 금액</span>
                                    <span className="text-[#6c63ff] text-base">{selectedOption.price}</span>
                                </div>
                            </div>

                            {/* 결제 수단 */}
                            <div>
                                <h3 className="font-bold mb-3">결제 수단</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {payMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedPay(method.id)}
                                            className={`flex flex-col items-center gap-2 py-4 rounded-xl border text-xs font-medium transition-colors ${
                                                selectedPay === method.id
                                                    ? 'border-[#6c63ff] bg-[#6c63ff]/10 text-white'
                                                    : 'border-white/10 bg-[#1a1a1a] text-white/60 hover:border-white/30'
                                            }`}
                                        >
                                            {method.icon}
                                            {method.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 이용 안내 */}
                            <div className="bg-[#1a1a1a] rounded-xl p-4">
                                <h3 className="text-xs font-bold mb-2">이용 안내</h3>
                                <ul className="flex flex-col gap-1.5">
                                    {notices.map((n, i) => (
                                        <li key={i} className="text-[11px] text-white/40 leading-relaxed flex gap-1">
                                            <span>•</span>{n}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 동의 체크 */}
                            <button
                                onClick={() => setAgreed(!agreed)}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors ${
                                    agreed ? 'border-[#6c63ff] bg-[#6c63ff]/10' : 'border-white/10 bg-[#1a1a1a]'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${agreed ? 'border-[#6c63ff] bg-[#6c63ff]' : 'border-white/30'}`}>
                                    {agreed && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20,6 9,17 4,12"/>
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs font-medium">주문 내용 및 유의사항을 확인하였으며 결제에 동의합니다.</span>
                            </button>

                            {/* 결제 버튼 */}
                            <button
                                onClick={handleCharge}
                                disabled={!agreed || charging}
                                className={`w-full py-4 rounded-xl font-bold text-sm transition-colors ${
                                    agreed && !charging
                                        ? 'bg-[#6c63ff] hover:bg-[#5a52e0] text-white'
                                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                            >
                                {charging ? '처리 중...' : `${selectedOption.price} 결제하기`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}