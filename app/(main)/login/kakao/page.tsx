// app/login/kakao/page.tsx
'use client'
import { useEffect } from 'react'

export default function KakaoLoginPage() {
    useEffect(() => {
        const CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID
        const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/login/kakao/callback`)
        const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`
        window.location.href = url
    }, [])

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#FEE500', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
