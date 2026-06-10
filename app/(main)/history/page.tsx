"use client"
import PageHeader from '@/components/PageHeader'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useRouter } from 'next/navigation'
import { db } from '@/firebase/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

const IMG = 'https://image.tmdb.org/t/p'

type Tab = 'point' | 'membership' | 'purchase'

export default function HistoryPage() {
    const { user } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const { history, fetchHistory } = usePointStore()
    const router = useRouter()
    const [tab, setTab] = useState<Tab>('point')
    const [membershipHistory, setMembershipHistory] = useState<any[]>([])
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        const uid = user?.uid
        if (!uid) { router.push('/login'); return }

        const load = async () => {
            setLoading(true)
            await fetchHistory(uid)
            try {
                const [memSnap, purSnap] = await Promise.all([
                    getDocs(query(collection(db, 'users', uid, 'membership_history'), orderBy('createdAt', 'desc'))),
                    getDocs(query(collection(db, 'users', uid, 'purchaseHistory'), orderBy('createdAt', 'desc'))),
                ])
                setMembershipHistory(memSnap.docs.map(d => ({ id: d.id, ...d.data() })))
                setPurchaseHistory(purSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch { }
            setLoading(false)
        }
        load()
    }, [user, hydrated])

    const fmt = (ts: any) => {
        if (!ts) return '-'
        const d = ts.toDate ? ts.toDate() : new Date(ts)
        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    const fmtEnd = (ts: any, days: number) => {
        if (!ts) return '-'
        const d = ts.toDate ? ts.toDate() : new Date(ts)
        const end = new Date(d.getTime() + days * 86400000)
        return end.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    const isExpired = (ts: any, days: number) => {
        if (!ts || !days) return false
        const d = ts.toDate ? ts.toDate() : new Date(ts)
        return new Date(d.getTime() + days * 86400000) < new Date()
    }

    const TABS: { id: Tab; label: string; count: number }[] = [
        { id: 'point', label: '포인트 충전내역', count: history.length },
        { id: 'membership', label: '멤버십 이용내역', count: membershipHistory.length },
        { id: 'purchase', label: '대여/소장 내역', count: purchaseHistory.length },
    ]

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .hs-wrap { width: 90%; margin: 0 auto; }
                .hs-tabs { display: flex; gap: 4px; background: var(--border-faint); border-radius: 12px; padding: 4px; margin-bottom: 32px; }
                .hs-tab { flex: 1; padding: 10px 0; border-radius: 9px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .18s; }
                .hs-tab.on { background: var(--main); color: #fff; }
                .hs-tab.off { background: none; color: var(--text-subtle); }
                .hs-tab.off:hover { color: var(--text-muted); }
                .hs-item { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-subtle); margin-bottom: 8px; transition: border-color .15s; }
                .hs-item:hover { border-color: rgba(108,99,255,.25); }
                .hs-item-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
                .hs-item-date { font-size: 12px; color: var(--text-subtle); margin: 0; }
                .hs-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 12px; }
                .hs-spinner { width: 32px; height: 32px; border: 2px solid var(--border); border-top-color: var(--main); border-radius: 50%; animation: spin .7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg) } }
                .hs-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
            `}</style>

            <div className="hs-wrap">
                <PageHeader title="이용내역" />

                <div className="hs-tabs">
                    {TABS.map(t => (
                        <button key={t.id} className={`hs-tab ${tab === t.id ? 'on' : 'off'}`} onClick={() => setTab(t.id)}>
                            {t.label}
                            {t.count > 0 && (
                                <span style={{
                                    marginLeft: 5, fontSize: 11,
                                    background: tab === t.id ? 'rgba(255,255,255,.25)' : 'var(--border)',
                                    borderRadius: 10, padding: '1px 6px'
                                }}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="hs-empty"><div className="hs-spinner" /></div>
                ) : (
                    <>
                        {/* 포인트 충전내역 */}
                        {tab === 'point' && (
                            history.length === 0 ? <Empty /> : (
                                <div>
                                    {history.map((h: any) => (
                                        <div key={h.id} className="hs-item">
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,99,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9d97ff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p className="hs-item-title">{h.label || h.description || '포인트 충전'}</p>
                                                <p className="hs-item-date">{fmt(h.createdAt)}</p>
                                            </div>
                                            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--main)', flexShrink: 0 }}>+{(h.amount || 0).toLocaleString()}P</span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* 멤버십 이용내역 */}
                        {tab === 'membership' && (
                            membershipHistory.length === 0 ? <Empty /> : (
                                <div>
                                    {membershipHistory.map((m: any) => (
                                        <div key={m.id} className="hs-item">
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p className="hs-item-title">{m.label || '멤버십 구독'}</p>
                                                <p className="hs-item-date">
                                                    {fmt(m.createdAt)}
                                                    {m.days && ` ~ ${fmtEnd(m.createdAt, m.days)}`}
                                                </p>
                                            </div>
                                            <span className="hs-badge" style={{
                                                background: m.type === 'premium' ? 'rgba(245,158,11,.15)' : 'rgba(59,130,246,.15)',
                                                color: m.type === 'premium' ? '#f59e0b' : '#3b82f6',
                                                border: `1px solid ${m.type === 'premium' ? 'rgba(245,158,11,.3)' : 'rgba(59,130,246,.3)'}`,
                                            }}>
                                                {m.type === 'premium' ? 'PREMIUM' : m.type === 'allinone' ? 'ALL-IN-ONE' : 'BASIC'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* 대여/소장 내역 */}
                        {tab === 'purchase' && (
                            purchaseHistory.length === 0 ? <Empty /> : (
                                <div>
                                    {[...purchaseHistory]
                                        .sort((a, b) => {
                                            if (a.purchaseType === b.purchaseType) return 0
                                            return a.purchaseType === 'own' ? -1 : 1
                                        })
                                        .map((p: any) => {
                                            const isRent = p.purchaseType === 'rent'
                                            const expired = isRent && isExpired(p.createdAt, p.rentDays)
                                            return (
                                                <div key={p.id} className="hs-item" style={{ opacity: expired ? 0.55 : 1 }}>
                                                    <div style={{ width: 44, height: 62, borderRadius: 8, background: 'var(--bg-card)', overflow: 'hidden', flexShrink: 0 }}>
                                                        {p.poster
                                                            ? <img src={`${IMG}/w92${p.poster}`} alt={p.animeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎬</div>
                                                        }
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p className="hs-item-title" style={{ marginBottom: 2 }}>{p.animeName || '작품'}</p>
                                                        <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '0 0 4px' }}>
                                                            {p.episodeCount ? `${p.episodeCount}화` : ''}{p.episodeNumbers?.length ? ` (${p.episodeNumbers.join(', ')}화)` : ''}
                                                        </p>
                                                        <p className="hs-item-date">
                                                            {fmt(p.createdAt)}
                                                            {isRent && p.rentDays && ` · ${fmtEnd(p.createdAt, p.rentDays)}까지`}
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                                        <span className="hs-badge" style={{
                                                            background: isRent ? 'rgba(59,130,246,.12)' : 'rgba(108,99,255,.15)',
                                                            color: isRent ? '#60a5fa' : '#9d97ff',
                                                            border: `1px solid ${isRent ? 'rgba(59,130,246,.25)' : 'rgba(108,99,255,.3)'}`,
                                                        }}>
                                                            {isRent ? `${p.rentDays}일 대여` : '소장'}
                                                        </span>
                                                        {expired && (
                                                            <span className="hs-badge" style={{ background: 'var(--border-faint)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                                                                만료됨
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                            {(p.totalPrice || 0).toLocaleString()}P
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

function Empty() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
            <img src="/images/laftel-icon/cry.png" alt="" style={{ width: 64, opacity: .4 }} />
            <p style={{ fontSize: 14, color: 'var(--text-subtle)', margin: 0 }}>이용 내역이 아직 없어요.</p>
        </div>
    )
}