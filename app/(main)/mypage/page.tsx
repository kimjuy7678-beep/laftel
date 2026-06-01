"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

interface Card {
    id: string
    brand: string
    last4: string
    expiry: string
    isDefault: boolean
}

export default function MyPage() {
    const { user } = useAuthStore()
    const router = useRouter()

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
    const [cardStep, setCardStep] = useState<'idle' | 'form'>('idle')
    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardError, setCardError] = useState('')
    const [cardLoading, setCardLoading] = useState(false)

    const provider = auth.currentUser?.providerData?.[0]?.providerId || ''
    const isEmailUser = provider === 'password'
    const isSocial = !isEmailUser
    const socialLabel = provider.includes('google') ? '구글' : provider.includes('naver') ? '네이버' : provider.includes('kakao') ? '카카오' : '소셜'

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        loadCards()
    }, [user])

    const loadCards = async () => {
        if (!user?.uid) return
        try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            if (snap.data()?.cards) setCards(snap.data()!.cards)
        } catch { }
    }

    const handleUpdateEmail = async () => {
        if (!auth.currentUser || !newEmail) return
        setEmailError('')
        setLoading(true)
        try {
            await updateEmail(auth.currentUser, newEmail)
            alert('이메일이 변경되었어요!')
            setEmailStep('idle')
            setNewEmail('')
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
        setCardLoading(true)
        try {
            const newCard: Card = {
                id: `card_${Date.now()}`,
                brand: detectBrand(rawNum),
                last4: rawNum.slice(-4),
                expiry: cardExpiry,
                isDefault: cards.length === 0,
            }
            const newCards = [...cards, newCard]
            await setDoc(doc(db, 'users', user!.uid), { cards: newCards }, { merge: true })
            setCards(newCards)
            setCardStep('idle')
            setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('')
        } catch { setCardError('카드 등록에 실패했어요.') }
        finally { setCardLoading(false) }
    }

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm('이 카드를 삭제할까요?')) return
        const newCards = cards.filter(c => c.id !== cardId)
        if (newCards.length > 0) newCards[0].isDefault = true
        await setDoc(doc(db, 'users', user!.uid), { cards: newCards }, { merge: true })
        setCards(newCards)
    }

    const handleSetDefault = async (cardId: string) => {
        const newCards = cards.map(c => ({ ...c, isDefault: c.id === cardId }))
        await setDoc(doc(db, 'users', user!.uid), { cards: newCards }, { merge: true })
        setCards(newCards)
    }

    const brandColor: Record<string, string> = {
        'VISA': '#1a1f71', 'Mastercard': '#eb001b', 'AMEX': '#007bc1', '카드': '#6c63ff',
    }

    if (!user) return null

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
       .mp-wrap { width: 90%; margin: 0 auto; }
                .mp-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.35); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 20px; }
                .mp-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
                .mp-row-title { font-size: 14px; color: rgba(255,255,255,.55); margin: 0 0 4px; }
                .mp-row-value { font-size: 14px; color: #fff; margin: 0; }
                .mp-row-value.accent { color: #6c63ff; }
                .mp-btn { font-size: 12px; padding: 7px 14px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: none; color: rgba(255,255,255,.6); cursor: pointer; transition: all .18s; white-space: nowrap; flex-shrink: 0; }
                .mp-btn:hover { border-color: rgba(255,255,255,.4); color: #fff; }
                .mp-btn.danger:hover { border-color: #f87171; color: #f87171; }
                .mp-form { background: #141420; border-radius: 14px; padding: 20px; margin-top: 8px; display: flex; flex-direction: column; gap: 16px; border: 1px solid rgba(255,255,255,.07); }
                .mp-form-label { font-size: 11px; color: rgba(255,255,255,.4); margin: 0 0 6px; }
                .mp-input { width: 100%; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,.15); outline: none; color: #fff; font-size: 14px; padding: 8px 0; transition: border-color .2s; box-sizing: border-box; }
                .mp-input:focus { border-color: #6c63ff; }
                .mp-input::placeholder { color: rgba(255,255,255,.25); }
                .mp-submit { width: 100%; padding: 13px; background: #6c63ff; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .2s; }
                .mp-submit:hover:not(:disabled) { background: #5a52e0; }
                .mp-submit:disabled { opacity: .5; cursor: default; }
                .mp-error { font-size: 12px; color: #f87171; margin: 0; }
                .mp-success { font-size: 12px; color: #6c63ff; margin: 0; }
                .mp-divider { border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 0 0 48px; }
                .mp-social-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
                .mp-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #141420; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); margin-bottom: 10px; }
                .mp-card-icon { width: 46px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #fff; flex-shrink: 0; }
                .mp-card-info { flex: 1; min-width: 0; }
                .mp-card-num { font-size: 14px; font-weight: 600; color: #fff; margin: 0 0 2px; }
                .mp-card-exp { font-size: 12px; color: rgba(255,255,255,.4); margin: 0; }
                .mp-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
                .mp-default-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(108,99,255,.2); color: #9d97ff; border: 1px solid rgba(108,99,255,.3); }
            `}</style>

            <div className="mp-wrap">
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 40px' }}>내 정보</h1>

                {/* 계정 */}
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
                                <input type="email" className="mp-input" value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)} placeholder="새 이메일을 입력해주세요." />
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
                                    <span className="mp-social-badge" style={{
                                        background: socialLabel === '카카오' ? '#FEE500' : socialLabel === '네이버' ? '#03C75A' : 'rgba(255,255,255,.1)',
                                        color: socialLabel === '카카오' ? '#3C1E1E' : '#fff',
                                    }}>
                                        {socialLabel} 로그인 연결됨
                                    </span>
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>이메일/비밀번호 변경 불가</span>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <hr className="mp-divider" />

                {/* 결제수단 */}
                <section style={{ marginBottom: 48 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <p className="mp-label" style={{ margin: 0 }}>결제수단</p>
                        <button className="mp-btn" onClick={() => setCardStep(cardStep === 'idle' ? 'form' : 'idle')}>+ 카드 추가</button>
                    </div>

                    {cards.length === 0 && cardStep === 'idle' && (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 14 }}>
                            등록된 결제수단이 없어요
                        </div>
                    )}

                    {cards.map(card => (
                        <div key={card.id} className="mp-card">
                            <div className="mp-card-icon" style={{ background: brandColor[card.brand] || '#6c63ff' }}>{card.brand}</div>
                            <div className="mp-card-info">
                                <p className="mp-card-num">•••• •••• •••• {card.last4}</p>
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

                    {cardStep === 'form' && (
                        <div className="mp-form">
                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>카드 등록</h3>
                            <div>
                                <p className="mp-form-label">카드번호</p>
                                <input className="mp-input" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <p className="mp-form-label">유효기간</p>
                                    <input className="mp-input" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} />
                                </div>
                                <div>
                                    <p className="mp-form-label">CVC</p>
                                    <input className="mp-input" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="000" maxLength={4} type="password" />
                                </div>
                            </div>
                            <div>
                                <p className="mp-form-label">카드 소유자 이름</p>
                                <input className="mp-input" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="홍길동" />
                            </div>
                            {cardError && <p className="mp-error">{cardError}</p>}
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', margin: 0 }}>🔒 카드번호 뒷 4자리만 저장됩니다.</p>
                            <button className="mp-submit" onClick={handleAddCard} disabled={cardLoading}>
                                {cardLoading ? '등록 중...' : '카드 등록하기'}
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}