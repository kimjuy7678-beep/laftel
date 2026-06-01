"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { db } from '@/firebase/firebase'
import { doc, setDoc, addDoc, collection } from 'firebase/firestore'

type PlanId = 'anime' | 'ost' | 'allinone'

interface Plan {
    id: PlanId
    name: string
    price: string
    period: string
    days: number
    color: string
    emoji: string
    desc: string
    highlight: boolean
    features: string[]
    notIncluded: string[]
}

const plans: Plan[] = [
    {
        id: 'anime',
        name: "애니 멤버십",
        price: "9,900",
        period: "월",
        days: 30,
        color: "#6c63ff",
        emoji: "🎬",
        desc: "애니메이션 무제한 시청",
        highlight: false,
        features: ["광고 없는 무제한 스트리밍", "FHD 고화질", "프로필 최대 4개", "동시 4기기 재생", "모바일/PC/TV 지원", "라이브 신작 시청"],
        notIncluded: ["OST 전곡 감상"],
    },
    {
        id: 'allinone',
        name: "올인원",
        price: "13,900",
        period: "월",
        days: 30,
        color: "#f59e0b",
        emoji: "⚡",
        desc: "애니 + OST 전부 다",
        highlight: true,
        features: ["광고 없는 무제한 스트리밍", "FHD 고화질", "프로필 최대 4개", "동시 4기기 재생", "모바일/PC/TV 지원", "라이브 신작 시청", "OST 전곡 무제한 감상", "OST 오프라인 저장"],
        notIncluded: [],
    },
    {
        id: 'ost',
        name: "OST 멤버십",
        price: "4,900",
        period: "월",
        days: 30,
        color: "#ec4899",
        emoji: "🎵",
        desc: "애니 OST 전곡 감상",
        highlight: false,
        features: ["OST 전곡 무제한 감상", "OST 오프라인 저장", "고음질 스트리밍", "아티스트/앨범 탐색"],
        notIncluded: ["애니메이션 시청"],
    },
]

const compareRows = [
    { label: '애니 무제한', anime: true, allinone: true, ost: false },
    { label: 'FHD 화질', anime: true, allinone: true, ost: false },
    { label: '라이브 신작', anime: true, allinone: true, ost: false },
    { label: 'OST 전곡', anime: false, allinone: true, ost: true },
    { label: 'OST 오프라인', anime: false, allinone: true, ost: true },
    { label: '광고 없음', anime: true, allinone: true, ost: true },
]

interface MembershipModalProps {
    isOpen: boolean
    onClose: () => void
    defaultPlan?: PlanId
}

export default function MembershipModal({ isOpen, onClose, defaultPlan = 'allinone' }: MembershipModalProps) {
    const { user, setMembership } = useAuthStore()
    const router = useRouter()
    const [modalPlan, setModalPlan] = useState<PlanId>(defaultPlan)
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

    useEffect(() => {
        if (defaultPlan) setModalPlan(defaultPlan)
    }, [defaultPlan])

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [onClose])

    if (!isOpen) return null

    const currentPlan = plans.find(p => p.id === modalPlan)!

    const handleSubscribe = async () => {
        if (!user) { router.push('/login'); return }
        const uid = (user as { uid: string }).uid
        setLoadingPlan(currentPlan.id)
        try {
            await setDoc(doc(db, 'users', uid), {
                membership: currentPlan.id,
                membershipDays: currentPlan.days,
                membershipStartAt: new Date()
            }, { merge: true })
            await addDoc(collection(db, 'users', uid, 'membership_history'), {
                type: currentPlan.id,
                label: `${currentPlan.name} ${currentPlan.days}일 이용권`,
                days: currentPlan.days,
                createdAt: new Date(),
            })
            setMembership(currentPlan.id)
            alert(`🎉 ${currentPlan.name}이 시작되었어요!`)
            onClose()
        } catch {
            alert('오류가 발생했어요. 다시 시도해주세요.')
        } finally {
            setLoadingPlan(null)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-3xl 2xl:max-w-4xl p-8 2xl:p-10 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                    ✕
                </button>

                <h3 className="text-xl 2xl:text-2xl font-black mb-1">멤버십 선택</h3>
                <p className="text-white/40 text-sm mb-6">언제든 해지 가능 · 다음 결제일 전까지 이용 가능</p>

                {/* 탭 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {plans.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setModalPlan(p.id)}
                            className="py-3 px-4 rounded-xl border text-sm font-bold transition-all cursor-pointer"
                            style={modalPlan === p.id
                                ? { borderColor: p.color, background: `${p.color}18`, color: '#fff' }
                                : { borderColor: 'rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                            }
                        >
                            <div>{p.emoji} {p.name}</div>
                            {p.highlight && <div className="text-xs text-[#f59e0b] mt-0.5">가장 인기</div>}
                        </button>
                    ))}
                </div>

                {/* 상세 + 비교표 */}
                <div className="grid grid-cols-2 gap-6">
                    {/* 왼쪽 — 플랜 상세 */}
                    <div className="rounded-xl p-6" style={{ background: `${currentPlan.color}15`, border: `1px solid ${currentPlan.color}40` }}>
                        <div className="text-sm font-bold mb-1" style={{ color: currentPlan.color }}>{currentPlan.emoji} {currentPlan.name}</div>
                        <div className="text-white/40 text-xs mb-4">{currentPlan.desc}</div>
                        <div className="text-4xl font-black mb-6">
                            ₩{currentPlan.price}
                            <span className="text-sm text-white/30 font-normal">/월</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            {currentPlan.features.map(f => (
                                <div key={f} className="flex items-center gap-2 text-sm text-white/80">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={currentPlan.color} strokeWidth="3">
                                        <polyline points="20,6 9,17 4,12" />
                                    </svg>
                                    {f}
                                </div>
                            ))}
                            {currentPlan.notIncluded.map(f => (
                                <div key={f} className="flex items-center gap-2 text-sm text-white/20">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 오른쪽 — 비교표 */}
                    <div>
                        <p className="text-white/40 text-xs mb-3">플랜 비교</p>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left text-xs text-white/40 pb-2">기능</th>
                                    {plans.map(p => (
                                        <th key={p.id} className="text-center text-xs pb-2" style={{ color: p.color }}>{p.emoji}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {compareRows.map(row => (
                                    <tr key={row.label} className="border-b border-white/5">
                                        <td className="py-2.5 text-xs text-white/50">{row.label}</td>
                                        {plans.map(p => (
                                            <td key={p.id} className="py-2.5 text-center">
                                                {row[p.id as keyof typeof row]
                                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="3" className="mx-auto"><polyline points="20,6 9,17 4,12" /></svg>
                                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" className="mx-auto"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 하단 시작하기 버튼 */}
                <button
                    onClick={handleSubscribe}
                    disabled={loadingPlan === currentPlan.id}
                    className="w-full mt-6 py-4 rounded-xl font-black text-lg text-white transition-all cursor-pointer"
                    style={{ background: currentPlan.color, opacity: loadingPlan === currentPlan.id ? 0.5 : 1 }}
                >
                    {loadingPlan === currentPlan.id ? '처리 중...' : `${currentPlan.name} 시작하기 — ₩${currentPlan.price}/월`}
                </button>
            </div>
        </div>
    )
}