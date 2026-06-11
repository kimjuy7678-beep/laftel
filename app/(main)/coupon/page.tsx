"use client"
import PageHeader from '@/components/PageHeader'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useRouter } from 'next/navigation'
import { db } from '@/firebase/firebase'
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore'
import { saveNotification } from '@/utils/notification'

const VALID_COUPONS: Record<string, { type: 'point' | 'basic' | 'premium', value: number, label: string }> = {
    'LAFTEL-1000-POINT': { type: 'point', value: 1000, label: '1,000 포인트 쿠폰' },
    'LAFTEL-3000-POINT': { type: 'point', value: 3000, label: '3,000 포인트 쿠폰' },
    'LAFTEL-5000-POINT': { type: 'point', value: 5000, label: '5,000 포인트 쿠폰' },
    'ANIME-WELCOME-2024': { type: 'point', value: 2000, label: '웰컴 포인트 쿠폰' },
    'POINT-FREE-7777': { type: 'point', value: 7777, label: '럭키 포인트 쿠폰' },
    'BASIC-FREE-30DAY': { type: 'basic', value: 30, label: '베이직 멤버십 30일 이용권' },
    'BASIC-FREE-07DAY': { type: 'basic', value: 7, label: '베이직 멤버십 7일 이용권' },
    'PREMIUM-FREE-7DAY': { type: 'premium', value: 7, label: '프리미엄 멤버십 7일 이용권' },
    'PREMIUM-VIP-30DAY': { type: 'premium', value: 30, label: '프리미엄 멤버십 30일 이용권' },
    'LAFTEL-SPECIAL-99': { type: 'point', value: 9900, label: '스페셜 포인트 쿠폰' },
}

const MEMBERSHIP_BY_COUPON = {
    basic: 'anime',
    premium: 'allinone',
} as const

const notices = [
    '쿠폰번호는 영문자와 숫자 혼합이며 대소문자 구분없이 입력할 수 있습니다.',
    '쿠폰마다 등록 가능한 기간이 다를 수 있습니다.',
    '멤버십 이용 중에는 멤버십 쿠폰을 사용할 수 없습니다.',
    '쿠폰은 등록 후 환불할 수 없습니다.',
    '등록한 내역은 MY > 이용 내역에서 확인할 수 있습니다.',
    '관련 문의는 MY > 고객센터 > 1:1문의하기를 이용해주세요.',
]

export default function CouponPage() {
    const { user, setMembership } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const { chargePoints, fetchPoints } = usePointStore()
    const router = useRouter()
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
    }, [user])

    const handleRegister = async () => {
        if (!code.trim() || !user?.uid) return
        const uid = user.uid
        setError(''); setSuccess('')
        setLoading(true)
        try {
            const upperCode = code.trim().toUpperCase()
            const coupon = VALID_COUPONS[upperCode]
            if (!coupon) { setError('유효하지 않은 쿠폰번호입니다.'); return }

            const usedRef = doc(db, 'used_coupons', `${user.uid!}_${upperCode}`)
            const usedSnap = await getDoc(usedRef)
            if (usedSnap.exists()) { setError('이미 사용한 쿠폰입니다.'); return }

            await setDoc(usedRef, { uid: user.uid!, code: upperCode, usedAt: new Date() })
            await addDoc(collection(db, 'users', user.uid!!, 'coupon_history'), {
                code: upperCode,
                label: coupon.label,
                type: coupon.type,
                value: coupon.value,
                usedAt: new Date(),
            })

            if (coupon.type === 'point') {
                await chargePoints(user.uid!!, coupon.value, coupon.label)
                await fetchPoints(user.uid!!)
                await saveNotification(user.uid!!, {
                    type: 'coupon',
                    title: '쿠폰 등록 완료',
                    body: `${coupon.label}이 등록되어 ${coupon.value.toLocaleString()}P가 충전되었어요.`,
                    link: '/point',
                })
                setSuccess(`🎉 ${coupon.label} 등록 완료! ${coupon.value.toLocaleString()}P가 충전되었어요.`)
            } else {
                await setDoc(doc(db, 'users', user.uid!), {
                    membership: coupon.type,
                    membershipDays: coupon.value,
                    membershipStartAt: new Date(),
                }, { merge: true })
                await addDoc(collection(db, 'users', user.uid!, 'membership_history'), {
                    type: coupon.type,
                    label: coupon.label,
                    days: coupon.value,
                    createdAt: new Date(),
                })
                await saveNotification(user.uid!, {
                    type: 'membership',
                    title: '멤버십 시작',
                    body: `${coupon.label}이 시작되었어요!`,
                    link: '/membership',
                })
                setMembership(coupon.type as any)
                setSuccess(`🎉 ${coupon.label} 등록 완료! 멤버십 혜택을 이용해보세요.`)
            }
            setCode('')
        } catch {
            setError('오류가 발생했어요. 다시 시도해주세요.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .cp-wrap { width: 90%; margin: 0 auto; }
                .cp-input { width: 100%; background: none; border: none; border-bottom: 1px solid var(--border); outline: none; color: var(--text-primary); font-size: 18px; font-weight: 600; padding: 12px 0; letter-spacing: 2px; transition: border-color .2s; box-sizing: border-box; caret-color: var(--main); }
                .cp-input:focus { border-color: var(--main); }
                .cp-input::placeholder { color: var(--text-faint); font-weight: 400; letter-spacing: 1px; }
                .cp-submit { width: 100%; padding: 16px; background: var(--main); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .2s; }
                .cp-submit:hover:not(:disabled) { background: #5a52e0; }
                .cp-submit:disabled { background: var(--border-subtle); color: var(--text-subtle); cursor: default; }
                .cp-notice-item { font-size: 13px; color: var(--text-subtle); line-height: 1.7; padding-left: 12px; position: relative; }
                .cp-notice-item::before { content: '-'; position: absolute; left: 0; color: var(--text-faint); }
                .cp-test-btn { font-size: 11px; color: var(--main); background: var(--border-faint); padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer; font-family: monospace; transition: background .15s; }
                .cp-test-btn:hover { background: var(--border-subtle); }
            `}</style>

            <div className="cp-wrap">
                <PageHeader title="쿠폰 등록" />

                <div style={{ marginBottom: 32 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>쿠폰번호 입력</p>
                    <input
                        className="cp-input"
                        type="text"
                        value={code}
                        onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
                        onKeyDown={e => e.key === 'Enter' && handleRegister()}
                        placeholder="ABCD-EF01-G23H"
                    />
                    {error && <p style={{ fontSize: 13, color: '#f87171', marginTop: 10 }}>{error}</p>}
                    {success && <p style={{ fontSize: 13, color: 'var(--main)', marginTop: 10 }}>{success}</p>}
                </div>

                <button className="cp-submit" onClick={handleRegister} disabled={!code.trim() || loading} style={{ marginBottom: 48 }}>
                    {loading ? '처리 중...' : '등록'}
                </button>

                <div style={{ marginBottom: 40 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14 }}>이용 안내</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notices.map((n, i) => (
                            <p key={i} className="cp-notice-item">{n}</p>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '16px 20px', background: 'var(--border-faint)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10, fontWeight: 600 }}>테스트 쿠폰 번호</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(VALID_COUPONS).map(([c]) => (
                            <button key={c} className="cp-test-btn" onClick={() => setCode(c)}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
