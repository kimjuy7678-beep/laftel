'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useState } from 'react'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const today = new Date().getDay()
const todayIdx = today === 0 ? 6 : today - 1

export default function DayNewSection() {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()
    const [activeDay, setActiveDay] = useState(todayIdx)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const dayItems = aniList.slice(activeDay * 6, activeDay * 6 + 6)

    return (
        <section>
            <style>{`
                .dn-wrap { width: 90%; margin: 0 auto; padding: 40px 0 0; }
                .dn-title { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.4px; margin-bottom: 16px; }

                .dn-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
                .dn-tab {
                    width: 52px; height: 52px; border-radius: 50%;
                    border: 1.5px solid rgba(255,255,255,0.15);
                    background: transparent;
                    color: rgba(255,255,255,0.45);
                    font-size: 15px; font-weight: 600;
                    cursor: pointer; transition: all .18s;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .dn-tab:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
                .dn-tab.active { background: #6c5ce7; border-color: #6c5ce7; color: #fff; }

                .dn-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 10px;
                }

                .dn-card {
                    cursor: pointer;
                    border-radius: 10px;
                    overflow: hidden;
                    position: relative;
                    background: #1e1e24;
                    transition: transform .22s cubic-bezier(.25,.46,.45,.94);
                }
                .dn-card:hover { transform: translateY(-4px); }
                .dn-card:hover .dn-img { transform: scale(1.05); }
                .dn-card:hover .dn-play { opacity: 1; transform: translate(-50%,-50%) scale(1); }

                .dn-img {
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    object-fit: cover;
                    display: block;
                    transition: transform .3s;
                }
                .dn-img-fallback {
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #1e1e24;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 28px; font-weight: 800; color: rgba(255,255,255,0.05);
                }

                .dn-gradient {
                    position: absolute; inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 50%, transparent 75%);
                    pointer-events: none;
                }

                .dn-play {
                    position: absolute; top: 50%; left: 50%; z-index: 3;
                    transform: translate(-50%,-50%) scale(0.85);
                    width: 38px; height: 38px; border-radius: 50%;
                    background: rgba(108,92,231,0.88);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: all .2s; pointer-events: none;
                }
                .dn-play svg { width: 13px; height: 13px; fill: #fff; margin-left: 2px; }

                .dn-up {
                    position: absolute; top: 8px; left: 8px; z-index: 2;
                    background: #e84040; color: #fff;
                    font-size: 10px; font-weight: 800;
                    padding: 2px 7px; border-radius: 5px;
                    letter-spacing: 0.3px; line-height: 1.6;
                }

                .dn-bottom {
                    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
                    padding: 10px 11px 11px;
                    display: flex; flex-direction: column; gap: 4px;
                }
                .dn-name {
                    font-size: 20px; font-weight: 700; color: #fff;
                    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
                    line-height: 1.3;
                }
                .dn-meta { display: flex; align-items: center; justify-content: space-between; }
                .dn-tags {
                    font-size: 12px; color: rgba(255,255,255,0.55);
                    display: flex; align-items: center; gap: 4px;
                    overflow: hidden;
                }
                .dn-tags span { white-space: nowrap; }
                .dn-tags-sep { color: rgba(255,255,255,0.2); }
                .dn-age {
                    display: inline-flex; align-items: center; justify-content: center;
                    min-width: 18px; height: 16px; border-radius: 3px;
                    font-size: 9px; font-weight: 800; padding: 0 3px; flex-shrink: 0;
                }
                .dn-age-all { background: #27ae60; color: #fff; }
                .dn-age-12  { background: #f39c12; color: #fff; }
                .dn-age-15  { background: #e74c3c; color: #fff; }
                .dn-age-19  { background: #333; color: #fff; border: 1px solid rgba(255,255,255,0.2); }
                .dn-exclusive {
                    background: #6c5ce7; color: #fff;
                    font-size: 10px; font-weight: 700;
                    padding: 2px 8px; border-radius: 5px;
                    line-height: 1.5; flex-shrink: 0;
                }
            `}</style>

            <div className="dn-wrap">
                <h2 className="dn-title">요일별 신작</h2>

                <div className="dn-tabs">
                    {DAYS.map((d, i) => (
                        <button
                            key={d}
                            className={`dn-tab${activeDay === i ? ' active' : ''}`}
                            onClick={() => setActiveDay(i)}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <div className="dn-grid">
                    {dayItems.map((ani: any, idx: number) => {
                        const vote = ani.vote_average ?? 0
                        const age = vote >= 8 ? 15 : vote >= 7 ? 12 : 0
                        const ageClass = age === 15 ? 'dn-age-15' : age === 12 ? 'dn-age-12' : 'dn-age-all'
                        const ageLabel = age === 0 ? 'ALL' : age
                        const isExclusive = idx % 3 === 0
                        const isUp = idx % 2 === 0

                        return (
                            <div key={ani.id} className="dn-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                                {ani.backdrop_path
                                    ? <img className="dn-img" src={`https://image.tmdb.org/t/p/w780${ani.backdrop_path}`} alt={ani.name} />
                                    : <div className="dn-img-fallback">{(ani.name || '?')[0]}</div>
                                }
                                <div className="dn-gradient" />
                                <div className="dn-play">
                                    <svg viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" /></svg>
                                </div>
                                {isUp && <span className="dn-up">UP</span>}
                                <div className="dn-bottom">
                                    <p className="dn-name">{ani.name}</p>
                                    <div className="dn-meta">
                                        <div className="dn-tags">
                                            <span>판타지·액션</span>
                                            <span className="dn-tags-sep">|</span>
                                            <span>TVA</span>
                                            <span className={`dn-age ${ageClass}`}>{ageLabel}</span>
                                        </div>
                                        {isExclusive && <span className="dn-exclusive">선독점</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}