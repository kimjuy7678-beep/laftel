'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect } from 'react'
import { usePreviewStore } from '@/store/usePreviewStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import Image from 'next/image'

interface Props { genre: number; title: string; rows?: number }

export default function ThemeRowSection({ genre, title, rows = 2 }: Props) {
    const { onFetchAni } = useAniStore()
    const router = useRouter()
    const { setPreviewId } = usePreviewStore()
    const aniList = useFilteredAniList();

    useEffect(() => { if (aniList.length === 0) onFetchAni() }, [])

    const items = aniList.filter((a: any) => a.genre_ids?.includes(genre)).slice(0, rows * 4)
    if (items.length === 0) return null

    const BADGE_MAP: Record<number, string[]> = {
        10759: ['선독점'], 14: ['더빙'], 10749: ['ONLY'], 10751: ['더빙', 'ONLY'],
    }

    return (
        <section style={{ padding: '80px 0 0' }}>
            <style>{`
                .tr-wrap { width: 90%; margin: 0 auto; }
                .tr-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
                .tr-title { font-size: 25px; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.4; }
                .tr-more { font-size: 12px; color: var(--text-subtle); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 3px; transition: color .2s; white-space: nowrap; }
                .tr-more:hover { color: var(--text-high); }
                .tr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
                .tr-card { cursor: pointer; border-radius: 10px; overflow: hidden; transition: transform .22s cubic-bezier(.25,.46,.45,.94); }
                .tr-card:hover { transform: translateY(-4px); }
                .tr-card:hover .tr-img { transform: scale(1.05); }
                .tr-thumb { width: 100%; aspect-ratio: 16 / 9; position: relative; overflow: hidden; background: var(--bg-secondary); }
                .tr-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .25s; }
                .tr-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: var(--border-subtle); }
                .tr-badges { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px; }
                .tr-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; line-height: 1.6; }
                .tr-badge-excl { background: #6c5ce7; color: #fff; }
                .tr-badge-dub { background: rgba(0,0,0,0.55); color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.15); }
                .tr-badge-only { background: #6c5ce7; color: #fff; }
                .tr-info { padding: 10px 10px 12px; }
                .tr-name { font-size: 18px; font-weight: 600; color: var(--text-high); margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.4; }
                @media (max-width: 900px) {
                    .tr-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
                    .tr-title { font-size: 22px; }
                }
                @media (max-width: 640px) {
                    .tr-wrap { width: calc(100% - 32px); }
                    .tr-head { align-items: flex-start; }
                    .tr-title { font-size: 20px; }
                    .tr-grid { display: flex; gap: 12px; margin-right: -16px; padding-right: 16px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
                    .tr-grid::-webkit-scrollbar { display: none; }
                    .tr-card { flex: 0 0 min(78vw, 320px); scroll-snap-align: start; }
                    .tr-name { font-size: 15px; }
                }
            `}</style>

            <div className="tr-wrap">
                <div className="tr-head">
                    <h2 className="tr-title">{title}</h2>
                    {/* <button className="tr-more" onClick={() => router.push(`/genre/${genre}`)}>
                        더보기
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button> */}
                </div>
                <div className="tr-grid">
                    {items.map((ani: any, idx: number) => {
                        const badges = BADGE_MAP[genre] || []
                        const showBadge = idx % 3 === 0 && badges.length > 0
                        return (
                            <div key={ani.id} className="tr-card" onClick={() => setPreviewId(ani.id)}>
                                <div className="tr-thumb">
                                    {ani.backdrop_path
                                        ? <Image className="tr-img" src={`https://image.tmdb.org/t/p/w780${ani.backdrop_path}`} alt={ani.name} fill sizes="(max-width:640px) 78vw, 25vw" style={{ objectFit: 'cover' }} />
                                        : <div className="tr-np">{(ani.name || '?')[0]}</div>
                                    }
                                    {showBadge && (
                                        <div className="tr-badges">
                                            {badges.map(b => (
                                                <span key={b} className={`tr-badge ${b === '선독점' ? 'tr-badge-excl' : b === '더빙' ? 'tr-badge-dub' : 'tr-badge-only'}`}>{b}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="tr-info"><p className="tr-name">{ani.name}</p></div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
