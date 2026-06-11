'use client'

import { useEffect, useState, useRef } from 'react'
import CalendarModal from './CalendarModal'
import { useAniStore } from '@/store/useAniStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import { usePreviewStore } from '@/store/usePreviewStore'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const DAY_LABELS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
const today = new Date().getDay()
const todayIdx = today === 0 ? 6 : today - 1
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const todayDayName = DAY_NAMES[today]

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF·판타지', 9648: '미스터리', 10749: '로맨스',
    10751: '가족', 27: '호러', 53: '스릴러', 80: '범죄',
}

const getThumb = (ani: any, size: 'w342' | 'w780' = 'w342') =>
    ani.poster_path
        ? `https://image.tmdb.org/t/p/${size}${ani.poster_path}`
        : ani.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${ani.backdrop_path}`
            : null

const EmptyState = ({ message = '연령에 맞는 애니메이션이 없습니다', sub = '연령 설정을 변경해보세요' }) => (
    <div style={{
        gridColumn: '1 / -1',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 0', gap: 14,
    }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-faint)' }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-muted)' }}>{message}</p>
        <p style={{ fontSize: 14, margin: 0, color: 'var(--text-faint)' }}>{sub}</p>
    </div>
)

export default function DayNewPage() {
    const { onFetchAni, contentRatings } = useAniStore()
    const [activeDay, setActiveDay] = useState(todayIdx)
    const [showCalendar, setShowCalendar] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const { setPreviewId } = usePreviewStore()
    const aniList = useFilteredAniList()
    const restScrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const todayItems = aniList.slice(todayIdx * 20, todayIdx * 20 + 20)
    const featured = todayItems[0] ?? null
    const restItems = todayItems.slice(1)
    const popularTitle = featured?.name ?? ''

    const allDayItems = aniList.slice(activeDay * 20, activeDay * 20 + 40)
    const SHOW_LIMIT = 21
    const dayItems = showAll ? allDayItems : allDayItems.slice(0, SHOW_LIMIT)
    const hasMore = allDayItems.length > SHOW_LIMIT

    const getGenre = (ani: any) =>
        (ani.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 2).join('·') || '애니메이션'

    const handleCalendarSelect = (dateStr: string) => {
        const d = new Date(dateStr)
        setActiveDay(d.getDay() === 0 ? 6 : d.getDay() - 1)
    }

    return (
        <>
            <style>{`
/* ── 페이지 ─────────────────────────────── */
.page {
    min-height: 100vh;
    padding-top: 64px;
    background: var(--bg-primary);
    color: var(--text-primary);
}
.section {
    border-bottom: 1px solid var(--border-subtle);
}
.section:last-child { border-bottom: none; }

/* ── 요일탭 ─────────────────────────────── */
.dayTabs {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 28px;
}
.dayTab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-subtle);
    position: relative;
    transition: color .18s;
}
.dayTab:hover { color: var(--text-high); }
.dayTabActive { color: var(--text-primary); }
.dayTabActive::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: #6c5ce7;
    border-radius: 2px 2px 0 0;
}
.dayTabToday .dayTabLabel::after {
    content: '';
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #9d97ff;
    margin-left: 4px;
    vertical-align: middle;
    margin-bottom: 1px;
}
.dayTabLabel { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; }

/* ── 캘린더 버튼 ─────────────────────────── */
.calBtn {
    display: flex; align-items: center; gap: 6px;
    padding: 0 14px; height: 32px; border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-muted);
    font-size: 12px; font-weight: 600; cursor: pointer; transition: all .18s;
}
.calBtn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--text-subtle); }

/* ── 요일 그리드 ─────────────────────────── */
.dayGrid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px 15px;
    align-items: start;
}
.dayCard { cursor: pointer; align-self: start; }
.dayCard:hover .dayImg { transform: scale(1.04); }
.dayThumb {
    position: relative; border-radius: 6px;
    overflow: hidden; background: var(--bg-card);
    width: 100%; aspect-ratio: 3 / 4; margin-bottom: 6px;
}
.dayImg {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover;
    display: block; transition: transform .3s;
}
.dayFallback {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 800; color: var(--border);
}
.dayName {
    font-size: 16px; font-weight: 800;
    color: var(--text-high);
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    line-height: 1.3; padding: 7px 0;
}
.daySkeleton {
    border-radius: 6px; width: 100%; aspect-ratio: 3 / 4;
    background: var(--bg-secondary); animation: shimmer 1.6s infinite;
    margin-bottom: 6px;
}

/* ── 오늘 업데이트 레이아웃 ──────────────── */
.todayLayout {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 15px; align-items: stretch;
}
.featuredWrap {
    grid-column: span 2;
    display: flex; flex-direction: column; align-self: stretch;
}
.featuredCard {
    position: relative; border-radius: 10px;
    overflow: hidden; background: var(--bg-card);
    width: 100%; flex: 1; cursor: pointer; min-height: 0;
}
.featuredCard:hover .featuredImg { transform: scale(1.04); }
.featuredCard:hover .featuredBottom { opacity: 1; }
.featuredCard:hover .featuredGradient { opacity: 1; }
.featuredImg {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover;
    display: block; transition: transform .35s;
}
.featuredFallback {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; font-weight: 800; color: var(--border);
}
.featuredGradient {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,.95) 0%, rgba(0,0,0,.3) 50%, transparent 70%);
    pointer-events: none; opacity: 0; transition: opacity .25s ease;
}
.featuredBottom {
    position: absolute; bottom: 0; left: 0; right: 0;
    z-index: 2; padding: 16px 16px 20px;
    opacity: 0; transition: opacity .25s ease;
}
.featuredGenres { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.genreTag {
    font-size: 10px; color: rgba(255,255,255,.6);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 12px; padding: 2px 8px;
}
.featuredName { font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 8px; line-height: 1.3; }
.featuredDesc {
    font-size: 12px; color: rgba(255,255,255,.45);
    line-height: 1.6; margin: 0 0 14px;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
}
.watchBtn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 18px; border-radius: 20px; border: none;
    background: #6c5ce7; color: #fff;
    font-size: 13px; font-weight: 700; cursor: pointer; transition: background .18s;
}
.watchBtn:hover { background: #7d6ff0; }
.featuredSkeleton {
    border-radius: 10px; width: 100%; aspect-ratio: 3 / 4;
    background: var(--bg-secondary); animation: shimmer 1.6s infinite;
}
.restGrid {
    grid-column: span 4;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 15px; align-content: stretch;
}
.restCard { cursor: pointer; display: flex; flex-direction: column; }
.restCard:hover .restImg { transform: scale(1.04); }
.restCard:hover .restOverlay { opacity: 1; }
.restThumb {
    position: relative; border-radius: 8px;
    overflow: hidden; background: var(--bg-card);
    width: 100%; aspect-ratio: 3 / 4; flex: 1;
}
.restName {
    font-size: 16px; font-weight: 800;
    color: var(--text-primary);
    margin-top: 10px; line-height: 1.3;
    height: 46px; overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
.restImg {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover;
    display: block; transition: transform .3s;
}
.restFallback {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 800; color: var(--border);
}
.restOverlay {
    position: absolute; inset: 0; z-index: 2;
    background: linear-gradient(to top, rgba(0,0,0,.97) 0%, rgba(0,0,0,.6) 55%, rgba(0,0,0,.15) 100%);
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 12px; opacity: 0; transition: opacity .25s ease;
}
.restOverlayGenres { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; }
.restOverlayTag {
    font-size: 9px; color: rgba(255,255,255,.55);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 8px; padding: 1px 5px;
}
.restOverlayName {
    font-size: 13px; font-weight: 800; color: #fff;
    margin: 0 0 5px; line-height: 1.3;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.restOverlayDesc {
    font-size: 10px; color: rgba(255,255,255,.4);
    line-height: 1.5; margin: 0 0 10px;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
}
.restOverlayBtn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 14px; border-radius: 16px; border: none;
    background: #6c5ce7; color: #fff;
    font-size: 11px; font-weight: 700; cursor: pointer;
    width: fit-content; transition: background .18s;
}
.restOverlayBtn:hover { background: #7d6ff0; }
.restSkeleton {
    border-radius: 8px; width: 100%; aspect-ratio: 3 / 4;
    background: var(--bg-secondary); animation: shimmer 1.6s infinite;
}

/* ── 뱃지 ───────────────────────────────── */
.badgeUp {
    position: absolute; top: 7px; left: 7px; z-index: 3;
    background: #e84040; color: #fff;
    font-size: 10px; font-weight: 700;
    padding: 1px 5px; border-radius: 3px; line-height: 1.6;
}
.badgeSel {
    position: absolute; top: 7px; right: 7px; z-index: 3;
    background: rgba(108,92,231,.85); color: #d0ccff;
    font-size: 9px; font-weight: 700;
    padding: 1px 5px; border-radius: 3px;
    border: 1px solid rgba(157,151,255,.25); line-height: 1.6;
}

/* ── 더보기 ─────────────────────────────── */
.moreWrap { display: flex; justify-content: center; margin-top: 24px; }
.moreBtn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 28px; border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-muted);
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all .18s;
}
.moreBtn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--text-subtle); }

/* ── 인기 배너 ──────────────────────────── */
.popularBanner {
    background: linear-gradient(135deg, rgba(108,92,231,.12) 0%, rgba(108,92,231,.04) 100%);
    border-top: 1px solid rgba(108,92,231,.2);
    border-bottom: 1px solid rgba(108,92,231,.2);
    overflow: hidden; margin: 50px 0 120px;
}
.popularInner { display: flex; align-items: center; height: 150px; }
.popularChar {
    height: 100px; width: auto; object-fit: contain;
    flex-shrink: 0; margin-top: -20px;
    filter: drop-shadow(0 4px 12px rgba(108,92,231,.4));
}
.popularBubble { display: flex; align-items: center; margin-left: 16px; }
.popularText { font-size: 24px; font-weight: 600; color: var(--text-high); line-height: 1.4; }
.popularTitle { color: #9d97ff; font-weight: 800; }

/* ── 스켈레톤 ───────────────────────────── */
@keyframes shimmer { 0%{opacity:1} 50%{opacity:.5} 100%{opacity:1} }

@media (max-width: 1024px) {
    .todayLayout { grid-template-columns: repeat(4, 1fr); }
    .featuredWrap { grid-column: span 1; }
    .restGrid { grid-column: span 3; grid-template-columns: repeat(3, 1fr); grid-template-rows: auto; }
    .restName { font-size: 13px; height: 38px; }
    .dayGrid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .dayTabLabel { font-size: 13px; }
    .popularText { font-size: 20px; }
}
@media (max-width: 768px) {
    .todayLayout { grid-template-columns: 1fr; gap: 20px; }
    .featuredWrap { grid-column: 1; }
    .featuredCard { aspect-ratio: 16 / 9; width: 100%; }
    .featuredImg { position: absolute; }
    .featuredBottom { opacity: 1; }
    .featuredGradient { opacity: 1; }
    .restGrid { grid-column: 1; grid-template-columns: repeat(3, 1fr); grid-template-rows: auto; gap: 10px; }
    .restName { font-size: 12px; margin-top: 6px; height: auto; -webkit-line-clamp: 1; }
    .dayGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 10px; }
    .dayName { font-size: 13px; }
    .dayTabLabel { font-size: 11px; }
    .dayTab { padding: 12px 0; }
    .popularBanner { margin: 30px 0 60px; }
    .popularInner { height: 110px; }
    .popularChar { height: 75px; }
    .popularText { font-size: 16px; }
    .calBtn span { display: none; }
}
@media (max-width: 480px) {
    .restGrid { grid-template-columns: repeat(2, 1fr); }
    .dayGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .dayTabLabel { font-size: 10px; }
    .dayTab { padding: 10px 2px; }
    .popularText { font-size: 14px; }
    .popularChar { height: 60px; }
}
`}</style>

            <div className="page">
                <div className="new">
                    <div style={{ width: "90%", margin: "0 auto", paddingTop: 64 }}>
                        <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "4px 0 50px", marginBottom: 28 }}>
                            <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: "var(--text-primary)", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                                <span style={{ color: "#6c63ff" }}>{todayDayName}요일</span> 신작
                            </h1>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>매일 업데이트되는 최신 애니메이션</p>
                        </div>

                        <div className="todayLayout">
                            {aniList.length > 0 && todayItems.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <>
                                    <div className="featuredWrap">
                                        {featured ? (
                                            <div className="featuredCard" onClick={() => setPreviewId(featured.id)}>
                                                {getThumb(featured, 'w780')
                                                    ? <img className="featuredImg" src={getThumb(featured, 'w780')!} alt={featured.name} />
                                                    : <div className="featuredFallback">{(featured.name || '?')[0]}</div>
                                                }
                                                <div className="featuredGradient" />
                                                <span className="badgeSel">선독점</span>
                                                <div className="featuredBottom">
                                                    <div className="featuredGenres">
                                                        {(featured.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 3).map((g: string) => (
                                                            <span key={g} className="genreTag">{g}</span>
                                                        ))}
                                                    </div>
                                                    <p className="featuredName">{featured.name}</p>
                                                    <p className="featuredDesc">{featured.overview || '줄거리 정보가 없습니다.'}</p>
                                                    <button className="watchBtn">
                                                        <svg width="11" height="11" viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" fill="currentColor" /></svg>
                                                        지금 보기
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="featuredSkeleton" />
                                        )}
                                        {featured && <p className="restName">{featured.name}</p>}
                                    </div>

                                    <div className="restGrid">
                                        {(restItems.slice(0, 10).length > 0 ? restItems.slice(0, 10) : Array(10).fill(null)).map((ani: any, idx: number) =>
                                            ani ? (
                                                <div key={ani.id} className="restCard" onClick={() => setPreviewId(ani.id)}>
                                                    <div className="restThumb">
                                                        {getThumb(ani)
                                                            ? <img className="restImg" src={getThumb(ani)!} alt={ani.name} />
                                                            : <div className="restFallback">{(ani.name || '?')[0]}</div>
                                                        }
                                                        <div className="restOverlay">
                                                            <div className="restOverlayGenres">
                                                                {(ani.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 2).map((g: string) => (
                                                                    <span key={g} className="restOverlayTag">{g}</span>
                                                                ))}
                                                            </div>
                                                            <p className="restOverlayName">{ani.name}</p>
                                                            <p className="restOverlayDesc">{ani.overview || '줄거리 정보가 없습니다.'}</p>
                                                            <button className="restOverlayBtn">
                                                                <svg width="9" height="9" viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" fill="currentColor" /></svg>
                                                                지금 보기
                                                            </button>
                                                        </div>
                                                        {idx % 2 === 0 && <span className="badgeUp">UP</span>}
                                                        {idx % 3 === 0 && <span className="badgeSel">선독점</span>}
                                                    </div>
                                                    <p className="restName">{ani.name}</p>
                                                </div>
                                            ) : (
                                                <div key={idx} className="restSkeleton" />
                                            )
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {popularTitle && (
                    <div className="popularBanner">
                        <div style={{ width: "90%", margin: "0 auto" }}>
                            <div className="popularInner">
                                <img src="/images/laftel-icon/new.png" alt="라프텔 캐릭터" className="popularChar" />
                                <div className="popularBubble">
                                    <p className="popularText">
                                        오늘 가장 인기있는 애니는{' '}
                                        <span className="popularTitle">"{popularTitle}"</span>
                                        {' '}입니다
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <section className="section">
                    <div style={{ width: "90%", margin: "0 auto" }}>
                        <div style={{ borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", marginBottom: 20 }}>
                            <div>
                                <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: "var(--text-primary)", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>요일별 신작</h1>
                                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>매일 업데이트되는 최신 애니메이션</p>
                            </div>
                            <button className="calBtn" onClick={() => setShowCalendar(true)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                전체 일정
                            </button>
                        </div>

                        <div className="dayTabs">
                            {DAYS.map((d, i) => (
                                <button
                                    key={d}
                                    className={['dayTab', activeDay === i ? 'dayTabActive' : '', i === todayIdx ? 'dayTabToday' : ''].join(' ')}
                                    onClick={() => { setActiveDay(i); setShowAll(false) }}
                                >
                                    <span className="dayTabLabel">{d}요일</span>
                                </button>
                            ))}
                        </div>

                        <div className="dayGrid">
                            {dayItems.length === 0 && aniList.length > 0 ? (
                                <EmptyState sub="다른 요일을 선택하거나 연령 설정을 변경해보세요" />
                            ) : dayItems.length === 0 ? (
                                Array(14).fill(null).map((_: any, idx: number) => (
                                    <div key={idx} className="daySkeleton" />
                                ))
                            ) : (
                                dayItems.map((ani: any, idx: number) => (
                                    <div key={ani.id} className="dayCard" onClick={() => setPreviewId(ani.id)}>
                                        <div className="dayThumb">
                                            {getThumb(ani)
                                                ? <img className="dayImg" src={getThumb(ani)!} alt={ani.name} />
                                                : <div className="dayFallback">{(ani.name || '?')[0]}</div>
                                            }
                                            {idx % 3 === 0 && <span className="badgeSel">선독점</span>}
                                            {idx % 2 === 0 && <span className="badgeUp">UP</span>}
                                        </div>
                                        <p className="dayName">{ani.name}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {hasMore && (
                            <div className="moreWrap">
                                <button className="moreBtn" onClick={() => setShowAll(v => !v)}>
                                    {showAll ? (
                                        <>접기 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg></>
                                    ) : (
                                        <>더보기 ({allDayItems.length - SHOW_LIMIT}개 더) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {showCalendar && (
                    <CalendarModal
                        onClose={() => setShowCalendar(false)}
                        onSelectDate={handleCalendarSelect}
                    />
                )}
            </div>
        </>
    )
}