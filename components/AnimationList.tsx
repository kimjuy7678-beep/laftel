'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAniStore } from '../store/useAniStore'
import { AniItem } from '../types/animation'

const GENRE_MAP: Record<number, string> = {
    16: '애니', 10759: '액션', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 27: '공포',
    10751: '가족', 10749: '로맨스', 80: '범죄', 53: '스릴러',
}

function AniCard({ ani }: { ani: AniItem }) {
    const { aniVideos, onFetchVideo } = useAniStore()
    const router = useRouter()
    const [hovered, setHovered] = useState(false)
    const [showIframe, setShowIframe] = useState(false)
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const iframeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const video = aniVideos[ani.id]
    const trailerKey = video?.key || null
    const poster = ani.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${ani.backdrop_path}`
        : null
    const score = Math.round(ani.vote_average * 10) / 10
    const year = ani.first_air_date?.slice(0, 4) || ''
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)

    const handleMouseEnter = async () => {
        hoverTimer.current = setTimeout(async () => {
            setHovered(true)
            await onFetchVideo(ani.id, ani.name)
            iframeTimer.current = setTimeout(() => setShowIframe(true), 400)
        }, 200)
    }

    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        if (iframeTimer.current) clearTimeout(iframeTimer.current)
        setHovered(false)
        setShowIframe(false)
    }

    return (
        <>
            <style>{`
                .ani-card {
                    border-radius: 12px;
                    overflow: hidden;
                    background: #111;
                    border: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                    transition: transform .25s, box-shadow .25s;
                }
                .ani-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.7);
                    border-color: rgba(255,255,255,0.12);
                }
                .ani-card-media {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: #1a1a1a;
                    overflow: hidden;
                }
                .ani-card-thumb {
                    position: absolute; inset: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    transition: opacity .3s;
                }
                .ani-card-thumb.fade { opacity: 0; }
                .ani-card-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 32px; font-weight: 800;
                    color: rgba(255,255,255,0.07);
                }
                .ani-card-iframe {
                    position: absolute; inset: 0;
                    width: 100%; height: 100%;
                    border: none;
                    opacity: 0;
                    transition: opacity .4s;
                    pointer-events: none;
                }
                .ani-card-iframe.visible {
                    opacity: 1;
                    pointer-events: auto;
                }
                .ani-card-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
                    pointer-events: none;
                }
                .ani-card-score {
                    position: absolute; top: 8px; right: 8px;
                    background: rgba(0,0,0,0.72);
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 5px;
                    padding: 3px 7px;
                    font-size: 11px; font-weight: 700; color: #fbbf24;
                    pointer-events: none;
                }

                /* 바디 고정 높이 - 항상 같은 공간 차지 */
                .ani-card-body {
                    height: 100px;
                    padding: 10px 14px;
                    position: relative;
                    overflow: hidden;
                }

                /* 기본 상태 - 제목만 */
                .ani-card-default {
                    position: absolute;
                    inset: 0; padding: 10px 14px;
                    display: flex; align-items: center;
                    transition: opacity .2s, transform .2s;
                }
                .ani-card-default.hide {
                    opacity: 0;
                    transform: translateY(-6px);
                    pointer-events: none;
                }
                .ani-card-title {
                    font-size: 13px; font-weight: 700;
                    color: rgba(255,255,255,0.85);
                    margin: 0;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                }

                /* 호버 상태 - 메타 + 버튼 */
                .ani-card-hover {
                    position: absolute;
                    inset: 0; padding: 10px 14px;
                    display: flex; flex-direction: column; justify-content: space-between;
                    transition: opacity .2s, transform .2s;
                    opacity: 0;
                    transform: translateY(6px);
                    pointer-events: none;
                }
                .ani-card-hover.show {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .ani-card-title-hov {
                    font-size: 13px; font-weight: 700;
                    color: rgba(255,255,255,0.92);
                    margin: 0 0 4px;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                }
                .ani-card-meta {
                    display: flex; align-items: center;
                    gap: 5px; margin-bottom: 8px;
                }
                .ani-card-year {
                    font-size: 11px; color: rgba(255,255,255,0.3);
                }
                .ani-card-genre {
                    font-size: 11px; color: rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.06);
                    padding: 2px 7px; border-radius: 3px;
                }
                .ani-card-actions {
                    display: flex; gap: 7px;
                }
                .ani-card-play {
                    flex: 1;
                    display: flex; align-items: center; justify-content: center; gap: 5px;
                    height: 28px;
                    background: #6c63ff; border: none; border-radius: 6px;
                    color: #fff; font-size: 11px; font-weight: 600;
                    cursor: pointer; transition: background .2s;
                }
                .ani-card-play:hover { background: #5a52e0; }
                .ani-card-add {
                    width: 28px; height: 28px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px; cursor: pointer;
                    color: rgba(255,255,255,0.5);
                    transition: all .2s;
                }
                .ani-card-add:hover { background: rgba(255,255,255,0.13); color: #fff; }
            `}</style>

            <li
                className="ani-card"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => router.push(`/anime/${ani.id}`)}
            >
                {/* 미디어 */}
                <div className="ani-card-media">
                    {poster
                        ? <img
                            className={`ani-card-thumb${showIframe && trailerKey ? ' fade' : ''}`}
                            src={poster}
                            alt={ani.name}
                            loading="lazy"
                          />
                        : <div className="ani-card-np">{(ani.name || '?')[0]}</div>
                    }
                    {hovered && trailerKey && (
                        <iframe
                            className={`ani-card-iframe${showIframe ? ' visible' : ''}`}
                            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${trailerKey}`}
                            allow="autoplay"
                        />
                    )}
                    <div className="ani-card-overlay" />
                    {score > 0 && <span className="ani-card-score">★ {score}</span>}
                </div>

                {/* 바디 — 고정 높이, 두 레이어가 겹쳐서 전환 */}
                <div className="ani-card-body">
                    {/* 기본: 제목만 */}
                    <div className={`ani-card-default${hovered ? ' hide' : ''}`}>
                        <p className="ani-card-title">{ani.name}</p>
                    </div>

                    {/* 호버: 제목 + 메타 + 버튼 */}
                    <div className={`ani-card-hover${hovered ? ' show' : ''}`}>
                        <div>
                            <p className="ani-card-title-hov">{ani.name}</p>
                            <div className="ani-card-meta">
                                {year && <span className="ani-card-year">{year}</span>}
                                {genres.map(g => <span key={g} className="ani-card-genre">{g}</span>)}
                            </div>
                        </div>
                        <div className="ani-card-actions">
                            <button
                                className="ani-card-play"
                                onClick={e => { e.stopPropagation(); router.push(`/anime/${ani.id}`) }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5,3 19,12 5,21"/>
                                </svg>
                                재생
                            </button>
                            <button
                                className="ani-card-add"
                                onClick={e => e.stopPropagation()}
                                title="찜하기"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        </>
    )
}

const AniList = () => {
    const { aniList, onFetchAni } = useAniStore()

    useEffect(() => {
        onFetchAni()
    }, [])

    return (
        <ul className="list grid grid-cols-4 gap-5">
            {aniList.map((ani: AniItem) => (
                <AniCard key={ani.id} ani={ani} />
            ))}
        </ul>
    )
}

export default AniList
