'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { usePreviewStore } from '@/store/usePreviewStore'
import { doc, setDoc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useRouter } from 'next/navigation'

const IMG = 'https://image.tmdb.org/t/p'

const RENT_OPTIONS = [
    { days: 2, price: 500 },
    { days: 7, price: 700 },
    { days: 14, price: 900 },
    { days: 30, price: 1000 },
]

interface PurchaseModalProps {
    episodes: any[]
    detail: any
    onClose: () => void
}

export function PurchaseModal({ episodes, detail, onClose }: PurchaseModalProps) {
    const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())
    const [showRentPeriod, setShowRentPeriod] = useState(false)
    const [showPayment, setShowPayment] = useState(false)
    const [showPayComplete, setShowPayComplete] = useState(false)
    const [purchaseType, setPurchaseType] = useState<'rent' | 'own' | null>(null)
    const [rentDays, setRentDays] = useState(7)

    if (showPayComplete) return (
        <PayCompleteModal
            onClose={() => { setShowPayComplete(false); onClose() }}
            paidTotal={selectedEpisodes.size * (purchaseType === 'rent' ? (RENT_OPTIONS.find(o => o.days === rentDays)?.price ?? 700) : 1500)}
            detail={detail}
        />
    )

    if (showPayment) return (
        <PaymentModal
            episodes={episodes}
            detail={detail}
            selectedEpisodes={selectedEpisodes}
            purchaseType={purchaseType}
            rentDays={rentDays}
            onClose={() => setShowPayment(false)}
            onComplete={() => { setShowPayment(false); setShowPayComplete(true) }}
        />
    )

    if (showRentPeriod) return (
        <RentPeriodModal
            selectedCount={selectedEpisodes.size}
            rentDays={rentDays}
            setRentDays={setRentDays}
            onClose={() => setShowRentPeriod(false)}
            onNext={() => { setShowRentPeriod(false); setShowPayment(true) }}
        />
    )

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden w-[480px] max-h-[80vh] flex flex-col border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                    <h2 className="text-[var(--text-primary)] font-bold text-lg">에피소드 구매</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* 전체선택 */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)]">
                    <div onClick={() => {
                        if (selectedEpisodes.size === episodes.length) setSelectedEpisodes(new Set())
                        else setSelectedEpisodes(new Set(episodes.map(ep => ep.episode_number)))
                    }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${selectedEpisodes.size === episodes.length ? 'bg-[var(--main)] border-[var(--main)]' : 'border-[var(--border)]'}`}>
                        {selectedEpisodes.size === episodes.length && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
                        )}
                    </div>
                    <span className="text-[var(--text-muted)] text-sm">전체선택 ({selectedEpisodes.size})</span>
                </div>

                {/* 에피소드 목록 */}
                <div className="overflow-y-auto flex-1">
                    {episodes.map(ep => (
                        <div key={ep.episode_number}
                            className="flex items-center gap-3 px-6 py-3 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                            onClick={() => setSelectedEpisodes(prev => {
                                const next = new Set(prev)
                                next.has(ep.episode_number) ? next.delete(ep.episode_number) : next.add(ep.episode_number)
                                return next
                            })}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedEpisodes.has(ep.episode_number) ? 'bg-[var(--main)] border-[var(--main)]' : 'border-[var(--border)]'}`}>
                                {selectedEpisodes.has(ep.episode_number) && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
                                )}
                            </div>
                            <div className="w-[100px] min-w-[100px] aspect-video rounded-lg overflow-hidden bg-[var(--bg-secondary)]">
                                {ep.still_path
                                    ? <img src={`${IMG}/w300${ep.still_path}`} className="w-full h-full object-cover" alt={ep.name} />
                                    : <div className="w-full h-full flex items-center justify-center text-[var(--text-faint)] font-black">{ep.episode_number}</div>
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{ep.episode_number}화 {ep.name}</p>
                                <p className="text-[var(--text-subtle)] text-xs mt-0.5">대여 700원 · 소장 1,500원</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 하단 버튼 */}
                <div className="flex border-t border-[var(--border)]">
                    <button onClick={() => { setPurchaseType('rent'); setShowRentPeriod(true) }} disabled={selectedEpisodes.size === 0}
                        className="flex-1 py-4 text-[var(--text-muted)] font-bold text-base hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30">대여</button>
                    <button onClick={() => { setPurchaseType('own'); setShowPayment(true) }} disabled={selectedEpisodes.size === 0}
                        className="flex-1 py-4 bg-[var(--main)] text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-30">소장</button>
                </div>
            </div>
        </div>
    )
}

function RentPeriodModal({ selectedCount, rentDays, setRentDays, onClose, onNext }: any) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl w-[360px] border border-[var(--border)] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                    <h2 className="text-[var(--text-primary)] font-bold text-lg">대여 기간 선택</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex flex-col gap-2 p-4">
                    {RENT_OPTIONS.map(opt => (
                        <div key={opt.days} onClick={() => setRentDays(opt.days)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${rentDays === opt.days ? 'border-[var(--main)] bg-[var(--main)]/10' : 'border-[var(--border)] hover:border-[var(--text-subtle)]'}`}>
                            <span className="text-[var(--text-primary)] font-semibold">{opt.days}일 대여</span>
                            <span className="text-[var(--text-muted)] text-sm">편당 {opt.price.toLocaleString()}원</span>
                        </div>
                    ))}
                </div>
                <div className="px-4 pb-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm px-1">
                        <span className="text-[var(--text-muted)]">총 결제금액</span>
                        <span className="text-[var(--main)] font-bold">{(selectedCount * (RENT_OPTIONS.find(o => o.days === rentDays)?.price ?? 700)).toLocaleString()}원</span>
                    </div>
                    <button onClick={onNext} className="w-full py-3 bg-[var(--main)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity">다음</button>
                </div>
            </div>
        </div>
    )
}

function PaymentModal({ episodes, detail, selectedEpisodes, purchaseType, rentDays, onClose, onComplete }: any) {
    const { user } = useAuthStore()
    const { addItem } = useWatchlistStore()
    const [cards, setCards] = useState<any[]>([])
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [showAddCard, setShowAddCard] = useState(false)

    useEffect(() => {
        if (!user?.uid) return
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (!snap.exists()) return
            const savedCards: any[] = snap.data()?.cards || []
            setCards(savedCards)
            const defaultCard = savedCards.find(c => c.isDefault) ?? savedCards[0]
            if (defaultCard) { setSelectedCardId(defaultCard.id); setShowAddCard(false) }
        }).catch(() => {})
    }, [user?.uid])

    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardError, setCardError] = useState('')
    const [cardLoading, setCardLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [paying, setPaying] = useState(false)

    const pricePerEp = purchaseType === 'rent' ? (RENT_OPTIONS.find(o => o.days === rentDays)?.price ?? 700) : 1500
    const totalPrice = selectedEpisodes.size * pricePerEp

    const detectBrand = (num: string) => {
        const n = num.replace(/\s/g, '')
        if (/^4/.test(n)) return 'VISA'
        if (/^5[1-5]/.test(n)) return 'Mastercard'
        return '카드'
    }
    const formatCardNumber = (val: string) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    const formatExpiry = (val: string) => { const nums = val.replace(/\D/g, '').slice(0, 4); return nums.length >= 3 ? nums.slice(0, 2) + '/' + nums.slice(2) : nums }

    const handleAddCard = async () => {
        setCardError('')
        const rawNum = cardNumber.replace(/\s/g, '')
        if (rawNum.length < 15) { setCardError('카드번호를 올바르게 입력해주세요.'); return }
        if (cardExpiry.length < 5) { setCardError('유효기간을 올바르게 입력해주세요.'); return }
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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!paying) onClose() }}>
            <div className="bg-[var(--bg-card)] rounded-2xl w-[380px] border border-[var(--border)] overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                    <h2 className="text-[var(--text-primary)] font-bold text-lg">라프텔 페이</h2>
                    {!paying && (
                        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                    {/* 결제 요약 */}
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-muted)]">구매 유형</span>
                        <span className="text-[var(--text-primary)] font-semibold">{purchaseType === 'rent' ? `${rentDays}일 대여` : '소장'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-muted)]">선택 에피소드</span>
                        <span className="text-[var(--text-primary)] font-semibold">{selectedEpisodes.size}화</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-[var(--border)] pt-3">
                        <span className="text-[var(--text-primary)] font-bold">총 결제금액</span>
                        <span className="text-[var(--main)] font-bold text-base">{totalPrice.toLocaleString()}원</span>
                    </div>

                    {/* 카드 목록 */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[var(--text-muted)] text-xs">등록된 결제수단</p>
                        {cards.length === 0
                            ? <p className="text-[var(--text-faint)] text-sm">등록된 카드가 없어요</p>
                            : cards.map(card => (
                                <div key={card.id} onClick={() => setSelectedCardId(card.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedCardId === card.id ? 'border-[var(--main)] bg-[var(--main)]/10' : 'border-[var(--border)] hover:border-[var(--text-subtle)]'}`}>
                                    <div className="w-10 h-7 rounded bg-[var(--main)]/20 border border-[var(--main)]/30 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                    </div>
                                    <span className="text-[var(--text-primary)] text-sm font-semibold">{card.brand} **** {card.last4}</span>
                                </div>
                            ))
                        }
                        {!showAddCard && (
                            <button onClick={() => setShowAddCard(true)}
                                className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:border-[var(--text-faint)] transition-all text-sm">
                                <span className="text-lg">+</span> 카드 추가
                            </button>
                        )}
                        {showAddCard && (
                            <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--bg-hover)] flex flex-col gap-4">
                                <p className="text-[var(--text-primary)] text-sm font-bold">카드 등록</p>
                                <input className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-muted)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                    value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-muted)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                        value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} />
                                    <input className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-muted)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                        value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="000" maxLength={4} type="password" />
                                </div>
                                <input className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--text-muted)] outline-none text-sm py-2 text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
                                    value={cardName} onChange={e => setCardName(e.target.value)} placeholder="홍길동" />
                                {cardError && <p className="text-xs text-red-400">{cardError}</p>}
                                <div className="flex gap-2">
                                    <button onClick={() => { setShowAddCard(false); setCardError('') }}
                                        className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors">취소</button>
                                    <button onClick={handleAddCard} disabled={cardLoading}
                                        className="flex-1 py-2 rounded-xl bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                                        {cardLoading ? '등록 중...' : '등록'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PIN 입력 */}
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
                                    onClick={() => {
                                        if (key === '⌫') setPassword(prev => prev.slice(0, -1))
                                        else if (key !== '' && password.length < 6) setPassword(prev => prev + key)
                                    }}
                                    className={`py-3 rounded-xl text-[var(--text-primary)] font-semibold text-lg transition-all ${key === '' ? '' : 'hover:bg-[var(--bg-hover)] active:bg-[var(--border)]'} disabled:opacity-50`}>
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 결제 버튼 */}
                <div className="px-6 pb-6">
                    <button
                        disabled={(password.length < 6 || !selectedCardId) || paying}
                        onClick={async () => {
                            setPaying(true)
                            await new Promise(res => setTimeout(res, 1500))
                            if (user?.uid) {
                                for (const epNum of selectedEpisodes) {
                                    await addItem(user.uid, { id: 0, title: detail?.name || '', poster: detail?.poster_path || '', tab: 'purchased' })
                                }
                                try {
                                    await addDoc(collection(db, 'users', user.uid, 'purchaseHistory'), {
                                        animeName: detail?.name || detail?.original_name || '알 수 없는 작품',
                                        animeId: detail?.id || 0,
                                        poster: detail?.poster_path || '',
                                        purchaseType,
                                        rentDays: purchaseType === 'rent' ? rentDays : null,
                                        episodeCount: selectedEpisodes.size,
                                        episodeNumbers: Array.from(selectedEpisodes),
                                        totalPrice: selectedEpisodes.size * pricePerEp,
                                        createdAt: serverTimestamp(),
                                    })
                                } catch (e) { console.warn('purchaseHistory 저장 실패:', e) }
                            }
                            setPaying(false)
                            setPassword('')
                            onComplete()
                        }}
                        className="w-full py-4 bg-[var(--main)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                        {paying
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />결제 중...</>
                            : '결제하기'
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

function PayCompleteModal({ onClose, paidTotal, detail }: any) {
    const router = useRouter()
    const { setPreviewId } = usePreviewStore()
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 flex flex-col items-center gap-4 border border-[var(--border)] w-[320px] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="w-14 h-14 rounded-full bg-[var(--main)]/20 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="2.5"><polyline points="20,6 9,17 4,12" /></svg>
                </div>
                <div className="text-center">
                    <p className="text-[var(--text-primary)] font-bold text-base mb-1">결제가 완료됐어요!</p>
                    <p className="text-[var(--text-subtle)] text-sm">{paidTotal.toLocaleString()}원 결제됨</p>
                </div>
                <div className="flex gap-2 w-full">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors">닫기</button>
                    <button onClick={() => { router.push('/library?tab=purchased'); onClose(); setPreviewId(null) }}
                        className="flex-1 py-2.5 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">구매한 작품 보기</button>
                </div>
            </div>
        </div>
    )
}