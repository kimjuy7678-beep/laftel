'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore, WatchlistTab } from '@/store/useWatchlistStore'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300'

const TABS: { id: WatchlistTab; label: string }[] = [
    { id: 'recent',    label: '최근 본' },
    { id: 'wishlist',  label: '보고싶다' },
    { id: 'purchased', label: '구매한' },
    { id: 'series',    label: '정주행' },
]

const EMPTY_MSG: Record<WatchlistTab, { icon: string; text: string }> = {
    recent:    { icon: '/images/laftel-icon/cry.png', text: '최근 본 작품이 아직 없어요.' },
    wishlist:  { icon: '/images/laftel-icon/cry.png', text: '보고싶은 작품을 추가해보세요.' },
    purchased: { icon: '/images/laftel-icon/cry.png', text: '구매한 작품이 없어요.' },
    series:    { icon: '/images/laftel-icon/cry.png', text: '정주행 중인 작품이 없어요.' },
}

export default function LibraryPage() {
    const router = useRouter()
    const { user, avatarConfig } = useAuthStore()
    const { items, loading, fetchWatchlist, removeItem } = useWatchlistStore()
    const [activeTab, setActiveTab] = useState<WatchlistTab>('recent')
    const [selectMode, setSelectMode] = useState(false)
    const [selected, setSelected] = useState<Set<number>>(new Set())

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        fetchWatchlist(user.uid)
    }, [user])

    const tabItems = items.filter(i => i.tab === activeTab)

    const handleDelete = async () => {
        if (!user || selected.size === 0) return
        for (const id of selected) {
            await removeItem(user.uid, id, activeTab)
        }
        setSelected(new Set())
        setSelectMode(false)
    }

    const toggleSelect = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56 }}>
            <style>{`
                .lib-wrap { max-width: 1820px; margin: 0 auto; padding: 32px 48px 60px; display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: start; min-height: calc(100vh - 56px); }
                /* 왼쪽 프로필 카드 */
                .lib-profile-card { background: #111; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 0; height: fit-content; }
                .lib-avatar { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; margin-bottom: 12px; background: #1a1a2e; }
                .lib-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .lib-username { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 4px; }
                .lib-level { font-size: 12px; color: rgba(255,255,255,.4); margin: 0 0 16px; }
                .lib-stats { display: flex; gap: 24px; margin-bottom: 20px; width: 100%; justify-content: center; }
                .lib-stat { text-align: center; }
                .lib-stat-num { font-size: 18px; font-weight: 900; color: #fff; }
                .lib-stat-label { font-size: 11px; color: rgba(255,255,255,.35); }
                .lib-action-btn { width: 100%; padding: 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.7); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all .2s; margin-bottom: 0; }
                .lib-action-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
                .lib-member-banner { width: 100%; margin-top: 16px; padding: 14px 16px; background: rgba(108,99,255,.12); border: 1px solid rgba(108,99,255,.2); border-radius: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all .2s; text-decoration: none; }
                .lib-member-banner:hover { background: rgba(108,99,255,.2); }
                .lib-member-text { font-size: 14px; font-weight: 800; color: #fff; margin: 0 0 2px; }
                .lib-member-sub { font-size: 11px; color: rgba(255,255,255,.45); margin: 0; }
                /* 오른쪽 보관함 */
                .lib-main { background: #111; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; overflow: hidden; min-height: calc(100vh - 140px); display: flex; flex-direction: column; }
                .lib-main-header { padding: 20px 24px 0; border-bottom: 1px solid rgba(255,255,255,.08); }
                .lib-main-title { font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 16px; }
                .lib-tabs { display: flex; gap: 0; }
                .lib-tab { padding: 10px 18px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,.4); background: none; border: none; cursor: pointer; position: relative; transition: color .2s; }
                .lib-tab:hover { color: rgba(255,255,255,.75); }
                .lib-tab.active { color: #fff; }
                .lib-tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #6c63ff; border-radius: 1px; }
                .lib-tab-action { margin-left: auto; display: flex; align-items: center; }
                .lib-delete-btn { display: flex; align-items: center; gap: 5px; background: none; border: none; color: rgba(255,255,255,.4); font-size: 13px; cursor: pointer; padding: 8px 0; transition: color .2s; }
                .lib-delete-btn:hover { color: #f87171; }
                /* 그리드 */
                .lib-grid { padding: 20px 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; align-content: start; }
                .lib-item { position: relative; cursor: pointer; }
                .lib-item-poster { width: 100%; aspect-ratio: 2/3; border-radius: 10px; overflow: hidden; background: #1a1a2e; transition: transform .2s; }
                .lib-item:hover .lib-item-poster { transform: translateY(-3px); }
                .lib-item-poster img { width: 100%; height: 100%; object-fit: cover; }
                .lib-item-title { font-size: 12px; color: rgba(255,255,255,.7); margin: 6px 0 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .lib-item-check { position: absolute; top: 6px; left: 6px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,.6); background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; transition: all .2s; }
                .lib-item-check.checked { background: #6c63ff; border-color: #6c63ff; }
                /* 빈 상태 */
                .lib-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 12px; flex: 1; }
                .lib-empty img { width: 80px; height: 80px; object-fit: contain; opacity: .5; filter: grayscale(1); flex-shrink: 0; }
                .lib-empty p { font-size: 14px; color: rgba(255,255,255,.35); margin: 0; }
                /* 카운트 */
                .lib-count { font-size: 13px; color: rgba(255,255,255,.3); padding: 0 24px 12px; }
            `}</style>

            <div className="lib-wrap">
                {/* 왼쪽 프로필 */}
                <div>
                    <div className="lib-profile-card">
                        <div className="lib-avatar">
                            {avatarConfig?.svgDataUrl
                                ? <img src={avatarConfig.svgDataUrl} alt="프로필" />
                                : user?.photoURL
                                    ? <img src={user.photoURL} alt="프로필" />
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6c63ff' }}>
                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </div>
                            }
                        </div>
                        <p className="lib-username">{user?.name || user?.email?.split('@')[0]}</p>
                        <p className="lib-level">😊 Lv.0 베이비</p>
                        <div className="lib-stats">
                            <div className="lib-stat"><p className="lib-stat-num">0</p><p className="lib-stat-label">별점</p></div>
                            <div className="lib-stat"><p className="lib-stat-num">0</p><p className="lib-stat-label">리뷰</p></div>
                            <div className="lib-stat"><p className="lib-stat-num">0</p><p className="lib-stat-label">댓글</p></div>
                        </div>
                        <Link href="/profile" style={{ width: '100%', textDecoration: 'none' }}>
                            <button className="lib-action-btn">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                프로필 선택
                            </button>
                        </Link>
                        <Link href="/membership" className="lib-member-banner">
                            <span style={{ fontSize: 28 }}>🐱</span>
                            <div>
                                <p className="lib-member-text"><span style={{ color: '#9d97ff' }}>멤버십</span> 시작하기</p>
                                <p className="lib-member-sub">한일 동시방영 신작부터 역대 인기애니까지 무제한</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* 오른쪽 보관함 */}
                <div className="lib-main">
                    <div className="lib-main-header">
                        <h1 className="lib-main-title">보관함</h1>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="lib-tabs">
                                {TABS.map(t => (
                                    <button key={t.id} className={`lib-tab${activeTab === t.id ? ' active' : ''}`}
                                        onClick={() => { setActiveTab(t.id); setSelectMode(false); setSelected(new Set()) }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="lib-tab-action">
                                {selectMode ? (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="lib-delete-btn" style={{ color: '#f87171' }} onClick={handleDelete}>
                                            삭제 ({selected.size})
                                        </button>
                                        <button className="lib-delete-btn" onClick={() => { setSelectMode(false); setSelected(new Set()) }}>
                                            취소
                                        </button>
                                    </div>
                                ) : (
                                    <button className="lib-delete-btn" onClick={() => setSelectMode(true)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
                                        </svg>
                                        삭제
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="lib-empty">
                            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    ) : tabItems.length === 0 ? (
                        <div className="lib-empty">
                            <img src={EMPTY_MSG[activeTab].icon} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                            <p>{EMPTY_MSG[activeTab].text}</p>
                        </div>
                    ) : (
                        <>
                            <p className="lib-count">작품 ({tabItems.length})</p>
                            <div className="lib-grid">
                                {tabItems.map(item => (
                                    <div key={item.id} className="lib-item"
                                        onClick={() => selectMode ? toggleSelect(item.id) : router.push(`/anime/${item.id}`)}>
                                        <div className="lib-item-poster">
                                            {item.poster
                                                ? <img src={item.poster.startsWith('http') ? item.poster : `${TMDB_IMG}${item.poster}`} alt={item.title} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎌</div>
                                            }
                                        </div>
                                        {selectMode && (
                                            <div className={`lib-item-check${selected.has(item.id) ? ' checked' : ''}`}>
                                                {selected.has(item.id) && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                                                )}
                                            </div>
                                        )}
                                        <p className="lib-item-title">{item.title}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
