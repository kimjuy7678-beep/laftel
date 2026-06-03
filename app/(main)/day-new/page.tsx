'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import CalendarModal from './CalendarModal'

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

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const DAYS = [
    { id: 0, label: '월', eng: 'MON', icon: '✦' },
    { id: 1, label: '화', eng: 'TUE', icon: '◐' },
    { id: 2, label: '수', eng: 'WED', icon: '◈' },
    { id: 3, label: '목', eng: 'THU', icon: '◉' },
    { id: 4, label: '금', eng: 'FRI', icon: '✸' },
    { id: 5, label: '토', eng: 'SAT', icon: '◎' },
    { id: 6, label: '일', eng: 'SUN', icon: '☁' },
]

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    10751: '가족', 14: '판타지', 27: '호러', 9648: '미스터리',
    10765: 'SF·판타지', 10762: '어린이',
}

const DAY_SUBTITLES = [
    '셀레는 한 주의 시작! 새로운 이야기가 찾아옵니다.',
    '화요일의 지루함, 애니로 날려버려!',
    '수요일의 힘! 주중 반환점 애니와 함께',
    '목요일도 버텨! 주말이 코앞이야',
    '불금엔 애니메이션과 함께 달려!',
    '토요일 정주행 시작! 오늘은 몇 편?',
    '일요일엔 느긋하게 애니 한 편 어때?',
]

function jsDateDayToTabIdx(jsDay: number) { return jsDay === 0 ? 6 : jsDay - 1 }

function getWeekDates() {
    const today = new Date()
    const jsDay = today.getDay()
    const diff = jsDay === 0 ? -6 : 1 - jsDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday); d.setDate(monday.getDate() + i)
        return d.toISOString().slice(0, 10)
    })
}

async function fetchAniByDate(date: string, pages = 2): Promise<AniItem[]> {
    let results: AniItem[] = []
    for (let page = 1; page <= pages; page++) {
        const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&air_date.gte=${date}&air_date.lte=${date}&sort_by=popularity.desc&language=ko-KR&page=${page}`
        const res = await fetch(url)
        const data = await res.json()
        if (!data.results?.length) break
        results = [...results, ...data.results]
    }
    return results
}

function FeaturedCard({ ani }: { ani: AniItem }) {
    const backdrop = ani.backdrop_path ? `${IMG}/w780${ani.backdrop_path}` : null
    const poster = ani.poster_path ? `${IMG}/w342${ani.poster_path}` : null
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 3)

    return (
        <Link href={`/anime/${ani.id}`}
            className="relative block rounded-2xl overflow-hidden cursor-pointer group shrink-0"
            style={{ width: 360, aspectRatio: '3/4', background: '#1a1530' }}>
            {(backdrop || poster)
                ? <img src={backdrop || poster || ''} alt={ani.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                : <div className="absolute inset-0 flex items-center justify-center"><span className="text-6xl font-black text-white/10">{ani.name[0]}</span></div>
            }
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,8,20,0.98) 0%, rgba(10,8,20,0.5) 45%, rgba(10,8,20,0.15) 100%)' }} />
            <span className="absolute top-4 left-4 text-[11px] font-bold tracking-widest px-3 py-1 rounded-full bg-violet-600 text-white z-10">NEW</span>
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {genres.map(g => <span key={g} className="text-[11px] text-white/60 border border-white/20 rounded-full px-2.5 py-0.5">{g}</span>)}
                    </div>
                )}
                <p className="text-white font-black text-[22px] leading-tight mb-2">{ani.name}</p>
                <p className="text-white/50 text-[12px] leading-relaxed line-clamp-2 mb-4">{ani.overview || '줄거리 정보가 없습니다.'}</p>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold border-none cursor-pointer transition-all"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                    지금 보기
                </button>
            </div>
        </Link>
    )
}

function SmallCard({ ani }: { ani: AniItem }) {
    const poster = ani.poster_path ? `${IMG}/w342${ani.poster_path}` : null
    const score = Math.round(ani.vote_average * 10) / 10
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)

    return (
        <Link href={`/anime/${ani.id}`}
            className="relative block rounded-xl overflow-hidden cursor-pointer group shrink-0"
            style={{ width: 148, background: '#1a1530' }}>
            <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '2/3' }}>
                {poster
                    ? <img src={poster} alt={ani.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center"><span className="text-2xl font-black text-white/10">{ani.name[0]}</span></div>
                }
                <div className="absolute inset-0 flex flex-col justify-end p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}>
                    <p className="text-white text-[10px] font-semibold leading-snug line-clamp-2 mb-1">{ani.name}</p>
                    {genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {genres.map(g => <span key={g} className="text-[9px] text-white/50 border border-white/15 rounded-full px-1.5 py-0.5">{g}</span>)}
                        </div>
                    )}
                </div>
                {score > 0 && <span className="absolute bottom-2 left-2.5 text-[10px] font-semibold text-amber-400/90 group-hover:opacity-0 transition-opacity">★ {score}</span>}
                <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white tracking-wider">NEW</span>
            </div>
            <p className="mt-1.5 px-0.5 text-[11px] font-medium leading-snug line-clamp-1 text-white/55">{ani.name}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{ani.first_air_date?.slice(0, 10) || ''}</p>
        </Link>
    )
}

function SkeletonSmall() {
    return (
        <li className="shrink-0" style={{ width: 148 }}>
            <div className="rounded-xl" style={{ width: 148, aspectRatio: '2/3', background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
            <div className="mt-1.5 h-2.5 rounded-full" style={{ width: 100, background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
        </li>
    )
}

function SkeletonFeatured() {
    return (
        <div className="rounded-2xl shrink-0" style={{ width: 360, aspectRatio: '3/4', background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
    )
}

export default function Page() {
    const weekDates = useRef<string[]>([])
    const todayTabIdxRef = useRef(0)

    const [activeDay, setActiveDay] = useState(0)
    const [initialized, setInitialized] = useState(false)
    const [tabCache, setTabCache] = useState<Record<number, AniItem[]>>({})
    const [tabLoading, setTabLoading] = useState(false)
    const [showCalendar, setShowCalendar] = useState(false)

    const scrollRef = useRef<HTMLUListElement>(null)

    useEffect(() => {
        weekDates.current = getWeekDates()
        todayTabIdxRef.current = jsDateDayToTabIdx(new Date().getDay())
        setActiveDay(todayTabIdxRef.current)
        setInitialized(true)
    }, [])

    useEffect(() => {
        if (!initialized) return
        if (tabCache[activeDay] !== undefined) return
        const load = async () => {
            setTabLoading(true)
            try {
                const list = await fetchAniByDate(weekDates.current[activeDay], 2)
                setTabCache(prev => ({ ...prev, [activeDay]: list }))
            } finally { setTabLoading(false) }
        }
        load()
    }, [activeDay, initialized])

    const scroll = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
    }

    const handleCalendarSelect = (dateStr: string) => {
        const d = new Date(dateStr)
        setActiveDay(jsDateDayToTabIdx(d.getDay()))
    }

    const tabList = tabCache[activeDay] ?? []
    const featured = tabList[0] || null
    const rest = tabList.slice(1)
    const todayIdx = todayTabIdxRef.current

    return (
        <>
            <style>{`
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                .hide-scroll::-webkit-scrollbar { display:none }
                .hide-scroll { -ms-overflow-style:none; scrollbar-width:none }
            `}</style>

            <div className="pt-14 min-h-screen text-white" style={{ background: '#0d0b1a' }}>

                {/* ── 상단 헤더 배너 ─────────────────────── */}
                <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #030108 0%, #0d0b1a 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 right-0 w-[500px] h-[300px] opacity-20"
                            style={{ background: 'radial-gradient(ellipse at 100% 0%, #7c3aed 0%, transparent 60%)' }} />
                    </div>
                    <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
                        <p className="text-violet-400/70 text-[12px] font-bold tracking-[0.3em] uppercase mb-2">업데이트는 매일, 설렘은 매주</p>
                        <h1 className="text-white font-black text-4xl sm:text-5xl tracking-tight mb-3">요일별 업데이트</h1>
                        <p className="text-white/40 text-[15px]">새롭게 공개되는 작품을 요일별로 확인해보세요!</p>
                    </div>

                    {/* ── 요일 탭 바 ─────────────────────────── */}
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex overflow-x-auto hide-scroll border-t border-white/[0.06]">
                            {DAYS.map(d => {
                                const isActive = activeDay === d.id
                                const isToday = d.id === todayIdx
                                return (
                                    <button
                                        key={d.id}
                                        onClick={() => setActiveDay(d.id)}
                                        className="flex-1 min-w-[80px] flex flex-col items-center gap-1.5 py-5 relative border-none cursor-pointer transition-all duration-200 bg-transparent"
                                        style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.35)' }}
                                    >
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] font-bold transition-all duration-200"
                                            style={{
                                                background: isActive ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.05)',
                                                color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                                            }}>
                                            {d.icon}
                                        </div>
                                        <span className="text-[14px] font-black tracking-wide">{d.label}</span>
                                        <span className="text-[10px] font-bold tracking-[0.15em] opacity-60">{d.eng}</span>
                                        {isToday && <span className="absolute top-3 right-[calc(50%-18px)] w-1.5 h-1.5 rounded-full bg-violet-400" />}
                                        {isActive && <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }} />}
                                    </button>
                                )
                            })}

                            {/* 전체 일정 버튼 */}
                            <button
                                onClick={() => setShowCalendar(true)}
                                className="flex-1 min-w-[80px] flex flex-col items-center gap-1.5 py-5 border-none cursor-pointer bg-transparent text-white/25 hover:text-white/50 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </div>
                                <span className="text-[12px] font-semibold">전체 일정</span>
                                <span className="text-[10px] font-bold tracking-[0.15em] opacity-60">캘린더 보기</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── 메인 콘텐츠 영역 ───────────────────────── */}
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-white font-black text-2xl sm:text-3xl">{DAYS[activeDay]?.label}요일 업데이트</h2>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-600/80 text-white tracking-widest">{DAYS[activeDay]?.eng}</span>
                        {activeDay === todayIdx && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-violet-400/40 text-violet-300/80 bg-violet-500/10 tracking-widest">오늘 날짜</span>
                        )}
                        <div className="flex-1" />
                        <button className="text-[13px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors border-none bg-transparent cursor-pointer">
                            전체 보기
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                    <p className="text-white/40 text-[14px] mb-8 -mt-4">{DAY_SUBTITLES[activeDay]}</p>

                    <div className="flex gap-6 items-start">
                        <div className="shrink-0">
                            {tabLoading
                                ? <SkeletonFeatured />
                                : featured
                                    ? <FeaturedCard ani={featured} />
                                    : <div className="rounded-2xl flex items-center justify-center text-white/20 text-sm shrink-0" style={{ width: 360, aspectRatio: '3/4', background: '#1a1530' }}>방영 정보 없음</div>
                            }
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col" style={{ alignSelf: 'stretch' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
                                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </svg>
                                <span className="text-white font-bold text-[15px]">오늘 새로 공개된 작품</span>
                                <span className="text-[12px] text-white/40 font-bold px-2 py-0.5 rounded-full bg-white/5">{tabLoading ? '…' : rest.length}</span>
                                <div className="flex-1" />
                                <button onClick={() => scroll('left')} className="w-7 h-7 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <button onClick={() => scroll('right')} className="w-7 h-7 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                {tabLoading ? (
                                    <ul ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scroll pb-2 flex-wrap" style={{ maxHeight: 480 }}>
                                        {Array.from({ length: 8 }).map((_, i) => <SkeletonSmall key={i} />)}
                                    </ul>
                                ) : rest.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-white/20 text-sm py-16">방영 정보가 없어요</div>
                                ) : (
                                    <ul ref={scrollRef} className="grid gap-3 overflow-x-auto hide-scroll pb-2"
                                        style={{ gridTemplateRows: 'repeat(2, auto)', gridAutoFlow: 'column', gridAutoColumns: '148px' }}>
                                        {rest.slice(0, 12).map(ani => <SmallCard key={ani.id} ani={ani} />)}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 캘린더 모달 ───────────────────────────── */}
            {showCalendar && (
                <CalendarModal
                    onClose={() => setShowCalendar(false)}
                    onSelectDate={handleCalendarSelect}
                />
            )}
        </>
    )
}