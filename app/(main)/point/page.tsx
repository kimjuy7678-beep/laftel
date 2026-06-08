"use client"
import PageHeader from '@/components/PageHeader'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useRouter } from 'next/navigation'
import { db } from '@/firebase/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import confetti from 'canvas-confetti'

type PayMethod = 'card' | 'toss' | 'naverpay' | 'kakaopay' | 'phone'

interface Card {
    id: string
    brand: string
    last4: string
    expiry: string
    isDefault: boolean
}
import { toast } from 'sonner'

const pointOptions = [
    { label: "1,000 포인트", amount: 1000, price: "1,000원" },
    { label: "5,000 포인트", amount: 5000, price: "5,000원" },
    { label: "10,000 포인트", amount: 10000, price: "10,000원" },
    { label: "20,000 포인트", amount: 20000, price: "20,000원" },
    { label: "30,000 포인트", amount: 30000, price: "30,000원" },
]

const easyOptions: { id: PayMethod; label: string; bg: string }[] = [
    { id: 'toss', label: '토스페이', bg: '#0064FF' },
    { id: 'naverpay', label: '네이버페이', bg: '#03C75A' },
    { id: 'kakaopay', label: '카카오페이', bg: '#FEE500' },
    { id: 'phone', label: '휴대폰', bg: '#333' },
]

const notices = [
    "라프텔 포인트로 애니메이션을 소장 하거나 대여할 수 있습니다.",
    "100 포인트는 라프텔에서 100원으로 사용할 수 있습니다.",
    "충전한 포인트는 충전 후 사용내역이 없는 경우 충전 결제 단위로 7일 이내에 라프텔 고객센터를 통해 결제취소 및 환불이 가능합니다.",
    "사용 후 남은 포인트는 환불되지 않습니다. 남은 포인트는 라프텔 홈페이지에서 대여, 소장 구매 시 부분 결제로 사용이 가능합니다.",
    "미성년 회원의 결제는 원칙적으로 법정대리인의 명의 또는 동의 하에 이루어져야 하고, 법정대리인은 본인 동의 없이 체결된 자녀(미성년자)의 계약을 취소할 수 있습니다.",
    "이용에 관한 기타 문의 사항은 1:1 문의로 연락주세요.",
]

function SuccessModal({ amount, onConfirm }: { amount: number; onConfirm: () => void }) {
    useEffect(() => {
        const colors = ['#826CFF', '#CEC5FF', '#9B8DFF', '#E8E3FF']
        const fire = (particleRatio: number, opts: confetti.Options) => {
            confetti({ origin: { y: 0.7 }, ...opts, particleCount: Math.floor(200 * particleRatio), colors })
        }
        fire(0.25, { spread: 26, startVelocity: 55 })
        fire(0.2, { spread: 60 })
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
        fire(0.1, { spread: 120, startVelocity: 45 })
    }, [])

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-sm p-10 flex flex-col items-center text-center gap-6 border border-[var(--border)]">
                <div className="w-20 h-20 rounded-full overflow-hidden" style={{ border: '2px solid var(--main)' }}>
                    <img src="/images/laftel-icon/success-icon.png" alt="포인트 충전" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h3 className="text-2xl font-black mb-2">충전 완료!</h3>
                    <p className="text-[var(--text-muted)] text-base">포인트가 충전되었어요 🎉</p>
                </div>
                <div className="w-full rounded-xl p-5 text-left flex flex-col gap-3"
                    style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.4)' }}>
                    <div className="flex justify-between">
                        <span className="text-[var(--text-muted)] text-base">충전 포인트</span>
                        <span className="font-bold text-base text-[var(--main)]">{amount.toLocaleString()}P</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[var(--text-muted)] text-base">결제 금액</span>
                        <span className="font-bold text-base text-[var(--text-primary)]">{amount.toLocaleString()}원</span>
                    </div>
                </div>
                <button
                    onClick={onConfirm}
                    className="w-full py-4 rounded-xl font-black text-lg text-white transition-all cursor-pointer hover:opacity-90"
                    style={{ background: 'var(--main)' }}
                >
                    확인
                </button>
            </div>
        </div>
    )
}

export default function Point() {
    const { user } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const { points, loading, fetchPoints, chargePoints } = usePointStore()

    useEffect(() => { setHydrated(true) }, [])
    const router = useRouter()

    const [selectedOption, setSelectedOption] = useState<typeof pointOptions[0] | null>(null)
    const [payMethod, setPayMethod] = useState<'easy' | 'card'>('easy')
    const [easyType, setEasyType] = useState<PayMethod | null>(null)
    const [agreed, setAgreed] = useState(false)
    const [charging, setCharging] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // 카드 관련
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
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        fetchPoints((user as any).uid)
        loadCards()
    }, [user])

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

    const handleCharge = async () => {
        if (!user || !selectedOption || !isPayable()) return
        setCharging(true)
        try {
            await chargePoints((user as any).uid, selectedOption.amount, '라프텔 OTT 포인트 충전')
            setShowSuccess(true)
        } catch {
            toast.error('충전 실패 😭', {
                description: '결제가 안 됐어요. 카드 정보 확인 후 다시 시도해봐요.',
            })
        } finally {
            setCharging(false)
        }
    }

    const handleClose = () => {
        setSelectedOption(null)
        setPayMethod('easy')
        setEasyType(null)
        setAgreed(false)
        setShowAddCard(false)
        setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('')
        setCardError('')
    }

    const handleSuccessConfirm = () => {
        setShowSuccess(false)
        handleClose()
    }

    const EasyIcon = ({ id }: { id: PayMethod }) => {
        if (id === 'toss') return <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
        if (id === 'naverpay') return <span className="text-white font-black text-base">N</span>
        if (id === 'kakaopay') return <span style={{ color: '#3C1E1E' }} className="font-black text-base">K</span>
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" /></svg>
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .pt-wrap { width: 90%; margin: 0 auto; }
                .pt-label { font-size: 12px; font-weight: 700; color: var(--text-subtle); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 20px; }
                .pt-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 0 0 48px; }
                .pt-notice-item { font-size: 13px; color: var(--text-subtle); line-height: 1.7; padding-left: 12px; position: relative; }
                .pt-notice-item::before { content: '-'; position: absolute; left: 0; color: var(--text-faint); }
            `}</style>

            <div className="pt-wrap">
                <PageHeader title="내 포인트" sub="포인트로 애니메이션을 소장하거나 대여할 수 있어요." />

                {/* 포인트 잔액 */}
                <section style={{ marginBottom: 48 }}>
                    <p className="pt-label">보유 포인트</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-primary)]">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                        </svg>
                        <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)' }}>
                            {loading ? '...' : `${points.toLocaleString()}P`}
                        </span>
                    </div>
                </section>

                <hr className="pt-divider" />

                {/* 충전 옵션 */}
                <section style={{ marginBottom: 48 }}>
                    <p className="pt-label">포인트 충전</p>
                    {pointOptions.map(opt => (
                        <div key={opt.amount} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-subtle)', marginBottom: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</span>
                            <button
                                onClick={() => { setSelectedOption(opt); setAgreed(false) }}
                                className="cursor-pointer"
                                style={{ fontSize: 13, padding: '8px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'none', color: 'var(--text-high)', transition: 'all .18s', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--main)'; (e.target as HTMLButtonElement).style.color = 'var(--main)' }}
                                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.target as HTMLButtonElement).style.color = 'var(--text-high)' }}
                            >
                                포인트 충전하기
                            </button>
                        </div>
                    ))}
                </section>

                <hr className="pt-divider" />

                {/* 안내 */}
                <section>
                    <p className="pt-label">포인트 구매 안내</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notices.map((n, i) => (
                            <p key={i} className="pt-notice-item">{n}</p>
                        ))}
                    </div>
                </section>
            </div>

            {/* 결제 모달 */}
            {selectedOption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={handleClose}
                >
                    <div className="relative bg-[var(--bg-secondary)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-[var(--border)]"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-secondary)] z-10">
                            <h3 className="text-xl font-black">결제</h3>
                            <button
                                onClick={handleClose}
                                className="w-9 h-9 rounded-full bg-[var(--border)] hover:bg-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-8 py-6 flex flex-col gap-7">

                            {/* 포인트 정보 */}
                            <div className="rounded-xl p-5 border border-[var(--border)] bg-[var(--border-faint)]">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                    </svg>
                                    <span className="text-2xl font-black text-[var(--main)]">{selectedOption.amount.toLocaleString()}P</span>
                                </div>
                                <p className="text-[var(--text-muted)] text-sm">라프텔 포인트로 애니메이션을 소장하거나 대여할 수 있어요!</p>
                            </div>

                            {/* 금액 */}
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)] text-base">판매금액</span>
                                    <span className="font-bold text-base">{selectedOption.price}</span>
                                </div>
                                <div className="flex justify-between border-t border-[var(--border)] pt-4">
                                    <span className="text-[var(--text-muted)] text-base font-bold">최종 결제 금액</span>
                                    <span className="text-2xl font-black text-[var(--main)]">{selectedOption.price}</span>
                                </div>
                            </div>

                            {/* 결제 수단 */}
                            <div>
                                <p className="text-[var(--text-muted)] text-sm font-bold mb-4 tracking-widest uppercase">결제 수단</p>

                                {/* 탭 */}
                                <div className="flex gap-3 mb-5">
                                    {[
                                        { id: 'easy' as const, label: '간편 결제' },
                                        { id: 'card' as const, label: '카드 결제' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setPayMethod(m.id)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer"
                                            style={payMethod === m.id
                                                ? { background: 'var(--main)', color: '#fff' }
                                                : { background: 'var(--border-subtle)', color: 'var(--text-muted)' }
                                            }
                                        >
                                            <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                                                style={payMethod === m.id ? { borderColor: '#fff' } : { borderColor: 'var(--border)' }}>
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
                                                    ? { borderColor: 'var(--main)', background: 'rgba(108,99,255,0.15)' }
                                                    : { borderColor: 'var(--border)', background: 'var(--border-faint)' }
                                                }
                                            >
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: opt.bg }}>
                                                    <EasyIcon id={opt.id} />
                                                </div>
                                                <span className="text-sm font-bold text-[var(--text-muted)]">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* 카드 결제 */}
                                {payMethod === 'card' && (
                                    <div className="flex flex-col gap-3">
                                        {/* 등록된 카드 목록 */}
                                        {cards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => { setSelectedCardId(card.id); setShowAddCard(false) }}
                                                className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer"
                                                style={selectedCardId === card.id
                                                    ? { borderColor: 'var(--main)', background: 'rgba(108,99,255,0.15)' }
                                                    : { borderColor: 'var(--border)', background: 'var(--border-faint)' }
                                                }
                                            >
                                                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                                    style={selectedCardId === card.id ? { borderColor: 'var(--main)' } : { borderColor: 'var(--border)' }}>
                                                    {selectedCardId === card.id && <span className="w-2.5 h-2.5 rounded-full block bg-[var(--main)]" />}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-base font-bold">{card.brand} •••• {card.last4}</p>
                                                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{card.expiry}</p>
                                                </div>
                                                {card.isDefault && (
                                                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[var(--main)]/20 text-[var(--main)]">기본</span>
                                                )}
                                            </button>
                                        ))}

                                        {/* 카드 추가 버튼 */}
                                        {!showAddCard && (
                                            <button
                                                onClick={() => { setShowAddCard(true); setSelectedCardId(null) }}
                                                className="flex items-center gap-2 p-4 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all text-base cursor-pointer"
                                            >
                                                <span className="text-xl">+</span>
                                                {cards.length > 0 ? '다른 결제 수단 추가' : '카드 추가하기'}
                                            </button>
                                        )}

                                        {/* 카드 추가 폼 */}
                                        {showAddCard && (
                                            <div className="rounded-xl p-5 border border-[var(--border)] bg-[var(--border-faint)] flex flex-col gap-5">
                                                <p className="text-base font-bold">카드 등록</p>
                                                <div>
                                                    <p className="text-sm text-[var(--text-muted)] mb-2">카드번호</p>
                                                    <input
                                                        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--main)] outline-none text-base py-2 text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors cursor-text"
                                                        value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                                        placeholder="0000 0000 0000 0000" maxLength={19}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-5">
                                                    <div>
                                                        <p className="text-sm text-[var(--text-muted)] mb-2">유효기간</p>
                                                        <input
                                                            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--main)] outline-none text-base py-2 text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors cursor-text"
                                                            value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                                                            placeholder="MM/YY" maxLength={5}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-[var(--text-muted)] mb-2">CVC</p>
                                                        <input
                                                            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--main)] outline-none text-base py-2 text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors cursor-text"
                                                            value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                            placeholder="000" maxLength={4} type="password"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-[var(--text-muted)] mb-2">카드 소유자 이름</p>
                                                    <input
                                                        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--main)] outline-none text-base py-2 text-[var(--text-primary)] placeholder-[var(--text-faint)] transition-colors cursor-text"
                                                        value={cardName} onChange={e => setCardName(e.target.value)}
                                                        placeholder="홍길동"
                                                    />
                                                </div>
                                                {cardError && <p className="text-sm text-red-400">{cardError}</p>}
                                                <p className="text-sm text-[var(--text-muted)]">🔒 카드번호 뒷 4자리만 저장됩니다.</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => { setShowAddCard(false); setCardError('') }}
                                                        className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-base font-bold hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleAddCard}
                                                        disabled={cardLoading}
                                                        className="flex-1 py-3 rounded-xl text-white text-base font-bold transition-colors cursor-pointer hover:opacity-90"
                                                        style={{ background: 'var(--main)', opacity: cardLoading ? 0.5 : 1 }}
                                                    >
                                                        {cardLoading ? '등록 중...' : '카드 등록'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 유의사항 */}
                            <div className="rounded-xl p-5 bg-[var(--border-faint)] border border-[var(--border)] max-h-36 overflow-y-auto"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
                                <p className="text-sm font-bold text-[var(--text-muted)] mb-3">이용 안내</p>
                                {notices.map((n, i) => (
                                    <p key={i} className="text-sm text-[var(--text-muted)] leading-relaxed">• {n}</p>
                                ))}
                            </div>

                            {/* 동의 체크박스 */}
                            <button
                                onClick={() => setAgreed(!agreed)}
                                className="flex items-center gap-4 p-5 rounded-xl border transition-all text-left cursor-pointer"
                                style={agreed
                                    ? { borderColor: 'var(--main)', background: 'rgba(108,99,255,0.10)' }
                                    : { borderColor: 'var(--border)', background: 'transparent' }
                                }
                            >
                                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                                    style={agreed ? { background: 'var(--main)' } : { border: '2px solid var(--border)' }}>
                                    {agreed && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-base font-bold text-[var(--text-muted)]">
                                    주문 내용 및 유의사항을 확인하였으며 결제에 동의합니다.
                                </p>
                            </button>

                            {/* 결제 버튼 */}
                            <button
                                onClick={handleCharge}
                                disabled={!isPayable() || charging}
                                className="w-full py-5 rounded-xl font-black text-xl text-white transition-all"
                                style={{
                                    background: isPayable() ? 'var(--main)' : 'var(--border-subtle)',
                                    color: isPayable() ? '#fff' : 'var(--text-subtle)',
                                    opacity: charging ? 0.7 : 1,
                                    cursor: isPayable() && !charging ? 'pointer' : 'default',
                                }}
                            >
                                {charging ? '처리 중...' : `${selectedOption.price} 결제하기`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 구매 완료 팝업 */}
            {showSuccess && selectedOption && (
                <SuccessModal amount={selectedOption.amount} onConfirm={handleSuccessConfirm} />
            )}
        </div>
    )
}