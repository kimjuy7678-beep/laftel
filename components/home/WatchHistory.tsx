'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchProgressStore } from '@/store/useWatchProgressStore'

export default function WatchHistory() {
    const router = useRouter()
    const { user } = useAuthStore()
    const { items, loading, fetchProgress } = useWatchProgressStore()

    const profileId = user?.currentProfileId || user?.profileId || 'main'


    useEffect(() => {
        if (user?.uid && profileId) {
            useWatchProgressStore.setState({ items: [] })
            fetchProgress(user.uid, profileId)
        }
    }, [user?.uid, profileId])

    if (!user || loading || items.length === 0) return null

    return (
        <section>
            <style>{`
                .wh-wrap { width: 90%; margin: 0 auto; padding: 48px 0 0; }
                .wh-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
                .wh-title { font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.4px; margin: 0; }
                .wh-more { font-size: 12px; color: var(--text-subtle); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 3px; transition: color .2s; }
                .wh-more:hover { color: var(--text-high); }
                .wh-more svg { width: 12px; height: 12px; }
                .wh-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
                .wh-card { cursor: pointer; transition: transform .22s cubic-bezier(.25,.46,.45,.94); }
                .wh-card:hover { transform: translateY(-4px); }
                .wh-card:hover .wh-img { transform: scale(1.04); }
                .wh-card:hover .wh-play { opacity: 1; transform: translate(-50%,-50%) scale(1); }
                .wh-thumb { width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; position: relative; background: var(--bg-secondary); margin-bottom: 12px; }
                .wh-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
                .wh-img-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: var(--border-faint); }
                .wh-play { position: absolute; top: 50%; left: 50%; z-index: 3; transform: translate(-50%,-50%) scale(0.85); width: 48px; height: 48px; border-radius: 50%; background: rgba(0,0,0,0.45); border: 2px solid rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: all .2s; pointer-events: none; }
                .wh-play svg { width: 16px; height: 16px; fill: #fff; margin-left: 3px; }
                .wh-progress { position: absolute; bottom: 0; left: 0; right: 0; z-index: 2; height: 4px; background: var(--border); }
                .wh-progress-bar { height: 100%; background: #6c5ce7; }
                .wh-name { font-size: 15px; font-weight: 700; color: var(--text-primary); overflow: hidden; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 4px; line-height: 1.3; }
                .wh-ep { font-size: 12px; color: var(--text-subtle); line-height: 1.4; }
                @media (max-width: 980px) {
                    .wh-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
                }
                @media (max-width: 640px) {
                    .wh-wrap { width: calc(100% - 32px); padding-top: 40px; }
                    .wh-grid { display: flex; gap: 12px; margin-right: -16px; padding-right: 16px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
                    .wh-grid::-webkit-scrollbar { display: none; }
                    .wh-card { flex: 0 0 min(78vw, 320px); scroll-snap-align: start; }
                    .wh-title { font-size: 19px; }
                }
            `}</style>

            <div className="wh-wrap">
                <div className="wh-head">
                    <h2 className="wh-title">이어서 정주행하기</h2>
                    <button className="wh-more" onClick={() => router.push('/library?tab=recent')}>
                        전체보기
                        <svg viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
                <div className="wh-grid">
                    {items.slice(0, 5).map((item) => (
                        <div key={item.tmdbId} className="wh-card" onClick={() => router.push(`/anime/${item.tmdbId}`)}>
                            <div className="wh-thumb">
                                {item.backdrop
                                    ? <img className="wh-img" src={item.backdrop.startsWith('http') ? item.backdrop : `https://image.tmdb.org/t/p/w780${item.backdrop}`} alt={item.title} />
                                    : item.poster
                                        ? <img className="wh-img" src={item.poster.startsWith('http') ? item.poster : `https://image.tmdb.org/t/p/w780${item.poster}`} alt={item.title} />
                                        : <div className="wh-img-fallback">{item.title?.[0] ?? '?'}</div>
                                }
                                <div className="wh-play">
                                    <svg viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" /></svg>
                                </div>
                                <div className="wh-progress">
                                    <div className="wh-progress-bar" style={{ width: `${item.progress ?? 5}%` }} />
                                </div>
                            </div>
                            <p className="wh-name">{item.title}</p>
                            <p className="wh-ep">{item.episode}화{item.episodeTitle ? ` · ${item.episodeTitle}` : ''}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
