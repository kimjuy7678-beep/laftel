'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useState } from 'react'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

export default function DayNewSection() {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()
    const today = new Date().getDay()
    // 일(0)→6, 월(1)→0 변환
    const todayIdx = today === 0 ? 6 : today - 1
    const [activeDay, setActiveDay] = useState(todayIdx)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    // 요일별로 aniList 슬라이싱 (실제론 방영일 기준으로 필터해야 함)
    const dayItems = aniList.slice(activeDay * 8, activeDay * 8 + 8)

    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .dn-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .dn-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .dn-title { font-size: 20px; font-weight: 800; color: #fff; margin: 0; }
                .dn-tabs { display: flex; gap: 4px; }
                .dn-tab { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: none; color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
                .dn-tab:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
                .dn-tab.active { background: #6c63ff; border-color: #6c63ff; color: #fff; }
                .dn-list { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
                .dn-card { cursor: pointer; border-radius: 8px; overflow: hidden; background: #111; border: 1px solid rgba(255,255,255,0.06); transition: transform .2s; }
                .dn-card:hover { transform: translateY(-3px); }
                .dn-thumb { width: 100%; aspect-ratio: 3/4; overflow: hidden; }
                .dn-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .dn-thumb-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: rgba(255,255,255,0.07); background: #1a1a1a; }
                .dn-info { padding: 8px 10px; }
                .dn-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            `}</style>
            <div className="dn-wrap">
                <div className="dn-head">
                    <h2 className="dn-title">요일별 신작</h2>
                    <div className="dn-tabs">
                        {DAYS.map((d, i) => (
                            <button key={d} className={`dn-tab${activeDay === i ? ' active' : ''}`} onClick={() => setActiveDay(i)}>{d}</button>
                        ))}
                    </div>
                </div>
                <div className="dn-list">
                    {dayItems.map((ani: any) => (
                        <div key={ani.id} className="dn-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                            <div className="dn-thumb">
                                {ani.poster_path
                                    ? <img src={`https://image.tmdb.org/t/p/w342${ani.poster_path}`} alt={ani.name} />
                                    : <div className="dn-thumb-np">{(ani.name||'?')[0]}</div>
                                }
                            </div>
                            <div className="dn-info">
                                <p className="dn-name">{ani.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
