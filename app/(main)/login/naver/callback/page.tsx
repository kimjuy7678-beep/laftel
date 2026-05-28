'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { auth } from '@/firebase/firebase'
import { signInWithCustomToken } from 'firebase/auth'

export default function NaverCallbackPage() {
    const router = useRouter()
    const { onLogin } = useAuthStore()

    useEffect(() => {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const savedState = sessionStorage.getItem('naver_state')

        if (!code || state !== savedState) {
            alert('로그인에 실패했어요. 다시 시도해주세요.')
            router.push('/login')
            return
        }

        // 네이버는 서버사이드 토큰 교환 필요
        // Firebase Custom Token 방식 or 직접 유저 정보만 저장
        const fetchNaverUser = async () => {
            try {
                // Next.js API Route로 토큰 교환
                const res = await fetch('/api/auth/naver', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, state }),
                })
                const data = await res.json()

                if (data.firebaseToken) {
                    // Firebase Custom Token으로 로그인
                    const result = await signInWithCustomToken(auth, data.firebaseToken)
                    onLogin({
                        uid: result.user.uid,
                        email: result.user.email || data.email,
                        name: data.name || result.user.displayName,
                        photoURL: data.profileImage || result.user.photoURL,
                        membership: 'none',
                    })
                    router.push('/')
                } else {
                    throw new Error('토큰 발급 실패')
                }
            } catch (err) {
                console.error('네이버 로그인 실패:', err)
                alert('네이버 로그인에 실패했어요.')
                router.push('/login')
            }
        }

        fetchNaverUser()
        sessionStorage.removeItem('naver_state')
    }, [])

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#03C75A', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>네이버 로그인 처리 중...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
