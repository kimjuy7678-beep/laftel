'use client'

import { useEffect, useState, useCallback } from 'react'

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
    const today = new Date()
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [animeDays, setAnimeDays] = useState<Record<string, Record<string, boolean>>>({})
    const [calLoading, setCalLoading] = useState(false)

    // 선택된 날짜 + 해당 날짜 애니 목록
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

    // 선택 날짜 포맷
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
                background: 'rgba(5,4,15,0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.15s ease',
            }}
        >
            <style>{`
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes slideUp { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                .cal-cell-btn:hover:not(:disabled) { background: rgba(124,58,237,0.18) !important; }
                .ani-row:hover { background: rgba(255,255,255,0.04) !important; }
            `}</style>

            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#13102a',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 24,
                    width: selectedDate ? 720 : 380,
                    maxHeight: '90vh',
                    display: 'flex',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                    animation: 'slideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)',
                    overflow: 'hidden',
                    transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
            >
                {/* ── 왼쪽: 캘린더 ──────────────────── */}
                <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: selectedDate ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>

                    {/* 헤더 */}
                    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <div>
                            <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>전체 일정 캘린더</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, marginTop: 1 }}>날짜 클릭 시 방영 작품을 확인해요</p>
                        </div>
                        <button onClick={onClose} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>✕</button>
                    </div>

                    {/* 월 네비 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px 10px' }}>
                        <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <span style={{ color: '#fff', fontSize: 15, fontWeight: 800, flex: 1, textAlign: 'center' }}>{viewYear}년 {viewMonth + 1}월</span>
                        <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>

                    {/* 요일 헤더 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 16px 4px' }}>
                        {DAYS_KR.map((d, i) => (
                            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: i === 5 ? 'rgba(167,139,250,0.5)' : i === 6 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.25)', padding: '4px 0' }}>{d}</div>
                        ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 16px 8px', gap: 2 }}>
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
                                    className="cal-cell-btn"
                                    onClick={() => handleSelectDate(dateStr)}
                                    style={{
                                        background: isSelected ? 'rgba(124,58,237,0.4)' : isToday ? 'rgba(124,58,237,0.2)' : 'transparent',
                                        border: isSelected ? '1px solid rgba(124,58,237,0.8)' : isToday ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                                        borderRadius: 8, padding: '5px 2px', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    {hasAnime && (
                                        <span style={{ display: 'block', width: 18, height: 2, borderRadius: 1, background: isSelected ? '#c4b5fd' : isToday ? '#a78bfa' : 'rgba(124,58,237,0.5)' }} />
                                    )}
                                    <span style={{
                                        fontSize: 12,
                                        fontWeight: isToday || isSelected ? 800 : 400,
                                        color: isSelected ? '#fff' : isToday ? '#fff' : colIdx === 5 ? 'rgba(167,139,250,0.6)' : colIdx === 6 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.5)',
                                        lineHeight: 1.6,
                                    }}>{day}</span>
                                    {isToday && !isSelected && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa', display: 'block' }} />}
                                </button>
                            )
                        })}
                    </div>

                    {/* 범례 */}
                    <div style={{ padding: '8px 24px 20px', display: 'flex', gap: 16, borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 'auto' }}>
                        {calLoading
                            ? <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>방영 정보 불러오는 중…</span>
                            : <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: 'rgba(124,58,237,0.5)' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>방영 있음</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: '#a78bfa' }} />
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>오늘</span>
                                </div>
                            </>
                        }
                    </div>
                </div>

                {/* ── 오른쪽: 선택 날짜 방영 목록 ────────── */}
                {selectedDate && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', scrollbarWidth: 'none' }}>

                        {/* 패널 헤더 */}
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#13102a', zIndex: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa' }}>{selectedLabel}</span>
                                {!listLoading && (
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 8px' }}>
                                        {selectedList.length}편
                                    </span>
                                )}
                            </div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>신작 · 방송 예정 작품</p>

                            {/* 해당 요일 탭으로 이동 버튼 */}
                            <button
                                onClick={() => { onSelectDate(selectedDate); onClose() }}
                                style={{
                                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 12, fontWeight: 700, color: '#a78bfa',
                                    background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
                                    borderRadius: 20, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s',
                                }}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                {selectedLabel} 탭으로 이동
                            </button>
                        </div>

                        {/* 애니 목록 */}
                        <div style={{ padding: '8px 0', flex: 1 }}>
                            {listLoading ? (
                                <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div style={{ width: 44, height: 62, borderRadius: 8, background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', flexShrink: 0 }} />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div style={{ height: 12, borderRadius: 4, background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', width: '70%' }} />
                                                <div style={{ height: 10, borderRadius: 4, background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite', width: '45%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedList.length === 0 ? (
                                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
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
                                            className="ani-row"
                                            style={{
                                                display: 'flex', gap: 12, alignItems: 'center',
                                                padding: '10px 20px',
                                                borderBottom: idx < selectedList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                cursor: 'pointer', transition: 'background 0.15s',
                                                background: 'transparent',
                                            }}
                                        >
                                            {/* 순위 */}
                                            <span style={{ fontSize: 11, fontWeight: 800, color: idx < 3 ? '#a78bfa' : 'rgba(255,255,255,0.2)', width: 16, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>

                                            {/* 포스터 */}
                                            <div style={{ width: 44, height: 62, borderRadius: 8, overflow: 'hidden', background: '#1e1b4b', flexShrink: 0 }}>
                                                {poster
                                                    ? <img src={poster} alt={ani.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(255,255,255,0.15)' }}>{ani.name[0]}</div>
                                                }
                                            </div>

                                            {/* 정보 */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ani.name}</p>
                                                    {isNew && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: '#7c3aed', color: '#fff', flexShrink: 0, letterSpacing: '0.05em' }}>신작</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {genres.map((g: string) => (
                                                        <span key={g} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '1px 7px' }}>{g}</span>
                                                    ))}
                                                    {score > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.8)', marginLeft: 2 }}>★ {score}</span>}
                                                </div>
                                            </div>
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