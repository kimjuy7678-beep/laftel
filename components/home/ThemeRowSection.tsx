'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect } from 'react'

interface Props {
    genre: number
    title: string
    rows?: number  // 몇 줄 보여줄지 (기본 2줄 = 8개)
}

export default function ThemeRowSection({ genre, title, rows = 2 }: Props) {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const items = aniList
        .filter((a: any) => a.genre_ids?.includes(genre))
        .slice(0, rows * 4)

    if (items.length === 0) return null

    const BADGE_MAP: Record<number, string[]> = {
        10759: ['선독점'],
        14: ['더빙'],
        10749: ['ONLY'],
        10751: ['더빙', 'ONLY'],
    }

    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .tr-wrap { width: 90%; margin: 0 auto; }
                .tr-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .tr-title { font-size: 32px; font-weight: 800; color: #fff; margin: 0; line-height: 1.4; }
                .tr-more {
                    font-size: 12px; color: rgba(255,255,255,0.35);
                    background: none; border: none; cursor: pointer;
                    display: flex; align-items: center; gap: 3px; transition: color .2s; white-space: nowrap;
                }
                .tr-more:hover { color: rgba(255,255,255,0.7); }

                .tr-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                }

                .tr-card {
                    cursor: pointer;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #111;
                    transition: transform .22s cubic-bezier(.25,.46,.45,.94);
                }
                .tr-card:hover { transform: translateY(-4px); }
                .tr-card:hover .tr-img { transform: scale(1.05); }

                .tr-thumb {
                    width: 100%; aspect-ratio: 16 / 9;
                    position: relative; overflow: hidden; background: #1a1a1a;
                }
                .tr-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .25s; }
                .tr-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: rgba(255,255,255,0.07); }

                .tr-badges {
                    position: absolute; bottom: 8px; right: 8px;
                    display: flex; gap: 4px;
                }
                .tr-badge {
                    font-size: 10px; font-weight: 700;
                    padding: 2px 7px; border-radius: 4px; line-height: 1.6;
                }
                .tr-badge-excl { background: #6c5ce7; color: #fff; }
                .tr-badge-dub  { background: rgba(0,0,0,0.55); color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.15); }
                .tr-badge-only { background: #6c5ce7; color: #fff; }

                .tr-info { padding: 10px 10px 12px; }
                .tr-name {
                    font-size: 25px; font-weight: 600; color: rgba(255,255,255,0.88);
                    margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
                    line-height: 1.4;
                }
            `}</style>

            <div className="tr-wrap">
                <div className="tr-head">
                    <h2 className="tr-title">{title}</h2>
                    <button className="tr-more" onClick={() => router.push(`/genre/${genre}`)}>
                        더보기
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="tr-grid">
                    {items.map((ani: any, idx: number) => {
                        const badges = BADGE_MAP[genre] || []
                        const showBadge = idx % 3 === 0 && badges.length > 0

                        return (
                            <div key={ani.id} className="tr-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                                <div className="tr-thumb">
                                    {ani.backdrop_path
                                        ? <img className="tr-img" src={`https://image.tmdb.org/t/p/w780${ani.backdrop_path}`} alt={ani.name} />
                                        : <div className="tr-np">{(ani.name || '?')[0]}</div>
                                    }
                                    {showBadge && (
                                        <div className="tr-badges">
                                            {badges.map(b => (
                                                <span key={b} className={`tr-badge ${b === '선독점' ? 'tr-badge-excl' : b === '더빙' ? 'tr-badge-dub' : 'tr-badge-only'}`}>
                                                    {b}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="tr-info">
                                    <p className="tr-name">{ani.name}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}