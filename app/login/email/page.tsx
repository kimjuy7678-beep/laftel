"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/firebase/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useAuthStore } from '@/store/useAuthStore'
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
                onLogin({
                    email: result.user.email,
                    name: result.user.displayName || email.split('@')[0],
                    photoURL: result.user.photoURL,
                })
                showToast('로그인 완료!')
                setTimeout(() => router.push('/'), 1000)
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password)
                await updateProfile(result.user, { displayName: nickname || email.split('@')[0] })
                onLogin({
                    email: result.user.email,
                    name: nickname || email.split('@')[0],
                    photoURL: null,
                })
                showToast('회원가입 완료! 환영해요 🎉')
                setTimeout(() => router.push('/'), 1200)
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
        <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4">

            {/* 토스트 */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#6c63ff] text-white text-sm font-medium px-6 py-3 rounded-full shadow-lg animate-fade-in">
                    {toast}
                </div>
            )}

            <div className="w-full max-w-[420px] flex flex-col gap-6">

                <Link href="/login" className="text-center">
                    <h1 className="font-black text-white text-4xl tracking-widest">LAFTEL</h1>
                </Link>

                <div className="flex bg-white/5 rounded-xl p-1">
                    <button
                        onClick={() => { setIsLogin(true); setError('') }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${isLogin ? 'bg-[#6c63ff] text-white' : 'text-white/50 hover:text-white'}`}
                    >
                        로그인
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError('') }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${!isLogin ? 'bg-[#6c63ff] text-white' : 'text-white/50 hover:text-white'}`}
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
                        className="w-full h-[52px] bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                    />
                    <input
                        type="password"
                        placeholder="비밀번호 (6자 이상)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="w-full h-[52px] bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                    />
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="닉네임 (선택)"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className="w-full h-[52px] bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#6c63ff] transition-colors"
                        />
                    )}
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full h-[56px] bg-[#6c63ff] hover:bg-[#5a52e0] disabled:opacity-50 transition-colors rounded-xl text-white font-bold text-base"
                >
                    {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
                </button>

            </div>
        </div>
    )
}