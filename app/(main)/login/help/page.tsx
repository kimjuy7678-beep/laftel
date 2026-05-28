'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/firebase/firebase'
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth'

export default function LoginHelpPage() {
    const router = useRouter()
    const [step, setStep] = useState<'menu' | 'find-account' | 'reset-password'>('menu')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [foundMethods, setFoundMethods] = useState<string[]>([])

    const handleResetPassword = async () => {
        if (!email.trim()) { setError('이메일을 입력해주세요'); return }
        setLoading(true); setError('')
        try {
            await sendPasswordResetEmail(auth, email)
            setSent(true)
        } catch (err: any) {
            const msg: Record<string, string> = {
                'auth/user-not-found': '가입되지 않은 이메일이에요',
                'auth/invalid-email': '올바른 이메일 형식이 아니에요',
            }
            setError(msg[err.code] || '오류가 발생했어요. 다시 시도해주세요.')
        } finally { setLoading(false) }
    }

    const handleFindAccount = async () => {
        if (!email.trim()) { setError('이메일을 입력해주세요'); return }
        setLoading(true); setError('')
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email)
            setFoundMethods(methods)
            setSent(true)
        } catch (err: any) {
            setError('조회 중 오류가 발생했어요.')
        } finally { setLoading(false) }
    }

    const methodLabel: Record<string, string> = {
        'password': '이메일/비밀번호',
        'google.com': '구글',
        'kakao.com': '카카오',
        'naver.com': '네이버',
    }

    const goBack = () => { setStep('menu'); setSent(false); setEmail(''); setError('') }

    return (
        <div style={{ minHeight: '100vh', background: '#0d0d0d', paddingTop: 80, paddingBottom: 60 }}>
            <style>{`
                .hlp-wrap { max-width: 860px; margin: 0 auto; padding: 0 32px; }
                .hlp-logo { font-size: 26px; font-weight: 900; color: #6c63ff; letterSpacing: '.1em'; margin: 0 0 32px; }
                .hlp-page-title { font-size: 22px; font-weight: 900; color: #fff; margin: 0 0 6px; }
                .hlp-page-sub { font-size: 14px; color: rgba(255,255,255,.4); margin: 0 0 28px; }
                /* TIP 배너 */
                .hlp-tip-banner { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(108,99,255,.1); border: 1px solid rgba(108,99,255,.2); border-radius: 12px; margin-bottom: 20px; cursor: pointer; transition: background .2s; }
                .hlp-tip-banner:hover { background: rgba(108,99,255,.15); }
                .hlp-tip-tag { font-size: 11px; font-weight: 800; padding: 3px 10px; background: #6c63ff; border-radius: 6px; color: #fff; flex-shrink: 0; }
                .hlp-tip-text { font-size: 13px; color: rgba(255,255,255,.65); flex: 1; }
                .hlp-tip-more { font-size: 12px; color: #9d97ff; flex-shrink: 0; }
                /* 가로 카드 그리드 */
                .hlp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
                .hlp-card { display: flex; flex-direction: column; justify-content: space-between; padding: 28px 24px; background: #111; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; cursor: pointer; transition: all .2s; text-align: left; min-height: 160px; }
                .hlp-card:hover { border-color: rgba(108,99,255,.4); background: rgba(108,99,255,.07); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(108,99,255,.1); }
                .hlp-card-title { font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 10px; }
                .hlp-card-desc { font-size: 13px; color: rgba(255,255,255,.4); margin: 0; line-height: 1.7; flex: 1; }
                .hlp-card-arrow { display: flex; align-items: center; justify-content: flex-end; margin-top: 16px; color: rgba(255,255,255,.3); }
                .hlp-card:hover .hlp-card-arrow { color: #9d97ff; }
                /* 뒤로가기 */
                .hlp-back { display: flex; align-items: center; gap: 6px; background: none; border: none; color: rgba(255,255,255,.4); font-size: 13px; cursor: pointer; padding: 0 0 24px; transition: color .2s; }
                .hlp-back:hover { color: #fff; }
                /* 입력 폼 */
                .hlp-form-box { background: #111; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 32px 28px; }
                .hlp-form-icon { font-size: 48px; text-align: center; margin-bottom: 16px; }
                .hlp-form-title { font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 6px; }
                .hlp-form-sub { font-size: 13px; color: rgba(255,255,255,.4); margin: 0 0 24px; line-height: 1.6; }
                .hlp-label { font-size: 13px; color: rgba(255,255,255,.55); display: block; margin-bottom: 8px; }
                .hlp-input { width: 100%; height: 50px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: #fff; font-size: 14px; padding: 0 16px; outline: none; box-sizing: border-box; transition: border-color .2s; }
                .hlp-input:focus { border-color: #6c63ff; background: rgba(108,99,255,.08); }
                .hlp-input::placeholder { color: rgba(255,255,255,.22); }
                .hlp-error { font-size: 13px; color: #f87171; margin: 8px 0 0; }
                .hlp-btn-primary { width: 100%; height: 50px; border-radius: 10px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; transition: all .2s; background: #6c63ff; color: #fff; margin-top: 12px; }
                .hlp-btn-primary:hover { background: #5a52e0; }
                .hlp-btn-primary:disabled { opacity: .45; cursor: default; }
                .hlp-btn-ghost { width: 100%; height: 50px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; background: rgba(255,255,255,.05); color: rgba(255,255,255,.55); margin-top: 8px; }
                .hlp-btn-ghost:hover { background: rgba(255,255,255,.1); color: #fff; }
                .hlp-notice-list { font-size: 12px; color: rgba(255,255,255,.3); margin: 16px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
                .hlp-notice-list li { display: flex; gap: 6px; line-height: 1.6; }
                /* 성공 */
                .hlp-success { text-align: center; padding: 8px 0; }
                .hlp-success-icon { font-size: 52px; margin-bottom: 14px; }
                .hlp-success-title { font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 8px; }
                .hlp-success-desc { font-size: 13px; color: rgba(255,255,255,.45); margin: 0 0 24px; line-height: 1.6; }
                .hlp-method-row { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 20px; }
                .hlp-method-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(108,99,255,.15); border: 1px solid rgba(108,99,255,.25); color: #9d97ff; font-size: 13px; font-weight: 700; }
            `}</style>

            <div className="hlp-wrap">
                <p className="hlp-logo">LAFTEL</p>

                {step === 'menu' && (
                    <>
                        <h1 className="hlp-page-title">로그인에 어려움을 겪고 계신가요?</h1>
                        <p className="hlp-page-sub">아래 방법을 통해 직접 해결할 수 있어요.</p>

                        {/* TIP 배너 */}
                        <div className="hlp-tip-banner" onClick={() => { setStep('find-account'); setSent(false); setEmail(''); setError('') }}>
                            <span className="hlp-tip-tag">TIP</span>
                            <span className="hlp-tip-text">계정 문제는 이렇게 해결해 보세요.</span>
                            <span className="hlp-tip-more">자세히</span>
                        </div>

                        {/* 가로 카드 2열 */}
                        <div className="hlp-grid">
                            <button className="hlp-card" onClick={() => { setStep('find-account'); setSent(false); setEmail(''); setError('') }}>
                                <div>
                                    <p className="hlp-card-title">나의 계정 찾기</p>
                                    <p className="hlp-card-desc">
                                        가입한 계정을 잊었거나 계정에 문제가 생겼나요?
                                        나의 계정을 찾고 로그인 정보를 변경하여 문제를 해결할 수 있어요.
                                    </p>
                                </div>
                                <div className="hlp-card-arrow">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                                </div>
                            </button>

                            <button className="hlp-card" onClick={() => { setStep('reset-password'); setSent(false); setEmail(''); setError('') }}>
                                <div>
                                    <p className="hlp-card-title">비밀번호 재설정</p>
                                    <p className="hlp-card-desc">
                                        비밀번호를 잊으셨다면 비밀번호를 재설정하고
                                        이메일 로그인을 진행해보세요.
                                    </p>
                                </div>
                                <div className="hlp-card-arrow">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                                </div>
                            </button>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', textDecoration: 'none' }}>
                                로그인으로 돌아가기
                            </Link>
                        </div>
                    </>
                )}

                {/* 계정 찾기 */}
                {step === 'find-account' && (
                    <>
                        <button className="hlp-back" onClick={goBack}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                            돌아가기
                        </button>
                        <div className="hlp-form-box">
                            {!sent ? (
                                <>
                                    <div className="hlp-form-icon">📮</div>
                                    <h2 className="hlp-form-title">가입 계정 찾기</h2>
                                    <p className="hlp-form-sub">라프텔에 가입한 계정을 확인하기 위해<br />본인 명의의 휴대폰 번호로 인증이 필요해요.</p>
                                    <label className="hlp-label">이메일</label>
                                    <input className="hlp-input" type="email" placeholder="example@gmail.com" value={email}
                                        onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFindAccount()} />
                                    {error && <p className="hlp-error">{error}</p>}
                                    <button className="hlp-btn-primary" disabled={loading} onClick={handleFindAccount}>
                                        {loading ? '조회 중...' : '본인확인하기'}
                                    </button>
                                </>
                            ) : (
                                <div className="hlp-success">
                                    <div className="hlp-success-icon">🔍</div>
                                    <p className="hlp-success-title">계정 조회 결과</p>
                                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginBottom: 16 }}>{email}</p>
                                    {foundMethods.length > 0 ? (
                                        <>
                                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>가입된 로그인 방식</p>
                                            <div className="hlp-method-row">
                                                {foundMethods.map(m => (
                                                    <span key={m} className="hlp-method-badge">
                                                        {m === 'password' ? '✉️' : m === 'google.com' ? '🔵' : m.includes('kakao') ? '💛' : '🟢'}
                                                        {methodLabel[m] || m}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="hlp-success-desc" style={{ marginTop: 12 }}>해당 방식으로 로그인해주세요.</p>
                                        </>
                                    ) : (
                                        <p className="hlp-success-desc">가입된 계정을 찾을 수 없어요.<br />이메일을 다시 확인해주세요.</p>
                                    )}
                                    <button className="hlp-btn-primary" onClick={() => router.push('/login')}>로그인하러 가기</button>
                                    <button className="hlp-btn-ghost" onClick={() => { setSent(false); setEmail(''); setFoundMethods([]) }}>다시 조회하기</button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* 비밀번호 재설정 */}
                {step === 'reset-password' && (
                    <>
                        <button className="hlp-back" onClick={goBack}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                            돌아가기
                        </button>
                        <div className="hlp-form-box">
                            {!sent ? (
                                <>
                                    <h2 className="hlp-form-title">비밀번호 찾기</h2>
                                    <p className="hlp-form-sub" style={{ marginBottom: 24 }}>&nbsp;</p>
                                    <label className="hlp-label">이메일</label>
                                    <input className="hlp-input" type="email" placeholder="example@gmail.com" value={email}
                                        onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResetPassword()} />
                                    {error && <p className="hlp-error">{error}</p>}
                                    <button className="hlp-btn-primary" disabled={loading} onClick={handleResetPassword}>
                                        {loading ? '발송 중...' : '비밀번호 재설정 이메일 보내기'}
                                    </button>
                                    <ul className="hlp-notice-list">
                                        <li><span>·</span>가입하신 이메일 주소를 입력해주시면 임시주소가 발송됩니다.</li>
                                        <li><span>·</span>임시주소로 들어오신 뒤 새로운 비밀번호를 입력하세요.</li>
                                        <li><span>·</span>임시주소가 메일로 도착하지 않았다면 스팸 메일함을 확인해 주시기 바랍니다.</li>
                                    </ul>
                                </>
                            ) : (
                                <div className="hlp-success">
                                    <div className="hlp-success-icon">📬</div>
                                    <p className="hlp-success-title">이메일을 발송했어요!</p>
                                    <p className="hlp-success-desc">
                                        <strong style={{ color: '#9d97ff' }}>{email}</strong>으로<br />
                                        비밀번호 재설정 링크를 보냈어요.<br />
                                        스팸함도 확인해주세요.
                                    </p>
                                    <button className="hlp-btn-primary" onClick={() => router.push('/login')}>로그인하러 가기</button>
                                    <button className="hlp-btn-ghost" onClick={() => { setSent(false); setEmail('') }}>다시 보내기</button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
