'use client'

import { useEffect, useState, useRef } from 'react'

// ─── 타입 ──────────────────────────────────────────
interface AniItem {
    id: number
    name: string
    overview: string
    poster_path: string | null
    backdrop_path: string | null
    first_air_date: string
    vote_average: number
    genre_ids: number[]
}

// ─── 상수 ──────────────────────────────────────────
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG_BASE = 'https://image.tmdb.org/t/p'

const DAYS = [
    { id: 0, label: '월' },
    { id: 1, label: '화' },
    { id: 2, label: '수' },
    { id: 3, label: '목' },
    { id: 4, label: '금' },
    { id: 5, label: '토' },
    { id: 6, label: '일' },
]

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    10751: '가족', 14: '판타지', 27: '호러', 9648: '미스터리',
    10765: 'SF·판타지', 10762: '어린이',
}

// JS getDay(): 0=일,1=월...6=토  →  내 탭 idx: 0=월...6=일
function jsDateDayToTabIdx(jsDay: number): number {
    return jsDay === 0 ? 6 : jsDay - 1
}

// 이번 주 월요일부터 7일치 날짜 배열 반환 (tab idx 0~6 순서)
function getWeekDates(): string[] {
    const today = new Date()
    const jsDay = today.getDay() // 0=일
    const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)

    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return d.toISOString().slice(0, 10)
    })
}

// ─── 카드 ──────────────────────────────────────────
function AniCard({ ani }: { ani: AniItem }) {
    const [hovered, setHovered] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const poster = ani.poster_path
        ? `${IMG_BASE}/w342${ani.poster_path}`
        : null
    const backdrop = ani.backdrop_path
        ? `${IMG_BASE}/w780${ani.backdrop_path}`
        : null

    const score = Math.round(ani.vote_average * 10) / 10
    const year = ani.first_air_date?.slice(0, 4) || ''
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)

    return (
        <li
            className="ani-card"
            onMouseEnter={() => { timer.current = setTimeout(() => setHovered(true), 180) }}
            onMouseLeave={() => { if (timer.current) clearTimeout(timer.current); setHovered(false) }}
        >
            <div className="card-thumb">
                {poster
                    ? <img src={poster} alt={ani.name} loading="lazy" />
                    : <div className="no-poster"><span>{ani.name[0]}</span></div>
                }
                {score > 0 && <span className="score-badge">★ {score}</span>}
            </div>
            <div className="card-info">
                <p className="card-title">{ani.name}</p>
                <p className="card-meta">{year}{genres.length ? ` · ${genres.join(' · ')}` : ''}</p>
            </div>

            {hovered && (
                <div className="hover-panel">
                    {backdrop
                        ? <div className="hover-backdrop"><img src={backdrop} alt="" /><div className="hb-overlay" /></div>
                        : <div className="hb-fallback" />
                    }
                    <div className="hover-body">
                        <p className="h-title">{ani.name}</p>
                        {genres.length > 0 && (
                            <div className="h-genres">
                                {genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
                            </div>
                        )}
                        <p className="h-overview">
                            {ani.overview
                                ? ani.overview.slice(0, 90) + (ani.overview.length > 90 ? '…' : '')
                                : '줄거리 정보가 없습니다.'}
                        </p>
                        <div className="h-actions">
                            <button className="btn-play">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                재생
                            </button>
                            <button className="btn-add" aria-label="찜">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </li>
    )
}

function SkeletonCard() {
    return (
        <li className="sk-card">
            <div className="sk-thumb" />
            <div className="sk-line" style={{ width: '75%' }} />
            <div className="sk-line" style={{ width: '50%', height: 10, marginTop: 5 }} />
        </li>
    )
}

// ─── 메인 ──────────────────────────────────────────
export default function DayNew() {
    const weekDates = useRef(getWeekDates())
    const todayTabIdx = jsDateDayToTabIdx(new Date().getDay())
    const [activeDay, setActiveDay] = useState(todayTabIdx)
    const [cache, setCache] = useState<Record<number, AniItem[]>>({})
    const [loading, setLoading] = useState(false)
    const tabsRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLSpanElement>(null)

    // 인디케이터 위치
    useEffect(() => {
        if (!tabsRef.current || !indicatorRef.current) return
        const btn = tabsRef.current.querySelector<HTMLButtonElement>(`[data-idx="${activeDay}"]`)
        if (!btn) return
        indicatorRef.current.style.left = `${btn.offsetLeft}px`
        indicatorRef.current.style.width = `${btn.offsetWidth}px`
    }, [activeDay])

    // 데이터 fetch — 해당 날짜 하루를 air_date로 쿼리
    useEffect(() => {
        if (cache[activeDay] !== undefined) return

        const date = weekDates.current[activeDay] // e.g. "2026-05-18"

        const fetchData = async () => {
            setLoading(true)
            try {
                let results: AniItem[] = []
                // 페이지 2장 정도면 충분 (하루치라 많지 않음)
                for (let page = 1; page <= 2; page++) {
                    const url =
                        `https://api.themoviedb.org/3/discover/tv` +
                        `?api_key=${TMDB_KEY}` +
                        `&with_genres=16` +
                        `&with_original_language=ja` +
                        `&air_date.gte=${date}` +
                        `&air_date.lte=${date}` +
                        `&sort_by=popularity.desc` +
                        `&language=ko-KR` +
                        `&page=${page}`
                    const res = await fetch(url)
                    const data = await res.json()
                    if (!data.results?.length) break
                    results = [...results, ...data.results]
                }
                setCache(prev => ({ ...prev, [activeDay]: results }))
            } catch {
                setCache(prev => ({ ...prev, [activeDay]: [] }))
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [activeDay])

    const list = cache[activeDay] ?? []

    return (
        <>
            <style>{`
                .day-page { min-height: 100vh; background: #0a0a0a; padding: 90px 0 80px; }
                .day-inner { max-width: 1400px; margin: 0 auto; padding: 0 32px; }

                /* 헤더 */
                .page-header { margin-bottom: 32px; }
                .page-header h1 { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 6px; letter-spacing: -.5px; }
                .page-header p { font-size: 13px; color: rgba(255,255,255,.3); margin: 0; }

                /* 탭 */
                .tabs-wrap { border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 32px; }
                .tabs { display: flex; gap: 0; position: relative; }
                .day-btn {
                    position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
                    padding: 12px 22px 16px; background: none; border: none; cursor: pointer;
                    color: rgba(255,255,255,.3); font-size: 15px; font-weight: 600;
                    transition: color .2s;
                }
                .day-btn:hover { color: rgba(255,255,255,.65); }
                .day-btn.active { color: #fff; }
                .today-dot { width: 4px; height: 4px; border-radius: 50%; background: #6c63ff; opacity: 0; transition: opacity .2s; }
                .day-btn.is-today .today-dot { opacity: 1; }
                .tab-line {
                    position: absolute; bottom: -1px; height: 2px;
                    background: #6c63ff; border-radius: 2px 2px 0 0;
                    transition: left .22s cubic-bezier(.4,0,.2,1), width .22s cubic-bezier(.4,0,.2,1);
                    pointer-events: none;
                }

                /* 결과수 */
                .result-count { font-size: 13px; color: rgba(255,255,255,.3); margin: 0 0 20px; }
                .cnt { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 16px; padding: 0 5px; border-radius: 8px; background: rgba(108,99,255,.22); color: #9d97ff; font-size: 10px; font-weight: 700; margin-left: 5px; }

                /* 날짜 표시 */
                .date-label { font-size: 12px; color: rgba(255,255,255,.2); margin: 0 0 24px; }

                /* 그리드 */
                .ani-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 20px 14px; }

                /* 카드 */
                .ani-card { position: relative; cursor: pointer; }
                .card-thumb { position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 8px; overflow: hidden; background: #181818; }
                .card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
                .ani-card:hover .card-thumb img { transform: scale(1.04); }
                .no-poster { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#1a1a2e,#16213e); }
                .no-poster span { font-size: 36px; font-weight: 800; color: rgba(255,255,255,.15); }
                .score-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,.72); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,.1); border-radius: 4px; padding: 2px 7px; font-size: 11px; font-weight: 700; color: #fbbf24; }
                .card-info { margin-top: 9px; }
                .card-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.88); line-height: 1.4; margin: 0 0 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                .card-meta { font-size: 11px; color: rgba(255,255,255,.28); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                /* 호버 패널 */
                .hover-panel { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 255px; border-radius: 10px; overflow: hidden; background: #1c1c1e; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 20px 55px rgba(0,0,0,.75); z-index: 200; animation: panelIn .16s cubic-bezier(.34,1.56,.64,1); }
                @keyframes panelIn { from { opacity:0; transform:translateX(-50%) scale(.93); } to { opacity:1; transform:translateX(-50%) scale(1); } }
                .hover-backdrop { position: relative; width: 100%; aspect-ratio: 16/9; }
                .hover-backdrop img { width: 100%; height: 100%; object-fit: cover; }
                .hb-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, #1c1c1e 100%); }
                .hb-fallback { width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg,#1a1a2e,#16213e); }
                .hover-body { padding: 10px 14px 14px; }
                .h-title { font-size: 13px; font-weight: 700; color: #fff; margin: 0 0 7px; line-height: 1.3; }
                .h-genres { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 7px; }
                .genre-tag { font-size: 10px; color: rgba(255,255,255,.45); background: rgba(255,255,255,.07); border-radius: 3px; padding: 2px 6px; }
                .h-overview { font-size: 11px; color: rgba(255,255,255,.4); line-height: 1.6; margin: 0 0 11px; }
                .h-actions { display: flex; gap: 7px; }
                .btn-play { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; height: 32px; background: #6c63ff; border: none; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .2s; }
                .btn-play:hover { background: #5a52e0; }
                .btn-add { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 6px; color: rgba(255,255,255,.65); cursor: pointer; transition: all .2s; }
                .btn-add:hover { background: rgba(255,255,255,.14); color: #fff; }

                /* 스켈레톤 */
                .sk-card { list-style: none; }
                .sk-thumb { width: 100%; aspect-ratio: 2/3; border-radius: 8px; background: linear-gradient(90deg,#1a1a1a 25%,#232323 50%,#1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
                .sk-line { height: 12px; border-radius: 4px; margin-top: 10px; background: linear-gradient(90deg,#1a1a1a 25%,#232323 50%,#1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

                /* 빈 상태 */
                .empty { grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 10px; }
                .empty svg { color: rgba(255,255,255,.1); }
                .empty p { font-size: 13px; color: rgba(255,255,255,.22); margin: 0; }
            `}</style>

            <div className="day-page">
                <div className="day-inner">
                    <div className="page-header">
                        <h1>요일별 신작</h1>
                        <p>이번 주 방영 중인 애니메이션</p>
                    </div>

                    {/* 탭 */}
                    <div className="tabs-wrap">
                        <div className="tabs" ref={tabsRef}>
                            {DAYS.map(d => (
                                <button
                                    key={d.id}
                                    data-idx={d.id}
                                    className={`day-btn${activeDay === d.id ? ' active' : ''}${d.id === todayTabIdx ? ' is-today' : ''}`}
                                    onClick={() => setActiveDay(d.id)}
                                >
                                    {d.label}
                                    <span className="today-dot" />
                                </button>
                            ))}
                            <span className="tab-line" ref={indicatorRef} />
                        </div>
                    </div>

                    {/* 날짜 + 결과수 */}
                    {!loading && (
                        <p className="result-count">
                            {weekDates.current[activeDay]}
                            {list.length > 0 && <span className="cnt">{list.length}</span>}
                        </p>
                    )}

                    {/* 그리드 */}
                    <ul className="ani-grid">
                        {loading
                            ? Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} />)
                            : list.length === 0
                                ? (
                                    <li className="empty">
                                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                        </svg>
                                        <p>이 날 방영 정보가 없어요</p>
                                    </li>
                                )
                                : list.map(ani => <AniCard key={ani.id} ani={ani} />)
                        }
                    </ul>
                </div>
            </div>
        </>
    )
}
