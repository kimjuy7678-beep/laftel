// app/api/auth/kakao/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const { code } = await req.json()

    try {
        const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login/kakao/callback`

        // 1. 카카오 액세스 토큰 발급
        const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.KAKAO_CLIENT_ID!,
                client_secret: process.env.KAKAO_CLIENT_SECRET || '',
                redirect_uri: REDIRECT_URI,
                code,
            }),
        })
        const tokenData = await tokenRes.json()
        console.log('[KAKAO] tokenData:', JSON.stringify(tokenData))
        if (!tokenData.access_token) {
            return NextResponse.json({ error: '카카오 토큰 발급 실패', detail: tokenData }, { status: 500 })
        }

        // 2. 카카오 유저 정보 조회
        const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        const userData = await userRes.json()
        console.log('[KAKAO] userData:', JSON.stringify(userData))

        const kakaoAccount = userData.kakao_account
        const profile = kakaoAccount?.profile

        // 3. Firebase Admin Custom Token 발급
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        const { default: admin } = await import('firebase-admin')
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey,
                }),
            })
        }

        const uid = `kakao:${userData.id}`
        const firebaseToken = await admin.auth().createCustomToken(uid)

        // 4. Firestore 저장
        const db = admin.firestore()
        await db.collection('users').doc(uid).set({
            uid,
            email: kakaoAccount?.email || null,
            displayName: profile?.nickname || null,
            photoURL: profile?.profile_image_url || null,
            provider: 'kakao',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })

        return NextResponse.json({
            firebaseToken,
            email: kakaoAccount?.email || null,
            nickname: profile?.nickname || null,
            profileImage: profile?.profile_image_url || null,
        })

    } catch (err: any) {
        console.error('[KAKAO] 에러:', err?.message)
        return NextResponse.json({ error: err?.message || '알 수 없는 오류' }, { status: 500 })
    }
}
