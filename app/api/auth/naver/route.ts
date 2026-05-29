// app/api/auth/naver/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const { code, state } = await req.json()

    try {
        const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login/naver/callback`

        // 1. 네이버 액세스 토큰 발급
        const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.NAVER_CLIENT_ID!,
                client_secret: process.env.NAVER_CLIENT_SECRET!,
                redirect_uri: REDIRECT_URI,
                code,
                state,
            }),
        })
        const tokenData = await tokenRes.json()
        console.log('[NAVER] tokenData:', JSON.stringify(tokenData))

        if (!tokenData.access_token) {
            return NextResponse.json({ error: '네이버 토큰 발급 실패', detail: tokenData }, { status: 500 })
        }

        // 2. 네이버 유저 정보 조회
        const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        const userData = await userRes.json()
        console.log('[NAVER] userData:', JSON.stringify(userData))

        const profile = userData.response

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

        const uid = `naver:${profile.id}`
        const firebaseToken = await admin.auth().createCustomToken(uid)

        // 4. Firestore 저장
        const db = admin.firestore()
        await db.collection('users').doc(uid).set({
            uid,
            email: profile.email || null,
            displayName: profile.name || profile.nickname || null,
            photoURL: profile.profile_image || null,
            provider: 'naver',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })

        return NextResponse.json({
            firebaseToken,
            email: profile.email || null,
            name: profile.name || profile.nickname || null,
            profileImage: profile.profile_image || null,
        })

    } catch (err: any) {
        console.error('[NAVER] 에러:', err?.message)
        return NextResponse.json({ error: err?.message || '알 수 없는 오류' }, { status: 500 })
    }
}