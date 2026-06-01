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
            try {
                const q = query(collection(db, 'users', user.uid, 'membership_history'), orderBy('createdAt', 'desc'))
                const snap = await getDocs(q)
                setMembershipHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch { }
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
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .hs-wrap { width: 90%; margin: 0 auto; }
                .hs-tabs { display: flex; gap: 4px; background: rgba(255,255,255,.05); border-radius: 12px; padding: 4px; margin-bottom: 32px; }
                .hs-tab { flex: 1; padding: 10px 0; border-radius: 9px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all .18s; }
                .hs-tab.on { background: #6c63ff; color: #fff; }
                .hs-tab.off { background: none; color: rgba(255,255,255,.4); }
                .hs-tab.off:hover { color: rgba(255,255,255,.7); }
                .hs-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #141420; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); margin-bottom: 8px; }
                .hs-item-title { font-size: 14px; font-weight: 600; color: #fff; margin: 0 0 4px; }
                .hs-item-date { font-size: 12px; color: rgba(255,255,255,.35); margin: 0; }
                .hs-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 12px; }
                .hs-spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,.1); border-top-color: #6c63ff; border-radius: 50%; animation: spin .7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg) } }
            `}</style>

            <div className="hs-wrap">
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 40px' }}>이용내역</h1>

                {/* 탭 */}
                <div className="hs-tabs">
                    <button className={`hs-tab ${tab === 'point' ? 'on' : 'off'}`} onClick={() => setTab('point')}>포인트 충전내역</button>
                    <button className={`hs-tab ${tab === 'membership' ? 'on' : 'off'}`} onClick={() => setTab('membership')}>멤버십 이용내역</button>
                </div>

                {loading ? (
                    <div className="hs-empty"><div className="hs-spinner" /></div>
                ) : (
                    <>
                        {/* 포인트 내역 */}
                        {tab === 'point' && (
                            history.length === 0 ? (
                                <div className="hs-empty">
                                    <img src="/images/laftel-icon/cry.png" alt="" style={{ width: 64, opacity: .4 }} />
                                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', margin: 0 }}>이용 내역이 아직 없어요.</p>
                                </div>
                            ) : (
                                <div>
                                    {history.map(h => (
                                        <div key={h.id} className="hs-item">
                                            <div>
                                                <p className="hs-item-title">{h.label}</p>
                                                <p className="hs-item-date">{formatDate(h.createdAt)}</p>
                                            </div>
                                            <span style={{ fontSize: 15, fontWeight: 800, color: '#6c63ff' }}>+{h.amount.toLocaleString()}P</span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* 멤버십 내역 */}
                        {tab === 'membership' && (
                            membershipHistory.length === 0 ? (
                                <div className="hs-empty">
                                    <img src="/images/laftel-icon/cry.png" alt="" style={{ width: 64, opacity: .4 }} />
                                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', margin: 0 }}>이용 내역이 아직 없어요.</p>
                                </div>
                            ) : (
                                <div>
                                    {membershipHistory.map(m => (
                                        <div key={m.id} className="hs-item">
                                            <div>
                                                <p className="hs-item-title">{m.label}</p>
                                                <p className="hs-item-date">{formatDate(m.createdAt)} ~ {formatEndDate(m.createdAt, m.days)}</p>
                                            </div>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                                                background: m.type === 'premium' ? 'rgba(245,158,11,.15)' : 'rgba(59,130,246,.15)',
                                                color: m.type === 'premium' ? '#f59e0b' : '#3b82f6',
                                                border: `1px solid ${m.type === 'premium' ? 'rgba(245,158,11,.3)' : 'rgba(59,130,246,.3)'}`,
                                            }}>
                                                {m.type === 'premium' ? 'PREMIUM' : 'BASIC'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    )
}