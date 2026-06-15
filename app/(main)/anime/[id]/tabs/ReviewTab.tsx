'use client'
import { useState, useEffect, useRef } from 'react'
import { db } from '@/firebase/firebase'
import {
    doc, setDoc, getDoc, deleteDoc, arrayUnion, arrayRemove,
    collection, addDoc, getDocs, serverTimestamp, orderBy, query, where, collectionGroup
} from 'firebase/firestore'
import { useAuthStore } from '@/store/useAuthStore'
import { useActivityStore } from '@/store/useActiveStore'
import GradeBadge from '@/components/GradeBadge'
import { toast } from 'sonner'

const AVATAR_COLORS = [
    { bg: 'rgba(108,99,255,0.2)', text: '#9d97ff' },
    { bg: 'rgba(236,72,153,0.2)', text: '#f472b6' },
    { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
    { bg: 'rgba(16,185,129,0.2)', text: '#34d399' },
    { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
    { bg: 'rgba(239,68,68,0.2)', text: '#f87171' },
]

function getAvatarColor(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ src, name, size = 40 }: { src?: string | null, name: string, size?: number }) {
    const color = getAvatarColor(name)
    if (src) return (
        <img src={src} alt={name}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
    )
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: color.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: size * 0.3, fontWeight: 800, color: color.text,
        }}>
            {name[0]?.toUpperCase() || '?'}
        </div>
    )
}

interface Reply {
    id: string
    uid: string
    nickname: string
    profileImg: string
    text: string
    createdAt: string
}

interface Review {
    id: string
    user: string
    nickname: string
    profileImg: string
    score: number
    text: string
    date: string
    edited: boolean
    likes: number
    liked: boolean
    spoiler: boolean
    spoilerVisible: boolean
    watched?: number
}

const MOCK_REVIEWS: Review[] = [
    { id: 'r1', user: 'pot**********', nickname: '파동', profileImg: '', score: 5.0, text: '이런 흔한 러브코미디에 볼게 뭐가 있다고...', date: '2026-04-01T00:00:00.000Z', edited: false, likes: 169, liked: false, spoiler: false, spoilerVisible: false },
    { id: 'r2', user: 'itt****', nickname: '뭉', profileImg: '', score: 5.0, text: '둘이 사귀면 될 일.', date: '2026-02-08T00:00:00.000Z', edited: false, likes: 101, liked: false, spoiler: true, spoilerVisible: false },
    { id: 'r3', user: 'lar******', nickname: '엘라라', profileImg: '', score: 5.0, text: '그냥 둘이 결혼해π', date: '2025-04-15T00:00:00.000Z', edited: false, likes: 80, liked: false, spoiler: true, spoilerVisible: false },
    { id: 'r4', user: 'hto***', nickname: '치키차', profileImg: '', score: 5.0, text: '럽코보단 사실 액션, 배틀이 더 중심인 작품', date: '2025-04-20T00:00:00.000Z', edited: false, likes: 57, liked: false, spoiler: false, spoilerVisible: false },
    { id: 'r5', user: 'star***', nickname: '새벽별', profileImg: '', score: 4.0, text: '작화 미쳤다 진짜 본즈 제대로 힘줬네요 ㅠㅠ', date: '2025-03-01T00:00:00.000Z', edited: false, likes: 45, liked: false, spoiler: false, spoilerVisible: false },
]

function calcStats(scores: number[]) {
    if (scores.length === 0) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const dist = [5, 4, 3, 2, 1].map(s => {
        const cnt = scores.filter(sc => Math.round(sc) === s).length
        return scores.length > 0 ? Math.round((cnt / scores.length) * 100) : 0
    })
    return { avg: Math.round(avg * 10) / 10, total: scores.length, dist }
}

export default function ReviewTab({ previewId, user, animeTitle, animePoster }: {
    previewId: number | string | null
    user: any
    animeTitle?: string
    animePoster?: string | null
}) {
    const { avatarConfig } = useAuthStore()
    const profileId = user?.currentProfileId || 'main'
    const myAvatarSrc = avatarConfig?.svgDataUrl || user?.photoURL || null
    const myName = user?.name || user?.email?.split('@')[0] || '나'

    const [myScore, setMyScore] = useState(0)
    const [myReview, setMyReview] = useState('')
    const [hoverScore, setHoverScore] = useState(0)
    const [isSpoiler, setIsSpoiler] = useState(false)
    const [scoreOnly, setScoreOnly] = useState(false)
    const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    const [allScores, setAllScores] = useState<number[]>([])

    const [repliesMap, setRepliesMap] = useState<Record<string, Reply[]>>({})
    const [openRepliesId, setOpenRepliesId] = useState<string | null>(null)
    const [replyingToId, setReplyingToId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [replyLoading, setReplyLoading] = useState(false)

    const menuRef = useRef<HTMLDivElement>(null)

    const myWatched = (() => {
        try {
            const s = typeof window !== 'undefined' ? localStorage.getItem('watch-progress-storage') : null
            return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0
        } catch { return 0 }
    })()

    // 전체 별점 fetch
    useEffect(() => {
        if (!previewId) return
        getDocs(query(collectionGroup(db, 'reviews'), where('animeId', '==', Number(previewId))))
            .then(snap => {
                const scores = snap.docs.map(d => d.data().score as number).filter(Boolean)
                setAllScores(scores)
            })
            .catch(console.error)
    }, [previewId])

    // 내 리뷰 불러오기
    useEffect(() => {
        if (!user?.uid || !previewId) return
        getDoc(doc(db, 'users', user.uid, 'profiles', profileId, 'reviews', `${previewId}`)).then(snap => {
            if (snap.exists()) {
                const data = snap.data()
                setMyScore(data.score || 0)
                setScoreOnly(!data.text)
                const myReviewItem: Review = {
                    id: `my_${user.uid}`, user: user.uid,
                    nickname: user?.name || '나', profileImg: user.photoURL || '',
                    score: data.score || 0, date: data.createdAt || new Date().toISOString(),
                    edited: data.edited || false, text: data.text || '',
                    likes: 0, liked: false, spoiler: data.spoiler || false, spoilerVisible: false,
                }
                setReviews(prev => [myReviewItem, ...prev.filter(r => r.id !== `my_${user.uid}`)])
            }
        })
        getDoc(doc(db, 'likes', user.uid)).then(snap => {
            if (snap.exists()) {
                const likedIds: string[] = snap.data().reviewIds || []
                setReviews(prev => prev.map(r => ({ ...r, liked: likedIds.includes(r.id) })))
            }
        })
    }, [user?.uid, previewId])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
        }
        window.addEventListener('mousedown', handler)
        return () => window.removeEventListener('mousedown', handler)
    }, [])

    // ── 별점만 저장 ──────────────────────────────────────────
    const handleSaveScoreOnly = async () => {
        if (myScore === 0 || !user?.uid) return

        // 프로필 컬렉션에 저장 (fetchCounts와 동일한 경로)
        await setDoc(doc(db, 'users', user.uid, 'profiles', profileId, 'reviews', `${previewId}`), {
            uid: user.uid, animeId: Number(previewId), animeTitle: animeTitle || '',
            animePoster: animePoster || null,
            score: myScore, text: '', spoiler: false, createdAt: new Date().toISOString(),
        })

        const newReview: Review = {
            id: `my_${user.uid}`, user: user.uid,
            nickname: user?.name || '나', profileImg: user.photoURL || '',
            score: myScore, date: new Date().toISOString(),
            edited: false, text: '', likes: 0, liked: false, spoiler: false, spoilerVisible: false,
        }

        setReviews(prev => {
            const hadMine = prev.some(r => r.id === `my_${user.uid}`)
            if (!hadMine) {
                setAllScores(s => [...s, myScore])
                useActivityStore.setState(s => ({
                    counts: { ...s.counts, rating: s.counts.rating + 1, review: s.counts.review + 1 }
                }))
            } else {
                // 기존 점수 교체
                const old = prev.find(r => r.id === `my_${user.uid}`)
                if (old) {
                    setAllScores(s => {
                        const idx = s.indexOf(old.score)
                        return idx !== -1 ? [...s.slice(0, idx), myScore, ...s.slice(idx + 1)] : [...s, myScore]
                    })
                }
            }
            return [newReview, ...prev.filter(r => r.id !== `my_${user.uid}`)]
        })
        setScoreOnly(true)
    }

    // ── 리뷰 포함 저장 ───────────────────────────────────────
    const handleSave = async () => {
        if (!myReview.trim() || myScore === 0 || !user?.uid) return

        const hadMine = reviews.some(r => r.id === `my_${user.uid}`)

        // 프로필 컬렉션에 저장 (fetchCounts와 동일한 경로)
        await setDoc(doc(db, 'users', user.uid, 'profiles', profileId, 'reviews', `${previewId}`), {
            uid: user.uid, animeId: Number(previewId), animeTitle: animeTitle || '',
            animePoster: animePoster || null,
            score: myScore, text: myReview.trim(), spoiler: isSpoiler,
            createdAt: new Date().toISOString(),
        })

        const newReview: Review = {
            id: `my_${user.uid}`, user: user.uid,
            nickname: user?.name || '나', profileImg: user.photoURL || '',
            score: myScore, date: new Date().toISOString(),
            edited: false, text: myReview.trim(),
            likes: 0, liked: false, spoiler: isSpoiler, spoilerVisible: false,
        }

        setReviews(prev => {
            const old = prev.find(r => r.id === `my_${user.uid}`)
            if (!hadMine) {
                // 완전히 새 리뷰 → 카운트 +1
                setAllScores(s => [...s, myScore])
                useActivityStore.setState(s => ({
                    counts: { ...s.counts, rating: s.counts.rating + 1, review: s.counts.review + 1 }
                }))
            } else if (old && scoreOnly) {
                // 별점만 있던 상태에서 리뷰 추가 → 점수는 이미 카운트됨, 리뷰 텍스트만 추가
                // 카운트 변경 없음 (review 수는 동일)
                setAllScores(s => {
                    const idx = s.indexOf(old.score)
                    return idx !== -1 ? [...s.slice(0, idx), myScore, ...s.slice(idx + 1)] : [...s, myScore]
                })
            } else if (old) {
                // 기존 리뷰 수정 → 점수만 업데이트
                setAllScores(s => {
                    const idx = s.indexOf(old.score)
                    return idx !== -1 ? [...s.slice(0, idx), myScore, ...s.slice(idx + 1)] : [...s, myScore]
                })
            }
            return [newReview, ...prev.filter(r => r.id !== `my_${user.uid}`)]
        })

        setMyReview('')
        setIsSpoiler(false)
        setScoreOnly(false)
    }

    const handleLike = async (id: string) => {
        if (!user?.uid) return
        const review = reviews.find(r => r.id === id)
        if (!review) return
        const isLiking = !review.liked
        setReviews(prev => prev.map(r => r.id === id
            ? { ...r, liked: isLiking, likes: isLiking ? r.likes + 1 : r.likes - 1 }
            : r
        ))
        await setDoc(doc(db, 'likes', user.uid),
            { reviewIds: isLiking ? arrayUnion(id) : arrayRemove(id) },
            { merge: true }
        )
    }

    const handleLoadReplies = async (reviewId: string) => {
        if (openRepliesId === reviewId) { setOpenRepliesId(null); return }
        setOpenRepliesId(reviewId)
        if (repliesMap[reviewId]) return
        try {
            const snap = await getDocs(
                query(collection(db, 'reviews', reviewId, 'replies'), orderBy('createdAt', 'asc'))
            )
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reply[]
            setRepliesMap(prev => ({ ...prev, [reviewId]: docs }))
        } catch (e) { console.error(e) }
    }

    const handlePostReply = async (reviewId: string) => {
        if (!replyText.trim() || !user?.uid) return
        setReplyLoading(true)
        try {
            const newReply = {
                uid: user.uid,
                nickname: user?.name || '익명',
                profileImg: user.photoURL || '',
                text: replyText.trim(),
                createdAt: new Date().toISOString(),
            }
            const ref = await addDoc(collection(db, 'reviews', reviewId, 'replies'), {
                ...newReply, createdAt: serverTimestamp(),
            })
            setRepliesMap(prev => ({
                ...prev,
                [reviewId]: [...(prev[reviewId] || []), { id: ref.id, ...newReply }],
            }))
            setReplyText('')
            setReplyingToId(null)
        } catch (e) { console.error(e) }
        finally { setReplyLoading(false) }
    }

    const handleDeleteReply = async (reviewId: string, replyId: string) => {
        if (!confirm('답글을 삭제할까요?')) return
        await deleteDoc(doc(db, 'reviews', reviewId, 'replies', replyId))
        setRepliesMap(prev => ({
            ...prev,
            [reviewId]: (prev[reviewId] || []).filter(r => r.id !== replyId),
        }))
    }

    const handleEditSave = async (id: string) => {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, text: editText, edited: true } : r))
        if (user?.uid && previewId) {
            await setDoc(
                doc(db, 'users', user.uid, 'profiles', profileId, 'reviews', `${previewId}`),
                { text: editText, edited: true },
                { merge: true }
            )
        }
        setEditingId(null)
        setEditText('')
    }

    const handleDelete = async (id: string) => {
        const mine = reviews.find(r => r.id === id)
        if (mine) {
            setAllScores(prev => {
                const idx = prev.indexOf(mine.score)
                return idx !== -1 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev
            })
        }
        setReviews(prev => prev.filter(r => r.id !== id))
        setOpenMenuId(null)
        if (user?.uid && previewId) {
            await deleteDoc(doc(db, 'users', user.uid, 'profiles', profileId, 'reviews', `${previewId}`))
        }
        useActivityStore.setState(s => ({
            counts: {
                ...s.counts,
                rating: Math.max(0, s.counts.rating - 1),
                review: Math.max(0, s.counts.review - 1),
            }
        }))
        setMyScore(0)
        setScoreOnly(false)
    }

    function formatDate(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const min = Math.floor(diff / 60000), hour = Math.floor(diff / 3600000)
        const day = Math.floor(diff / 86400000), month = Math.floor(day / 30), year = Math.floor(day / 365)
        if (min < 1) return '방금 전'
        if (min < 60) return `${min}분 전`
        if (hour < 24) return `${hour}시간 전`
        if (day < 30) return `${day}일 전`
        if (month < 12) return `${month}개월 전`
        return `${year}년 전`
    }

    const isMyReviewExists = reviews.some(r => r.id === `my_${user?.uid}`)
    const stats = calcStats(allScores)
    const reviewCount = reviews.filter(r => r.text.trim() !== '').length

    return (
        <div className="flex min-w-0 flex-col gap-6 py-2">
            <style>{`
                .reply-input::placeholder { color: var(--text-faint); }
                .reply-input:focus { outline: none; border-color: rgba(108,99,255,.5) !important; }
            `}</style>

            {/* 별점 입력 + 평균 */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {/* 내 별점 */}
                <div className="min-w-0 flex flex-col items-center gap-3 rounded-2xl border p-4 sm:p-5"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <p className="text-[var(--text-subtle)] text-sm font-semibold">내 별점</p>
                    <p className="text-4xl font-bold text-[var(--text-primary)]">{myScore > 0 ? myScore.toFixed(1) : '0'}</p>
                    <p className="text-[var(--text-faint)] text-xs">
                        {myScore > 0 ? (scoreOnly ? '별점을 남겼어요' : '리뷰를 남겼어요') : '별점을 남겨주세요'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => {
                            const active = hoverScore || myScore
                            const full = active >= s
                            const half = !full && active >= s - 0.5
                            return (
                                <div
                                    key={s}
                                    className="relative cursor-pointer"
                                    style={{ width: 32, height: 32 }}
                                    onMouseMove={e => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const x = e.clientX - rect.left
                                        setHoverScore(x < rect.width / 2 ? s - 0.5 : s)
                                    }}
                                    onMouseLeave={() => setHoverScore(0)}
                                    onClick={e => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const x = e.clientX - rect.left
                                        setMyScore(x < rect.width / 2 ? s - 0.5 : s)
                                    }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--border)" stroke="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                    </svg>
                                    {(full || half) && (
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#6c63ff" stroke="none"
                                            style={{ position: 'absolute', top: 0, left: 0, clipPath: half ? 'inset(0 50% 0 0)' : 'none' }}>
                                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                        </svg>
                                    )}
                                </div>
                            )
                        })}
                        {myScore > 0 && (
                            <span className="ml-2 text-2xl font-bold text-[var(--text-primary)]">{myScore.toFixed(1)}</span>
                        )}
                    </div>

                    {scoreOnly && isMyReviewExists ? (
                        <div className="w-full flex flex-col gap-2">
                            <p className="text-[var(--text-faint)] text-xs text-center">별점만 남긴 상태예요</p>
                            <button
                                onClick={() => setScoreOnly(false)}
                                className="w-full py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                                style={{ background: 'rgba(108,99,255,.15)', color: '#9d97ff', border: '1px solid rgba(108,99,255,.2)' }}
                            >
                                리뷰 추가하기
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 w-full">
                            <textarea
                                value={myReview}
                                onChange={e => setMyReview(e.target.value.slice(0, 1000))}
                                placeholder="이 작품에 대한 내 생각을 남겨보세요. (선택)"
                                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                rows={3}
                                onFocus={e => e.target.style.borderColor = 'rgba(108,99,255,.5)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsSpoiler(v => !v)}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSpoiler ? 'bg-[#6c63ff] border-[#6c63ff]' : ''}`}
                                        style={!isSpoiler ? { borderColor: 'var(--border)' } : {}}>
                                        {isSpoiler && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                    </div>
                                    <span className="text-[var(--text-subtle)] text-xs">스포일러</span>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <span className="text-[var(--text-faint)] text-xs">{myReview.length}/1,000</span>
                                    {myScore > 0 && !myReview.trim() && (
                                        <button
                                            onClick={handleSaveScoreOnly}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                                            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--bg-card)' }}
                                        >
                                            별점만 등록
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSave}
                                        disabled={!myReview.trim() || myScore === 0}
                                        className="px-4 py-1.5 bg-[#6c63ff] rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        등록
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 평균 별점 */}
                <div className="min-w-0 flex flex-col items-center gap-3 rounded-2xl border p-4 sm:p-5"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <p className="text-[var(--text-subtle)] text-sm font-semibold">평균 별점</p>
                    <p className="text-4xl font-bold text-[var(--text-primary)]">
                        {stats.avg > 0 ? stats.avg.toFixed(1) : '-'}
                    </p>
                    <p className="text-[var(--text-faint)] text-xs">
                        {stats.total > 0
                            ? `별점 ${stats.total.toLocaleString()}개 · 리뷰 ${reviewCount}개`
                            : '아직 별점이 없어요'}
                    </p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <svg key={s} width="24" height="24" viewBox="0 0 24 24"
                                fill={stats.avg >= s ? '#6c63ff' : stats.avg >= s - 0.5 ? 'url(#half)' : 'var(--border)'}
                                stroke="none">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                        ))}
                    </div>
                    <div className="w-full flex flex-col gap-1.5 mt-1">
                        {[5, 4, 3, 2, 1].map((score, i) => (
                            <div key={score} className="flex items-center gap-2">
                                <span className="text-[10px] text-[var(--text-faint)] w-6 text-right">{score}.0</span>
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                                    <div
                                        className="h-full bg-[#6c63ff] rounded-full transition-all duration-500"
                                        style={{ width: `${stats.dist[i]}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-[var(--text-faint)] w-6">{stats.dist[i]}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 리뷰 목록 */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[var(--text-primary)] font-bold text-sm">
                        리뷰 <span className="text-[var(--text-subtle)]">({reviewCount})</span>
                    </p>
                    <span className="text-[var(--text-faint)] text-xs">좋아요순 ↕</span>
                </div>
                <div className="flex flex-col gap-3" ref={menuRef}>
                    {reviews.map((r) => (
                        <div key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <div className="py-4">
                                <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                                    <div className="flex shrink-0 items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => {
                                            const full = r.score >= s
                                            const half = !full && r.score >= s - 0.5
                                            return (
                                                <div key={s} className="relative" style={{ width: 23, height: 23 }}>
                                                    <svg width="23" height="23" viewBox="0 0 24 24" fill="var(--border)" stroke="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                    </svg>
                                                    {(full || half) && (
                                                        <svg width="23" height="23" viewBox="0 0 24 24" fill="#6c63ff" stroke="none"
                                                            style={{ position: 'absolute', top: 0, left: 0, clipPath: half ? 'inset(0 50% 0 0)' : 'none' }}>
                                                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <span className="ml-1 text-[var(--text-muted)] text-sm font-medium">{r.score.toFixed(1)}</span>
                                    </div>
                                    <div className="flex min-w-0 items-center justify-end gap-2">
                                        <span className="hidden text-[var(--text-faint)] text-[11px] sm:inline">
                                            {formatDate(r.date)}{r.edited && ' (수정됨)'}
                                        </span>
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <Avatar src={r.profileImg} name={r.nickname} size={40} />
                                            <span className="max-w-[68px] truncate text-[var(--text-muted)] text-xs font-bold sm:max-w-[140px]">{r.nickname}</span>
                                            <GradeBadge watched={r.watched ?? 0} size="sm" showName={true} />
                                            <span className="hidden max-w-[120px] truncate text-[var(--text-faint)] text-[10px] sm:inline">({r.user})</span>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id) }}
                                                className="w-6 h-6 flex items-center justify-center rounded transition-all"
                                                style={{ color: 'var(--text-faint)' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                                                </svg>
                                            </button>
                                            {openMenuId === r.id && (
                                                <div className="absolute top-7 right-0 rounded-xl overflow-hidden shadow-2xl w-[140px] z-20"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                    {r.id === `my_${user?.uid}` ? (
                                                        <>
                                                            <button className="w-full px-4 py-2.5 text-left text-xs transition-colors"
                                                                style={{ color: 'var(--text-muted)' }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                                                                onClick={() => { setEditingId(r.id); setEditText(r.text); setOpenMenuId(null) }}>수정하기</button>
                                                            <button className="w-full px-4 py-2.5 text-left text-xs text-red-400 transition-colors"
                                                                style={{ borderTop: '1px solid var(--border-faint)' }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                                                                onClick={() => handleDelete(r.id)}>삭제하기</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="w-full px-4 py-2.5 text-left text-xs transition-colors"
                                                                style={{ color: 'var(--text-muted)' }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                                                                onClick={() => { toast.success('스포일러로 신고했어요.'); setOpenMenuId(null) }}>스포일러 신고</button>
                                                            <button className="w-full px-4 py-2.5 text-left text-xs transition-colors"
                                                                style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-faint)' }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                                                                onClick={() => { toast.success('부적절한 표현으로 신고했어요.'); setOpenMenuId(null) }}>부적절한 표현 신고</button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {editingId === r.id ? (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <textarea
                                            value={editText}
                                            onChange={e => setEditText(e.target.value)}
                                            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
                                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                            rows={3}
                                        />
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2 cursor-pointer"
                                                onClick={() => setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, spoiler: !rv.spoiler } : rv))}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${r.spoiler ? 'bg-[#6c63ff] border-[#6c63ff]' : ''}`}
                                                    style={!r.spoiler ? { borderColor: 'var(--border)' } : {}}>
                                                    {r.spoiler && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                                </div>
                                                <span className="text-[var(--text-subtle)] text-xs">스포일러</span>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingId(null)}
                                                    className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                                                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>취소</button>
                                                <button onClick={() => handleEditSave(r.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-[#6c63ff] text-white text-xs font-bold hover:opacity-90 transition-opacity">저장</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : r.text === '' ? (
                                    <p className="text-[var(--text-faint)] text-xs mt-1 italic">별점만 남겼어요</p>
                                ) : r.spoiler && !r.spoilerVisible ? (
                                    <p className="text-[var(--text-subtle)] text-sm mt-1">
                                        스포일러가 있어요!{' '}
                                        <button onClick={() => setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, spoilerVisible: true } : rv))}
                                            className="text-[#6c63ff] hover:underline transition-colors">보기</button>
                                    </p>
                                ) : (
                                    <p className="mt-1 break-words text-[var(--text-muted)] text-sm leading-relaxed whitespace-pre-line">{r.text}</p>
                                )}

                                <div className="flex items-center gap-4 mt-3">
                                    <button onClick={() => handleLike(r.id)}
                                        className="flex items-center gap-1.5 transition-colors"
                                        style={{ color: r.liked ? '#6c63ff' : 'var(--text-faint)' }}
                                        onMouseEnter={e => { if (!r.liked) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                                        onMouseLeave={e => { if (!r.liked) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24"
                                            fill={r.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                        </svg>
                                        <span className="text-xs">{r.likes}</span>
                                    </button>

                                    <button
                                        onClick={() => handleLoadReplies(r.id)}
                                        className="flex items-center gap-1.5 text-xs transition-colors"
                                        style={{ color: openRepliesId === r.id ? '#6c63ff' : 'var(--text-faint)' }}
                                        onMouseEnter={e => { if (openRepliesId !== r.id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                                        onMouseLeave={e => { if (openRepliesId !== r.id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span>
                                            {repliesMap[r.id]?.length ? `답글 ${repliesMap[r.id].length}개` : '답글'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {openRepliesId === r.id && (
                                <div className="pb-4 pl-2 sm:pl-4" style={{ borderTop: '1px solid var(--border-faint)' }}>
                                    {(repliesMap[r.id] || []).map(reply => (
                                        <div key={reply.id} className="flex gap-3 pt-3">
                                            <div className="mt-0.5 text-[var(--text-faint)]">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9,10 4,15 9,20" />
                                                    <path d="M20 4h-7a4 4 0 0 0-4 4v7" />
                                                </svg>
                                            </div>
                                            <Avatar src={reply.profileImg} name={reply.nickname} size={28} />
                                            <div className="flex-1 min-w-0">
                                                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                                    <span className="max-w-[120px] truncate text-[var(--text-muted)] text-xs font-bold">{reply.nickname}</span>
                                                    <span className="text-[var(--text-faint)] text-[10px]">{formatDate(reply.createdAt)}</span>
                                                    {reply.uid === user?.uid && (
                                                        <button
                                                            onClick={() => handleDeleteReply(r.id, reply.id)}
                                                            className="text-[10px] transition-colors ml-auto"
                                                            style={{ color: 'var(--text-faint)' }}
                                                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                                                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'}
                                                        >삭제</button>
                                                    )}
                                                </div>
                                                <p className="break-words text-[var(--text-muted)] text-xs leading-relaxed">{reply.text}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {user ? (
                                        replyingToId === r.id ? (
                                            <div className="mt-3 flex gap-2 pl-0 sm:pl-4">
                                                <Avatar src={myAvatarSrc} name={myName} size={28} />
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                    <input
                                                        className="reply-input w-full rounded-lg px-3 py-2 text-xs"
                                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                        placeholder="답글을 입력하세요..."
                                                        value={replyText}
                                                        onChange={e => setReplyText(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostReply(r.id) } }}
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-1.5 justify-end">
                                                        <button
                                                            onClick={() => { setReplyingToId(null); setReplyText('') }}
                                                            className="px-3 py-1 rounded-lg text-[11px] transition-colors"
                                                            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                                        >취소</button>
                                                        <button
                                                            onClick={() => handlePostReply(r.id)}
                                                            disabled={!replyText.trim() || replyLoading}
                                                            className="px-3 py-1 rounded-lg bg-[#6c63ff] text-white text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                                                        >{replyLoading ? '...' : '등록'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setReplyingToId(r.id)}
                                                className="mt-3 ml-4 text-xs transition-colors flex items-center gap-1"
                                                style={{ color: 'var(--text-faint)' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#6c63ff'}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'}
                                            >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                </svg>
                                                답글 달기
                                            </button>
                                        )
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
