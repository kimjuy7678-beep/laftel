"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import Link from 'next/link'

export default function EmailLoginPage() {
    const router = useRouter()
    const { onLogin } = useAuthStore()
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [nickname, setNickname] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState('')

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(''), 2500)
    }

    const handleSubmit = async () => {
        setError('')
        setLoading(true)
        try {
            if (isLogin) {
                const result = await signInWithEmailAndPassword(auth, email, password)
                const uid = result.user.uid
                const snap = await getDoc(doc(db, 'users', uid))
                const userData = snap.data()
                onLogin({
                    email: result.user.email,
                    name: userData?.nickname || result.user.displayName || email.split('@')[0],
                    photoURL: userData?.avatarUrl || result.user.photoURL,
                    uid,
                    membership: userData?.membership || 'none',
                    points: userData?.points || 0,
                })
                showToast('로그인 완료!')
                setTimeout(() => router.push('/profile'), 800)
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password)
                const uid = result.user.uid
                const displayName = nickname || email.split('@')[0]
                await updateProfile(result.user, { displayName })
                await setDoc(doc(db, 'users', uid), {
                    email,
                    nickname: displayName,
                    avatarUrl: null,
                    membership: 'none',
                    points: 0,
                    createdAt: new Date().toISOString(),
                })
                showToast('회원가입 완료! 환영해요 🎉')
                setTimeout(() => router.push('/login'), 800)
            }
        } catch (err: any) {
            const msg: Record<string, string> = {
                'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
                'auth/user-not-found': '가입된 계정이 없어요.',
                'auth/wrong-password': '비밀번호가 틀렸어요.',
                'auth/email-already-in-use': '이미 사용 중인 이메일이에요.',
                'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
                'auth/invalid-credential': '이메일 또는 비밀번호를 확인해주세요.',
            }
            setError(msg[err.code] || '오류가 발생했어요. 다시 시도해주세요.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'var(--bg-primary)' }}>
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#6c63ff] text-white text-sm font-medium px-6 py-3 rounded-full shadow-lg">
                    {toast}
                </div>
            )}

            <div className="w-full max-w-[420px] flex flex-col gap-6">
                <Link href="/login" className="flex justify-center">
                    <img src="/images/logo-white.svg" alt="" className="dark:block hidden" />
                    <img src="/images/logo-dark.png" alt="" className="dark:hidden block w-[167px] h-[41]" />
                </Link>

                <div className="flex rounded-xl p-1" style={{ background: 'var(--bg-hover)' }}>
                    <button
                        onClick={() => { setIsLogin(true); setError('') }}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        style={isLogin
                            ? { background: '#6c63ff', color: '#ffffff' }
                            : { background: 'transparent', color: 'var(--text-subtle)' }}
                    >
                        로그인
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError('') }}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        style={!isLogin
                            ? { background: '#6c63ff', color: '#ffffff' }
                            : { background: 'transparent', color: 'var(--text-subtle)' }}
                    >
                        회원가입
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[52px] rounded-xl px-4 text-sm focus:outline-none transition-colors"
                        style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                    <input
                        type="password"
                        placeholder="비밀번호 (6자 이상)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="w-full h-[52px] rounded-xl px-4 text-sm focus:outline-none transition-colors"
                        style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="닉네임 (선택)"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className="w-full h-[52px] rounded-xl px-4 text-sm focus:outline-none transition-colors"
                            style={{
                                background: 'var(--bg-hover)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        />
                    )}
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full h-[56px] disabled:opacity-50 transition-colors rounded-xl text-white font-bold text-base"
                    style={{ background: '#6c63ff' }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = '#5a52e0')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#6c63ff')}
                >
                    {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
                </button>
            </div>
        </div>
    )
}