"use client"
import PageHeader from '@/components/PageHeader'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import CancelMembershipModal from '@/components/CancelMembershipModal'
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'

interface Card {
    id: string
    name?: string
    brand: string
    last4: string
    expiry: string
    isDefault: boolean
}

const MEMBERSHIP_META = {
    anime: {
        name: '애니 멤버십',
        emoji: '🎬',
        price: '9,900',
        color: '#6c63ff',
        features: ['애니메이션 무제한 시청', 'FHD 고화질', '광고 없음', '동시 4기기'],
    },
    ost: {
        name: 'OST 멤버십',
        emoji: '🎵',
        price: '4,900',
        color: '#ec4899',
        features: ['OST 전곡 무제한 감상', 'OST 오프라인 저장', '고음질 스트리밍'],
    },
    allinone: {
        name: '올인원',
        emoji: '⚡',
        price: '13,900',
        color: '#f59e0b',
        features: ['애니메이션 무제한 시청', 'FHD 고화질', 'OST 전곡 감상', 'OST 오프라인 저장', '광고 없음'],
    },
}

function AddCardModal({ onClose, onAdd }: { onClose: () => void; onAdd: (card: Card) => void }) {
    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')
    const [cardAlias, setCardAlias] = useState('')
    const [cardError, setCardError] = useState('')
    const [cardLoading, setCardLoading] = useState(false)

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

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

    const handleSubmit = async () => {
        setCardError('')
        const rawNum = cardNumber.replace(/\s/g, '')
        if (rawNum.length < 15) { setCardError('카드번호를 올바르게 입력해주세요.'); return }
        if (cardExpiry.length < 5) { setCardError('유효기간을 올바르게 입력해주세요.'); return }
        if (cardCvc.length < 3) { setCardError('CVC를 올바르게 입력해주세요.'); return }
        setCardLoading(true)
        await new Promise(r => setTimeout(r, 300))
        const newCard: Card = {
            id: `card_${Date.now()}`,
            name: cardAlias.trim() || undefined,
            brand: detectBrand(rawNum),
            last4: rawNum.slice(-4),
            expiry: cardExpiry,
            isDefault: false,
        }
        setCardLoading(false)
        onAdd(newCard)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="relative bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-7 py-5 border-b border-white/10">
                    <h3 className="text-lg font-black">카드 등록</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer">✕</button>
                </div>
                <div className="px-7 py-6 flex flex-col gap-5">
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-2">카드번호</p>
                        <input className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors"
                            value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <p className="text-sm text-[var(--text-muted)] mb-2">유효기간</p>
                            <input className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors"
                                value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-muted)] mb-2">CVC</p>
                            <input className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors"
                                value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="000" maxLength={4} type="password" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] mb-2">카드 별칭 <span style={{ opacity: 0.5 }}>(선택)</span></p>
                        <input className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-base py-2 text-white placeholder-white/25 transition-colors"
                            value={cardAlias} onChange={e => setCardAlias(e.target.value)} placeholder="예: 내 주거래카드"
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                    </div>
                    {cardError && <p className="text-sm text-red-400">{cardError}</p>}
                    <p className="text-sm text-[var(--text-muted)]">🔒 카드번호 뒷 4자리만 저장됩니다.</p>
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/20 text-[var(--text-muted)] text-base font-bold hover:border-white/40 transition-colors cursor-pointer">취소</button>
                        <button onClick={handleSubmit} disabled={cardLoading} className="flex-1 py-3 rounded-xl text-white text-base font-bold transition-colors cursor-pointer hover:opacity-90"
                            style={{ background: '#6c63ff', opacity: cardLoading ? 0.5 : 1 }}>
                            {cardLoading ? '등록 중...' : '카드 등록하기'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function MyPage() {
    const { user, setMembership } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const router = useRouter()

    // ✅ Firebase onAuthStateChanged로 hydration — 로그인 상태 완전히 복원 후 체크
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(() => {
            setHydrated(true)
        })
        return () => unsubscribe()
    }, [])

    const [emailStep, setEmailStep] = useState<'idle' | 'form'>('idle')
    const [newEmail, setNewEmail] = useState('')
    const [emailError, setEmailError] = useState('')
    const [pwStep, setPwStep] = useState<'idle' | 'form'>('idle')
    const [currentPw, setCurrentPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [pwError, setPwError] = useState('')
    const [pwSuccess, setPwSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const [cards, setCards] = useState<Card[]>([])
    const [showAddCardModal, setShowAddCardModal] = useState(false)
    const [showCancelModal, setShowCancelModal] = useState(false)

    const membershipKey = user?.membership as keyof typeof MEMBERSHIP_META | 'none' | undefined
    const membership = membershipKey && membershipKey !== 'none' ? MEMBERSHIP_META[membershipKey] : null

    const nextBillingDate = (() => {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    })()

    const provider = auth.currentUser?.providerData?.[0]?.providerId || ''
    const isEmailUser = provider === 'password'
    const isSocial = !isEmailUser
    const socialLabel = provider.includes('google') ? '구글' : provider.includes('naver') ? '네이버' : provider.includes('kakao') ? '카카오' : '소셜'

    // ✅ hydrated + user 둘 다 의존성에 포함
    useEffect(() => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        loadCards()
    }, [hydrated, user])

    const loadCards = async () => {
        if (!user?.uid) return
        try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            if (snap.data()?.cards) setCards(snap.data()!.cards)
        } catch { }
    }

    const saveCards = async (newCards: Card[]) => {
        if (!user?.uid) return
        await setDoc(doc(db, 'users', user.uid), { cards: newCards }, { merge: true })
        setCards(newCards)
    }

    const handleAddCard = async (newCard: Card) => {
        const updatedCards = [...cards, { ...newCard, isDefault: cards.length === 0 }]
        await saveCards(updatedCards)
        setShowAddCardModal(false)
    }

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm('이 카드를 삭제할까요?')) return
        const newCards = cards.filter(c => c.id !== cardId)
        if (newCards.length > 0) newCards[0].isDefault = true
        await saveCards(newCards)
    }

    const handleSetDefault = async (cardId: string) => {
        const newCards = cards.map(c => ({ ...c, isDefault: c.id === cardId }))
        await saveCards(newCards)
    }

    const handleCancelMembership = async () => {
        if (!user?.uid) return
        try {
            await setDoc(doc(db, 'users', user.uid), { membership: 'none' }, { merge: true })
            setMembership('none')
            setShowCancelModal(false)
            toast.success('멤버십이 해지되었어요', { description: '현재 기간 종료 후 이용이 중단돼요.' })
        } catch {
            toast.error('해지 중 오류가 발생했어요. 다시 시도해주세요.')
        }
    }

    const handleUpdateEmail = async () => {
        if (!auth.currentUser || !newEmail) return
        setEmailError('')
        setLoading(true)
        try {
            await updateEmail(auth.currentUser, newEmail)
            toast.success('이메일 변경 완료 ✉️', { description: '새 이메일로 로그인할 수 있어요.' })
            setEmailStep('idle'); setNewEmail('')
        } catch (err: any) {
            const msgs: Record<string, string> = {
                'auth/requires-recent-login': '보안을 위해 다시 로그인 후 시도해주세요.',
                'auth/email-already-in-use': '이미 사용 중인 이메일이에요.',
                'auth/invalid-email': '올바른 이메일 형식이 아니에요.',
            }
            setEmailError(msgs[err.code] || '이메일 변경에 실패했어요.')
        } finally { setLoading(false) }
    }

    const handleUpdatePassword = async () => {
        setPwError(''); setPwSuccess('')
        if (newPw !== confirmPw) { setPwError('새 비밀번호가 일치하지 않아요.'); return }
        if (newPw.length < 8) { setPwError('비밀번호는 8자 이상이어야 해요.'); return }
        if (!auth.currentUser || !user?.email) return
        setLoading(true)
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPw)
            await reauthenticateWithCredential(auth.currentUser, credential)
            await updatePassword(auth.currentUser, newPw)
            setPwSuccess('비밀번호가 변경되었어요!')
            setCurrentPw(''); setNewPw(''); setConfirmPw('')
            setTimeout(() => { setPwStep('idle'); setPwSuccess('') }, 2000)
        } catch (err: any) {
            const msgs: Record<string, string> = {
                'auth/wrong-password': '현재 비밀번호가 틀렸어요.',
                'auth/weak-password': '비밀번호가 너무 약해요.',
                'auth/requires-recent-login': '보안을 위해 다시 로그인 후 시도해주세요.',
            }
            setPwError(msgs[err.code] || '비밀번호 변경에 실패했어요.')
        } finally { setLoading(false) }
    }

    const brandColor: Record<string, string> = {
        'VISA': '#1a1f71', 'Mastercard': '#eb001b', 'AMEX': '#007bc1', '카드': '#6c63ff',
    }

    // hydrated 전엔 아무것도 안 보여줌 (로그인 튕김 방지)
    if (!hydrated) return null
    if (!user) return null

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .mp-wrap { width: 90%; margin: 0 auto; }
                .mp-label { font-size: 12px; font-weight: 700; color: var(--text-subtle); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 20px; }
                .mp-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border-faint); }
                .mp-row-title { font-size: 14px; color: var(--text-muted); margin: 0 0 4px; }
                .mp-row-value { font-size: 14px; color: var(--text-primary); margin: 0; }
                .mp-row-value.accent { color: var(--main); }
                .mp-btn { font-size: 12px; padding: 7px 14px; border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--text-muted); cursor: pointer; transition: all .18s; white-space: nowrap; flex-shrink: 0; }
                .mp-btn:hover { border-color: var(--border); color: var(--text-primary); }
                .mp-btn.danger { border-color: rgba(248,113,113,.3); color: rgba(248,113,113,.7); }
                .mp-btn.danger:hover { border-color: #f87171; color: #f87171; }
                .mp-form { background: var(--bg-card); border-radius: 14px; padding: 20px; margin-top: 8px; display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--border-subtle); }
                .mp-form-label { font-size: 11px; color: var(--text-subtle); margin: 0 0 6px; }
                .mp-input { width: 100%; background: none; border: none; border-bottom: 1px solid var(--border); outline: none; color: var(--text-primary); font-size: 14px; padding: 8px 0; transition: border-color .2s; box-sizing: border-box; }
                .mp-input:focus { border-color: var(--main); }
                .mp-input::placeholder { color: var(--text-faint); }
                .mp-submit { width: 100%; padding: 13px; background: var(--main); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .2s; }
                .mp-submit:hover:not(:disabled) { background: #5a52e0; }
                .mp-submit:disabled { opacity: .5; cursor: default; }
                .mp-error { font-size: 12px; color: #f87171; margin: 0; }
                .mp-success { font-size: 12px; color: var(--main); margin: 0; }
                .mp-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 0 0 48px; }
                .mp-social-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
                .mp-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-subtle); margin-bottom: 10px; }
                .mp-card-icon { width: 46px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #fff; flex-shrink: 0; }
                .mp-card-info { flex: 1; min-width: 0; }
                .mp-card-num { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 2px; }
                .mp-card-exp { font-size: 12px; color: var(--text-subtle); margin: 0; }
                .mp-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
                .mp-default-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(108,99,255,.2); color: #9d97ff; border: 1px solid rgba(108,99,255,.3); }
            `}</style>

            <div className="mp-wrap">
                <PageHeader title="내 정보" />

                {/* ── 멤버십 섹션 ───────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <p className="mp-label">멤버십</p>
                    {membership ? (
                        <div style={{ borderRadius: 16, padding: '24px', background: `${membership.color}0f`, border: `1px solid ${membership.color}30` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${membership.color}20`, border: `1px solid ${membership.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                                        {membership.emoji}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{membership.name}</span>
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${membership.color}25`, color: membership.color, border: `1px solid ${membership.color}40` }}>이용 중</span>
                                        </div>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>월 ₩{membership.price}</span>
                                    </div>
                                </div>
                                <button className="mp-btn danger" onClick={() => setShowCancelModal(true)}>해지하기</button>
                            </div>
                            <div style={{ height: 1, background: `${membership.color}20`, marginBottom: 20 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                {membership.features.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={membership.color} strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
                                        <span style={{ fontSize: 13, color: 'var(--text-high)' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--border-faint)', border: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>다음 결제일</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-high)' }}>{nextBillingDate}</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ borderRadius: 16, padding: '28px 24px', background: 'var(--border-faint)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-high)', margin: '0 0 5px' }}>이용 중인 멤버십이 없어요</p>
                                <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: 0 }}>멤버십을 구독하고 애니·OST를 즐겨보세요</p>
                            </div>
                            <button onClick={() => router.push('/membership')} className="mp-btn" style={{ background: '#6c63ff', borderColor: '#6c63ff', color: 'var(--text-primary)', padding: '9px 18px', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                멤버십 시작하기
                            </button>
                        </div>
                    )}
                </section>

                <hr className="mp-divider" />

                {/* ── 계정 섹션 ─────────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <p className="mp-label">계정</p>
                    <div className="mp-row">
                        <div>
                            <p className="mp-row-title">이메일</p>
                            <p className="mp-row-value accent">{user.email}</p>
                        </div>
                        {isEmailUser && (
                            <button className="mp-btn" onClick={() => setEmailStep(emailStep === 'idle' ? 'form' : 'idle')}>이메일 변경</button>
                        )}
                    </div>
                    {emailStep === 'form' && isEmailUser && (
                        <div className="mp-form">
                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>이메일 변경</h3>
                            <div>
                                <p className="mp-form-label">새 이메일</p>
                                <input type="email" className="mp-input" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="새 이메일을 입력해주세요." />
                            </div>
                            {emailError && <p className="mp-error">{emailError}</p>}
                            <button className="mp-submit" onClick={handleUpdateEmail} disabled={!newEmail || loading}>
                                {loading ? '처리 중...' : '이메일 변경하기'}
                            </button>
                        </div>
                    )}
                    {isEmailUser && (
                        <>
                            <div className="mp-row">
                                <div>
                                    <p className="mp-row-title">비밀번호</p>
                                    <p className="mp-row-value" style={{ letterSpacing: 2 }}>••••••••••</p>
                                </div>
                                <button className="mp-btn" onClick={() => setPwStep(pwStep === 'idle' ? 'form' : 'idle')}>비밀번호 변경</button>
                            </div>
                            {pwStep === 'form' && (
                                <div className="mp-form">
                                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>비밀번호 변경</h3>
                                    <div>
                                        <p className="mp-form-label">현재 비밀번호</p>
                                        <input type="password" className="mp-input" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="현재 비밀번호를 입력해주세요." />
                                    </div>
                                    <div>
                                        <p className="mp-form-label">새 비밀번호</p>
                                        <input type="password" className="mp-input" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="8자 이상 영문/숫자/특수문자 중 2가지 포함" />
                                    </div>
                                    <div>
                                        <p className="mp-form-label">새 비밀번호 확인</p>
                                        <input type="password" className="mp-input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="비밀번호를 다시 입력해주세요." onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()} />
                                    </div>
                                    {pwError && <p className="mp-error">{pwError}</p>}
                                    {pwSuccess && <p className="mp-success">{pwSuccess}</p>}
                                    <button className="mp-submit" onClick={handleUpdatePassword} disabled={!currentPw || !newPw || !confirmPw || loading}>
                                        {loading ? '처리 중...' : '비밀번호 변경하기'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    {isSocial && (
                        <div className="mp-row">
                            <div>
                                <p className="mp-row-title">로그인 방식</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <span className="mp-social-badge" style={{ background: socialLabel === '카카오' ? '#FEE500' : socialLabel === '네이버' ? '#03C75A' : 'var(--border)', color: socialLabel === '카카오' ? '#3C1E1E' : 'var(--text-primary)' }}>
                                        {socialLabel} 로그인 연결됨
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>이메일/비밀번호 변경 불가</span>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <hr className="mp-divider" />

                {/* ── 결제수단 섹션 ─────────────────────────── */}
                <section style={{ marginBottom: 48 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <p className="mp-label" style={{ margin: 0 }}>결제수단</p>
                        <button className="mp-btn" onClick={() => setShowAddCardModal(true)}>+ 카드 추가</button>
                    </div>
                    {cards.length === 0 && (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
                            등록된 결제수단이 없어요
                        </div>
                    )}
                    {cards.map(card => (
                        <div key={card.id} className="mp-card">
                            <div className="mp-card-icon" style={{ background: brandColor[card.brand] || '#6c63ff' }}>{card.brand}</div>
                            <div className="mp-card-info">
                                <p className="mp-card-num">{card.name || card.brand} •••• {card.last4}</p>
                                <p className="mp-card-exp">유효기간 {card.expiry}</p>
                            </div>
                            <div className="mp-card-actions">
                                {card.isDefault ? (
                                    <span className="mp-default-badge">기본</span>
                                ) : (
                                    <button className="mp-btn" style={{ fontSize: 11 }} onClick={() => handleSetDefault(card.id)}>기본으로</button>
                                )}
                                <button className="mp-btn danger" style={{ fontSize: 11 }} onClick={() => handleDeleteCard(card.id)}>삭제</button>
                            </div>
                        </div>
                    ))}
                </section>
            </div>

            {showAddCardModal && (
                <AddCardModal onClose={() => setShowAddCardModal(false)} onAdd={handleAddCard} />
            )}
            <CancelMembershipModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancelMembership}
                membershipName={membership?.name ?? ''}
            />
        </div>
    )
}