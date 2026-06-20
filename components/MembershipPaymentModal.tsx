'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { doc, setDoc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useRouter } from 'next/navigation'
import { issueCoupon } from '@/lib/coupon'

type PlanId = 'anime' | 'ost' | 'allinone'

const PLAN_INFO = {
    anime: { name: '애니 멤버십', price: 9900, color: '#6c63ff' },
    ost: { name: 'OST 멤버십', price: 4900, color: '#ec4899' },
    allinone: { name: '올인원', price: 13900, color: '#f59e0b' },
}

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onCloseAll: () => void
    planId: PlanId
}

export default function PaymentModal({ isOpen, onClose, onCloseAll, planId }: PaymentModalProps) {
    const { user } = useAuthStore()
    const plan = PLAN_INFO[planId]

    const [cards, setCards] = useState<any[]>([])
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [showAddCard, setShowAddCard] = useState(false)
    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardError, setCardError] = useState('')
    const [cardLoading, setCardLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [paying, setPaying] = useState(false)
    const [done, setDone] = useState(false)
    const { setMembership } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        if (!isOpen || !user?.uid) return
        const fetchCards = async () => {
            const snap = await getDoc(doc(db, 'users', user.uid!))
            const data = snap.data()
            if (data?.cards?.length) {
                setCards(data.cards)
                setSelectedCardId(data.cards[0].id)
            }
        }
        fetchCards()
    }, [isOpen, user?.uid])

    if (!isOpen) return null

    const detectBrand = (num: string) => {
        const n = num.replace(/\s/g, '')
        if (/^4/.test(n)) return 'VISA'
        if (/^5[1-5]/.test(n)) return 'Mastercard'
        return '카드'
    }
    const formatCardNumber = (val: string) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    const formatExpiry = (val: string) => {
        const nums = val.replace(/\D/g, '').slice(0, 4)
        if (nums.length >= 2) {
            const month = parseInt(nums.slice(0, 2))
            if (month > 12) return '12' + (nums.length >= 3 ? '/' + nums.slice(2) : '')
            if (month === 0) return '01' + (nums.length >= 3 ? '/' + nums.slice(2) : '')
        }
        return nums.length >= 3 ? nums.slice(0, 2) + '/' + nums.slice(2) : nums
    }

    const handleAddCard = async () => {
        setCardError('')
        const rawNum = cardNumber.replace(/\s/g, '')
        if (rawNum.length < 15) { setCardError('카드번호를 올바르게 입력해주세요.'); return }
        if (cardExpiry.length < 5) { setCardError('유효기간을 올바르게 입력해주세요.'); return }
        const [expMonth, expYear] = cardExpiry.split('/')
        const month = parseInt(expMonth)
        const year = parseInt('20' + expYear)
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        if (month < 1 || month > 12) { setCardError('유효한 월을 입력해주세요. (01~12)'); return }
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            setCardError('만료된 카드예요.'); return
        }
        if (cardCvc.length < 3) { setCardError('CVC를 올바르게 입력해주세요.'); return }
        if (!cardName.trim()) { setCardError('카드 소유자 이름을 입력해주세요.'); return }
        if (!user?.uid) return
        setCardLoading(true)
        try {
            const newCard = { id: `card_${Date.now()}`, brand: detectBrand(rawNum), last4: rawNum.slice(-4), expiry: cardExpiry, isDefault: cards.length === 0 }
            const newCards = [...cards, newCard]
            await setDoc(doc(db, 'users', user.uid), { cards: newCards }, { merge: true })
            setCards(newCards); setSelectedCardId(newCard.id); setShowAddCard(false)
            setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('')
        } catch { setCardError('카드 등록에 실패했어요.') }
        finally { setCardLoading(false) }
    }

    const handlePay = async () => {
        if (!user?.uid) return
        setPaying(true)
        await new Promise(res => setTimeout(res, 1500))
        try {
            // 멤버십 상태 저장
            await setDoc(doc(db, 'users', user.uid), {
                membership: planId,
                membershipStartedAt: new Date().toISOString(),
                membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }, { merge: true })

            // 결제 내역 저장
            await addDoc(collection(db, 'users', user.uid, 'paymentHistory'), {
                planId,
                planName: plan.name,
                price: plan.price,
                createdAt: serverTimestamp(),
            })

            // 멤버십 가입 축하 쿠폰 발급 + 알림 자동 생성
            await issueCoupon({
                uid: user.uid,
                label: `${plan.name} 가입 축하 쿠폰`,
                discount: 2000,
                type: 'fixed',
                minOrderAmount: 10000,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            })

        } catch (e) { console.warn('멤버십 저장 실패:', e) }
        setPaying(false)
        setMembership(planId)
        setPassword('')
        setDone(true)
    }

    // 결제 완료 화면
    if (done) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCloseAll}>
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 w-[320px] border border-[var(--border)] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${plan.color}20` }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5"><polyline points="20,6 9,17 4,12" /></svg>
                </div>
                <p className="text-[var(--text-primary)] font-bold text-base">멤버십이 시작됐어요!</p>
                <p className="text-[var(--text-subtle)] text-sm text-center">{plan.name} · {plan.price.toLocaleString()}원/월</p>
                <button onClick={onCloseAll} className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity" style={{ background: plan.color }}>
                    확인
                </button>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!paying) onClose() }}>
            <div className="bg-[var(--bg-card)] rounded-2xl w-[380px] border border-[var(--border)] overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                    <h2 className="text-[var(--text-primary)] font-bold text-lg">라프텔 페이</h2>
                    {!paying && <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>}
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    {/* 플랜 요약 */}
                    <div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">선택 플랜</span><span className="text-[var(--text-primary)] font-semibold">{plan.name}</span></div>
                    <div className="flex justify-between text-sm border-t border-[var(--border)] pt-3">
                        <span className="text-[var(--text-primary)] font-bold">월 결제금액</span>
                        <span className="font-bold text-base" style={{ color: plan.color }}>{plan.price.toLocaleString()}원</span>
                    </div>

                    {/* 카드 */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[var(--text-muted)] text-xs">등록된 결제수단</p>
                        {cards.length === 0
                            ? <p className="text-[var(--text-faint)] text-sm">등록된 카드가 없어요</p>
                            : cards.map(card => (
                                <div key={card.id} onClick={() => setSelectedCardId(card.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedCardId === card.id
                                        ? 'border-[var(--main)] bg-[var(--main)]/10'
                                        : 'border-[var(--border)] hover:border-[var(--text-subtle)]'
                                        }`}>
                                    <div className="w-10 h-7 rounded bg-[var(--main)]/20 border border-[var(--main)]/30 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                    </div>
                                    <span className="text-[var(--text-primary)] text-sm font-semibold">{card.brand} **** {card.last4}</span>
                                </div>
                            ))
                        }
                        {!showAddCard && (
                            <button onClick={() => setShowAddCard(true)} className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-subtle)] hover:text-[--text-muted] transition-all text-sm">
                                <span className="text-lg">+</span> 카드 추가
                            </button>
                        )}
                        {showAddCard && (
                            <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col gap-4">
                                <p className="text-[var(--text-primary)] text-sm font-bold">카드 등록</p>
                                <input
                                    className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-primary)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                    value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                    placeholder="0000 0000 0000 0000" maxLength={19}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-primary)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                        value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                                        placeholder="MM/YY" maxLength={5}
                                    />
                                    <input
                                        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-primary)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                        value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="000" maxLength={4} type="password"
                                    />
                                </div>
                                <input
                                    className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-primary)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                    value={cardName} onChange={e => setCardName(e.target.value)}
                                    placeholder="홍길동"
                                />
                                {cardError && <p className="text-xs text-red-400">{cardError}</p>}
                                <div className="flex gap-2">
                                    <button onClick={() => { setShowAddCard(false); setCardError('') }} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors">취소</button>
                                    <button onClick={handleAddCard} disabled={cardLoading} className="flex-1 py-2 rounded-xl bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">{cardLoading ? '등록 중...' : '등록'}</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 비밀번호 */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[var(--text-muted)] text-sm">결제 비밀번호 6자리</p>
                        <div className="flex gap-2 justify-center">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${password.length > i ? 'border-[var(--main)] bg-[var(--main)]/10' : 'border-[var(--border)]'}`}>
                                    {password.length > i && <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-primary)] block" />}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, i) => (
                                <button key={i} disabled={paying}
                                    onClick={() => { if (key === '⌫') setPassword(prev => prev.slice(0, -1)); else if (key !== '' && password.length < 6) setPassword(prev => prev + key) }}
                                    className={`py-3 rounded-xl text-[var(--text-primary)] font-semibold text-lg transition-all ${key === '' ? '' : 'hover:bg-[var(--bg-hover)] active:bg-[var(--bg-secondary)]'} disabled:opacity-50`}>
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <button
                        disabled={password.length < 6 || !selectedCardId || paying}
                        onClick={handlePay}
                        className="w-full py-4 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
                        style={{ background: plan.color }}
                    >
                        {paying
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />결제 중...</>
                            : `${plan.price.toLocaleString()}원 결제하기`
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}