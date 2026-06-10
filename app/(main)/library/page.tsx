'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore, WatchlistTab } from '@/store/useWatchlistStore'
import { usePreviewStore } from '@/store/usePreviewStore'
import { syncActivityCounts } from '@/store/useActiveStore'
import { doc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc, collectionGroup } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

const membershipConfig: Record<string, { label: string; color: string }> = {
    anime: { label: '애니 멤버십', color: '#6c63ff' },
    ost: { label: 'OST 멤버십', color: '#ec4899' },
    allinone: { label: '올인원 멤버십', color: '#f59e0b' },
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300'

// WatchlistTab 타입에 'reviews' | 'comments' 추가 필요
// useWatchlistStore.ts 에서: export type WatchlistTab = 'recent' | 'wishlist' | 'purchased' | 'reviews' | 'comments'
const TABS: { id: WatchlistTab; label: string }[] = [
    { id: 'recent', label: '최근 본' },
    { id: 'wishlist', label: '보고싶다' },
    { id: 'purchased', label: '구매한' },
    { id: 'reviews', label: '내 리뷰' },
    { id: 'comments', label: '내 댓글' },
]

const EMPTY_MSG: Record<WatchlistTab, { icon: string; text: string }> = {
    recent: { icon: '/images/laftel-icon/cry.png', text: '최근 본 작품이 아직 없어요.' },
    wishlist: { icon: '/images/laftel-icon/cry.png', text: '보고싶은 작품을 추가해보세요.' },
    purchased: { icon: '/images/laftel-icon/cry.png', text: '구매한 작품이 없어요.' },
    reviews: { icon: '/images/laftel-icon/cry.png', text: '작성한 리뷰가 아직 없어요.' },
    comments: { icon: '/images/laftel-icon/cry.png', text: '작성한 댓글이 아직 없어요.' },
}

interface ReviewItem {
    id: string
    animeId: number
    animeTitle?: string
    animePoster?: string | null
    score: number
    text: string
    spoiler: boolean
    createdAt: string
    uid: string
}

interface CommentItem {
    id: string
    eventId: number
    eventName?: string
    eventImg?: string | null
    authorId: string
    authorNickname: string
    content: string
    createdAt: any
    likeCount: number
    replyCount: number
}

interface AnimeCommentItem {
    id: string
    uid: string
    animeId: number
    animeTitle?: string
    animePoster?: string | null
    episodeNumber: number
    author: string
    avatar: string
    text: string
    createdAt: any
    likes: number
}

export default function LibraryPage() {
    const router = useRouter()
    const { user, avatarConfig } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const { items, loading, fetchWatchlist, removeItem } = useWatchlistStore()
    const [activeTab, setActiveTab] = useState<WatchlistTab>('recent')
    const [selectMode, setSelectMode] = useState(false)
    const [selected, setSelected] = useState<Set<number>>(new Set())

    const { setMembership } = useAuthStore()
    const { setPreviewId } = usePreviewStore()
    const [showMembershipMgmt, setShowMembershipMgmt] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    // 리뷰 / 댓글 / 카운트 상태
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [comments, setComments] = useState<CommentItem[]>([])
    const [animeComments, setAnimeComments] = useState<AnimeCommentItem[]>([])
    const [activityLoading, setActivityLoading] = useState(false)
    const [activityCount, setActivityCount] = useState({ rating: 0, review: 0, comment: 0 })

    const membership = user?.membership
    const memberInfo = membership && membership !== 'none' ? membershipConfig[membership] : null

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        if (user?.uid) {
            const profileId = user?.profileId || 'main'
            fetchWatchlist(user.uid, profileId)
            fetchActivity(user.uid)
        }
    }, [user, hydrated])

    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab')
        if (tab === 'recent' || tab === 'wishlist' || tab === 'purchased' || tab === 'reviews' || tab === 'comments') {
            setActiveTab(tab as WatchlistTab)
        }
    }, [])

    // 리뷰 + 댓글 fetch
    const fetchActivity = async (uid: string) => {
        setActivityLoading(true)

        // 1. 리뷰 fetch
        let reviewDocs: ReviewItem[] = []
        try {
            const reviewSnap = await getDocs(
                query(collection(db, 'reviews'), where('uid', '==', uid), orderBy('createdAt', 'desc'))
            )
            reviewDocs = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ReviewItem[]

            // animeTitle 또는 animePoster 없는 리뷰는 TMDB에서 가져오기
            const missingTitles = reviewDocs.filter(r => (!r.animeTitle || !r.animePoster) && r.animeId)
            if (missingTitles.length > 0) {
                const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
                const titleResults = await Promise.allSettled(
                    missingTitles.map(r =>
                        fetch(`https://api.themoviedb.org/3/tv/${r.animeId}?api_key=${TMDB_KEY}&language=ko-KR`)
                            .then(res => res.json())
                            .then(data => ({ animeId: r.animeId, title: data.name || '', poster: data.poster_path || null }))
                    )
                )
                const titleMap: Record<number, { title: string; poster: string | null }> = {}
                titleResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        titleMap[result.value.animeId] = { title: result.value.title, poster: result.value.poster }
                    }
                })
                reviewDocs = reviewDocs.map(r =>
                    (!r.animeTitle || !r.animePoster) && titleMap[r.animeId]
                        ? { ...r, animeTitle: r.animeTitle || titleMap[r.animeId].title, animePoster: r.animePoster || titleMap[r.animeId].poster }
                        : r
                )
            }
            setReviews(reviewDocs)
        } catch (e) {
            console.error('reviews fetch error:', e)
        }

        // 2. 이벤트 댓글 fetch (인덱스 없어도 동작하도록 orderBy 제거)
        let commentDocs: CommentItem[] = []
        try {
            const commentSnap = await getDocs(
                query(collectionGroup(db, 'event_comments'), where('authorId', '==', uid))
            )
            commentDocs = commentSnap.docs
                .map(d => {
                    const colId = d.ref.parent.id
                    const eventId = parseInt(colId.replace('event_comments_', '')) || 0
                    return { id: d.id, eventId, ...d.data() }
                })
                .sort((a: any, b: any) => {
                    const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)
                    const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)
                    return bt.getTime() - at.getTime()
                }) as CommentItem[]
            setComments(commentDocs)
        } catch (e) {
            console.error('event_comments fetch error (인덱스 필요):', e)
        }

        // 3. 애니 댓글 fetch — 단일 컬렉션이므로 collectionGroup 불필요
        let animeCommentDocs: AnimeCommentItem[] = []
        try {
            const animeCommentSnap = await getDocs(
                query(collection(db, 'anime_comments'), where('uid', '==', uid))
            )
            animeCommentDocs = animeCommentSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => {
                    const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)
                    const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)
                    return bt.getTime() - at.getTime()
                }) as AnimeCommentItem[]
            setAnimeComments(animeCommentDocs)
        } catch (e) {
            console.error('anime_comments fetch error:', e)
        }

        // 쿼리 실패한 항목은 기존 헤더 카운트 유지
        const { useActivityStore } = await import('@/store/useActiveStore')
        const existingCounts = useActivityStore.getState().counts

        const counts = {
            rating: reviewDocs.filter(r => r.score > 0).length,
            review: reviewDocs.length,
            // 댓글 쿼리 성공한 것만 반영, 둘 다 실패하면 기존 값 유지
            comment: (commentDocs.length + animeCommentDocs.length) > 0
                ? commentDocs.length + animeCommentDocs.length
                : existingCounts.comment,
        }
        setActivityCount(counts)
        syncActivityCounts(counts)
        setActivityLoading(false)
    }

    const tabItems = items.filter(i => i.tab === activeTab)
    const isActivityTab = activeTab === 'reviews' || activeTab === 'comments'
    const activityItems = activeTab === 'reviews' ? reviews : comments

    const handleDelete = async () => {
        if (!user || !user.uid || selected.size === 0) return
        const profileId = user?.profileId || 'main'
        for (const id of selected) {
            await removeItem(user.uid, profileId, id, activeTab)
        }
        setSelected(new Set())
        setSelectMode(false)
    }

    const handleDeleteActivity = async (item: ReviewItem | CommentItem, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('삭제할까요?')) return
        try {
            if (activeTab === 'reviews') {
                await deleteDoc(doc(db, 'reviews', item.id))
                setReviews(prev => prev.filter(r => r.id !== item.id))
                setActivityCount(prev => ({
                    ...prev,
                    review: prev.review - 1,
                    rating: (item as ReviewItem).score > 0 ? prev.rating - 1 : prev.rating,
                }))
            } else {
                // 댓글은 event_comments_{eventId}/{docId} 경로
                const eventId = (item as CommentItem).eventId
                await deleteDoc(doc(db, `event_comments_${eventId}`, item.id))
                setComments(prev => prev.filter(c => c.id !== item.id))
                setActivityCount(prev => ({ ...prev, comment: prev.comment - 1 }))
            }
        } catch (e) { console.error(e) }
    }

    const toggleSelect = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleCancelMembership = async () => {
        if (!user?.uid) return
        setCancelling(true)
        try {
            await setDoc(doc(db, 'users', user.uid), { membership: 'none' }, { merge: true })
            setMembership('none')
            setShowCancelConfirm(false)
            setShowMembershipMgmt(false)
        } catch (e) { console.error(e) }
        finally { setCancelling(false) }
    }

    const switchTab = (tab: WatchlistTab) => {
        setActiveTab(tab)
        setSelectMode(false)
        setSelected(new Set())
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56 }}>
            <style>{`
                .lib-wrap { max-width: 1820px; margin: 0 auto; padding: 32px 48px 60px; display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: start; min-height: calc(100vh - 56px); }

                .lib-profile-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 0; height: fit-content; }
                .lib-avatar { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; margin-bottom: 12px; background: var(--bg-secondary); }
                .lib-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .lib-username { font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px; }
                .lib-level { font-size: 12px; color: var(--text-subtle); margin: 0 0 16px; }
                .lib-stats { display: flex; gap: 24px; margin-bottom: 20px; width: 100%; justify-content: center; }
                .lib-stat { text-align: center; cursor: pointer; padding: 6px 8px; border-radius: 8px; transition: background .15s; }
                .lib-stat:hover { background: var(--border-faint); }
                .lib-stat-num { font-size: 18px; font-weight: 900; color: var(--text-primary); }
                .lib-stat-label { font-size: 11px; color: var(--text-subtle); }
                .lib-action-btn { width: 100%; padding: 11px; border-radius: 10px; border: 1px solid var(--border); background: var(--border-faint); color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all .2s; }
                .lib-action-btn:hover { background: var(--border-subtle); color: var(--text-primary); }

                .lib-main { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; min-height: calc(100vh - 140px); display: flex; flex-direction: column; }
                .lib-main-header { padding: 20px 24px 0; border-bottom: 1px solid var(--border-subtle); }
                .lib-main-title { font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 16px; }
                .lib-tabs { display: flex; gap: 0; }
                .lib-tab { padding: 10px 18px; font-size: 14px; font-weight: 600; color: var(--text-subtle); background: none; border: none; cursor: pointer; position: relative; transition: color .2s; white-space: nowrap; }
                .lib-tab:hover { color: var(--text-muted); }
                .lib-tab.active { color: var(--text-primary); }
                .lib-tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--main); border-radius: 1px; }
                .lib-tab-action { margin-left: auto; display: flex; align-items: center; }
                .lib-delete-btn { display: flex; align-items: center; gap: 5px; background: none; border: none; color: var(--text-subtle); font-size: 13px; cursor: pointer; padding: 8px 0; transition: color .2s; }
                .lib-delete-btn:hover { color: #f87171; }

                .lib-grid { padding: 20px 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; align-content: start; }
                .lib-item { position: relative; cursor: pointer; }
                .lib-item-poster { width: 100%; aspect-ratio: 2/3; border-radius: 10px; overflow: hidden; background: var(--bg-secondary); transition: transform .2s; }
                .lib-item:hover .lib-item-poster { transform: translateY(-3px); }
                .lib-item-poster img { width: 100%; height: 100%; object-fit: cover; }
                .lib-item-title { font-size: 12px; color: var(--text-muted); margin: 6px 0 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .lib-item-check { position: absolute; top: 6px; left: 6px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; transition: all .2s; }
                .lib-item-check.checked { background: var(--main); border-color: var(--main); }

                .lib-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 12px; flex: 1; }
                .lib-empty img { width: 80px; height: 80px; object-fit: contain; opacity: .5; filter: grayscale(1); flex-shrink: 0; }
                .lib-empty p { font-size: 14px; color: var(--text-subtle); margin: 0; }

                .lib-count { font-size: 13px; color: var(--text-faint); padding: 0 24px 12px; }

                /* 리뷰 / 댓글 리스트 */
                .lib-activity-list { padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; }
                .lib-activity-item { display: flex; gap: 14px; padding: 14px 16px; background: var(--bg-secondary); border-radius: 12px; cursor: pointer; border: 1px solid var(--border-subtle); transition: background .15s; position: relative; }
                .lib-activity-item:hover { background: var(--bg-hover); }
                .lib-activity-poster { width: 48px; height: 68px; border-radius: 7px; object-fit: cover; flex-shrink: 0; background: var(--bg-card); }
                .lib-activity-poster-placeholder { width: 48px; height: 68px; border-radius: 7px; flex-shrink: 0; background: var(--border-faint); display: flex; align-items: center; justify-content: center; font-size: 22px; }
                .lib-activity-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 5px; }
                .lib-activity-anime { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0; }
                .lib-activity-score { font-size: 13px; color: #f59e0b; margin: 0; letter-spacing: 1px; }
                .lib-activity-text { font-size: 13px; color: var(--text-muted); margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5; }
                .lib-activity-meta { font-size: 11px; color: var(--text-faint); margin: 0; }
                .lib-activity-del { background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 4px; border-radius: 6px; transition: color .15s; flex-shrink: 0; align-self: flex-start; }
                .lib-activity-del:hover { color: #f87171; }
                .lib-spoiler-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(239,68,68,.12); color: #ef4444; margin-left: 6px; }
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
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main)' }}>
                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                            }
                        </div>
                        <p className="lib-username">{user?.name || user?.email?.split('@')[0]}</p>
                        <p className="lib-level">😊 Lv.0 베이비</p>

                        {/* 클릭하면 해당 탭으로 이동 */}
                        <div className="lib-stats">
                            <div className="lib-stat" onClick={() => switchTab('reviews')} title="별점 보기">
                                <p className="lib-stat-num">{activityCount.rating}</p>
                                <p className="lib-stat-label">별점</p>
                            </div>
                            <div className="lib-stat" onClick={() => switchTab('reviews')} title="리뷰 보기">
                                <p className="lib-stat-num">{activityCount.review}</p>
                                <p className="lib-stat-label">리뷰</p>
                            </div>
                            <div className="lib-stat" onClick={() => switchTab('comments')} title="댓글 보기">
                                <p className="lib-stat-num">{activityCount.comment}</p>
                                <p className="lib-stat-label">댓글</p>
                            </div>
                        </div>

                        <Link href="/profile" style={{ width: '100%', textDecoration: 'none' }}>
                            <button className="lib-action-btn">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                프로필 선택
                            </button>
                        </Link>

                        {memberInfo && (
                            <>
                                <button
                                    onClick={() => setShowMembershipMgmt(true)}
                                    style={{ width: '100%', marginTop: 8, padding: '8px', borderRadius: 8, border: `1px solid ${memberInfo.color}40`, background: `${memberInfo.color}10`, color: memberInfo.color, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                    {memberInfo.label} 관리
                                </button>

                                {showMembershipMgmt && (
                                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60" onClick={() => setShowMembershipMgmt(false)}>
                                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 w-[320px] border border-[var(--border)] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                                            <div>
                                                <p className="text-[var(--text-primary)] font-bold text-base mb-1">멤버십 관리</p>
                                                <p className="text-[var(--text-subtle)] text-xs">현재 <span style={{ color: memberInfo.color, fontWeight: 700 }}>{memberInfo.label}</span> 이용 중이에요</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button onClick={() => { setShowMembershipMgmt(false); router.push('/membership') }} className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90" style={{ background: memberInfo.color }}>요금제 변경하기</button>
                                                <button onClick={() => { setShowMembershipMgmt(false); setShowCancelConfirm(true) }} className="w-full py-3 rounded-xl font-bold text-sm border border-[var(--border)] text-[var(--text-subtle)] hover:text-red-400 hover:border-red-400/40 transition-colors">멤버십 취소</button>
                                                <button onClick={() => setShowMembershipMgmt(false)} className="w-full py-2 text-xs text-[var(--text-faint)] hover:text-[var(--text-subtle)] transition-colors">닫기</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showCancelConfirm && (
                                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60" onClick={() => setShowCancelConfirm(false)}>
                                        <div className="bg-[var(--bg-card)] rounded-2xl p-6 w-[320px] border border-[var(--border)] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                                            <div>
                                                <p className="text-[var(--text-primary)] font-bold text-base mb-1">멤버십을 취소할까요?</p>
                                                <p className="text-[var(--text-subtle)] text-sm leading-relaxed">취소하면 이번 달 종료 후 멤버십 혜택이 사라져요. 정말 취소하시겠어요?</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-bold hover:text-[var(--text-primary)] transition-colors">유지하기</button>
                                                <button onClick={handleCancelMembership} disabled={cancelling} className="flex-1 py-3 rounded-xl bg-red-500/80 text-white text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50">{cancelling ? '처리 중...' : '취소하기'}</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 오른쪽 보관함 */}
                <div className="lib-main">
                    <div className="lib-main-header">
                        <h1 className="lib-main-title">보관함</h1>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="lib-tabs">
                                {TABS.map(t => (
                                    <button key={t.id} className={`lib-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => switchTab(t.id)}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            {/* 기존 보관함 탭에서만 삭제 버튼 표시 */}
                            {!isActivityTab && (
                                <div className="lib-tab-action">
                                    {selectMode ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="lib-delete-btn" style={{ color: '#f87171' }} onClick={handleDelete}>삭제 ({selected.size})</button>
                                            <button className="lib-delete-btn" onClick={() => { setSelectMode(false); setSelected(new Set()) }}>취소</button>
                                        </div>
                                    ) : (
                                        <button className="lib-delete-btn" onClick={() => setSelectMode(true)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></svg>
                                            삭제
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 리뷰 / 댓글 탭 */}
                    {isActivityTab ? (
                        activityLoading ? (
                            <div className="lib-empty">
                                <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--main)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                            </div>
                        ) : activityItems.length === 0 && (activeTab !== 'comments' || animeComments.length === 0) ? (
                            <div className="lib-empty">
                                <img src={EMPTY_MSG[activeTab].icon} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                                <p>{EMPTY_MSG[activeTab].text}</p>
                            </div>
                        ) : (
                            <>
                                <p className="lib-count">
                                    {activeTab === 'reviews'
                                        ? `리뷰 (${reviews.length})`
                                        : `댓글 (${comments.length + animeComments.length})`
                                    }
                                </p>
                                <div className="lib-activity-list">
                                    {activeTab === 'reviews' && reviews.map(item => (
                                        <div key={item.id} className="lib-activity-item" onClick={() => setPreviewId(item.animeId)}>
                                            {item.animePoster
                                                ? <img src={`${TMDB_IMG}${item.animePoster}`} alt={item.animeTitle} className="lib-activity-poster" />
                                                : <div className="lib-activity-poster-placeholder">🎌</div>
                                            }
                                            <div className="lib-activity-body">
                                                <p className="lib-activity-anime">
                                                    {item.animeTitle || `애니 #${item.animeId}`}
                                                    {item.spoiler && <span className="lib-spoiler-badge">스포</span>}
                                                </p>
                                                {item.score > 0 && (
                                                    <p className="lib-activity-score" style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {[1, 2, 3, 4, 5].map(s => {
                                                            const full = item.score >= s
                                                            const half = !full && item.score >= s - 0.5
                                                            return (
                                                                <span key={s} style={{ position: 'relative', display: 'inline-block', width: 14, height: 14 }}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--border)" stroke="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                                                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                                    </svg>
                                                                    {(full || half) && (
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"
                                                                            style={{ position: 'absolute', top: 0, left: 0, clipPath: half ? 'inset(0 50% 0 0)' : 'none' }}>
                                                                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                                        </svg>
                                                                    )}
                                                                </span>
                                                            )
                                                        })}
                                                        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{item.score.toFixed(1)}점</span>
                                                    </p>
                                                )}
                                                <p className="lib-activity-text">{item.text}</p>
                                                <p className="lib-activity-meta">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : ''}
                                                </p>
                                            </div>
                                            <button className="lib-activity-del" onClick={e => handleDeleteActivity(item, e)} title="삭제">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></svg>
                                            </button>
                                        </div>
                                    ))}

                                    {activeTab === 'comments' && (
                                        <>
                                            {/* 애니 에피소드 댓글 */}
                                            {animeComments.map(item => (
                                                <div key={item.id} className="lib-activity-item"
                                                    onClick={() => router.push(`/anime/${item.animeId}?ep=${item.episodeNumber}`)}>
                                                    {item.animePoster
                                                        ? <img src={`${TMDB_IMG}${item.animePoster}`} alt={item.animeTitle} className="lib-activity-poster" />
                                                        : <div className="lib-activity-poster-placeholder">🎌</div>
                                                    }
                                                    <div className="lib-activity-body">
                                                        <p className="lib-activity-anime">
                                                            {item.animeTitle || `애니 #${item.animeId}`}
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#6c63ff', marginLeft: 6, background: 'rgba(108,99,255,.12)', padding: '1px 6px', borderRadius: 4 }}>
                                                                {item.episodeNumber}화
                                                            </span>
                                                        </p>
                                                        <p className="lib-activity-text">{item.text}</p>
                                                        <p className="lib-activity-meta">
                                                            {item.likes > 0 && `좋아요 ${item.likes} · `}
                                                            {item.createdAt?.toDate
                                                                ? item.createdAt.toDate().toLocaleDateString('ko-KR')
                                                                : item.createdAt
                                                                    ? new Date(item.createdAt).toLocaleDateString('ko-KR')
                                                                    : ''}
                                                        </p>
                                                    </div>
                                                    <button className="lib-activity-del"
                                                        onClick={async e => {
                                                            e.stopPropagation()
                                                            if (!confirm('삭제할까요?')) return
                                                            const { deleteDoc, doc } = await import('firebase/firestore')
                                                            await deleteDoc(doc(db, 'anime_comments', item.id))
                                                            setAnimeComments(prev => prev.filter(c => c.id !== item.id))
                                                            setActivityCount(prev => ({ ...prev, comment: prev.comment - 1 }))
                                                        }} title="삭제">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {/* 이벤트 댓글 */}
                                            {comments.map(item => (
                                                <div key={item.id} className="lib-activity-item" onClick={() => router.push(`/event/${item.eventId}`)}>
                                                    {item.eventImg
                                                        ? <img src={item.eventImg} alt={item.eventName} className="lib-activity-poster" />
                                                        : <div className="lib-activity-poster-placeholder">🎪</div>
                                                    }
                                                    <div className="lib-activity-body">
                                                        <p className="lib-activity-anime">{item.eventName || `이벤트 #${item.eventId}`}</p>
                                                        <p className="lib-activity-text">{item.content}</p>
                                                        <p className="lib-activity-meta">
                                                            {item.likeCount > 0 && `좋아요 ${item.likeCount} · `}
                                                            {item.replyCount > 0 && `답글 ${item.replyCount} · `}
                                                            {item.createdAt?.toDate
                                                                ? item.createdAt.toDate().toLocaleDateString('ko-KR')
                                                                : item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : ''}
                                                        </p>
                                                    </div>
                                                    <button className="lib-activity-del" onClick={e => handleDeleteActivity(item, e)} title="삭제">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        )
                    ) : (
                        /* 기존 보관함 탭 */
                        loading ? (
                            <div className="lib-empty">
                                <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--main)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
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
                                        <div key={item.id} className="lib-item" onClick={() => selectMode ? toggleSelect(item.id) : router.push(`/anime/${item.id}`)}>
                                            <div className="lib-item-poster">
                                                {item.poster
                                                    ? <img src={item.poster.startsWith('http') ? item.poster : `${TMDB_IMG}${item.poster}`} alt={item.title} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎌</div>
                                                }
                                            </div>
                                            {selectMode && (
                                                <div className={`lib-item-check${selected.has(item.id) ? ' checked' : ''}`}>
                                                    {selected.has(item.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>}
                                                </div>
                                            )}
                                            <p className="lib-item-title">{item.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}