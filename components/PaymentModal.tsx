"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { doc, setDoc, addDoc, collection, getDoc } from 'firebase/firestore'
import confetti from 'canvas-confetti'
import React from 'react'

type PlanId = 'anime' | 'ost' | 'allinone'
type PayMethod = 'card' | 'easy'
type EasyType = 'toss' | 'naverpay' | 'kakaopay' | 'phone'

interface Plan {
    id: PlanId
    name: string
    price: string
    priceNum: number
    days: number
    color: string
    emoji: string
    desc: string
    features: string[]
}

const plans: Record<PlanId, Plan> = {
    anime: {
        id: 'anime', name: '애니 멤버십', price: '9,900', priceNum: 9900, days: 30,
        color: '#6c63ff', emoji: '🎬', desc: '애니메이션 무제한 시청',
        features: ['프로필 4인', '동시재생 4회선', '최신화 시청', 'FHD 화질 지원', 'TV 앱 지원', '실시간 라이브 감상'],
    },
    allinone: {
        id: 'allinone', name: '올인원', price: '13,900', priceNum: 13900, days: 30,
        color: '#f59e0b', emoji: '⚡', desc: '애니 + OST 전부 다',
        features: ['프로필 4인', '동시재생 4회선', '최신화 시청', '다운로드 지원', 'FHD 화질 지원', 'TV 앱 지원', '실시간 라이브 감상', 'OST 전곡 감상'],
    },
    ost: {
        id: 'ost', name: 'OST 멤버십', price: '4,900', priceNum: 4900, days: 30,
        color: '#ec4899', emoji: '🎵', desc: '애니 OST 전곡 감상',
        features: ['OST 전곡 무제한 감상', 'OST 오프라인 저장', '고음질 스트리밍'],
    },
}

interface Card {
    id: string
    brand: string
    last4: string
    expiry: string
    isDefault: boolean
}

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onCloseAll?: () => void   // MembershipModal까지 포함해 모든 팝업 닫기
    planId: PlanId
}

// ── 구매 완료 팝업 ─────────────────────────────────────────────
function SuccessModal({ plan, onGoHome, onGoHistory }: {
    plan: Plan
    onGoHome: () => void
    onGoHistory: () => void
}) {
    useEffect(() => {
        const fire = (particleRatio: number, opts: confetti.Options) => {
            confetti({
                origin: { y: 0.7 },
                ...opts,
                particleCount: Math.floor(150 * particleRatio),
            })
        }
        const colors = ['#826CFF', '#CEC5FF', '#9B8DFF', '#E8E3FF']
        fire(0.25, { spread: 26, startVelocity: 55, colors })
        fire(0.2, { spread: 60, colors })
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors })
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors })
        fire(0.1, { spread: 120, startVelocity: 45, colors })
    }, [])

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-sm p-10 flex flex-col items-center text-center gap-6 border border-white/10">

                {/* 닫기 버튼 */}
                <button
                    onClick={onGoHome}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* 아이콘 */}
                <div className="w-20 h-20 rounded-full overflow-hidden"
                    style={{ border: `2px solid ${plan.color}` }}>
                    <img
                        src="/images/laftel-icon/success-icon.png"
                        alt={plan.name}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* 타이틀 */}
                <div>
                    <h3 className="text-2xl font-black mb-2">구매 완료!</h3>
                    <p className="text-white/50 text-base">멤버십이 시작되었어요 🎉</p>
                </div>

                {/* 구매 정보 */}
                <div className="w-full rounded-xl p-5 text-left flex flex-col gap-3"
                    style={{ background: `${plan.color}12`, border: `1px solid ${plan.color}40` }}>
                    <div className="flex justify-between text-sm">
                        <span className="text-white/50 text-base">플랜</span>
                        <span className="font-bold text-base" style={{ color: plan.color }}>{plan.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/50 text-base">결제 금액</span>
                        <span className="font-bold text-base text-white">₩{plan.price}/월</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/50 text-base">이용 기간</span>
                        <span className="font-bold text-base text-white">{plan.days}일</span>
                    </div>
                </div>

                {/* 메인 버튼 — 홈으로 */}
                <button
                    onClick={onGoHome}
                    className="w-full py-4 rounded-xl font-black text-lg text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                    style={{ background: plan.color }}
                >
                    라프텔 이용하기
                </button>

                {/* 서브 버튼 — 이용내역 */}
                <button
                    onClick={onGoHistory}
                    className="text-white/35 text-sm font-semibold hover:text-white/60 transition-colors underline underline-offset-4 cursor-pointer"
                >
                    이용내역 확인하기
                </button>
            </div>
        </div>
    )
}

// ── 결제 팝업 ─────────────────────────────────────────────────
export default function PaymentModal({ isOpen, onClose, onCloseAll, planId }: PaymentModalProps) {
    const { user, setMembership } = useAuthStore()
    const router = useRouter()
    const plan = plans[planId]

    const [payMethod, setPayMethod] = useState<PayMethod>('easy')
    const [easyType, setEasyType] = useState<EasyType | null>(null)
    const [agreed, setAgreed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const [cards, setCards] = useState<Card[]>([])
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [showAddCard, setShowAddCard] = useState(false)
    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardError, setCardError] = useState('')
    const [cardLoading, setCardLoading] = useState(false)

    useEffect(() => {
        if (isOpen && user) loadCards()
    }, [isOpen, user])

    useEffect(() => {
        if (!isOpen) {
            setAgreed(false)
            setPayMethod('easy')
            setEasyType(null)
            setShowAddCard(false)
            setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('')
            setCardError('')
            setShowSuccess(false)
        }
    }, [isOpen])

    const loadCards = async () => {
        if (!user) return
        try {
            const uid = (user as any).uid
            const snap = await getDoc(doc(db, 'users', uid))
            const data = snap.data()
            if (data?.cards) {
                setCards(data.cards)
                const def = data.cards.find((c: Card) => c.isDefault)
                if (def) setSelectedCardId(def.id)
            }
        } catch { }
    }

    const detectBrand = (num: string) => {
        const n = num.replace(/\s/g, '')
        if (/^4/.test(n)) return 'VISA'
        if (/^5[1-5]/.test(n)) return 'Mastercard'
        if (/^3[47]/.test(n)) return 'AMEX'
        return '카드'
    }

    const formatCardNumber = (val: string) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    const formatExpiry = (val: string) => {
        const nums = val.replace(/\D/g, '').slice(0, 4)
        return nums.length >= 3 ? nums.slice(0, 2) + '/' + nums.slice(2) : nums
    }

    const handleAddCard = async () => {
        setCardError('')
        const rawNum = cardNumber.replace(/\s/g, '')
        if (rawNum.length < 15) { setCardError('카드번호를 올바르게 입력해주세요.'); return }
        if (cardExpiry.length < 5) { setCardError('유효기간을 올바르게 입력해주세요.'); return }
        if (cardCvc.length < 3) { setCardError('CVC를 올바르게 입력해주세요.'); return }
        if (!cardName.trim()) { setCardError('카드 소유자 이름을 입력해주세요.'); return }
        if (!user) return
        setCardLoading(true)
        try {
            const uid = (user as any).uid
            const newCard: Card = {
                id: `card_${Date.now()}`,
                brand: detectBrand(rawNum),
                last4: rawNum.slice(-4),
                expiry: cardExpiry,
                isDefault: cards.length === 0,
            }
            const newCards = [...cards, newCard]
            await setDoc(doc(db, 'users', uid), { cards: newCards }, { merge: true })
            setCards(newCards)
            setSelectedCardId(newCard.id)
            setShowAddCard(false)
            setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('')
        } catch { setCardError('카드 등록에 실패했어요.') }
        finally { setCardLoading(false) }
    }

    const isPayable = () => {
        if (!agreed) return false
        if (payMethod === 'card') return !!selectedCardId
        if (payMethod === 'easy') return !!easyType
        return false
    }

    const handlePay = async () => {
        if (!user || !isPayable()) return
        setLoading(true)
        try {
            const uid = (user as any).uid
            await setDoc(doc(db, 'users', uid), {
                membership: planId,
                membershipDays: plan.days,
                membershipStartAt: new Date(),
            }, { merge: true })
            await addDoc(collection(db, 'users', uid, 'membership_history'), {
                type: planId,
                label: `${plan.name} ${plan.days}일 이용권`,
                days: plan.days,
                createdAt: new Date(),
            })
            setMembership(planId)
            setShowSuccess(true)
        } catch {
            alert('결제에 실패했어요. 다시 시도해주세요.')
        } finally {
            setLoading(false)
        }
    }

    // 구매 완료 후 홈으로 — 모든 팝업 닫기
    const handleGoHome = () => {
        setShowSuccess(false)
        onClose()
        onCloseAll?.()   // MembershipModal도 닫기
        router.push('/')
    }

    // 구매 완료 후 이용내역으로 — 모든 팝업 닫기
    const handleGoHistory = () => {
        setShowSuccess(false)
        onClose()
        onCloseAll?.()   // MembershipModal도 닫기
        router.push('/history')
    }

    if (!isOpen) return null

    const easyOptions: { id: EasyType; label: string; bg: string; icon: React.ReactNode }[] = [
        {
            id: 'toss', label: '토스페이', bg: '#0064FF',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
        },
        {
            id: 'naverpay', label: '네이버페이', bg: '#03C75A',
            icon: <span className="text-white font-black text-base">N</span>
        },
        {
            id: 'kakaopay', label: '카카오페이', bg: '#FEE500',
            icon: <span style={{ color: '#3C1E1E' }} className="font-black text-base">K</span>
        },
        {
            id: 'phone', label: '휴대폰', bg: '#333',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" /></svg>
        },
    ]

    return (
        <>
            {/* 결제 팝업 — showSuccess일 때는 뒤로 숨김 */}
            {!showSuccess && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => { onClose(); onCloseAll?.() }}
                >
                    <div
                        className="relative bg-[#111] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-white/10"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 sticky top-0 bg-[#111] z-10">
                            <h3 className="text-xl font-black">결제</h3>
                            <button
                                onClick={() => { onClose(); onCloseAll?.() }}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-8 py-6 flex flex-col gap-7">

                            {/* 플랜 정보 */}
                            <div className="rounded-xl p-5 border border-white/10 bg-white/5">
                                <p className="font-black text-lg mb-2" style={{ color: plan.color }}>{plan.name}</p>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    {plan.features.join(' · ')}
                                </p>
                            </div>

                            {/* 금액 */}
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between">
                                    <span className="text-white/50 text-base">정기 결제 (매월)</span>
                                    <span className="font-bold text-base">월 {plan.price}원</span>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-4">
                                    <span className="text-white/60 text-base font-bold">최종 결제 금액</span>
                                    <span className="text-2xl font-black" style={{ color: plan.color }}>{plan.price}원</span>
                                </div>
                            </div>

                            {/* 결제 수단 */}
                            <div>
                                <p className="text-white/60 text-sm font-bold mb-4 tracking-widest uppercase">결제 수단</p>
                                <div className="flex gap-3 mb-5">
                                    {[
                                        { id: 'easy' as PayMethod, label: '간편 결제' },
                                        { id: 'card' as PayMethod, label: '카드 결제' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setPayMethod(m.id)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer"
                                            style={payMethod === m.id
                                                ? { background: plan.color, color: '#fff' }
                                                : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
                                            }
                                        >
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${payMethod === m.id ? 'border-white' : 'border-white/30'}`}>
                                                {payMethod === m.id && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                                            </span>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {/* 간편결제 */}
                                {payMethod === 'easy' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {easyOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setEasyType(opt.id)}
                                                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer"
                                                style={easyType === opt.id
                                                    ? { borderColor: plan.color, background: `${plan.color}15` }
                                                    : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }
                                                }
                                            >
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: opt.bg }}>
                                                    {opt.icon}
                                                </div>
                                                <span className="text-sm font-bold text-white/70">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* 카드 결제 */}
                                {payMethod === 'card' && (
                                    <div className="flex flex-col gap-3">
                                        {cards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => { setSelectedCardId(card.id); setShowAddCard(false) }}
                                                className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer"
                                                style={selectedCardId === card.id
                                                    ? { borderColor: plan.color, background: `${plan.color}15` }
                                                    : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }
                                                }
                                            >
                                                <span
                                                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                                    style={selectedCardId === card.id ? { borderColor: plan.color } : { borderColor: 'rgba(255,255,255,0.3)' }}
                                                >
                                                    {selectedCardId === card.id && <span className="w-2.5 h-2.5 rounded-full block" style={{ background: plan.color }} />}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-base font-bold">{card.brand} •••• {card.last4}</p>
                                                    <p className="text-sm text-white/40 mt-0.5">{card.expiry}</p>
                                                </div>
                                                {card.isDefault && (
                                                    <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: `${plan.color}20`, color: plan.color }}>기본</span>
                                                )}
                                            </button>
                                        ))}

                                        {!showAddCard && (
                                            <button
                                                onClick={() => { setShowAddCard(true); setSelectedCardId(null) }}
                                                className="flex items-center gap-2 p-4 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white/60 hover:border-white/40 transition-all text-base cursor-pointer"
                                            >
                                                <span className="text-xl">+</span> 다른 결제 수단 추가
                                            </button>
                                        )}

                                        {showAddCard && (
                                            <div className="rounded-xl p-5 border border-white/10 bg-white/5 flex flex-col gap-5">
                                                <p className="text-base font-bold">카드 등록</p>
                                                <div>
                                                    <p className="text-sm text-white/40 mb-2">카드번호</p>
                                                    <input
                                                        className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors cursor-text"
                                                        value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                                        placeholder="0000 0000 0000 0000" maxLength={19}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-5">
                                                    <div>
                                                        <p className="text-sm text-white/40 mb-2">유효기간</p>
                                                        <input
                                                            className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors cursor-text"
                                                            value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                                                            placeholder="MM/YY" maxLength={5}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-white/40 mb-2">CVC</p>
                                                        <input
                                                            className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors cursor-text"
                                                            value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                            placeholder="000" maxLength={4} type="password"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white/40 mb-2">카드 소유자 이름</p>
                                                    <input
                                                        className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors cursor-text"
                                                        value={cardName} onChange={e => setCardName(e.target.value)} placeholder="홍길동"
                                                    />
                                                </div>
                                                {cardError && <p className="text-sm text-red-400">{cardError}</p>}
                                                <p className="text-sm text-white/25">🔒 카드번호 뒷 4자리만 저장됩니다.</p>
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setShowAddCard(false); setCardError('') }}
                                                        className="flex-1 py-3 rounded-xl border border-white/20 text-white/50 text-base font-bold hover:border-white/40 transition-colors cursor-pointer">
                                                        취소
                                                    </button>
                                                    <button onClick={handleAddCard} disabled={cardLoading}
                                                        className="flex-1 py-3 rounded-xl text-white text-base font-bold transition-colors cursor-pointer hover:opacity-90"
                                                        style={{ background: plan.color, opacity: cardLoading ? 0.5 : 1 }}>
                                                        {cardLoading ? '등록 중...' : '카드 등록'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 유의사항 */}
                            <div className="rounded-xl p-5 bg-white/5 border border-white/10 max-h-36 overflow-y-auto"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                <p className="text-sm font-bold text-white/50 mb-3">멤버십 구독 및 결제 안내</p>
                                {[
                                    '결제 금액은 부가가치세(VAT)가 포함된 가격입니다.',
                                    '멤버십은 월정액 유료 이용권으로, 결제 즉시 적용되며 이용이 시작됩니다.',
                                    '매월 정기 결제일에 등록한 결제 수단을 통해 자동으로 결제됩니다.',
                                    '쿠폰, 분봉, 이벤트 등 무료 혜택과 중복 사용은 불가합니다.',
                                    '멤버십은 언제든지 해지할 수 있으며, 해지 후에도 남은 이용 기간까지는 서비스를 이용하실 수 있습니다.',
                                    '멤버십 이용 중에는 남은 기간에 대한 금액 환불이 불가합니다.',
                                ].map((t, i) => (
                                    <p key={i} className="text-sm text-white/30 leading-relaxed">• {t}</p>
                                ))}
                            </div>

                            {/* 동의 체크박스 */}
                            <button
                                onClick={() => setAgreed(!agreed)}
                                className="flex items-center gap-4 p-5 rounded-xl border transition-all text-left cursor-pointer"
                                style={agreed
                                    ? { borderColor: plan.color, background: `${plan.color}10` }
                                    : { borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }
                                }
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                                    style={agreed ? { background: plan.color } : { border: '2px solid rgba(255,255,255,0.3)' }}
                                >
                                    {agreed && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-base font-bold text-white/70">
                                    가격 및 유의사항을 확인하였으며, 매월 정기결제에 동의합니다.
                                </p>
                            </button>

                            {/* 결제 버튼 */}
                            <button
                                onClick={handlePay}
                                disabled={!isPayable() || loading}
                                className="w-full py-5 rounded-xl font-black text-xl text-white transition-all"
                                style={{
                                    background: isPayable() ? plan.color : 'rgba(255,255,255,0.1)',
                                    color: isPayable() ? '#fff' : 'rgba(255,255,255,0.3)',
                                    opacity: loading ? 0.7 : 1,
                                    cursor: isPayable() && !loading ? 'pointer' : 'default',
                                }}
                            >
                                {loading ? '처리 중...' : `${plan.price}원 결제하기`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 구매 완료 팝업 */}
            {showSuccess && (
                <SuccessModal
                    plan={plan}
                    onGoHome={handleGoHome}
                    onGoHistory={handleGoHistory}
                />
            )}
        </>
    )
}