'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { auth, db } from '@/firebase/firebase'
import { signInWithCustomToken } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

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

        const fetchNaverUser = async () => {
            try {
                const res = await fetch('/api/auth/naver', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, state }),
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
                            nickname: data.name || result.user.displayName,
                            avatarUrl: data.profileImage || result.user.photoURL,
                            membership: 'none',
                            points: 0,
                            createdAt: new Date().toISOString(),
                        })
                    }

                    onLogin({
                        uid,
                        email: result.user.email || data.email,
                        name: userData?.nickname || data.name || result.user.displayName,
                        photoURL: userData?.avatarUrl || data.profileImage || result.user.photoURL,
                        membership: userData?.membership || 'none',
                        points: userData?.points || 0,
                    })
                    router.push('/profile')
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