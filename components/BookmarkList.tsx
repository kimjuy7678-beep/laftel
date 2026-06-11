'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookmarkStore, Bookmark } from '@/store/useBookmarkStore'

interface Props {
    tmdbId?: number        // 특정 애니 북마크만 보기 (애니 상세페이지용)
    onSeek?: (timeSeconds: number, episode: number) => void  // 해당 시간으로 이동
}

export default function BookmarkList({ tmdbId, onSeek }: Props) {
    const router = useRouter()
    const { user } = useAuthStore()
    const { bookmarks, fetchBookmarks, removeBookmark } = useBookmarkStore()

    const profileId = (user as any)?.currentProfileId || 'main'

    useEffect(() => {
        if (user?.uid) fetchBookmarks(user.uid, profileId)
    }, [user?.uid])

    const filtered = tmdbId
        ? bookmarks.filter(b => b.tmdbId === tmdbId)
        : bookmarks

    const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt)

    if (sorted.length === 0) return (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>저장된 북마크가 없어요</p>
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(b => (
                <div
                    key={b.id}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        cursor: onSeek ? 'pointer' : 'default',
                        transition: 'border-color .15s',
                    }}
                    onClick={() => {
                        if (onSeek) onSeek(b.timeSeconds, b.episode)
                        else router.push(`/anime/${b.tmdbId}?ep=${b.episode}`)
                    }}
                    onMouseEnter={e => { if (onSeek || !tmdbId) (e.currentTarget as HTMLDivElement).style.borderColor = '#6c63ff' }}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
                >
                    {/* 포스터 */}
                    {b.poster && (
                        <img
                            src={`https://image.tmdb.org/t/p/w92${b.poster}`}
                            alt={b.title}
                            style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }}
                        />
                    )}

                    {/* 정보 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {!tmdbId && (
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {b.title}
                            </p>
                        )}
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                            {b.episode}화{b.episodeTitle ? ` · ${b.episodeTitle}` : ''}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                            <span style={{
                                fontSize: 11, fontWeight: 700,
                                padding: '1px 8px', borderRadius: 99,
                                background: 'rgba(108,99,255,0.15)',
                                color: '#9d97ff',
                                border: '1px solid rgba(108,99,255,0.25)',
                            }}>
                                ▶ {b.timeLabel}
                            </span>
                        </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                        onClick={e => {
                            e.stopPropagation()
                            if (user?.uid) removeBookmark(user.uid, profileId, b.id)
                        }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-faint)', padding: 4, borderRadius: 6,
                            flexShrink: 0, transition: 'color .15s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'}
                        title="북마크 삭제"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    )
}