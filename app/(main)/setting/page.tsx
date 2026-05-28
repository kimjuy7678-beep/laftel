"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { auth } from '@/firebase/firebase'
import { db } from '@/firebase/firebase'
import {
    updatePassword,
    updateEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification,
    signOut
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default function Setting() {
    const { user, onLogout } = useAuthStore()
    const { theme, setTheme } = useTheme()
    const router = useRouter()

    // 알림 설정
    const [notifications, setNotifications] = useState({
        works: true,
        community: true,
        store: true,
        events: false,
    })

    // 이메일 변경
    const [emailStep, setEmailStep] = useState<'idle' | 'verify' | 'done'>('idle')
    const [newEmail, setNewEmail] = useState('')
    const [emailCode, setEmailCode] = useState('')
    const [emailTimer, setEmailTimer] = useState(0)
    const [emailError, setEmailError] = useState('')

    // 비밀번호 변경
    const [pwStep, setPwStep] = useState<'idle' | 'form'>('idle')
    const [currentPw, setCurrentPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [pwError, setPwError] = useState('')
    const [pwSuccess, setPwSuccess] = useState('')

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        loadNotifications()
    }, [user])

    // 타이머
    useEffect(() => {
        if (emailTimer <= 0) return
        const t = setInterval(() => setEmailTimer(p => p - 1), 1000)
        return () => clearInterval(t)
    }, [emailTimer])

    const loadNotifications = async () => {
        if (!user?.uid) return
        try {
            const ref = doc(db, 'users', user.uid)
            const snap = await getDoc(ref)
            if (snap.exists() && snap.data().notifications) {
                setNotifications(snap.data().notifications)
            }
        } catch {}
    }

    const saveNotifications = async (updated: typeof notifications) => {
        if (!user?.uid) return
        setNotifications(updated)
        await setDoc(doc(db, 'users', user.uid), { notifications: updated }, { merge: true })
    }

    const formatTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

    // 이메일 인증코드 발송
    const handleSendEmailCode = async () => {
        if (!auth.currentUser) return
        setEmailError('')
        setLoading(true)
        try {
            await sendEmailVerification(auth.currentUser)
            setEmailStep('verify')
            setEmailTimer(30 * 60) // 30분
        } catch (err: any) {
            setEmailError('인증코드 발송에 실패했어요.')
        } finally {
            setLoading(false)
        }
    }

    // 이메일 변경 확인 (실제로는 Firebase가 인증코드 방식이 아니라 링크 방식이라 updateEmail로 처리)
    const handleUpdateEmail = async () => {
        if (!auth.currentUser || !newEmail) return
        setEmailError('')
        setLoading(true)
        try {
            await updateEmail(auth.currentUser, newEmail)
            setEmailStep('done')
            setEmailError('')
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
        } finally {
            setLoading(false)
        }
    }

    // 비밀번호 변경
    const handleUpdatePassword = async () => {
        setPwError('')
        setPwSuccess('')
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
        } finally {
            setLoading(false)
        }
    }

    // 모든 기기 로그아웃
    const handleLogoutAll = async () => {
        if (!confirm('모든 기기에서 로그아웃할까요?')) return
        await signOut(auth)
        await onLogout()
        router.push('/')
    }

    // 회원 탈퇴
    const handleWithdraw = async () => {
        if (!confirm('정말 라프텔을 탈퇴하시겠어요?\n모든 데이터가 삭제되며 복구할 수 없어요.')) return
        if (!confirm('정말로요? 포인트, 이용내역 모두 사라져요.')) return
        try {
            await auth.currentUser?.delete()
            await onLogout()
            router.push('/')
        } catch (err: any) {
            if (err.code === 'auth/requires-recent-login') {
                alert('보안을 위해 다시 로그인 후 시도해주세요.')
            }
        }
    }

    if (!user) return null

    return (
        <div className="min-h-screen pt-20">
            <div className="inner px-6 py-10 max-w-3xl">
                <h1 className="text-xl font-bold mb-10">설정</h1>

                {/* 계정 */}
                <section className="mb-10">
                    <h2 className="text-sm font-bold text-white/50 mb-6">계정</h2>

                    {/* 이메일 */}
                    <div className="flex items-start justify-between py-4 border-b border-white/5">
                        <div>
                            <p className="text-sm text-white/60 mb-1">이메일</p>
                            <p className="text-sm text-[#6c63ff]">{user.email}</p>
                        </div>
                        <button
                            onClick={() => setEmailStep(emailStep === 'idle' ? 'verify' : 'idle')}
                            className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:border-white/40 transition-colors"
                        >
                            이메일 변경
                        </button>
                    </div>

                    {/* 이메일 변경 폼 */}
                    {emailStep === 'verify' && (
                        <div className="bg-[#1a1a1a] rounded-xl p-5 mt-3 flex flex-col gap-4">
                            <h3 className="font-bold text-sm">이메일 변경</h3>
                            <div>
                                <p className="text-xs text-white/50 mb-2">새 이메일</p>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="새 이메일을 입력해주세요."
                                    className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none py-2 text-sm text-white placeholder:text-white/30"
                                />
                            </div>
                            {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                            <button
                                onClick={handleUpdateEmail}
                                disabled={!newEmail || loading}
                                className="w-full py-3 bg-[#6c63ff] hover:bg-[#5a52e0] disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
                            >
                                {loading ? '처리 중...' : '이메일 변경하기'}
                            </button>
                        </div>
                    )}

                    {/* 비밀번호 */}
                    <div className="flex items-start justify-between py-4 border-b border-white/5">
                        <div>
                            <p className="text-sm text-white/60 mb-1">비밀번호</p>
                            <p className="text-sm text-[#6c63ff]">••••••••••</p>
                        </div>
                        <button
                            onClick={() => setPwStep(pwStep === 'idle' ? 'form' : 'idle')}
                            className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:border-white/40 transition-colors"
                        >
                            비밀번호 변경
                        </button>
                    </div>

                    {/* 비밀번호 변경 폼 */}
                    {pwStep === 'form' && (
                        <div className="bg-[#1a1a1a] rounded-xl p-5 mt-3 flex flex-col gap-4">
                            <h3 className="font-bold text-sm">비밀번호 변경</h3>
                            <div>
                                <p className="text-xs text-white/50 mb-2">현재 비밀번호</p>
                                <input
                                    type="password"
                                    value={currentPw}
                                    onChange={(e) => setCurrentPw(e.target.value)}
                                    placeholder="현재 사용중인 비밀번호를 입력해주세요."
                                    className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none py-2 text-sm text-white placeholder:text-white/30"
                                />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 mb-2">새 비밀번호</p>
                                <input
                                    type="password"
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                    placeholder="8자 이상 영문/숫자/특수문자 중 2가지 포함"
                                    className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none py-2 text-sm text-white placeholder:text-white/30"
                                />
                            </div>
                            <div>
                                <p className="text-xs text-white/50 mb-2">새 비밀번호 확인</p>
                                <input
                                    type="password"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                    placeholder="비밀번호를 다시 한 번 입력해주세요."
                                    className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none py-2 text-sm text-white placeholder:text-white/30"
                                />
                            </div>
                            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
                            {pwSuccess && <p className="text-[#6c63ff] text-xs">{pwSuccess}</p>}
                            <button
                                onClick={handleUpdatePassword}
                                disabled={!currentPw || !newPw || !confirmPw || loading}
                                className="w-full py-3 bg-[#6c63ff] hover:bg-[#5a52e0] disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
                            >
                                {loading ? '처리 중...' : '비밀번호 변경하기'}
                            </button>
                        </div>
                    )}

                    {/* 모든 기기 로그아웃 */}
                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                        <p className="text-sm text-white/60">모든 기기에서 로그아웃</p>
                        <button
                            onClick={handleLogoutAll}
                            className="text-xs px-3 py-1.5 border border-white/20 rounded-lg hover:border-white/40 transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </section>

                {/* 구분선 */}
                <div className="border-t border-white/10 mb-10" />

                {/* 알림 */}
                <section className="mb-10">
                    <h2 className="text-sm font-bold text-white/50 mb-6">알림</h2>

                    <div className="flex flex-col gap-0">
                        {[
                            { key: 'works', category: '관심 작품 및 커뮤니티', label: '관심있는 작품의 업데이트 소식' },
                            { key: 'community', category: '', label: '커뮤니티 활동 소식' },
                            { key: 'store', category: '스토어', label: '주문 및 배송 정보' },
                            { key: 'events', category: '이벤트 및 혜택', label: '맞춤 이벤트 및 혜택 정보 소식' },
                        ].map((item, i, arr) => {
                            const showCategory = item.category && (i === 0 || arr[i - 1].category !== item.category)
                            return (
                                <div key={item.key} className="flex items-center py-3 border-b border-white/5">
                                    {showCategory && (
                                        <span className="text-sm text-white/60 w-48 shrink-0">{item.category}</span>
                                    )}
                                    {!showCategory && <span className="w-48 shrink-0" />}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications[item.key as keyof typeof notifications]}
                                            onChange={(e) => saveNotifications({ ...notifications, [item.key]: e.target.checked })}
                                            className="w-4 h-4 accent-[#6c63ff]"
                                        />
                                        <span className="text-sm">{item.label}</span>
                                    </label>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* 구분선 */}
                <div className="border-t border-white/10 mb-10" />

                {/* 테마 */}
                <section className="mb-10">
                    <h2 className="text-sm font-bold text-white/50 mb-6">테마</h2>
                    <div className="flex gap-4">
                        {[
                            { id: 'light', label: '밝은 테마', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg> },
                            { id: 'dark', label: '어두운 테마', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
                            { id: 'system', label: '기기 설정을 따름', icon: <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/></svg><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></> },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                                    theme === t.id
                                        ? 'border-[#6c63ff] bg-[#6c63ff]/10'
                                        : 'border-white/10 bg-[#1a1a1a] hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-1 text-white">{t.icon}</div>
                                <span className="text-xs text-white/70">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* 구분선 */}
                <div className="border-t border-white/10 mb-10" />

                {/* 탈퇴 */}
                <button
                    onClick={handleWithdraw}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors underline underline-offset-2"
                >
                    라프텔 탈퇴하기
                </button>
            </div>
        </div>
    )
}