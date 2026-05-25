'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect } from 'react'

export default function WatchHistory() {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    // TODO: 실제 시청 기록으로 교체
    const history = aniList.slice(10, 16)
    if (history.length === 0) return null

    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .wh-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .wh-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .wh-title { font-size: 20px; font-weight: 800; color: #fff; margin: 0; }
                .wh-more { font-size: 13px; color: rgba(255,255,255,0.35); background: none; border: none; cursor: pointer; transition: color .2s; }
                .wh-more:hover { color: rgba(255,255,255,0.7); }
                .wh-list { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
                .wh-card { cursor: pointer; border-radius: 10px; overflow: hidden; background: #111; border: 1px solid rgba(255,255,255,0.06); transition: transform .2s; }
                .wh-card:hover { transform: translateY(-3px); }
                .wh-thumb { position: relative; width: 100%; aspect-ratio: 16/9; }
                .wh-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .wh-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.1); }
                .wh-progress-bar { height: 100%; background: #6c63ff; border-radius: 0 2px 2px 0; }
                .wh-info { padding: 8px 10px 10px; }
                .wh-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .wh-ep { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
            `}</style>
            <div className="wh-wrap">
                <div className="wh-head">
                    <h2 className="wh-title">시청 목록</h2>
                    <button className="wh-more">전체보기 →</button>
                </div>
                <div className="wh-list">
                    {history.map((ani: any, i: number) => (
                        <div key={ani.id} className="wh-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                            <div className="wh-thumb">
                                {ani.backdrop_path && (
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} />
                                )}
                                <div className="wh-progress">
                                    <div className="wh-progress-bar" style={{ width: `${(i + 1) * 15}%` }} />
                                </div>
                            </div>
                            <div className="wh-info">
                                <p className="wh-name">{ani.name}</p>
                                <p className="wh-ep">{i + 1}화 시청중</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
