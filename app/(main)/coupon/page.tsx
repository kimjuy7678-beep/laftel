"use client"
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

const notices = [
    "쿠폰번호는 영문자와 숫자 혼합이며 대소문자 구분없이 입력할 수 있습니다.",
    "쿠폰마다 등록 가능한 기간이 다를 수 있습니다.",
    "멤버십 이용 중에는 멤버십 쿠폰을 사용할 수 없습니다.",
    "쿠폰은 등록 후 환불할 수 없습니다.",
    "등록한 내역은 MY>이용 내역에서 확인할 수 있습니다.",
    "관련 문의는 MY>고객센터>1:1문의하기를 이용해주세요.",
]

const couponIllustrations = [
    {
        label: "포인트 쿠폰",
        color: "#6c63ff",
        icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
        desc: "포인트로 애니를\n소장하거나 대여"
    },
    {
        label: "베이직 이용권",
        color: "#3b82f6",
        icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
        desc: "FHD 화질로\n무제한 스트리밍"
    },
    {
        label: "프리미엄 이용권",
        color: "#f59e0b",
        icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
        desc: "4인 동시 재생\n프리미엄 혜택"
    },
]

export default function CouponPage() {
    const { user, setMembership } = useAuthStore()
    const { chargePoints, fetchPoints } = usePointStore()
    const router = useRouter()
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (!user) { router.push('/login'); return }
    }, [user])

    const handleRegister = async () => {
        if (!code.trim() || !user) return
        setError('')
        setSuccess('')
        setLoading(true)
        try {
            const upperCode = code.trim().toUpperCase()
            const coupon = VALID_COUPONS[upperCode]
            if (!coupon) { setError('유효하지 않은 쿠폰번호입니다.'); return }
            const usedRef = doc(db, 'used_coupons', `${user.uid}_${upperCode}`)
            const usedSnap = await getDoc(usedRef)
            if (usedSnap.exists()) { setError('이미 사용한 쿠폰입니다.'); return }
            await setDoc(usedRef, { uid: user.uid, code: upperCode, usedAt: new Date() })

            if (coupon.type === 'point') {
                await chargePoints(user.uid, coupon.value, coupon.label)
                await fetchPoints(user.uid)
                await saveNotification(user.uid, {
                    type: 'coupon',
                    title: '쿠폰 등록 완료',
                    body: `${coupon.label}이 등록되어 ${coupon.value.toLocaleString()}P가 충전되었어요.`,
                    link: '/point',
                })
                setSuccess(`🎉 ${coupon.label} 등록 완료! ${coupon.value.toLocaleString()}P가 충전되었어요.`)
            } else {
                const memberRef = doc(db, 'users', user.uid)
                await setDoc(memberRef, {
                    membership: coupon.type,
                    membershipDays: coupon.value,
                    membershipStartAt: new Date()
                }, { merge: true })
                await addDoc(collection(db, 'users', user.uid, 'membership_history'), {
                    type: coupon.type,
                    label: coupon.label,
                    days: coupon.value,
                    createdAt: new Date(),
                })
                await saveNotification(user.uid, {
                    type: 'membership',
                    title: '멤버십 시작',
                    body: `${coupon.label}이 시작되었어요!`,
                    link: '/membership',
                })
                setMembership(coupon.type)
                setSuccess(`🎉 ${coupon.label} 등록 완료! 멤버십 혜택을 이용해보세요.`)
            }
            setCode('')
        } catch (err) {
            setError('오류가 발생했어요. 다시 시도해주세요.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen pt-20">
            <div className="inner px-6 py-10 max-w-3xl">
                <h1 className="text-xl font-bold mb-8">쿠폰 등록</h1>
                <div className="mb-8">
                    <p className="text-sm font-medium mb-3">쿠폰번호 입력</p>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                        placeholder="ABCD-EF01-G23H"
                        className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none py-2 text-white placeholder:text-white/30 text-sm transition-colors"
                    />
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                    {success && <p className="text-[#6c63ff] text-xs mt-2">{success}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4 mb-10">
                    {couponIllustrations.map((ill) => (
                        <div key={ill.label} className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
                            style={{ background: `linear-gradient(135deg, ${ill.color}33, ${ill.color}11)`, border: `1px solid ${ill.color}33` }}>
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: ill.color }}>{ill.icon}</div>
                            <div>
                                <p className="text-white font-bold text-sm">{ill.label}</p>
                                <p className="text-white/50 text-xs mt-1 whitespace-pre-line">{ill.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mb-8">
                    <h2 className="text-sm font-bold mb-3">이용 안내</h2>
                    <ul className="flex flex-col gap-1.5">
                        {notices.map((n, i) => (
                            <li key={i} className="text-xs text-white/40 leading-relaxed">- {n}</li>
                        ))}
                    </ul>
                </div>
                <button
                    onClick={handleRegister}
                    disabled={!code.trim() || loading}
                    className={`w-full py-4 rounded-xl font-bold text-sm transition-colors ${code.trim() && !loading ? 'bg-[#6c63ff] hover:bg-[#5a52e0] text-white' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                >
                    {loading ? '처리 중...' : '등록'}
                </button>
                <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xs text-white/40 mb-2 font-medium">테스트 쿠폰 번호</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(VALID_COUPONS).map((c) => (
                            <button key={c} onClick={() => setCode(c)}
                                className="text-[11px] text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-1 rounded font-mono hover:bg-[#6c63ff]/20 transition-colors">
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}