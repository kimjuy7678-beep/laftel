// app/login/kakao/callback/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { auth } from '@/firebase/firebase'
import { signInWithCustomToken } from 'firebase/auth'

export default function KakaoCallbackPage() {
    const router = useRouter()
    const { onLogin } = useAuthStore()

    useEffect(() => {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (!code) { router.push('/login'); return }

        const fetchKakaoUser = async () => {
            try {
                const res = await fetch('/api/auth/kakao', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                })
                const data = await res.json()
                if (data.firebaseToken) {
                    const result = await signInWithCustomToken(auth, data.firebaseToken)
                    onLogin({
                        uid: result.user.uid,
                        email: result.user.email || data.email,
                        name: data.nickname || result.user.displayName,
                        photoURL: data.profileImage || result.user.photoURL,
                        membership: 'none',
                    })
                    router.push('/')
                } else {
                    throw new Error('토큰 발급 실패')
                }
            } catch (err) {
                console.error('카카오 로그인 실패:', err)
                alert('카카오 로그인에 실패했어요.')
                router.push('/login')
            }
        }
        fetchKakaoUser()
    }, [])

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#FEE500', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>카카오 로그인 처리 중...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
