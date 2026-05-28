"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useRouter } from 'next/navigation'
import { db } from '@/firebase/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

export default function HistoryPage() {
    const { user } = useAuthStore()
    const { history, fetchHistory } = usePointStore()
    const router = useRouter()
    const [tab, setTab] = useState<'point' | 'membership'>('point')
    const [membershipHistory, setMembershipHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        const load = async () => {
            setLoading(true)
            await fetchHistory(user.uid)
            // 멤버십 내역
            try {
                const q = query(
                    collection(db, "users", user.uid, "membership_history"),
                    orderBy("createdAt", "desc")
                )
                const snap = await getDocs(q)
                setMembershipHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch {}
            setLoading(false)
        }
        load()
    }, [user])

    const formatDate = (ts: any) => {
        if (!ts) return '-'
        const date = ts.toDate ? ts.toDate() : new Date(ts)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    const formatEndDate = (ts: any, days: number) => {
        if (!ts) return '-'
        const date = ts.toDate ? ts.toDate() : new Date(ts)
        const end = new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
        return end.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    return (
        <div className="min-h-screen pt-20">
            <div className="inner px-6 py-10 max-w-3xl">
                <h1 className="text-xl font-bold mb-6">이용내역</h1>

                {/* 탭 */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
                    <button
                        onClick={() => setTab('point')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'point' ? 'bg-[#6c63ff] text-white' : 'text-white/50 hover:text-white'}`}
                    >
                        포인트 충전내역
                    </button>
                    <button
                        onClick={() => setTab('membership')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'membership' ? 'bg-[#6c63ff] text-white' : 'text-white/50 hover:text-white'}`}
                    >
                        멤버십 이용내역
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* 포인트 내역 */}
                        {tab === 'point' && (
                            history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4">
                                    <img src="/images/laftel-icon/cry.png" alt="없음" className="w-20 opacity-50" />
                                    <p className="text-white/40 text-sm">이용 내역이 아직 없어요.</p>
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {history.map((h) => (
                                        <li key={h.id} className="flex items-center justify-between px-5 py-4 bg-[#1a1a1a] rounded-xl border border-white/5">
                                            <div>
                                                <p className="text-sm font-medium">{h.label}</p>
                                                <p className="text-xs text-white/40 mt-0.5">{formatDate(h.createdAt)}</p>
                                            </div>
                                            <span className="text-[#6c63ff] font-bold text-sm">
                                                +{h.amount.toLocaleString()}P
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )
                        )}

                        {/* 멤버십 내역 */}
                        {tab === 'membership' && (
                            membershipHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4">
                                    <img src="/images/laftel-icon/cry.png" alt="없음" className="w-20 opacity-50" />
                                    <p className="text-white/40 text-sm">이용 내역이 아직 없어요.</p>
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {membershipHistory.map((m) => (
                                        <li key={m.id} className="flex items-center justify-between px-5 py-4 bg-[#1a1a1a] rounded-xl border border-white/5">
                                            <div>
                                                <p className="text-sm font-medium">{m.label}</p>
                                                <p className="text-xs text-white/40 mt-0.5">
                                                    {formatDate(m.createdAt)} ~ {formatEndDate(m.createdAt, m.days)}
                                                </p>
                                            </div>
                                            <span
                                                className="text-xs font-bold px-2.5 py-1 rounded-full"
                                                style={{
                                                    background: m.type === 'premium' ? '#f59e0b30' : '#3b82f630',
                                                    color: m.type === 'premium' ? '#f59e0b' : '#3b82f6'
                                                }}
                                            >
                                                {m.type === 'premium' ? 'PREMIUM' : 'BASIC'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    )
}