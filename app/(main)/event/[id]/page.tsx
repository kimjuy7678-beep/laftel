'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEventStore } from '@/store/useEventStore'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import GradeBadge from '@/components/GradeBadge'

const STATUS_LABEL: Record<string, string> = {
    ongoing: '진행중',
    result: '결과 발표',
    past: '이벤트 종료',
}
const STATUS_COLOR: Record<string, string> = {
    ongoing: '#6c63ff',
    result: '#f59e0b',
    past: 'var(--text-faint)',
}

const sortOptions = [
    { label: '최신순', value: 'latest' as const },
    { label: '인기순', value: 'popular' as const },
]

const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 14, height: 14, color: filled ? '#ff4d6d' : 'var(--text-faint)', fill: filled ? '#ff4d6d' : 'none', flexShrink: 0 }}>
        <path d="M20.8 4.6c-2-1.8-5.1-1.6-6.9.4L12 7.1 10.1 5C8.3 3 5.2 2.8 3.2 4.6 1 6.6.9 10 .9 10l.2 1.1c.3 1.4 1.1 2.7 2.2 3.7l8.1 7.1c.4.3.9.3 1.3 0l8.1-7.1c1.1-1 1.9-2.3 2.2-3.7l.2-1.1s-.1-3.4-2.4-5.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
)

export default function EventDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string
    const eventId = Number(id)

    const { user } = useAuthStore()
    const [hydrated, setHydrated] = useState(false)

    const {
        events, onFetchEvents,
        selectedEvent: detail,
        detailLoading: loading,
        onFetchEventDetail,
        comments, commentTotal, commentLoading, hasNextComment, onFetchComments,
    } = useEventStore()

    const [sorting, setSorting] = useState<'latest' | 'popular'>('latest')
    const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null)
    const [localComments, setLocalComments] = useState<any[]>([])
    const [commentText, setCommentText] = useState('')
    const [posting, setPosting] = useState(false)
    const [postError, setPostError] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)


    const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
    const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})


    const handleLike = (commentId: string, currentLikeCount: number, isLiked: boolean) => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        setLikedIds(prev => {
            const next = new Set(prev)
            if (next.has(commentId)) next.delete(commentId)
            else next.add(commentId)
            return next
        })
        setLikeCounts(prev => ({
            ...prev,
            [commentId]: isLiked
                ? (prev[commentId] ?? currentLikeCount) - 1
                : (prev[commentId] ?? currentLikeCount) + 1
        }))
    }

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (events.length === 0) onFetchEvents()
    }, [events.length, onFetchEvents])

    useEffect(() => {
        if (!eventId) return
        onFetchEventDetail(eventId)
    }, [eventId, onFetchEventDetail])

    useEffect(() => {
        if (!eventId) return
        onFetchComments(eventId, sorting, 0)
        setLocalComments([])
    }, [eventId, sorting, onFetchComments])

    const handleLoadMore = () => {
        onFetchComments(eventId, sorting, comments.length)
    }

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCommentText(e.target.value)
        setPostError(null)
        const el = textareaRef.current
        if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
    }

    const handlePostComment = async () => {
        if (!commentText.trim()) return
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        setPosting(true)
        setPostError(null)
        try {
            const myWatched = (() => { try { const s = localStorage.getItem('watch-progress-storage'); return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0 } catch { return 0 } })()
            const newComment = {
                id: `local_${Date.now()}`,
                content: commentText.trim(),
                author: {
                    nickname: user.name || user.email?.split('@')[0] || '익명',
                    profile_img: user.photoURL || null,
                    watched: myWatched,
                },
                created: new Date().toISOString(),
                like_count: 0,
                is_liked: false,
                reply_count: 0,
            }

            await addDoc(collection(db, `event_comments_${eventId}`), {
                content: newComment.content,
                authorId: user.uid,
                authorNickname: newComment.author.nickname,
                authorProfileImg: newComment.author.profile_img,
                authorWatched: myWatched,
                createdAt: serverTimestamp(),
                likeCount: 0,
                replyCount: 0,
                eventId: eventId,
                eventName: detail?.name ?? '',
                eventImg: detail?.img ?? detail?.banner_img ?? null,
            })

            setLocalComments(prev => [newComment, ...prev])
            setCommentText('')
            if (textareaRef.current) textareaRef.current.style.height = 'auto'
        } catch {
            setPostError('댓글 등록에 실패했어요. 다시 시도해주세요.')
        } finally {
            setPosting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handlePostComment()
        }
    }

    const formatDate = (dt: string) => dt?.slice(0, 10).replaceAll('-', '.')
    const eventSummary = events.find(e => String(e.id) === String(id))
    const detailStatus = detail?.status ?? eventSummary?.status
    const detailType = detail?.type ?? eventSummary?.type
    const detailBannerImg = detail?.banner_img ?? eventSummary?.banner_img
    const isPast = detailStatus === 'past'
    const isOngoing = detailStatus === 'ongoing'

    const sameGroupEvents = events.filter(e =>
        String(e.id) !== String(id) && (e.type === detailType || e.status === detailStatus)
    )
    const related = (sameGroupEvents.length > 0
        ? sameGroupEvents
        : events.filter(e => String(e.id) !== String(id))
    ).slice(0, 3)

    const allComments = [...localComments, ...comments]

    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    if (!detail) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ fontSize: 48 }}>🎪</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 16 }}>이벤트를 찾을 수 없어요</p>
            <button onClick={() => router.push('/event')} style={{ padding: '10px 24px', borderRadius: 10, background: '#6c63ff', border: 'none', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                이벤트 목록으로
            </button>
        </div>
    )

    const candidateBannerSrc = detailBannerImg || detail.img
    const bannerSrc = candidateBannerSrc !== failedImageSrc ? candidateBannerSrc : null
    const userAvatar = user?.photoURL || null
    const userNickname = user?.name || user?.email?.split('@')[0] || null

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 56, paddingBottom: 80 }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes fade-in { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
                .ev-content img { max-width: 100%; border-radius: 12px; }
                .ev-content a { color: #9d97ff; }
                .ev-content-blocks img { width: 100%; display: block; }
                .comment-textarea::placeholder { color: var(--text-faint); }
                .comment-textarea:focus { outline: none; border-color: #6c63ff !important; }
                .comment-submit:hover:not(:disabled) { background: #7c74ff !important; }
                .comment-submit:disabled { opacity: .45; cursor: default; }
            `}</style>

            {/* 히어로 배너 */}
            <div style={{ position: 'relative', width: '100%', maxHeight: 520, overflow: 'hidden' }}>
                {bannerSrc ? (
                    <img src={bannerSrc} alt={detail.name} onError={() => setFailedImageSrc(bannerSrc)}
                        style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', filter: isPast ? 'brightness(0.5)' : 'none' }} />
                ) : (
                    <div style={{ width: '100%', height: 360, background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🎪</div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, var(--bg-primary), transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 20, left: 24 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, background: STATUS_COLOR[detailStatus ?? 'ongoing'] || '#6c63ff', color: 'var(--text-primary)' }}>
                        {detailStatus ? STATUS_LABEL[detailStatus] || detailStatus : '이벤트'}
                    </span>
                </div>
            </div>

            {/* 본문 */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px', animation: 'fade-in .4s ease' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-faint)', margin: '24px 0 20px' }}>
                    <Link href="/event" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>이벤트</Link>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                    <span style={{ color: 'var(--text-muted)' }}>{detail.name}</span>
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 14px', lineHeight: 1.3 }}>{detail.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>📅 {formatDate(detail.start_datetime)} ~ {formatDate(detail.end_datetime)}</span>
                    {detailType && (
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: 'var(--border-subtle)', color: 'var(--text-subtle)', border: '1px solid var(--border)' }}>{detailType}</span>
                    )}
                </div>

                <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 32 }} />

                {detail.contents?.blocks ? (
                    <div className="ev-content-blocks" style={{ overflow: 'hidden', borderRadius: 16, background: 'var(--bg-card)' }}>
                        {detail.contents.blocks.map((block: any, index: number) => {
                            const text = block.content?.map((item: any) => item.content).join('') ?? ''
                            if (block.type === 'image_v1' && block.src) return <img key={`${block.id}-${index}`} src={block.src} alt={detail.name} style={{ width: '100%', display: 'block' }} />
                            if (block.type === 'heading_v1' && text) return <h2 key={`${block.id}-${index}`} style={{ margin: 0, padding: '18px 24px', color: 'var(--text-primary)', fontSize: block.level === 1 ? 22 : 18, fontWeight: 900, textAlign: block.textAlign ?? 'left' }}>{text}</h2>
                            if (block.type === 'paragraph_v1' && text) return <p key={`${block.id}-${index}`} style={{ margin: 0, padding: '12px 24px', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.8, textAlign: block.textAlign ?? 'left', whiteSpace: 'pre-wrap' }}>{text}</p>
                            if (block.type === 'margin_v1') return <div key={`${block.id}-${index}`} style={{ height: block.size ?? 16 }} />
                            return null
                        })}
                    </div>
                ) : detail.content ? (
                    <div className="ev-content" style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: detail.content }} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        {detail.img && <img src={detail.img} alt={detail.name} style={{ width: '100%', borderRadius: 16, objectFit: 'cover' }} />}
                        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>이벤트 상세 내용은 라프텔 앱에서 확인해주세요</p>
                    </div>
                )}

                {isPast && (
                    <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg-hover)', borderRadius: 12, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>📦</span>
                        <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>종료된 이벤트예요. 다음 이벤트를 기대해주세요!</p>
                    </div>
                )}

                {related.length > 0 && (
                    <div style={{ marginTop: 56 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                            {isOngoing ? '🎪 진행중인 다른 이벤트' : '📋 관련 이벤트'}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                            {related.map(ev => (
                                <Link key={ev.id} href={`/event/${ev.id}`} style={{ textDecoration: 'none', minWidth: 0 }}>
                                    <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary', transition: 'transform .2s, border-color .2s', cursor: 'pointer' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(108,99,255,.3)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)' }}>
                                        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#1a1a2e' }}>
                                            <img src={ev.img} alt={ev.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: ev.status === 'past' ? 'brightness(.5)' : 'none' }} />
                                        </div>
                                        <div style={{ padding: '10px 12px 12px', minWidth: 0 }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ev.name}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>{formatDate(ev.start_datetime)} ~ {formatDate(ev.end_datetime)}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* 댓글 섹션 */}
                <section style={{ marginTop: 56 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            댓글 <span style={{ color: '#6c63ff' }}>{(commentTotal + localComments.length).toLocaleString()}</span>
                        </h2>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {sortOptions.map(option => (
                                <button key={option.value} type="button"
                                    onClick={() => { setSorting(option.value); setLocalComments([]) }}
                                    style={{ border: 'none', borderRadius: 999, padding: '7px 12px', background: sorting === option.value ? '#6c63ff' : 'var(--border-faint)', color: sorting === option.value ? 'var(--text-primary)' : 'var(--text-subtle)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 댓글 입력창 */}
                    <div style={{ marginBottom: 28, padding: '16px', background: 'var(--bg-hover)', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
                        {user ? (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                {userAvatar ? (
                                    <img src={userAvatar} alt={userNickname ?? ''} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }} />
                                ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', flexShrink: 0, marginTop: 2 }}>
                                        {(userNickname ?? '?')[0].toUpperCase()}
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: 6 }}>{userNickname}</span>
                                    <textarea ref={textareaRef} className="comment-textarea" value={commentText}
                                        onChange={handleCommentChange} onKeyDown={handleKeyDown}
                                        placeholder="댓글을 입력하세요... (Ctrl+Enter로 등록)" rows={2}
                                        style={{ width: '100%', background: 'var(--border-faint)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7, padding: '10px 14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 72, transition: 'border-color .2s' }} />
                                    {postError && <p style={{ fontSize: 12, color: '#f87171', margin: '6px 0 0' }}>{postError}</p>}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                        <span style={{ fontSize: 11, color: commentText.length > 500 ? '#f87171' : 'var(--text-faint)' }}>{commentText.length} / 500</span>
                                        <button className="comment-submit" type="button" onClick={handlePostComment}
                                            disabled={posting || !commentText.trim() || commentText.length > 500}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#6c63ff', border: 'none', borderRadius: 9, color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background .2s' }}>
                                            {posting ? (
                                                <><div style={{ width: 12, height: 12, border: '2px solid var(--text-faint)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />등록 중</>
                                            ) : (
                                                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>댓글 등록</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <p style={{ fontSize: 14, color: 'var(--text-faint)', margin: 0 }}>댓글을 달려면 로그인이 필요해요</p>
                                <button type="button" onClick={() => router.push('/login')}
                                    style={{ padding: '8px 18px', background: '#6c63ff', border: 'none', borderRadius: 9, color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                                    로그인
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 댓글 목록 */}
                    {commentLoading && allComments.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '42px 0' }}>
                            <div style={{ width: 26, height: 26, border: '2px solid var(--border)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                        </div>
                    ) : allComments.length === 0 ? (
                        <div style={{ padding: '38px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
                            첫 번째 댓글을 남겨보세요!
                        </div>
                    ) : (
                        <>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--border-faint)' }}>
                                {allComments.map(comment => (
                                    <li key={comment.id} style={{ display: 'flex', gap: 12, padding: '18px 0', borderBottom: '1px solid var(--border-faint)' }}>
                                        {comment.author.profile_img ? (
                                            <img src={comment.author.profile_img} alt={comment.author.nickname} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                        ) : (
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--border-subtle)', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                                                {comment.author.nickname[0] ?? '?'}
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>{comment.author.nickname}</span>
                                                <GradeBadge watched={comment.author.watched ?? comment.authorWatched ?? 0} size="sm" showName={true} />
                                                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{formatDate(comment.created)}</span>
                                            </div>
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                                {comment.content}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 9 }}>
                                                <button type="button"
                                                    onClick={() => handleLike(String(comment.id), comment.like_count, likedIds.has(String(comment.id)) || comment.is_liked)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: likedIds.has(String(comment.id)) || comment.is_liked ? '#ff4d6d' : 'var(--text-faint)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                    <HeartIcon filled={likedIds.has(String(comment.id)) || comment.is_liked} />
                                                    {(likeCounts[String(comment.id)] ?? comment.like_count).toLocaleString()}
                                                </button>
                                                {comment.reply_count > 0 && (
                                                    <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>답글 {comment.reply_count.toLocaleString()}개</span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {hasNextComment && (
                                <button type="button" onClick={handleLoadMore} disabled={commentLoading}
                                    style={{ width: '100%', marginTop: 18, padding: '12px 0', border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 800, cursor: commentLoading ? 'default' : 'pointer', opacity: commentLoading ? .55 : 1 }}>
                                    {commentLoading ? '불러오는 중...' : '댓글 더보기'}
                                </button>
                            )}
                        </>
                    )}
                </section>

                <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/event" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: 'var(--border-faint)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)', transition: 'all .2s' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                        이벤트 목록
                    </Link>
                </div>
            </div>
        </div>
    )
}