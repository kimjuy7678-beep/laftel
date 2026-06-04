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
        const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&air_date.gte=${dateStr}&air_date.lte=${dateStr}&sort_by=popularity.desc&language=ko-KR&page=1`
        const res = await fetch(url)
        const data = await res.json()
        return (data.total_results ?? 0) > 0
    } catch { return false }
}

async function fetchAniByDate(dateStr: string): Promise<AniItem[]> {
    try {
        const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&air_date.gte=${dateStr}&air_date.lte=${dateStr}&sort_by=popularity.desc&language=ko-KR&page=1`
        const res = await fetch(url)
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
        if (!animeDays[`${viewYear}-${viewMonth}`]) {
            loadMonthData(viewYear, viewMonth)
        }
    }, [viewYear, viewMonth, animeDays, loadMonthData])

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

    const selectedLabel = selectedDate
        ? (() => {
            const d = new Date(selectedDate)
            return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS_KR[jsToTabIdx(d.getDay())]})`
        })()
        : null

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <style>{`
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                .cal-day:hover { background: rgba(108,92,231,0.15) !important; }
                .ani-item:hover { background: rgba(255,255,255,0.05) !important; }
            `}</style>

            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#111018',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    width: selectedDate ? 760 : 400,
                    maxHeight: '88vh',
                    display: 'flex',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                    animation: 'slideUp 0.2s ease',
                    overflow: 'hidden',
                    transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
                }}
            >
                {/* ── 왼쪽: 캘린더 ──────────────────────── */}
                <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: selectedDate ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>

                    {/* 헤더 */}
                    <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
                        <p style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, flex: 1 }}>전체 일정</p>
                        <button
                            onClick={onClose}
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                    </div>

                    {/* 월 네비 */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 8px' }}>
                        <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center' }}>{viewYear}년 {viewMonth + 1}월</span>
                        <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>

                    {/* 요일 헤더 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 14px 6px' }}>
                        {DAYS_KR.map((d, i) => (
                            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: i === 5 ? 'rgba(167,139,250,0.5)' : i === 6 ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.2)', padding: '3px 0' }}>{d}</div>
                        ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 14px 12px', gap: 3 }}>
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
                                        background: isSelected ? '#6c5ce7' : isToday ? 'rgba(108,92,231,0.2)' : 'transparent',
                                        border: isSelected ? '1px solid #6c5ce7' : isToday ? '1px solid rgba(108,92,231,0.4)' : '1px solid transparent',
                                        borderRadius: 8,
                                        padding: '6px 2px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 3,
                                        transition: 'background 0.12s',
                                        position: 'relative',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 12,
                                        fontWeight: isToday || isSelected ? 800 : 400,
                                        color: isSelected ? '#fff' : isToday ? '#fff' : colIdx === 5 ? 'rgba(167,139,250,0.65)' : colIdx === 6 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.55)',
                                        lineHeight: 1,
                                    }}>{day}</span>
                                    {hasAnime && (
                                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : '#6c5ce7', display: 'block', flexShrink: 0 }} />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* 범례 */}
                    <div style={{ padding: '10px 20px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16, marginTop: 'auto' }}>
                        {calLoading
                            ? <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>방영 정보 불러오는 중…</span>
                            : <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c5ce7', display: 'block' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>방영 있음</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.4)', display: 'block' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>오늘</span>
                                </div>
                            </>
                        }
                    </div>
                </div>

                {/* ── 오른쪽: 방영 목록 ─────────────────── */}
                {selectedDate && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', scrollbarWidth: 'none' }}>

                        {/* 패널 헤더 */}
                        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#111018', zIndex: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{selectedLabel}</span>
                                {!listLoading && (
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '2px 8px' }}>
                                        {selectedList.length}편
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => { onSelectDate(selectedDate); onClose() }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 11, fontWeight: 700, color: '#9d97ff',
                                    background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.25)',
                                    borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                                }}
                            >
                                해당 요일 탭으로 이동
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>

                        {/* 목록 */}
                        <div style={{ flex: 1 }}>
                            {listLoading ? (
                                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <div style={{ width: 40, height: 56, borderRadius: 6, background: 'linear-gradient(90deg,#1a1a2e 25%,#252545 50%,#1a1a2e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', flexShrink: 0 }} />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div style={{ height: 11, borderRadius: 4, background: 'linear-gradient(90deg,#1a1a2e 25%,#252545 50%,#1a1a2e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', width: '65%' }} />
                                                <div style={{ height: 9, borderRadius: 4, background: 'linear-gradient(90deg,#1a1a2e 25%,#252545 50%,#1a1a2e 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', width: '40%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedList.length === 0 ? (
                                <div style={{ padding: '60px 18px', textAlign: 'center' }}>
                                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0 }}>이 날은 방영 작품이 없어요</p>
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
                                            className="ani-item"
                                            onClick={() => { router.push(`/anime/${ani.id}`); onClose() }}
                                            style={{
                                                display: 'flex', gap: 10, alignItems: 'center',
                                                padding: '10px 18px',
                                                borderBottom: idx < selectedList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                cursor: 'pointer',
                                                background: 'transparent',
                                                transition: 'background 0.12s',
                                            }}
                                        >
                                            {/* 순위 */}
                                            <span style={{ fontSize: 11, fontWeight: 800, color: idx < 3 ? '#9d97ff' : 'rgba(255,255,255,0.18)', width: 18, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>

                                            {/* 포스터 */}
                                            <div style={{ width: 40, height: 56, borderRadius: 6, overflow: 'hidden', background: '#1a1a2e', flexShrink: 0 }}>
                                                {poster
                                                    ? <img src={poster} alt={ani.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'rgba(255,255,255,0.15)' }}>{ani.name[0]}</div>
                                                }
                                            </div>

                                            {/* 정보 */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ani.name}</p>
                                                    {isNew && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 10, background: '#6c5ce7', color: '#fff', flexShrink: 0 }}>신작</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                                    {genres.map((g: string) => (
                                                        <span key={g} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '1px 6px' }}>{g}</span>
                                                    ))}
                                                    {score > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(251,191,36,0.7)' }}>★ {score}</span>}
                                                </div>
                                            </div>

                                            {/* 화살표 */}
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
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
