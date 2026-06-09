'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { auth, db } from '@/firebase/firebase'
import { signInWithCustomToken } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'

export default function KakaoCallbackPage() {
    const router = useRouter()

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
                    const uid = result.user.uid

                    const snap = await getDoc(doc(db, 'users', uid))
                    const userData = snap.data()

                    if (!snap.exists()) {
                        await setDoc(doc(db, 'users', uid), {
                            email: result.user.email || data.email,
                            nickname: data.nickname || result.user.displayName,
                            avatarUrl: data.profileImage || result.user.photoURL,
                            membership: 'none',
                            points: 0,
                            createdAt: new Date().toISOString(),
                        })
                    }

                    useAuthStore.setState({
                        user: {
                            uid,
                            email: result.user.email || data.email,
                            name: userData?.nickname || data.nickname || result.user.displayName,
                            photoURL: userData?.avatarUrl || data.profileImage || result.user.photoURL,
                            membership: userData?.membership || 'none',
                            points: userData?.points || 0,
                            onboardingDone: userData?.onboardingDone || false,
                        }
                    })
                    router.push('/profile') // 프로필 선택 페이지로
                } else {
                    throw new Error('토큰 발급 실패')
                }
            } catch (err) {
                console.error('카카오 로그인 실패:', err)
                toast.error('카카오 로그인 실패 😓', {
                    description: '카카오 계정 연결에 문제가 생겼어요. 다시 시도해봐요.',
                })
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
