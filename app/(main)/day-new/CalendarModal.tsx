'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'
const DAYS_KR = ['월', '화', '수', '목', '금', '토', '일']

interface AniItem {
    id: number
    name: string
    poster_path: string | null
    overview: string
    vote_average: number
    genre_ids: number[]
    first_air_date: string
}

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    10751: '가족', 14: '판타지', 27: '호러', 9648: '미스터리',
    10765: 'SF·판타지', 10762: '어린이',
}

interface Props {
    onClose: () => void
    onSelectDate: (dateStr: string) => void
}

function jsToTabIdx(jsDay: number) { return jsDay === 0 ? 6 : jsDay - 1 }

async function checkHasAnime(dateStr: string): Promise<boolean> {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&air_date.gte=${dateStr}&air_date.lte=${dateStr}&sort_by=popularity.desc&language=ko-KR&page=1`)
        const data = await res.json()
        return (data.total_results ?? 0) > 0
    } catch { return false }
}

async function fetchAniByDate(dateStr: string): Promise<AniItem[]> {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&air_date.gte=${dateStr}&air_date.lte=${dateStr}&sort_by=popularity.desc&language=ko-KR&page=1`)
        const data = await res.json()
        return data.results ?? []
    } catch { return [] }
}

export default function CalendarModal({ onClose, onSelectDate }: Props) {
    const router = useRouter()
    const today = new Date()
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [animeDays, setAnimeDays] = useState<Record<string, Record<string, boolean>>>({})
    const [calLoading, setCalLoading] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [selectedList, setSelectedList] = useState<AniItem[]>([])
    const [listLoading, setListLoading] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    // 모바일 감지 — SSR 안전
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    const loadMonthData = useCallback(async (year: number, month: number) => {
        setCalLoading(true)
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const checks = await Promise.all(
            Array.from({ length: daysInMonth }, (_, i) => {
                const d = String(i + 1).padStart(2, '0')
                const m = String(month + 1).padStart(2, '0')
                const dateStr = `${year}-${m}-${d}`
                return checkHasAnime(dateStr).then(has => ({ dateStr, has }))
            })
        )
        const map: Record<string, boolean> = {}
        checks.forEach(({ dateStr, has }) => { if (has) map[dateStr] = true })
        setAnimeDays(prev => ({ ...prev, [`${year}-${month}`]: map }))
        setCalLoading(false)
    }, [])

    useEffect(() => {
        if (!animeDays[`${viewYear}-${viewMonth}`]) loadMonthData(viewYear, viewMonth)
    }, [viewYear, viewMonth])

    const handleSelectDate = async (dateStr: string) => {
        setSelectedDate(dateStr)
        setSelectedList([])
        setListLoading(true)
        const list = await fetchAniByDate(dateStr)
        setSelectedList(list)
        setListLoading(false)
    }

    const prevMonth = () => {
        setSelectedDate(null)
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
        else setViewMonth(m => m - 1)
    }
    const nextMonth = () => {
        setSelectedDate(null)
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
        else setViewMonth(m => m + 1)
    }

    const firstTabIdx = jsToTabIdx(new Date(viewYear, viewMonth, 1).getDay())
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const currentMap = animeDays[`${viewYear}-${viewMonth}`] ?? {}
    const todayStr = today.toISOString().slice(0, 10)

    const cells: (number | null)[] = [
        ...Array(firstTabIdx).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    const selectedLabel = selectedDate ? (() => {
        const d = new Date(selectedDate)
        return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS_KR[jsToTabIdx(d.getDay())]})`
    })() : null

    // 모바일: 날짜 선택 시 모달 너비 그대로, flexDirection column
    const modalWidth = isMobile
        ? '95vw'
        : selectedDate ? 860 : 480

    const modalFlexDir: React.CSSProperties['flexDirection'] = isMobile ? 'column' : 'row'

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 16px',
                animation: 'cal-bg .2s ease',
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes cal-up { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes cal-bg { from{opacity:0} to{opacity:1} }
                .cal-scroll::-webkit-scrollbar { width:4px; }
                .cal-scroll::-webkit-scrollbar-track { background:transparent; }
                .cal-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
                .cal-scroll::-webkit-scrollbar-thumb:hover { background:var(--border-subtle); }
                @keyframes shimmer { 0%{opacity:1} 50%{opacity:.5} 100%{opacity:1} }
                .cal-day:hover { background: var(--bg-hover) !important; }
                .cal-item:hover { background: var(--bg-hover) !important; }
                .cal-nav-btn:hover { border-color: var(--text-muted) !important; color: var(--text-primary) !important; }
            `}</style>

            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    display: 'flex',
                    flexDirection: modalFlexDir,
                    maxHeight: isMobile ? '92vh' : '88vh',
                    boxShadow: '0 40px 80px rgba(0,0,0,.5)',
                    animation: 'cal-up .35s cubic-bezier(.34,1.56,.64,1)',
                    overflow: 'hidden',
                    width: modalWidth,
                    transition: 'width .28s cubic-bezier(.4,0,.2,1)',
                }}
            >
                {/* ── 왼쪽(데스크탑) / 위(모바일): 캘린더 ── */}
                <div style={{
                    width: isMobile ? '100%' : 480,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}>

                    {/* 헤더 */}
                    <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, margin: 0 }}>전체 일정</h2>
                        <button
                            onClick={onClose}
                            className="cal-nav-btn"
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-subtle)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s'
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--text-faint)', padding: '6px 28px 20px', margin: 0, borderBottom: '1px solid var(--border-subtle)' }}>
                        날짜를 선택하면 해당일 방영 작품을 확인할 수 있어요
                    </p>

                    {/* 월 네비 */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '18px 28px 12px' }}>
                        <button onClick={prevMonth} className="cal-nav-btn"
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <span style={{ flex: 1, textAlign: 'center', color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }}>{viewYear}년 {viewMonth + 1}월</span>
                        <button onClick={nextMonth} className="cal-nav-btn"
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>

                    {/* 요일 헤더 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 20px 8px' }}>
                        {DAYS_KR.map((d, i) => (
                            <div key={d} style={{
                                textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '3px 0',
                                color: i === 5 ? 'rgba(167,139,250,.6)' : i === 6 ? 'rgba(248,113,113,.5)' : 'var(--text-faint)'
                            }}>{d}</div>
                        ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, padding: '0 20px 16px' }}>
                        {cells.map((day, idx) => {
                            if (!day) return <div key={`e-${idx}`} />
                            const m = String(viewMonth + 1).padStart(2, '0')
                            const d = String(day).padStart(2, '0')
                            const dateStr = `${viewYear}-${m}-${d}`
                            const isToday = dateStr === todayStr
                            const isSelected = dateStr === selectedDate
                            const hasAnime = !!currentMap[dateStr]
                            const colIdx = idx % 7

                            return (
                                <button
                                    key={dateStr}
                                    className="cal-day"
                                    onClick={() => handleSelectDate(dateStr)}
                                    style={{
                                        background: isSelected ? '#6c63ff' : isToday ? 'rgba(108,99,255,.15)' : 'transparent',
                                        border: `1px solid ${isSelected ? '#6c63ff' : isToday ? 'rgba(108,99,255,.3)' : 'transparent'}`,
                                        borderRadius: 8, padding: '8px 4px', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                        transition: 'background .12s',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 13, lineHeight: 1,
                                        fontWeight: isSelected || isToday ? 700 : 400,
                                        color: isSelected ? '#fff'
                                            : isToday ? '#fff'
                                                : colIdx === 5 ? 'rgba(167,139,250,.7)'
                                                    : colIdx === 6 ? 'rgba(248,113,113,.6)'
                                                        : 'var(--text-muted)',
                                    }}>{day}</span>
                                    {hasAnime && (
                                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,.8)' : 'rgba(108,99,255,.8)', display: 'block', flexShrink: 0 }} />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* 범례 */}
                    <div style={{ padding: '12px 28px 20px', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto', display: 'flex', gap: 20 }}>
                        {calLoading
                            ? <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>방영 정보 불러오는 중…</span>
                            : <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(108,99,255,.8)', display: 'block' }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>방영 있음</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(108,99,255,.15)', border: '1px solid rgba(108,99,255,.3)', display: 'block' }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>오늘</span>
                                </div>
                            </>
                        }
                    </div>
                </div>

                {/* ── 오른쪽(데스크탑) / 아래(모바일): 방영 목록 ── */}
                {selectedDate && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: isMobile ? 'none' : '1px solid var(--border-subtle)',
                        borderTop: isMobile ? '1px solid var(--border-subtle)' : 'none',
                        overflow: 'hidden',
                        // 모바일에서 목록 패널 최대 높이 제한
                        maxHeight: isMobile ? '45vh' : undefined,
                    }}>

                        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedLabel}</span>
                                {!listLoading && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 20, padding: '2px 8px' }}>{selectedList.length}편</span>
                                )}
                            </div>
                            <button
                                onClick={() => { onSelectDate(selectedDate!); onClose() }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 11, fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 20, padding: '5px 12px', cursor: 'pointer', transition: 'all .18s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                            >
                                해당 요일 탭으로 이동
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }} className="cal-scroll">
                            {listLoading ? (
                                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div style={{ width: 44, height: 62, borderRadius: 8, background: 'var(--bg-secondary)', animation: 'shimmer 1.6s infinite', flexShrink: 0 }} />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                                                <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-secondary)', width: '60%' }} />
                                                <div style={{ height: 10, borderRadius: 4, background: 'var(--bg-secondary)', width: '40%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedList.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', margin: 0 }}>이 날은 방영 작품이 없어요</p>
                                </div>
                            ) : (
                                selectedList.map((ani, idx) => {
                                    const poster = ani.poster_path ? `${IMG}/w92${ani.poster_path}` : null
                                    const score = Math.round(ani.vote_average * 10) / 10
                                    const genres = ani.genre_ids.map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 2)
                                    const isNew = ani.first_air_date === selectedDate

                                    return (
                                        <div
                                            key={ani.id}
                                            className="cal-item"
                                            onClick={() => { router.push(`/anime/${ani.id}`); onClose() }}
                                            style={{
                                                display: 'flex', gap: 12, alignItems: 'center',
                                                padding: '12px 20px',
                                                borderBottom: idx < selectedList.length - 1 ? '1px solid var(--border-faint)' : 'none',
                                                cursor: 'pointer', background: 'transparent', transition: 'background .12s',
                                            }}
                                        >
                                            <span style={{ fontSize: 11, fontWeight: 800, color: idx < 3 ? '#9d97ff' : 'var(--text-faint)', width: 18, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                                            <div style={{ width: 44, height: 62, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                                                {poster
                                                    ? <img src={poster} alt={ani.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-faint)' }}>{ani.name[0]}</div>
                                                }
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ani.name}</p>
                                                    {isNew && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 10, background: '#6c63ff', color: '#fff', flexShrink: 0 }}>신작</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                                    {genres.map((g: string) => (
                                                        <span key={g} style={{ fontSize: 10, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 6px' }}>{g}</span>
                                                    ))}
                                                    {score > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(251,191,36,.8)' }}>★ {score}</span>}
                                                </div>
                                            </div>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}