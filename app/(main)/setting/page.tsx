"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import { signOut } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default function Setting() {
    const { user, onLogout } = useAuthStore()
    const router = useRouter()

    const [notifications, setNotifications] = useState({
        works: true, community: true, store: true, events: false,
    })

    useEffect(() => {
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
            await auth.currentUser?.delete()
            await onLogout()
            router.push('/')
        } catch (err: any) {
            if (err.code === 'auth/requires-recent-login') alert('보안을 위해 다시 로그인 후 시도해주세요.')
        }
    }

    if (!user) return null

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .st-wrap { width: 90%; max-width: 720px; margin: 0 auto; }
                .st-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.35); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 20px; }
                .st-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
                .st-row-title { font-size: 14px; color: rgba(255,255,255,.55); margin: 0; }
                .st-btn { font-size: 12px; padding: 7px 14px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: none; color: rgba(255,255,255,.6); cursor: pointer; transition: all .18s; white-space: nowrap; }
                .st-btn:hover { border-color: rgba(255,255,255,.4); color: #fff; }
                .st-divider { border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 0 0 48px; }
                .st-toggle { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
                .st-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
                .st-toggle-slider { position: absolute; inset: 0; background: rgba(255,255,255,.15); border-radius: 24px; cursor: pointer; transition: background .2s; }
                .st-toggle-slider::before { content:''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .2s; }
                .st-toggle input:checked + .st-toggle-slider { background: #6c63ff; }
                .st-toggle input:checked + .st-toggle-slider::before { transform: translateX(18px); }
                .st-noti-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
            `}</style>

            <div className="st-wrap">
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 40px' }}>설정</h1>

                {/* 알림 */}
                <section style={{ marginBottom: 48 }}>
                    <p className="st-label">알림</p>
                    {[
                        { key: 'works', label: '관심있는 작품의 업데이트 소식', category: '관심 작품' },
                        { key: 'community', label: '커뮤니티 활동 소식', category: '커뮤니티' },
                        { key: 'store', label: '주문 및 배송 정보', category: '스토어' },
                        { key: 'events', label: '맞춤 이벤트 및 혜택 정보', category: '이벤트' },
                    ].map(item => (
                        <div key={item.key} className="st-noti-row">
                            <div>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', margin: '0 0 3px' }}>{item.category}</p>
                                <p style={{ fontSize: 14, color: '#fff', margin: 0 }}>{item.label}</p>
                            </div>
                            <label className="st-toggle">
                                <input type="checkbox"
                                    checked={notifications[item.key as keyof typeof notifications]}
                                    onChange={e => saveNotifications({ ...notifications, [item.key]: e.target.checked })} />
                                <span className="st-toggle-slider" />
                            </label>
                        </div>
                    ))}
                </section>

                <hr className="st-divider" />

                {/* 계정 관리 */}
                <section style={{ marginBottom: 48 }}>
                    <p className="st-label">계정 관리</p>
                    <div className="st-row">
                        <p className="st-row-title">모든 기기에서 로그아웃</p>
                        <button className="st-btn" onClick={handleLogoutAll}>로그아웃</button>
                    </div>
                </section>


                <button onClick={handleWithdraw}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,.25)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.25)')}>
                    라프텔 탈퇴하기
                </button>
            </div>
        </div>
    )
}