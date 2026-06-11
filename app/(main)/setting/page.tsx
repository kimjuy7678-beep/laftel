"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import { signOut } from 'firebase/auth'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'

const SECTIONS = [
    { id: 'notification', label: '알림' },
    { id: 'account', label: '계정 관리' },
]


export default function Setting() {
    const { user, onLogout } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const router = useRouter()
    const [activeSection, setActiveSection] = useState('notification')
    const [notifications, setNotifications] = useState({
        works: true, community: true, store: true, events: false,
    })

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        loadNotifications()
    }, [user])

    const loadNotifications = async () => {
        if (!user?.uid) return
        try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            if (snap.data()?.notifications) setNotifications(snap.data()!.notifications)
        } catch { }
    }

    const saveNotifications = async (updated: typeof notifications) => {
        if (!user?.uid) return
        setNotifications(updated)
        await setDoc(doc(db, 'users', user.uid), { notifications: updated }, { merge: true })
    }

    const handleLogoutAll = async () => {
        if (!confirm('모든 기기에서 로그아웃할까요?')) return
        await signOut(auth)
        await onLogout()
        router.push('/')
    }
    const handleWithdraw = async () => {
        if (!confirm('정말 라프텔을 탈퇴하시겠어요?\n모든 데이터가 삭제되며 복구할 수 없어요.')) return
        if (!confirm('정말로요? 포인트, 이용내역 모두 사라져요.')) return
        try {
            const uid = user?.uid
            if (!uid) return
            await deleteDoc(doc(db, 'users', uid))
            await onLogout()
            await auth.currentUser?.delete()
            toast.success('탈퇴가 완료됐어요.')
            router.push('/')
        } catch (err: any) {
            if (err.code === 'auth/requires-recent-login') toast.error('재로그인 필요 🔐', {
                description: '보안을 위해 다시 로그인 후 시도해주세요.',
            })
        }
    }

    if (!user) return null

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: 80 }}>
            <style>{`
                .st-wrap { width: 90%; margin: 0 auto; display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }

                /* 좌측 네비 */
                .st-nav { position: sticky; top: 80px; }
                .st-nav-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: none; background: none; color: var(--text-subtle); font-size: 14px; font-weight: 500; cursor: pointer; transition: all .18s; text-align: left; }
                .st-nav-btn:hover { background: var(--border-faint); color: var(--text-muted); }
                .st-nav-btn.active { background: rgba(108,99,255,.15); color: #a5a0ff; font-weight: 700; }

                /* 우측 콘텐츠 */
                .st-section-title { font-size: 13px; font-weight: 700; color: var(--text-subtle); margin: 0 0 14px; }
                .st-card { background: var(--border-faint); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; margin-bottom: 32px; }
                .st-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border-faint); }
                .st-row:last-child { border-bottom: none; }
                .st-row-title { font-size: 14px; color: var(--text-high); margin: 0; font-weight: 500; }
                .st-row-sub { font-size: 12px; color: var(--text-subtle); margin: 4px 0 0; }
                .st-btn { font-size: 12px; padding: 7px 16px; border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--text-muted); cursor: pointer; transition: all .18s; white-space: nowrap; font-weight: 500; }
                .st-btn:hover { border-color: var(--border-subtle); color: var(--text-primary); background: var(--border-faint); }

                /* 토글 */
                .st-toggle { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
                .st-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
                .st-toggle-slider { position: absolute; inset: 0; background: var(--border); border-radius: 24px; cursor: pointer; transition: background .2s; }
                .st-toggle-slider::before { content:''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
                .st-toggle input:checked + .st-toggle-slider { background: var(--main); }
                .st-toggle input:checked + .st-toggle-slider::before { transform: translateX(18px); }
            `}</style>

            <div className="w-[90%] mx-auto pt-[82px] pb-[32px]">
                <PageHeader title="설정" />
            </div>

            <div className="st-wrap">

                {/* 좌측 네비게이션 */}
                <nav className="st-nav">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            className={`st-nav-btn ${activeSection === s.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(s.id)}
                        >
                            {s.id === 'notification' && (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            )}
                            {s.id === 'account' && (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                            )}
                            {s.label}
                        </button>
                    ))}
                </nav>

                {/* 우측 콘텐츠 */}
                <div>
                    {activeSection === 'notification' && (
                        <section>
                            <p className="st-section-title">알림</p>
                            <div className="st-card">
                                {[
                                    { key: 'works', label: '관심있는 작품의 업데이트 소식', category: '관심 작품' },
                                    { key: 'community', label: '커뮤니티 활동 소식', category: '커뮤니티' },
                                    { key: 'store', label: '주문 및 배송 정보', category: '스토어' },
                                    { key: 'events', label: '맞춤 이벤트 및 혜택 정보', category: '이벤트' },
                                ].map(item => (
                                    <div key={item.key} className="st-row">
                                        <div>
                                            <p className="st-row-title">{item.label}</p>
                                            <p className="st-row-sub">{item.category}</p>
                                        </div>
                                        <label className="st-toggle">
                                            <input type="checkbox"
                                                checked={notifications[item.key as keyof typeof notifications]}
                                                onChange={e => saveNotifications({ ...notifications, [item.key]: e.target.checked })} />
                                            <span className="st-toggle-slider" />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {activeSection === 'account' && (
                        <section>
                            <p className="st-section-title">계정 관리</p>
                            <div className="st-card">
                                <div className="st-row">
                                    <div>
                                        <p className="st-row-title">모든 기기에서 로그아웃</p>
                                        <p className="st-row-sub">현재 로그인된 모든 기기에서 로그아웃돼요</p>
                                    </div>
                                    <button className="st-btn" onClick={handleLogoutAll}>로그아웃</button>
                                </div>
                            </div>

                            <button onClick={handleWithdraw}
                                style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-faint)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
                                라프텔 탈퇴하기
                            </button>
                        </section>
                    )}
                </div>

            </div>
        </div>
    )
}