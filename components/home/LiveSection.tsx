'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'
import { useAniStore } from '@/store/useAniStore'
import channels from '@/data/channels.json'

export default function LiveSection() {
    const router = useRouter()
    const { aniDetails, onFetchDetail } = useAniStore()
    const schedule = useMemo(() => buildChannels(getTodaySeed()), [])
    const nowMin = nowInMinutes()

    // 각 채널의 현재 방영 중 아이템 추출
    const nowPlaying = useMemo(() => {
        return schedule.map((sch) => {
            const currentIdx = getCurrentIdx(sch.items, nowMin)
            const item = sch.items[currentIdx]
            const next = sch.items[currentIdx + 1]
            return { channelId: sch.id, item, next }
        })
    }, [schedule, nowMin])

    // 현재 방영 중인 tmdbId들 detail fetch
    useEffect(() => {
        nowPlaying.forEach(({ item }) => {
            if (item?.tmdbId) onFetchDetail(item.tmdbId)
        })
    }, [])

    return (
        <section>
            <style>{`
                .lv-wrap { width: 90%; margin: 0 auto; padding: 48px 0 0; }

                .lv-head { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
                .lv-dot { width: 12px; height: 12px; border-radius: 50%; background: #e84040; flex-shrink: 0; animation: lv-ping 1.4s ease-in-out infinite; }
                @keyframes lv-ping {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.25); }
                }
                .lv-title { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.4px; }
                .lv-schedule-btn {
                    padding: 4px 12px; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: rgba(255,255,255,0.5);
                    font-size: 12px; font-weight: 500;
                    cursor: pointer; transition: all .18s;
                }
                .lv-schedule-btn:hover { color: #fff; border-color: rgba(255,255,255,0.5); }

                .lv-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }

                .lv-card { cursor: pointer; transition: transform .22s cubic-bezier(.25,.46,.45,.94); }
                .lv-card:hover { transform: translateY(-4px); }
                .lv-card:hover .lv-img { transform: scale(1.04); }
                .lv-card:hover .lv-play { opacity: 1; transform: translate(-50%,-50%) scale(1); }

                .lv-ch-logo-wrap { display: flex; align-items: center; margin-bottom: 10px; padding: 0 2px; }
                .lv-ch-logo { height: 22px; width: auto; object-fit: contain;}

                .lv-thumb {
                    width: 100%; aspect-ratio: 16 / 9;
                    border-radius: 12px; overflow: hidden; position: relative;
                    background: #1a1a22;
                    border: 1px solid rgba(255,255,255,0.08);
                    margin-bottom: 14px;
                }
                .lv-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
                .lv-img-fallback {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 32px; font-weight: 800; color: rgba(255,255,255,0.05);
                }

                .lv-badge {
                    position: absolute; top: 10px; left: 10px; z-index: 2;
                    display: flex; align-items: center; gap: 5px;
                    background: #e84040; color: #fff;
                    font-size: 11px; font-weight: 800;
                    padding: 3px 9px; border-radius: 6px;
                    letter-spacing: 0.5px; line-height: 1.5;
                }
                .lv-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #fff; animation: lv-ping 1.4s ease-in-out infinite; }

                .lv-play {
                    position: absolute; top: 50%; left: 50%; z-index: 3;
                    transform: translate(-50%,-50%) scale(0.85);
                    width: 44px; height: 44px; border-radius: 50%;
                    background: rgba(232,64,64,0.85);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: all .2s; pointer-events: none;
                }
                .lv-play svg { width: 16px; height: 16px; fill: #fff; margin-left: 3px; }

                .lv-info { padding: 0 2px; }
                .lv-name {
                    font-size: 16px; font-weight: 700; color: #fff;
                    margin-bottom: 5px; line-height: 1.4;
                    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
                }
                .lv-ep {
                    font-size: 13px; color: rgba(255,255,255,0.4);
                    margin-bottom: 10px; line-height: 1.4;
                    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
                }
                .lv-meta {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px; padding: 5px 12px;
                    font-size: 12px; color: rgba(255,255,255,0.45);
                }
                .lv-meta svg { width: 13px; height: 13px; opacity: 0.5; }
                .lv-next { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 6px; }
            `}</style>

            <div className="lv-wrap">
                <div className="lv-head">
                    <span className="lv-dot" />
                    <h2 className="lv-title">지금 실시간 방송 중</h2>
                    <button className="lv-schedule-btn" onClick={() => router.push('/live')}>
                        편성표
                    </button>
                </div>

                <div className="lv-grid">
                    {nowPlaying.map(({ channelId, item, next }) => {
                        const ch = channels.find((c) => c.id === channelId)
                        if (!ch || !item) return null
                        const detail = aniDetails[item.tmdbId]
                        const backdropUrl = detail?.backdrop_path
                            ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}`
                            : null

                        return (
                            <div key={channelId} className="lv-card" onClick={() => router.push(`/live/${ch.slug}`)}>
                                <div className="lv-ch-logo-wrap">
                                    <img className="lv-ch-logo" src={ch.logo} alt={ch.name} />
                                </div>

                                <div className="lv-thumb">
                                    {backdropUrl
                                        ? <img className="lv-img" src={backdropUrl} alt={item.koTitle} />
                                        : <div className="lv-img-fallback">{item.koTitle[0]}</div>
                                    }
                                    <span className="lv-badge">
                                        <span className="lv-badge-dot" />
                                        LIVE
                                    </span>
                                    <div className="lv-play">
                                        <svg viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" /></svg>
                                    </div>
                                </div>

                                <div className="lv-info">
                                    <p className="lv-name">{item.koTitle}</p>
                                    <p className="lv-ep">{item.time} 방영 중</p>
                                    <div className="lv-meta">
                                        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 8a4.5 4.5 0 0 1-3.6-1.8C4.6 9.4 6.2 9 8 9s3.4.4 3.6 1.2A4.5 4.5 0 0 1 8 12z" /></svg>
                                        {ch.name} 방영 중
                                    </div>
                                    {next && (
                                        <p className="lv-next">다음 · {next.time} {next.koTitle}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}