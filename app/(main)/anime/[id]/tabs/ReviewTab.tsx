'use client'
import { useState, useEffect, useRef } from 'react'
import { db } from '@/firebase/firebase'
import { doc, setDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

const MOCK_REVIEWS = [
    { id: 'r1', user: 'pot**********', nickname: '파동', profileImg: '', score: 5.0, text: '이런 흔한 러브코미디에 볼게 뭐가 있다고...', date: '2026-04-01T00:00:00.000Z', edited: false, likes: 169, liked: false, spoiler: false, spoilerVisible: false },
    { id: 'r2', user: 'itt****', nickname: '뭉', profileImg: '', score: 5.0, text: '둘이 사귀면 될 일.', date: '2026-02-08T00:00:00.000Z', edited: false, likes: 101, liked: false, spoiler: true, spoilerVisible: false },
    { id: 'r3', user: 'lar******', nickname: '엘라라', profileImg: '', score: 5.0, text: '그냥 둘이 결혼해π', date: '2025-04-15T00:00:00.000Z', edited: false, likes: 80, liked: false, spoiler: true, spoilerVisible: false },
    { id: 'r4', user: 'hto***', nickname: '치키차', profileImg: '', score: 5.0, text: '럽코보단 사실 액션, 배틀이 더 중심인 작품', date: '2025-04-20T00:00:00.000Z', edited: false, likes: 57, liked: false, spoiler: false, spoilerVisible: false },
    { id: 'r5', user: 'star***', nickname: '새벽별', profileImg: '', score: 4.0, text: '작화 미쳤다 진짜 본즈 제대로 힘줬네요 ㅠㅠ', date: '2025-03-01T00:00:00.000Z', edited: false, likes: 45, liked: false, spoiler: false, spoilerVisible: false },
]

export default function ReviewTab({ previewId, user }: { previewId: number | string | null, user: any }) {
    const [myScore, setMyScore] = useState(0)
    const [myReview, setMyReview] = useState('')
    const [hoverScore, setHoverScore] = useState(0)
    const [isSpoiler, setIsSpoiler] = useState(false)
    const [reviews, setReviews] = useState(MOCK_REVIEWS)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!user?.uid || !previewId) return

        // 내 리뷰 불러오기
        getDoc(doc(db, 'reviews', `${user.uid}_${previewId}`)).then(snap => {
            if (snap.exists()) {
                const data = snap.data()
                setMyScore(data.score || 0)
                const myReviewItem = {
                    id: `my_${user.uid}`,
                    user: user.uid,
                    nickname: user.displayName || '나',
                    profileImg: user.photoURL || '',
                    score: data.score || 0,
                    date: data.createdAt || new Date().toISOString(),
                    edited: data.edited || false,
                    text: data.text || '',
                    likes: 0,
                    liked: false,
                    spoiler: data.spoiler || false,
                    spoilerVisible: false,
                }
                setReviews(prev => [myReviewItem, ...prev.filter(r => r.id !== `my_${user.uid}`)])
            }
        })

        // 좋아요 목록 불러오기
        getDoc(doc(db, 'likes', user.uid)).then(snap => {
            if (snap.exists()) {
                const likedIds: string[] = snap.data().reviewIds || []
                setReviews(prev => prev.map(r => ({
                    ...r,
                    liked: likedIds.includes(r.id),
                    likes: likedIds.includes(r.id) ? r.likes + (r.liked ? 0 : 1) : r.likes
                })))
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

    const handleSave = async () => {
        if (!myReview.trim() || myScore === 0) return
        if (!user?.uid) { alert('로그인이 필요해요'); return }

        await setDoc(doc(db, 'reviews', `${user.uid}_${previewId}`), {
            uid: user.uid,
            animeId: previewId,
            score: myScore,
            text: myReview.trim(),
            spoiler: isSpoiler,
            createdAt: new Date().toISOString(),
        })

        const newReview = {
            id: `my_${user.uid}`,
            user: user.uid,
            nickname: user.displayName || '나',
            profileImg: user.photoURL || '',
            score: myScore,
            date: new Date().toISOString(),
            edited: false,
            text: myReview.trim(),
            likes: 0,
            liked: false,
            spoiler: isSpoiler,
            spoilerVisible: false,
        }
        setReviews(prev => [newReview, ...prev.filter(r => r.id !== `my_${user.uid}`)])
        setMyReview('')
        setMyScore(0)
        setIsSpoiler(false)
    }

    const handleLike = async (id: string) => {
        if (!user?.uid) return
        const review = reviews.find(r => r.id === id)
        if (!review) return

        const isLiking = !review.liked
        setReviews(prev => prev.map(r =>
            r.id === id ? { ...r, liked: isLiking, likes: isLiking ? r.likes + 1 : r.likes - 1 } : r
        ))
        await setDoc(doc(db, 'likes', user.uid), {
            reviewIds: isLiking ? arrayUnion(id) : arrayRemove(id)
        }, { merge: true })
    }

    function formatDate(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const min = Math.floor(diff / 60000)
        const hour = Math.floor(diff / 3600000)
        const day = Math.floor(diff / 86400000)
        const month = Math.floor(day / 30)
        const year = Math.floor(day / 365)
        if (min < 1) return '방금 전'
        if (min < 60) return `${min}분 전`
        if (hour < 24) return `${hour}시간 전`
        if (day < 30) return `${day}일 전`
        if (month < 12) return `${month}개월 전`
        if (year >= 1) return `${year}년 전`
        return '1년 전'
    }

    const handleEditSave = (id: string) => {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, text: editText, edited: true } : r))
        setEditingId(null)
        setEditText('')
    }

    const handleDelete = (id: string) => {
        setReviews(prev => prev.filter(r => r.id !== id))
        setOpenMenuId(null)
    }

    const scoreLabel = (s: number) => ['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요'][s] || ''

    return (
        <div className="flex flex-col gap-6 py-2">
            <div className="flex gap-4">
                <div className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                    <p className="text-[var(--text-subtle)] text-sm font-semibold">내 별점</p>
                    <p className="text-4xl font-bold text-white">{myScore > 0 ? myScore.toFixed(1) : '0'}</p>
                    <p className="text-[var(--text-faint)] text-xs">{myScore > 0 ? '별점을 남겼어요' : '별점을 남겨주세요'}</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <svg key={s} width="32" height="32" viewBox="0 0 24 24"
                                fill={(hoverScore || myScore) >= s ? '#6c63ff' : 'rgba(255,255,255,0.12)'}
                                stroke="none" className="cursor-pointer transition-colors"
                                onMouseEnter={() => setHoverScore(s)}
                                onMouseLeave={() => setHoverScore(0)}
                                onClick={() => setMyScore(s)}
                            >
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                        ))}
                        {myScore > 0 && <span className="ml-2 text-2xl font-bold text-white">{myScore}.0</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={myReview}
                            onChange={e => setMyReview(e.target.value.slice(0, 1000))}
                            placeholder="이 작품에 대한 내 생각을 남겨보세요."
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 placeholder-white/20 resize-none outline-none focus:border-white/20 transition-colors"
                            rows={3}
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsSpoiler(v => !v)}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSpoiler ? 'bg-[#6c63ff] border-[#6c63ff]' : 'border-white/20'}`}>
                                    {isSpoiler && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                </div>
                                <span className="text-white/40 text-xs">스포일러</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-white/25 text-xs">{myReview.length}/1,000</span>
                                <button
                                    onClick={handleSave}
                                    disabled={!myReview.trim() || myScore === 0}
                                    className="px-4 py-1.5 bg-[#6c63ff] rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                                >등록</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                    <p className="text-[var(--text-subtle)] text-sm font-semibold">평균 별점</p>
                    <p className="text-4xl font-bold text-white">4.5</p>
                    <p className="text-[var(--text-faint)] text-xs">274개의 별점</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <svg key={s} width="24" height="24" viewBox="0 0 24 24"
                                fill='#6c63ff' stroke="none">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                        ))}
                    </div>
                    <div className="w-full flex flex-col gap-1.5 mt-1">
                        {[{ label: '5.0', pct: 78 }, { label: '4.0', pct: 12 }, { label: '3.0', pct: 5 }, { label: '2.0', pct: 3 }, { label: '1.0', pct: 2 }].map(row => (
                            <div key={row.label} className="flex items-center gap-2">
                                <span className="text-[10px] text-[var(--text-faint)] w-6 text-right">{row.label}</span>
                                <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#6c63ff] rounded-full transition-all" style={{ width: `${row.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 리뷰 목록 */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-bold text-sm">리뷰 <span className="text-[var(--text-subtle)]">(114)</span></p>
                    <span className="text-[var(--text-faint)] text-xs">좋아요순 ↕</span>
                </div>
                <div className="flex flex-col gap-3" ref={menuRef}>
                    {reviews.map((r) => (
                        <div key={r.id} className="py-4 border-b border-white/[0.06] last:border-b-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex gap-0.5 mt-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <svg key={s} width="23" height="23" viewBox="0 0 24 24"
                                            fill={s <= Math.floor(r.score) ? '#6c63ff' : 'rgba(255,255,255,0.12)'} stroke="none">
                                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                        </svg>
                                    ))}
                                    <span className="ml-1 text-white/50 text-20 font-medium">{r.score.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-white/25 text-[11px]">
                                        {formatDate(r.date)}{r.edited && ' (수정됨)'}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {r.profileImg ? (
                                            <div className="w-10 h-10 rounded-full bg-[#6c63ff]/30 flex items-center justify-center text-[10px] text-white/60 font-bold">
                                                {r.nickname[0]}
                                            </div>

                                        ) : (
                                            <img src={r.profileImg} className="w-10 h-10 rounded-full object-cover border border-white/10" alt={r.nickname} />
                                        )}
                                        <span className="text-white/60 text-xs font-bold">{r.nickname}</span>
                                        <span className="text-white/25 text-[10px]">({r.user})</span>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id) }}
                                            className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                                            </svg>
                                        </button>
                                        {openMenuId === r.id && (
                                            <div className="absolute top-7 right-0 bg-[#222] border border-white/10 rounded-xl overflow-hidden shadow-2xl w-[140px] z-20">
                                                {r.id === `my_${user?.uid}` ? (
                                                    // 내 리뷰
                                                    <>
                                                        <button className="w-full px-4 py-2.5 text-left text-xs text-white/70 hover:bg-white/[0.06] transition-colors"
                                                            onClick={() => { setEditingId(r.id); setEditText(r.text); setOpenMenuId(null) }}>수정하기</button>
                                                        <button className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                                                            onClick={() => handleDelete(r.id)}>삭제하기</button>
                                                    </>
                                                ) : (
                                                    // 상대방 리뷰
                                                    <>
                                                        <button className="w-full px-4 py-2.5 text-left text-xs text-white/70 hover:bg-white/[0.06] transition-colors"
                                                            onClick={() => { alert('스포일러로 신고했어요.'); setOpenMenuId(null) }}>스포일러 신고</button>
                                                        <button className="w-full px-4 py-2.5 text-left text-xs text-white/70 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                                                            onClick={() => { alert('부적절한 표현으로 신고했어요.'); setOpenMenuId(null) }}>부적절한 표현 신고</button>
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
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 resize-none outline-none focus:border-white/20"
                                        rows={3}
                                    />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 cursor-pointer"
                                            onClick={() => setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, spoiler: !rv.spoiler } : rv))}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${r.spoiler ? 'bg-[#6c63ff] border-[#6c63ff]' : 'border-white/20'}`}>
                                                {r.spoiler && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                            </div>
                                            <span className="text-white/40 text-xs">스포일러</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-xs hover:text-white/60 transition-colors">취소</button>
                                            <button onClick={() => handleEditSave(r.id)} className="px-3 py-1.5 rounded-lg bg-[#6c63ff] text-white text-xs font-bold hover:opacity-90 transition-opacity">저장</button>
                                        </div>
                                    </div>
                                </div>
                            ) : r.spoiler && !r.spoilerVisible ? (
                                <p className="text-white/40 text-sm mt-1">
                                    스포일러가 있어요!{' '}
                                    <button
                                        onClick={() => setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, spoilerVisible: true } : rv))}
                                        className="text-[#6c63ff] hover:underline transition-colors"
                                    >보기</button>
                                </p>
                            ) : (
                                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line mt-1">{r.text}</p>
                            )}

                            <button
                                onClick={() => handleLike(r.id)}
                                className={`flex items-center gap-1.5 mt-3 transition-colors ${r.liked ? 'text-[#6c63ff]' : 'text-white/25 hover:text-white/50'}`}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24"
                                    fill={r.liked ? 'currentColor' : 'none'}
                                    stroke="currentColor" strokeWidth="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                </svg>
                                <span className="text-xs">{r.likes}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}