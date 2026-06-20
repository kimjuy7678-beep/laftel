'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePreviewStore } from '@/store/usePreviewStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useAuthStore } from '@/store/useAuthStore'

const IMG = 'https://image.tmdb.org/t/p'

type Season = { season_number: number; episode_count: number }
type Episode = {
    episode_number: number
    name?: string
    still_path?: string | null
    runtime?: number
}
type Detail = { seasons?: Season[] }

interface Props {
    detail: Detail | null
    episodes: Episode[]
    selectedSeason: number
    setSelectedSeason: (v: number) => void
}

export default function EpisodesTab({ detail, episodes, selectedSeason, setSelectedSeason }: Props) {
    const router = useRouter()
    const { previewId, setPreviewId } = usePreviewStore()
    const { items } = useWatchlistStore()
    const { user } = useAuthStore()
    const [now] = useState(() => Date.now())

    const purchasedItems = items.filter(i => i.tab === 'purchased' && i.id === (previewId ?? 0))

    const isUnlocked = (epNum: number) => {
        // 멤버십 있으면 전체 잠금 해제
        if (user?.membership && user.membership !== 'none') return true
        const item = purchasedItems.find(i => i.episodeNumber === epNum)
        if (!item) return false
        if (item.purchaseType === 'own') return true
        // 대여: 만료 여부 확인
        return item.rentExpiry ? now < item.rentExpiry : false
    }

    return (
        <div className="flex flex-col gap-2">
            <select
                value={selectedSeason}
                onChange={e => setSelectedSeason(Number(e.target.value))}
                className="mb-2 w-full cursor-pointer rounded-lg px-3 py-2 text-xs sm:mb-3 sm:w-fit sm:text-sm"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                }}
            >
                {(detail?.seasons || [])
                    .filter((s) => s.season_number > 0)
                    .map((s) => (
                        <option
                            key={s.season_number}
                            value={s.season_number}
                            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        >
                            시즌 {s.season_number} ({s.episode_count}화)
                        </option>
                    ))
                }
            </select>

            {episodes.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[#6c63ff] rounded-full animate-spin" />
                </div>
            ) : episodes.map((ep) => {
                const unlocked = isUnlocked(ep.episode_number)
                return (
                    <div
                        key={ep.episode_number}
                        className="group flex cursor-pointer items-center gap-2.5 rounded-xl p-2.5 transition-colors sm:gap-3 sm:p-3"
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                        onClick={() => {
                            // 잠겨있어도 애니 페이지로는 이동 (페이지에서 구매/멤버십 유도)
                            router.push(`/anime/${previewId}?ep=${ep.episode_number}`)
                            setPreviewId(null)
                        }}
                    >
                        {/* 썸네일 */}
                        <div
                            className="relative w-[92px] shrink-0 overflow-hidden rounded-lg sm:w-[110px] md:w-[120px]"
                            style={{ aspectRatio: '16/9', background: 'var(--bg-secondary)' }}
                        >
                            {ep.still_path
                                ? <img src={`${IMG}/w300${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xl font-black" style={{ color: 'var(--text-faint)' }}>{ep.episode_number}</div>
                            }

                            {/* 잠금 오버레이 */}
                            {!unlocked && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <span className="text-[8px] font-semibold text-white/70 sm:text-[9px]">구매 필요</span>
                                </div>
                            )}

                            {/* 재생 버튼 오버레이 (잠금 해제된 경우만) */}
                            {unlocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                        <polygon points="5,3 19,12 5,21" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* 에피소드 정보 */}
                        <div className="flex-1 min-w-0">
                            <div className="mb-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{ep.episode_number}화</p>
                                {!unlocked && (
                                    <span className="rounded px-1.5 py-0.5 text-[8px] font-bold sm:text-[9px]"
                                        style={{ background: 'rgba(108,99,255,0.15)', color: '#9d97ff' }}>
                                        대여 700원 · 소장 1,500원
                                    </span>
                                )}
                            </div>
                            <p className="truncate text-xs font-semibold sm:text-sm" style={{ color: unlocked ? 'var(--text-high)' : 'var(--text-subtle)' }}>
                                {ep.name}
                            </p>
                            {ep.runtime && (
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{ep.runtime}분</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
