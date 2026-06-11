'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore, WatchlistTab, WatchlistItem } from '@/store/useWatchlistStore'
import { useWatchProgressStore } from '@/store/useWatchProgressStore'
import { usePreviewStore } from '@/store/usePreviewStore'
import { syncActivityCounts } from '@/store/useActiveStore'
import { doc, setDoc, collection, getDocs, orderBy, query, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

const membershipConfig: Record<string, { label: string; color: string }> = {
    anime: { label: '애니 멤버십', color: '#6c63ff' },
    ost: { label: 'OST 멤버십', color: '#ec4899' },
    allinone: { label: '올인원 멤버십', color: '#f59e0b' },
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300'

const TABS: { id: WatchlistTab; label: string }[] = [
    { id: 'recent', label: '최근 본' },
    { id: 'wishlist', label: '보고싶다' },
    { id: 'purchased', label: '구매한' },
    { id: 'reviews', label: '내 리뷰' },
    { id: 'comments', label: '내 댓글' },
]

const EMPTY_MSG: Record<string, { icon: string; text: string }> = {
    recent: { icon: '/images/laftel-icon/cry.png', text: '최근 본 작품이 아직 없어요.' },
    wishlist: { icon: '/images/laftel-icon/cry.png', text: '보고싶은 작품을 추가해보세요.' },
    purchased: { icon: '/images/laftel-icon/cry.png', text: '구매한 에피소드가 없어요.' },
    reviews: { icon: '/images/laftel-icon/cry.png', text: '작성한 리뷰가 아직 없어요.' },
    comments: { icon: '/images/laftel-icon/cry.png', text: '작성한 댓글이 아직 없어요.' },
}

interface ReviewItem {
    id: string; animeId: number; animeTitle?: string; animePoster?: string | null
    score: number; text: string; spoiler: boolean; createdAt: string; uid: string
}
interface CommentItem {
    id: string; eventId: number; eventName?: string; eventImg?: string | null
    authorId: string; authorNickname: string; content: string; createdAt: any
    likeCount: number; replyCount: number
}
interface AnimeCommentItem {
    id: string; uid: string; animeId: number; animeTitle?: string; animePoster?: string | null
    episodeNumber: number; author: string; avatar: string; text: string; createdAt: any; likes: number
}

// 구매 탭용: 애니별로 그룹핑된 타입
interface PurchasedAnimeGroup {
    animeId: number
    title: string
    poster: string
    episodes: WatchlistItem[]
}

export default function LibraryPage() {
    const router = useRouter()
    const { user, avatarConfig, setMembership } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)
    const { items, loading: wlLoading, fetchWatchlist, removeItem } = useWatchlistStore()
    const { items: progressItems, loading: wpLoading, fetchProgress } = useWatchProgressStore()
    const [activeTab, setActiveTab] = useState<WatchlistTab>('recent')
    const [selectMode, setSelectMode] = useState(false)
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const { setPreviewId } = usePreviewStore()
    const [showMembershipMgmt, setShowMembershipMgmt] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [animeComments, setAnimeComments] = useState<AnimeCommentItem[]>([])
    const [activityLoading, setActivityLoading] = useState(false)
    const [activityCount, setActivityCount] = useState({ rating: 0, review: 0, comment: 0 })

    // 구매 탭: 펼쳐진 애니 id
    const [expandedAnimeId, setExpandedAnimeId] = useState<number | null>(null)

    const membership = user?.membership
    const memberInfo = membership && membership !== 'none' ? membershipConfig[membership] : null
    const profileId = user?.currentProfileId || user?.profileId || 'main'

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (!hydrated || !user?.uid) return
        if (!user) { router.push('/login'); return }
        fetchWatchlist(user.uid, profileId)
        fetchProgress(user.uid, profileId)
        fetchActivity(user.uid, profileId)
    }, [user?.uid, profileId, hydrated])

    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab')
        if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab as WatchlistTab)
    }, [])

    const fetchActivity = async (uid: string, profileId: string) => {
        setActivityLoading(true)
        let reviewDocs: ReviewItem[] = []
        try {
            const snap = await getDocs(query(
                collection(db, 'users', uid, 'profiles', profileId, 'reviews'),
                orderBy('createdAt', 'desc')
            ))
            reviewDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ReviewItem[]
            const missing = reviewDocs.filter(r => (!r.animeTitle || !r.animePoster) && r.animeId)
            if (missing.length > 0) {
                const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
                const results = await Promise.allSettled(
                    missing.map(r => fetch(`https://api.themoviedb.org/3/tv/${r.animeId}?api_key=${TMDB_KEY}&language=ko-KR`)
                        .then(res => res.json()).then(d => ({ animeId: r.animeId, title: d.name || '', poster: d.poster_path || null })))
                )
                const map: Record<number, { title: string; poster: string | null }> = {}
                results.forEach(r => { if (r.status === 'fulfilled') map[r.value.animeId] = { title: r.value.title, poster: r.value.poster } })
                reviewDocs = reviewDocs.map(r => (!r.animeTitle || !r.animePoster) && map[r.animeId]
                    ? { ...r, animeTitle: r.animeTitle || map[r.animeId].title, animePoster: r.animePoster || map[r.animeId].poster } : r)
            }
            setReviews(reviewDocs)
        } catch (e) { console.error('reviews fetch error:', e) }

        let animeCommentDocs: AnimeCommentItem[] = []
        try {
            const snap = await getDocs(
                collection(db, 'users', uid, 'profiles', profileId, 'anime_comments')
            )
            animeCommentDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a: any, b: any) => {
                    const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0)
                    const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0)
                    return bt.getTime() - at.getTime()
                }) as AnimeCommentItem[]
            setAnimeComments(animeCommentDocs)
        } catch (e) { console.error('anime_comments fetch error:', e) }

        const { useActivityStore } = await import('@/store/useActiveStore')
        const counts = {
            rating: reviewDocs.filter(r => r.score > 0).length,
            review: reviewDocs.length,
            comment: animeCommentDocs.length,
        }
        setActivityCount(counts)
        syncActivityCounts(counts)
        setActivityLoading(false)
    }

    const isActivityTab = activeTab === 'reviews' || activeTab === 'comments'
    const loading = wlLoading || wpLoading

    const tabItems = activeTab === 'recent'
        ? progressItems.map(p => ({ id: p.tmdbId, title: p.title, poster: p.poster || p.backdrop, addedAt: p.updatedAt, tab: 'recent' as const, episode: p.episode, episodeTitle: p.episodeTitle, progress: p.progress }))
        : items.filter(i => i.tab === activeTab)

    // 구매 탭: 애니별 그룹핑
    const purchasedGroups: PurchasedAnimeGroup[] = (() => {
        const grouped = new Map<number, PurchasedAnimeGroup>()
        items.filter(i => i.tab === 'purchased').forEach(item => {
            if (!grouped.has(item.id)) {
                grouped.set(item.id, { animeId: item.id, title: item.title, poster: item.poster, episodes: [] })
            }
            grouped.get(item.id)!.episodes.push(item)
        })
        grouped.forEach(g => g.episodes.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)))
        return Array.from(grouped.values())
    })()

    const handleDelete = async () => {
        if (!user?.uid || selected.size === 0) return
        for (const id of selected) {
            if (activeTab !== 'recent') await removeItem(user.uid, id, activeTab as WatchlistTab, profileId)
        }
        setSelected(new Set()); setSelectMode(false)
    }

    const handleDeleteActivity = async (item: ReviewItem | AnimeCommentItem, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('삭제할까요?')) return
        try {
            if (activeTab === 'reviews') {
                await deleteDoc(doc(db, 'users', user!.uid!, 'profiles', profileId, 'reviews', item.id))
                setReviews(prev => prev.filter(r => r.id !== item.id))
                setActivityCount(prev => ({ ...prev, review: prev.review - 1, rating: (item as ReviewItem).score > 0 ? prev.rating - 1 : prev.rating }))
            } else {
                await deleteDoc(doc(db, 'users', user!.uid!, 'profiles', profileId, 'anime_comments', item.id))
                setAnimeComments(prev => prev.filter(c => c.id !== item.id))
                setActivityCount(prev => ({ ...prev, comment: prev.comment - 1 }))
            }
        } catch (e) { console.error(e) }
    }

    const toggleSelect = (id: number) => {
        setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
    }

    const handleCancelMembership = async () => {
        if (!user?.uid) return
        setCancelling(true)
        try {
            await setDoc(doc(db, 'users', user.uid), { membership: 'none' }, { merge: true })
            setMembership('none'); setShowCancelConfirm(false); setShowMembershipMgmt(false)
        } catch (e) { console.error(e) }
        finally { setCancelling(false) }
    }

    const switchTab = (tab: WatchlistTab) => { setActiveTab(tab); setSelectMode(false); setSelected(new Set()) }

    const formatExpiry = (ts: number | null | undefined) => {
        if (!ts) return null
        const diff = ts - Date.now()
        if (diff <= 0) return '만료됨'
        const days = Math.floor(diff / 86400000)
        const hours = Math.floor((diff % 86400000) / 3600000)
        if (days > 0) return `${days}일 후 만료`
        return `${hours}시간 후 만료`
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56 }}>
            <style>{`
                /* ── BASE (Desktop 1024px+) ── */
                .lib-wrap {
                    max-width: 1820px;
                    margin: 0 auto;
                    padding: 32px 48px 60px;
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 24px;
                    align-items: start;
                    align-content: start;
                    grid-auto-rows: max-content;
                    min-height: calc(100vh - 56px);
                }
                .lib-profile-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                    padding: 28px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0;
                    height: fit-content;
                }
                /* 태블릿/모바일에서 사이드바 숨김 */
                .lib-sidebar { display: contents; }

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

                /* ── 모바일 프로필 상단 바 (기본 숨김) ── */
                .lib-mobile-profile {
                    display: none;
                }

                .lib-main { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; min-height: calc(100vh - 140px); display: flex; flex-direction: column; }
                .lib-main-header { padding: 20px 24px 0; border-bottom: 1px solid var(--border-subtle); }
                .lib-main-title { font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 16px; }
                .lib-tabs { display: flex; gap: 0; }
                .lib-tab { padding: 10px 18px; font-size: 14px; font-weight: 600; color: var(--text-subtle); background: none; border: none; cursor: pointer; position: relative; transition: color .2s; white-space: nowrap; }
                .lib-tab:hover { color: var(--text-muted); }
                .lib-tab.active { color: var(--text-primary); }
                .lib-tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--main); border-radius: 1px; }
                .lib-tab-action { margin-left: auto; display: flex; align-items: center; }
                .lib-delete-btn { display: flex; align-items: center; gap: 5px; background: none; border: none; color: var(--text-subtle); font-size: 13px; cursor: pointer; padding: 8px 0; transition: color .2s; white-space: nowrap; flex-shrink: 0; }
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
                .lib-count { font-size: 13px; color: var(--text-faint); padding: 10px 24px 12px; }
                .lib-recent-card { display: flex; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--border-faint); cursor: pointer; transition: background .15s; }
                .lib-recent-card:hover { background: var(--bg-hover); }
                .lib-recent-thumb { width: 80px; height: 52px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--bg-secondary); }
                .lib-recent-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .lib-recent-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
                .lib-recent-title { font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .lib-recent-ep { font-size: 12px; color: var(--text-subtle); }
                .lib-recent-bar { height: 3px; background: var(--border-faint); border-radius: 2px; margin-top: 4px; overflow: hidden; }
                .lib-recent-bar-fill { height: 100%; background: var(--main); border-radius: 2px; }
                .lib-activity-list { padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; }
                .lib-activity-item { display: flex; gap: 14px; padding: 14px 16px; background: var(--bg-secondary); border-radius: 12px; cursor: pointer; border: 1px solid var(--border-subtle); transition: background .15s; position: relative; }
                .lib-activity-item:hover { background: var(--bg-hover); }
                .lib-activity-poster { width: 48px; height: 68px; border-radius: 7px; object-fit: cover; flex-shrink: 0; background: var(--bg-card); }
                .lib-activity-poster-placeholder { width: 48px; height: 68px; border-radius: 7px; flex-shrink: 0; background: var(--border-faint); display: flex; align-items: center; justify-content: center; font-size: 22px; }
                .lib-activity-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 5px; }
                .lib-activity-anime { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0; }
                .lib-activity-text { font-size: 13px; color: var(--text-muted); margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5; }
                .lib-activity-meta { font-size: 11px; color: var(--text-faint); margin: 0; }
                .lib-activity-del { background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 4px; border-radius: 6px; transition: color .15s; flex-shrink: 0; align-self: flex-start; }
                .lib-activity-del:hover { color: #f87171; }
                .lib-spoiler-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(239,68,68,.12); color: #ef4444; margin-left: 6px; }
                @keyframes spin { to { transform: rotate(360deg) } }

                /* ── TABLET (768px ~ 1023px) ── */
                @media (max-width: 1023px) {
                    .lib-wrap {
                        grid-template-columns: 1fr;
                        padding: 20px 24px 48px;
                        gap: 16px;
                        align-content: start;
                        grid-auto-rows: max-content;
                    }
                    /* 사이드 프로필 카드 숨기고 */
                    .lib-sidebar {
                        display: none;
                    }
                    /* 인라인 프로필 바 표시 */
                    .lib-mobile-profile {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        background: var(--bg-card);
                        border: 1px solid var(--border-subtle);
                        border-radius: 14px;
                        padding: 14px 18px;
                    }
                    .lib-mobile-avatar {
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        overflow: hidden;
                        flex-shrink: 0;
                        background: var(--bg-secondary);
                    }
                    .lib-mobile-avatar img { width: 100%; height: 100%; object-fit: cover; }
                    .lib-mobile-info { flex: 1; min-width: 0; }
                    .lib-mobile-name { font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px; }
                    .lib-mobile-level { font-size: 11px; color: var(--text-subtle); margin: 0; }
                    .lib-mobile-stats {
                        display: flex;
                        gap: 16px;
                        flex-shrink: 0;
                    }
                    .lib-mobile-stat { text-align: center; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: background .15s; }
                    .lib-mobile-stat:hover { background: var(--border-faint); }
                    .lib-mobile-stat-num { font-size: 15px; font-weight: 900; color: var(--text-primary); }
                    .lib-mobile-stat-label { font-size: 10px; color: var(--text-subtle); }
                    .lib-mobile-profile-link {
                        flex-shrink: 0;
                        width: 34px; height: 34px;
                        border-radius: 8px;
                        border: 1px solid var(--border);
                        background: var(--border-faint);
                        display: flex; align-items: center; justify-content: center;
                        color: var(--text-muted);
                        text-decoration: none;
                        transition: all .2s;
                    }
                    .lib-mobile-profile-link:hover { background: var(--border-subtle); color: var(--text-primary); }

                    .lib-main {
                        min-height: 60vh;
                    }
                    .lib-grid {
                        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                        gap: 12px;
                        padding: 16px 20px;
                    }
                    .lib-main-header { padding: 16px 20px 0; }
                    .lib-count { padding: 0 20px 10px; }
                    .lib-activity-list { padding: 12px 20px; }
                    .lib-recent-card { padding: 10px 20px; }
                }

                /* ── MOBILE (~ 767px) ── */
                @media (max-width: 767px) {
                    .lib-wrap {
                        padding: 12px 12px 60px;
                        gap: 12px;
                        align-content: start;
                        grid-auto-rows: max-content;
                    }
                    .lib-mobile-profile {
                        padding: 12px 14px;
                        gap: 10px;
                        border-radius: 12px;
                    }
                    .lib-mobile-avatar { width: 40px; height: 40px; }
                    .lib-mobile-name { font-size: 13px; }
                    .lib-mobile-stats { gap: 10px; }
                    .lib-mobile-stat-num { font-size: 14px; }

                    .lib-main { border-radius: 12px; min-height: 50vh; }
                    .lib-main-header { padding: 14px 14px 0; }
                    .lib-main-title { font-size: 15px; margin-bottom: 12px; }

                    /* 탭 가로 스크롤 */
                    .lib-tabs {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    .lib-tabs::-webkit-scrollbar { display: none; }
                    .lib-tab { padding: 8px 12px; font-size: 13px; }

                    .lib-grid {
                        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                        gap: 10px;
                        padding: 12px 14px;
                    }
                    .lib-item-title { font-size: 11px; }

                    .lib-recent-card { padding: 10px 14px; gap: 10px; }
                    .lib-recent-thumb { width: 68px; height: 44px; }
                    .lib-recent-title { font-size: 12px; }
                    .lib-recent-ep { font-size: 11px; }

                    .lib-activity-list { padding: 10px 14px; gap: 8px; }
                    .lib-activity-item { padding: 12px 12px; gap: 10px; }
                    .lib-activity-poster { width: 40px; height: 56px; border-radius: 6px; }
                    .lib-activity-poster-placeholder { width: 40px; height: 56px; font-size: 18px; }
                    .lib-activity-anime { font-size: 12px; }
                    .lib-activity-text { font-size: 12px; }

                    .lib-count { padding: 0 14px 8px; font-size: 12px; }
                    .lib-empty { padding: 40px 16px; }

                    .lib-delete-btn { font-size: 12px; }

                    /* 구매 탭 모바일 */
                    .lib-purchased-wrap { padding: 12px 14px; }
                }

                /* ── SMALL MOBILE (~ 480px) ── */
                @media (max-width: 480px) {
                    .lib-wrap { padding: 8px 8px 60px; gap: 8px; }
                    .lib-mobile-profile { padding: 10px; gap: 8px; }
                    .lib-mobile-info { max-width: 92px; }
                    .lib-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px 10px; }
                    .lib-mobile-stats { gap: 8px; }
                    .lib-mobile-stat { padding: 3px 4px; }
                }
            `}</style>

            <div className="lib-wrap">

                {/* ── 사이드바 (데스크탑만) ── */}
                <div className="lib-sidebar">
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
                        <div className="lib-stats">
                            <div className="lib-stat" onClick={() => switchTab('reviews')}>
                                <p className="lib-stat-num">{activityCount.rating}</p>
                                <p className="lib-stat-label">별점</p>
                            </div>
                            <div className="lib-stat" onClick={() => switchTab('reviews')}>
                                <p className="lib-stat-num">{activityCount.review}</p>
                                <p className="lib-stat-label">리뷰</p>
                            </div>
                            <div className="lib-stat" onClick={() => switchTab('comments')}>
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
                                <button onClick={() => setShowMembershipMgmt(true)}
                                    style={{ width: '100%', marginTop: 8, padding: '8px', borderRadius: 8, border: `1px solid ${memberInfo.color}40`, background: `${memberInfo.color}10`, color: memberInfo.color, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                    {memberInfo.label} 관리
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── 태블릿/모바일 인라인 프로필 바 ── */}
                <div className="lib-mobile-profile">
                    <div className="lib-mobile-avatar">
                        {avatarConfig?.svgDataUrl
                            ? <img src={avatarConfig.svgDataUrl} alt="프로필" />
                            : user?.photoURL
                                ? <img src={user.photoURL} alt="프로필" />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main)', borderRadius: '50%' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </div>
                        }
                    </div>
                    <div className="lib-mobile-info">
                        <p className="lib-mobile-name">{user?.name || user?.email?.split('@')[0]}</p>
                        <p className="lib-mobile-level">😊 Lv.0 베이비</p>
                    </div>
                    <div className="lib-mobile-stats">
                        <div className="lib-mobile-stat" onClick={() => switchTab('reviews')}>
                            <p className="lib-mobile-stat-num">{activityCount.rating}</p>
                            <p className="lib-mobile-stat-label">별점</p>
                        </div>
                        <div className="lib-mobile-stat" onClick={() => switchTab('reviews')}>
                            <p className="lib-mobile-stat-num">{activityCount.review}</p>
                            <p className="lib-mobile-stat-label">리뷰</p>
                        </div>
                        <div className="lib-mobile-stat" onClick={() => switchTab('comments')}>
                            <p className="lib-mobile-stat-num">{activityCount.comment}</p>
                            <p className="lib-mobile-stat-label">댓글</p>
                        </div>
                    </div>
                    <Link href="/profile" className="lib-mobile-profile-link" title="프로필 선택">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </Link>
                </div>

                {/* ── 오른쪽 보관함 ── */}
                <div className="lib-main">
                    <div className="lib-main-header">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <h1 className="lib-main-title" style={{ margin: 0 }}>보관함</h1>
                            {user?.name && (
                                <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    {user.name}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="lib-tabs">
                                {TABS.map(t => (
                                    <button key={t.id} className={`lib-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => switchTab(t.id)}>{t.label}</button>
                                ))}
                            </div>
                            {!isActivityTab && activeTab !== 'recent' && activeTab !== 'purchased' && (
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

                    {/* ── 구매한 탭 ── */}
                    {activeTab === 'purchased' ? (
                        loading ? (
                            <div className="lib-empty">
                                <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--main)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                            </div>
                        ) : purchasedGroups.length === 0 ? (
                            <div className="lib-empty">
                                <img src={EMPTY_MSG.purchased.icon} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                                <p>{EMPTY_MSG.purchased.text}</p>
                            </div>
                        ) : (
                            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <p className="lib-count" style={{ padding: 0, marginBottom: 4 }}>
                                    작품 {purchasedGroups.length}개 · 총 {items.filter(i => i.tab === 'purchased').length}화
                                </p>
                                {purchasedGroups.map(group => {
                                    const isExpanded = expandedAnimeId === group.animeId
                                    const now = Date.now()
                                    const activeEps = group.episodes.filter(ep =>
                                        ep.purchaseType === 'own' || (ep.rentExpiry ? ep.rentExpiry > now : false)
                                    )
                                    const expiredEps = group.episodes.filter(ep =>
                                        ep.purchaseType === 'rent' && ep.rentExpiry && ep.rentExpiry <= now
                                    )

                                    return (
                                        <div key={group.animeId}
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 14,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
                                                onClick={() => setExpandedAnimeId(isExpanded ? null : group.animeId)}
                                            >
                                                <div style={{ width: 48, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card)' }}>
                                                    {group.poster
                                                        ? <img src={group.poster.startsWith('http') ? group.poster : `${TMDB_IMG}${group.poster}`} alt={group.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎌</div>
                                                    }
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                        {group.title}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>총 {group.episodes.length}화 구매</span>
                                                        {activeEps.length > 0 && (
                                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(108,99,255,.12)', color: '#9d97ff' }}>
                                                                시청 가능 {activeEps.length}화
                                                            </span>
                                                        )}
                                                        {expiredEps.length > 0 && (
                                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(239,68,68,.1)', color: '#f87171' }}>
                                                                만료 {expiredEps.length}화
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                    {activeEps.length > 0 && (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation()
                                                                const firstEp = activeEps[0].episodeNumber
                                                                router.push(`/anime/${group.animeId}?ep=${firstEp}`)
                                                            }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 5,
                                                                padding: '6px 12px', borderRadius: 8, border: 'none',
                                                                background: 'var(--main)', color: 'white',
                                                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                            }}
                                                        >
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                                            재생
                                                        </button>
                                                    )}
                                                    <svg
                                                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                        stroke="var(--text-faint)" strokeWidth="2"
                                                        style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                                                    >
                                                        <path d="m6 9 6 6 6-6" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                                    {group.episodes.map(ep => {
                                                        const isOwn = ep.purchaseType === 'own'
                                                        const isActive = isOwn || (ep.rentExpiry ? ep.rentExpiry > now : false)
                                                        const expiryText = isOwn ? '소장' : formatExpiry(ep.rentExpiry)

                                                        return (
                                                            <div
                                                                key={`${ep.id}_${ep.episodeNumber}`}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                                    padding: '10px 16px 10px 24px',
                                                                    borderBottom: '1px solid var(--border-faint)',
                                                                    cursor: isActive ? 'pointer' : 'default',
                                                                    opacity: isActive ? 1 : 0.5,
                                                                    transition: 'background .15s',
                                                                }}
                                                                onMouseEnter={e => { if (isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
                                                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                                                                onClick={() => { if (!isActive) return; router.push(`/anime/${group.animeId}?ep=${ep.episodeNumber}`) }}
                                                            >
                                                                <div style={{
                                                                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                                                    background: isActive ? 'rgba(108,99,255,.12)' : 'var(--border-faint)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 13, fontWeight: 800,
                                                                    color: isActive ? '#9d97ff' : 'var(--text-faint)',
                                                                }}>
                                                                    {ep.episodeNumber}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-subtle)', margin: 0 }}>
                                                                        {ep.episodeNumber}화
                                                                    </p>
                                                                    <p style={{ fontSize: 11, color: isActive ? (isOwn ? '#9d97ff' : '#34d399') : '#f87171', margin: '2px 0 0', fontWeight: 600 }}>
                                                                        {isOwn ? '소장' : isActive ? expiryText : '대여 만료'}
                                                                    </p>
                                                                </div>
                                                                <span style={{
                                                                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                                                                    background: isOwn ? 'rgba(108,99,255,.12)' : 'rgba(52,211,153,.1)',
                                                                    color: isOwn ? '#9d97ff' : '#34d399', flexShrink: 0,
                                                                }}>
                                                                    {isOwn ? '소장' : '대여'}
                                                                </span>
                                                                {isActive && (
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" style={{ flexShrink: 0 }}>
                                                                        <polygon points="5,3 19,12 5,21" fill="var(--text-faint)" stroke="none" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )

                        /* ── 리뷰/댓글 탭 ── */
                    ) : isActivityTab ? (
                        activityLoading ? (
                            <div className="lib-empty"><div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--main)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
                        ) : (activeTab === 'reviews' ? reviews.length : animeComments.length) === 0 ? (
                            <div className="lib-empty">
                                <img src={EMPTY_MSG[activeTab].icon} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                                <p>{EMPTY_MSG[activeTab].text}</p>
                            </div>
                        ) : (
                            <>
                                <p className="lib-count">{activeTab === 'reviews' ? `리뷰 (${reviews.length})` : `댓글 (${animeComments.length})`}</p>
                                <div className="lib-activity-list">
                                    {activeTab === 'reviews' && reviews.map(item => (
                                        <div key={item.id} className="lib-activity-item" onClick={() => setPreviewId(item.animeId)}>
                                            {item.animePoster ? <img src={`${TMDB_IMG}${item.animePoster}`} alt={item.animeTitle} className="lib-activity-poster" /> : <div className="lib-activity-poster-placeholder">🎌</div>}
                                            <div className="lib-activity-body">
                                                <p className="lib-activity-anime">{item.animeTitle || `애니 #${item.animeId}`}{item.spoiler && <span className="lib-spoiler-badge">스포</span>}</p>
                                                {item.score > 0 && (
                                                    <p style={{ display: 'flex', alignItems: 'center', gap: 1, margin: 0 }}>
                                                        {[1, 2, 3, 4, 5].map(s => {
                                                            const full = item.score >= s, half = !full && item.score >= s - 0.5
                                                            return (
                                                                <span key={s} style={{ position: 'relative', display: 'inline-block', width: 14, height: 14 }}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--border)" stroke="none" style={{ position: 'absolute', top: 0, left: 0 }}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
                                                                    {(full || half) && <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" style={{ position: 'absolute', top: 0, left: 0, clipPath: half ? 'inset(0 50% 0 0)' : 'none' }}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>}
                                                                </span>
                                                            )
                                                        })}
                                                        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{item.score.toFixed(1)}점</span>
                                                    </p>
                                                )}
                                                <p className="lib-activity-text">{item.text}</p>
                                                <p className="lib-activity-meta">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : ''}</p>
                                            </div>
                                            <button className="lib-activity-del" onClick={e => handleDeleteActivity(item, e)} title="삭제">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {activeTab === 'comments' && animeComments.map(item => (
                                        <div key={item.id} className="lib-activity-item" onClick={() => router.push(`/anime/${item.animeId}?ep=${item.episodeNumber}`)}>
                                            {item.animePoster ? <img src={`${TMDB_IMG}${item.animePoster}`} alt={item.animeTitle} className="lib-activity-poster" /> : <div className="lib-activity-poster-placeholder">🎌</div>}
                                            <div className="lib-activity-body">
                                                <p className="lib-activity-anime">
                                                    {item.animeTitle || `애니 #${item.animeId}`}
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6c63ff', marginLeft: 6, background: 'rgba(108,99,255,.12)', padding: '1px 6px', borderRadius: 4 }}>{item.episodeNumber}화</span>
                                                </p>
                                                <p className="lib-activity-text">{item.text}</p>
                                                <p className="lib-activity-meta">
                                                    {item.likes > 0 && `좋아요 ${item.likes} · `}
                                                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ko-KR') : item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : ''}
                                                </p>
                                            </div>
                                            <button className="lib-activity-del" title="삭제"
                                                onClick={async e => {
                                                    e.stopPropagation(); if (!confirm('삭제할까요?')) return
                                                    await deleteDoc(doc(db, 'users', user!.uid!, 'profiles', profileId, 'anime_comments', item.id))
                                                    setAnimeComments(prev => prev.filter(c => c.id !== item.id))
                                                    setActivityCount(prev => ({ ...prev, comment: prev.comment - 1 }))
                                                }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )

                        /* ── 최근 본 / 보고싶다 탭 ── */
                    ) : loading ? (
                        <div className="lib-empty"><div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--main)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>
                    ) : tabItems.length === 0 ? (
                        <div className="lib-empty">
                            <img src={EMPTY_MSG[activeTab]?.icon} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                            <p>{EMPTY_MSG[activeTab]?.text}</p>
                        </div>
                    ) : activeTab === 'recent' ? (
                        <div style={{ padding: '8px 0' }}>
                            {progressItems.map(item => (
                                <div key={item.tmdbId} className="lib-recent-card" onClick={() => router.push(`/anime/${item.tmdbId}`)}>
                                    <div className="lib-recent-thumb">
                                        {(item.backdrop || item.poster)
                                            ? <img src={(item.backdrop || item.poster).startsWith('http') ? (item.backdrop || item.poster) : `${TMDB_IMG}${item.backdrop || item.poster}`} alt={item.title} />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎌</div>
                                        }
                                    </div>
                                    <div className="lib-recent-info">
                                        <p className="lib-recent-title">{item.title}</p>
                                        <p className="lib-recent-ep">{item.episode}화{item.episodeTitle ? ` · ${item.episodeTitle}` : ''}</p>
                                        <div className="lib-recent-bar"><div className="lib-recent-bar-fill" style={{ width: `${item.progress}%` }} /></div>
                                    </div>
                                </div>
                            ))}
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
                    )}
                </div>

                {/* ── 멤버십 모달 (전체 공용) ── */}
                {memberInfo && showMembershipMgmt && (
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
                {memberInfo && showCancelConfirm && (
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
            </div>
        </div>
    )
}
