'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

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
    { id: 0, label: '월' }, { id: 1, label: '화' }, { id: 2, label: '수' },
    { id: 3, label: '목' }, { id: 4, label: '금' }, { id: 5, label: '토' }, { id: 6, label: '일' },
]

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    10751: '가족', 14: '판타지', 27: '호러', 9648: '미스터리',
    10765: 'SF·판타지', 10762: '어린이',
}

const QUOTES = [
    { text: "강해지고 싶다면, 먼저 자신을 믿어라.", from: "— 귀멸의 칼날" },
    { text: "포기하는 건 죽는 것보다 무서운 일이야.", from: "— 나루토" },
    { text: "이 세계는 잔인하지. 하지만 그래서 아름다워.", from: "— 진격의 거인" },
    { text: "사람은 언제 죽는가? 사람들에게 잊혀졌을 때.", from: "— 원피스" },
    { text: "꿈을 꾸는 걸 멈추는 순간, 진짜 죽는 거야.", from: "— 블리치" },
    { text: "괜찮아. 왜냐하면 내가 여기 있으니까.", from: "— 나의 히어로 아카데미아" },
    { text: "후회하지 않으려면, 지금 이 순간을 살아야 해.", from: "— 소드 아트 온라인" },
    { text: "강함이란 남을 이기는 것이 아니라, 어제의 자신을 이기는 것.", from: "— 드래곤볼" },
    { text: "혼자라서 무서운 게 아니야. 중요한 걸 잃는 게 무서운 거야.", from: "— 페어리 테일" },
    { text: "세상이 어떻게 되든, 나는 내 친구를 지킨다.", from: "— 헌터x헌터" },
    { text: "살아있다는 건, 누군가에게 영향을 준다는 거야.", from: "— 코드 기아스" },
    { text: "눈물을 흘려도 괜찮아. 그게 살아있다는 증거니까.", from: "— 클라나드" },
]

// 별자리 별 좌표 (12개, 각 별자리 고유 패턴)
const CONSTELLATIONS: Record<string, { name: string; label: string; stars: { x: number; y: number; r: number }[]; lines: [number, number][] }> = {
    aries: { name: '양자리', label: '♈', stars: [{ x: 50, y: 30, r: 3 }, { x: 70, y: 45, r: 2.5 }, { x: 95, y: 38, r: 3.5 }, { x: 115, y: 28, r: 2 }, { x: 130, y: 42, r: 2.5 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    taurus: { name: '황소자리', label: '♉', stars: [{ x: 40, y: 55, r: 2 }, { x: 55, y: 40, r: 2.5 }, { x: 75, y: 30, r: 3.5 }, { x: 100, y: 35, r: 2 }, { x: 120, y: 25, r: 2.5 }, { x: 80, y: 55, r: 2 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 0]] },
    gemini: { name: '쌍둥이자리', label: '♊', stars: [{ x: 40, y: 20, r: 3.5 }, { x: 45, y: 40, r: 2 }, { x: 50, y: 60, r: 2.5 }, { x: 50, y: 78, r: 2 }, { x: 110, y: 20, r: 3 }, { x: 115, y: 40, r: 2 }, { x: 115, y: 60, r: 2.5 }, { x: 112, y: 78, r: 2 }, { x: 78, y: 50, r: 1.5 }], lines: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [1, 8], [5, 8]] },
    cancer: { name: '게자리', label: '♋', stars: [{ x: 60, y: 25, r: 2.5 }, { x: 45, y: 50, r: 2 }, { x: 80, y: 55, r: 3.5 }, { x: 115, y: 50, r: 2 }, { x: 100, y: 25, r: 2.5 }], lines: [[0, 2], [1, 2], [2, 3], [2, 4]] },
    leo: { name: '사자자리', label: '♌', stars: [{ x: 50, y: 70, r: 3.5 }, { x: 40, y: 50, r: 2.5 }, { x: 55, y: 30, r: 2 }, { x: 80, y: 22, r: 3 }, { x: 105, y: 28, r: 2 }, { x: 120, y: 50, r: 2.5 }, { x: 105, y: 65, r: 2 }, { x: 75, y: 72, r: 2.5 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]] },
    virgo: { name: '처녀자리', label: '♍', stars: [{ x: 45, y: 25, r: 2 }, { x: 65, y: 18, r: 2.5 }, { x: 90, y: 22, r: 3.5 }, { x: 110, y: 35, r: 2 }, { x: 120, y: 55, r: 2.5 }, { x: 90, y: 65, r: 2 }, { x: 65, y: 58, r: 2.5 }, { x: 45, y: 68, r: 2 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [6, 7]] },
    libra: { name: '천칭자리', label: '♎', stars: [{ x: 45, y: 65, r: 2.5 }, { x: 80, y: 70, r: 3.5 }, { x: 115, y: 65, r: 2.5 }, { x: 80, y: 40, r: 2 }, { x: 55, y: 25, r: 2 }, { x: 105, y: 25, r: 2 }], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5]] },
    scorpio: { name: '전갈자리', label: '♏', stars: [{ x: 35, y: 30, r: 2.5 }, { x: 55, y: 25, r: 3.5 }, { x: 75, y: 30, r: 2 }, { x: 90, y: 42, r: 2.5 }, { x: 100, y: 55, r: 2 }, { x: 105, y: 68, r: 2.5 }, { x: 118, y: 75, r: 2 }, { x: 125, y: 65, r: 2 }, { x: 130, y: 55, r: 1.5 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]] },
    sagittarius: { name: '사수자리', label: '♐', stars: [{ x: 50, y: 70, r: 2.5 }, { x: 70, y: 55, r: 2 }, { x: 60, y: 35, r: 2.5 }, { x: 80, y: 25, r: 3.5 }, { x: 100, y: 35, r: 2 }, { x: 120, y: 55, r: 2.5 }, { x: 105, y: 70, r: 2 }, { x: 90, y: 50, r: 2 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [1, 7], [7, 3]] },
    capricorn: { name: '염소자리', label: '♑', stars: [{ x: 40, y: 30, r: 2.5 }, { x: 65, y: 22, r: 3.5 }, { x: 90, y: 30, r: 2.5 }, { x: 115, y: 40, r: 2 }, { x: 120, y: 60, r: 2.5 }, { x: 95, y: 70, r: 2 }, { x: 65, y: 68, r: 2.5 }, { x: 40, y: 55, r: 2 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 6]] },
    aquarius: { name: '물병자리', label: '♒', stars: [{ x: 35, y: 40, r: 2.5 }, { x: 60, y: 30, r: 2 }, { x: 80, y: 38, r: 3.5 }, { x: 105, y: 30, r: 2 }, { x: 125, y: 40, r: 2.5 }, { x: 50, y: 60, r: 2 }, { x: 75, y: 55, r: 2.5 }, { x: 100, y: 62, r: 2 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [2, 6]] },
    pisces: { name: '물고기자리', label: '♓', stars: [{ x: 35, y: 35, r: 3 }, { x: 50, y: 22, r: 2 }, { x: 65, y: 30, r: 2.5 }, { x: 80, y: 50, r: 2 }, { x: 95, y: 30, r: 2.5 }, { x: 110, y: 22, r: 2 }, { x: 125, y: 35, r: 3 }, { x: 80, y: 65, r: 1.5 }], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [6, 7]] },
}

function getConstellationByDate(month: number, day: number): string {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'gemini'
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'cancer'
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return 'libra'
    if ((month === 10 && day >= 24) || (month === 11 && day <= 21)) return 'scorpio'
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius'
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn'
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
    return 'pisces'
}

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

function getYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
function getToday() { return new Date().toISOString().slice(0, 10) }

function seededShuffle<T>(arr: T[], seed: number): T[] {
    const a = [...arr]; let s = seed
    for (let i = a.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff
        const j = Math.abs(s) % (i + 1);[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function dateSeed() {
    const d = new Date()
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

async function fetchAniByDate(date: string, pages = 2): Promise<AniItem[]> {
    let results: AniItem[] = []
    for (let page = 1; page <= pages; page++) {
        const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&air_date.gte=${date}&air_date.lte=${date}&sort_by=popularity.desc&language=ko-KR&page=${page}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.status_message) console.error('TMDB error:', data.status_message)
        if (!data.results?.length) break
        results = [...results, ...data.results]
    }
    return results
}

// ─── 호버 패널 ─────────────────────────────────────
function HoverPanel({ ani }: { ani: AniItem }) {
    const backdrop = ani.backdrop_path ? `${IMG}/w780${ani.backdrop_path}` : null
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)
    return (
        <div
            className="absolute top-0 left-1/2 w-60 rounded-2xl overflow-hidden z-[200] border border-white/[0.08]"
            style={{
                transform: 'translateX(-50%)',
                animation: 'panelIn 0.18s cubic-bezier(0.34,1.4,0.64,1)',
                background: 'rgba(18,18,24,0.96)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
        >
            {backdrop
                ? <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                    <img src={backdrop} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(18,18,24,0.98))' }} />
                </div>
                : <div className="w-full" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }} />
            }
            <div className="px-4 pb-4 pt-2.5">
                <p className="text-[13px] font-semibold text-white/90 leading-snug mb-2">{ani.name}</p>
                {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {genres.map(g => (
                            <span key={g} className="text-[10px] text-violet-300/70 border border-violet-400/20 rounded-full px-2 py-0.5 tracking-wide">
                                {g}
                            </span>
                        ))}
                    </div>
                )}
                <p className="text-[11px] text-white/35 leading-relaxed mb-3">
                    {ani.overview ? ani.overview.slice(0, 75) + (ani.overview.length > 75 ? '…' : '') : '줄거리 정보가 없습니다.'}
                </p>
                <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-white text-[12px] font-medium border-none cursor-pointer transition-all"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>재생
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── 카드 공통 훅 ──────────────────────────────────
function useHover() {
    const [hovered, setHovered] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onEnter = () => { timer.current = setTimeout(() => setHovered(true), 160) }
    const onLeave = () => { if (timer.current) clearTimeout(timer.current); setHovered(false) }
    return { hovered, onEnter, onLeave }
}

// ─── 슬라이드 카드 ─────────────────────────────────
function SlideCard({ ani, w }: { ani: AniItem; w: number }) {
    const poster = ani.poster_path ? `${IMG}/w342${ani.poster_path}` : null
    const score = Math.round(ani.vote_average * 10) / 10
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)
    return (
        <Link href={`/anime/${ani.id}`} className="relative cursor-pointer group shrink-0 block" style={{ width: w }}>
            <div className="relative overflow-hidden rounded-xl" style={{ width: w, aspectRatio: '2/3', background: '#1e1b4b' }}>
                {poster
                    ? <img src={poster} alt={ani.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center"><span className="text-3xl font-black text-white/10">{ani.name[0]}</span></div>
                }
                {/* 내부 오버레이 */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}>
                    <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2 mb-1">{ani.name}</p>
                    {genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                            {genres.map(g => <span key={g} className="text-[9px] text-white/50 border border-white/15 rounded-full px-1.5 py-0.5">{g}</span>)}
                        </div>
                    )}
                    {score > 0 && <span className="text-[10px] font-semibold text-amber-400/90">★ {score}</span>}
                </div>
                {/* 평소 점수 뱃지 */}
                {score > 0 && (
                    <span className="absolute bottom-2 left-2.5 text-[11px] font-semibold text-amber-400/90 group-hover:opacity-0 transition-opacity">
                        ★ {score}
                    </span>
                )}
            </div>
            <p className="mt-2 text-[11px] font-medium leading-snug line-clamp-1 text-white/50" style={{ width: w }}>{ani.name}</p>
        </Link>
    )
}

// ─── 최근 업데이트 카드 ────────────────────────────
function RecentCard({ ani, dayLabel, featured = false }: { ani: AniItem & { _date?: string }; dayLabel: string; featured?: boolean }) {
    const poster = ani.poster_path ? `${IMG}/w342${ani.poster_path}` : null
    const backdrop = ani.backdrop_path ? `${IMG}/w780${ani.backdrop_path}` : null
    const score = Math.round(ani.vote_average * 10) / 10
    const isToday = ani._date === 'today'
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)

    return (
        <Link href={`/anime/${ani.id}`} className="relative cursor-pointer group shrink-0 w-[160px] sm:w-[180px] md:w-[200px] block">
            <div
                className="relative overflow-hidden rounded-xl"
                style={{
                    aspectRatio: '1/1',
                    background: '#1e1b4b',
                    boxShadow: featured ? '0 0 0 2px rgba(139,92,246,0.8), 0 8px 32px rgba(109,40,217,0.4)' : 'none',
                }}
            >
                {/* 이미지 — featured는 backdrop 우선 */}
                {featured && backdrop
                    ? <img src={backdrop} alt={ani.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    : poster
                        ? <img src={poster} alt={ani.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        : <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-black text-white/10">{ani.name[0]}</span></div>
                }

                {/* featured 전용 보라 글로우 */}
                {featured && <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(109,40,217,0.8) 0%, transparent 60%)' }} />}

                {/* 기본 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* 뱃지 */}
                <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider z-10 ${isToday ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/50'}`}>
                    {isToday ? 'TODAY' : 'YEST'}
                </span>

                {/* 기본 정보 */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10 group-hover:opacity-0 transition-opacity duration-200">
                    {score > 0 && <span className="text-[11px] font-semibold text-amber-400/90">★ {score}</span>}
                </div>

                {/* 호버 오버레이 */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)' }}>
                    <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2 mb-1">{ani.name}</p>
                    {featured && genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                            {genres.map(g => <span key={g} className="text-[9px] text-white/45 border border-white/15 rounded-full px-1.5 py-0.5">{g}</span>)}
                        </div>
                    )}
                    <p className="text-[9px] text-violet-300/60 tracking-wide">매주 {dayLabel}요일</p>
                </div>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-snug line-clamp-1 text-white/55">{ani.name}</p>
            <p className="text-[10px] text-violet-400/50 mt-0.5 tracking-wide">매주 {dayLabel}요일</p>
        </Link>
    )
}

// ─── 그리드 카드 ───────────────────────────────────
function GridCard({ ani }: { ani: AniItem }) {
    const poster = ani.poster_path ? `${IMG}/w342${ani.poster_path}` : null
    const score = Math.round(ani.vote_average * 10) / 10
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)
    return (
        <Link href={`/anime/${ani.id}`} className="relative cursor-pointer group overflow-hidden rounded-xl block" style={{ aspectRatio: '2/3', background: '#1e1b4b' }}>
            {poster
                ? <img src={poster} alt={ani.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                : <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl font-black text-white/10">{ani.name[0]}</span></div>
            }
            {/* 호버 오버레이 — 카드 내부에서만 */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)' }}>
                <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2 mb-1.5">{ani.name}</p>
                {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {genres.map(g => <span key={g} className="text-[9px] text-white/50 border border-white/15 rounded-full px-1.5 py-0.5">{g}</span>)}
                    </div>
                )}
                {score > 0 && <span className="text-[11px] font-semibold text-amber-400/90">★ {score}</span>}
            </div>
        </Link>
    )
}

// ─── 스켈레톤 ──────────────────────────────────────
function SkeletonSlide({ w }: { w: number }) {
    return (
        <li className="shrink-0" style={{ width: w }}>
            <div className="rounded-xl" style={{ width: w, aspectRatio: '2/3', background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
            <div className="mt-2 h-2.5 rounded-full" style={{ width: w * 0.65, background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
        </li>
    )
}

function SkeletonGrid() {
    return (
        <li>
            <div className="w-full rounded-xl" style={{ aspectRatio: '2/3', background: 'linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.06) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
        </li>
    )
}

// ─── 스크롤 버튼 ───────────────────────────────────
function ScrollBtn({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full items-center justify-center cursor-pointer transition-all border border-violet-500/30 bg-violet-950/60 hover:bg-violet-600/70 hover:border-violet-400/60 text-violet-400/60 hover:text-white"
            style={{ [dir === 'left' ? 'left' : 'right']: -20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
            </svg>
        </button>
    )
}

// ─── 섹션 타이틀 ───────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-white font-black text-xl sm:text-2xl tracking-tight flex items-center gap-1.5">
                <span style={{ display: 'inline-block', animation: 'wiggle 1.2s ease-in-out infinite' }}>🔔</span>
                {children}
                <span className="text-violet-400">!</span>
            </h2>
            <span className="text-[11px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full border border-violet-400/30 text-violet-300/80 bg-violet-500/10">
                어제 · 오늘
            </span>
        </div>
    )
}

// ─── 메인 ──────────────────────────────────────────
export default function Page() {
    const weekDates = useRef<string[]>([])
    const todayTabIdxRef = useRef(0)
    const seed = useRef(0)

    const [activeDay, setActiveDay] = useState(0)
    const [initialized, setInitialized] = useState(false)
    const [tabCache, setTabCache] = useState<Record<number, AniItem[]>>({})
    const [tabLoading, setTabLoading] = useState(false)
    const [todayList, setTodayList] = useState<AniItem[]>([])
    const [todayLoading, setTodayLoading] = useState(true)
    const [recentList, setRecentList] = useState<(AniItem & { _date: string })[]>([])
    const [recentLoading, setRecentLoading] = useState(true)
    const [popularAni, setPopularAni] = useState<AniItem | null>(null)
    const [quote, setQuote] = useState(QUOTES[0])
    const [constellation, setConstellation] = useState(CONSTELLATIONS['pisces'])

    const todayScrollRef = useRef<HTMLUListElement>(null)
    const recentScrollRef = useRef<HTMLUListElement>(null)

    // 클라이언트에서만 Date 계산
    useEffect(() => {
        weekDates.current = getWeekDates()
        todayTabIdxRef.current = jsDateDayToTabIdx(new Date().getDay())
        seed.current = dateSeed()
        setActiveDay(todayTabIdxRef.current)
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
        const now = new Date()
        setConstellation(CONSTELLATIONS[getConstellationByDate(now.getMonth() + 1, now.getDate())])
        setInitialized(true)
    }, [])

    const scroll = (ref: React.RefObject<HTMLUListElement | null>, dir: 'left' | 'right') => {
        ref.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
    }

    useEffect(() => {
        if (!initialized) return
        const load = async () => {
            setTodayLoading(true)
            try {
                const list = await fetchAniByDate(weekDates.current[todayTabIdxRef.current], 3)
                setTodayList(list)
                const sorted = [...list].sort((a, b) => b.vote_average - a.vote_average)
                setPopularAni(sorted[0] || null)
            } finally { setTodayLoading(false) }
        }
        load()
    }, [initialized])

    useEffect(() => {
        if (!initialized) return
        const load = async () => {
            setRecentLoading(true)
            try {
                const [todayItems, yestItems] = await Promise.all([
                    fetchAniByDate(getToday(), 2),
                    fetchAniByDate(getYesterday(), 2),
                ])
                const merged = [
                    ...todayItems.map(a => ({ ...a, _date: 'today' })),
                    ...yestItems
                        .filter(a => !todayItems.find(t => t.id === a.id))
                        .map(a => ({ ...a, _date: 'yesterday' })),
                ]
                setRecentList(merged)
            } finally { setRecentLoading(false) }
        }
        load()
    }, [initialized])

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

    const tabList = tabCache[activeDay] ?? []
    const todayLabel = DAYS[todayTabIdxRef.current]?.label || '오늘'

    return (
        <>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                @keyframes wiggle {
                    0%, 100% { transform: rotate(-8deg) scale(1); }
                    25% { transform: rotate(8deg) scale(1.15); }
                    50% { transform: rotate(-5deg) scale(1.05); }
                    75% { transform: rotate(6deg) scale(1.1); }
                }
                @keyframes panelIn {
                    from { opacity:0; transform:translateX(-50%) scale(.95) translateY(4px); }
                    to   { opacity:1; transform:translateX(-50%) scale(1)   translateY(0); }
                }
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                .hide-scroll::-webkit-scrollbar { display:none }
                .hide-scroll { -ms-overflow-style:none; scrollbar-width:none }
                .tab-btn::before, .tab-btn::after {
                    content: '';
                    position: absolute;
                    left: 0; right: 0;
                    height: 1px;
                    background: rgba(255,255,255,0.07);
                    transition: background 0.25s;
                }
                .tab-btn::before { top: 0; }
                .tab-btn::after  { bottom: 0; }
                .tab-btn:hover::before, .tab-btn:hover::after {
                    background: rgba(255,255,255,0.45);
                }
            `}</style>

            <div className="pt-14 min-h-screen bg-[#0a0910] dark:bg-[#0a0910] text-white transition-colors">

                {/* ── Today's Pick ─────────────────────────── */}
                <section className="px-4 sm:px-6 lg:px-8 pt-10 pb-10 max-w-[1400px] mx-auto">
                    <div className="flex items-start gap-6 sm:gap-10">

                        {/* 요일 원형 + 명대사 */}
                        <div className="shrink-0 flex flex-col items-center gap-5" style={{ width: 160 }}>
                            <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
                                {/* 바깥 싸이클 */}
                                <div className="absolute rounded-full border border-violet-400/20"
                                    style={{ width: 156, height: 156, animation: 'spin 8s linear infinite' }}>
                                    <div className="absolute w-2.5 h-2.5 rounded-full bg-violet-400/60" style={{ top: -5, left: '50%', transform: 'translateX(-50%)' }} />
                                    <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-300/40" style={{ bottom: -4, right: '20%' }} />
                                </div>
                                {/* 안쪽 싸이클 */}
                                <div className="absolute rounded-full border border-violet-500/15"
                                    style={{ width: 128, height: 128, animation: 'spinReverse 5s linear infinite' }}>
                                    <div className="absolute w-2 h-2 rounded-full bg-violet-300/50" style={{ top: -4, right: '25%' }} />
                                </div>
                                {/* 뒤 남색 원 */}
                                <div className="absolute rounded-full bg-[#1e1566]" style={{ width: 108, height: 108, top: 18, left: 8 }} />
                                {/* 메인 원 */}
                                <div className="relative rounded-full flex items-center justify-center font-black text-white text-3xl sm:text-4xl"
                                    style={{ width: 112, height: 112, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 0 4px rgba(109,40,217,0.2), 0 12px 40px rgba(109,40,217,0.6)' }}>
                                    {todayLabel}
                                </div>
                            </div>

                            {/* 명대사 — 오늘의 별자리 */}
                            <div className="w-full flex flex-col items-center">
                                <style>{`
                                    @keyframes twinkleA { 0%,100%{opacity:0.95} 50%{opacity:0.3} }
                                    @keyframes twinkleB { 0%,100%{opacity:0.85} 50%{opacity:0.25} }
                                    @keyframes twinkleC { 0%,100%{opacity:0.75} 50%{opacity:0.2} }
                                    @keyframes linePulse { 0%,100%{stroke-opacity:0.6} 50%{stroke-opacity:0.15} }
                                    .sA{animation:twinkleA 2.4s ease-in-out infinite}
                                    .sB{animation:twinkleB 1.9s ease-in-out infinite 0.5s}
                                    .sC{animation:twinkleC 2.8s ease-in-out infinite 1.1s}
                                    .sD{animation:twinkleA 2.1s ease-in-out infinite 0.3s}
                                    .sE{animation:twinkleB 2.6s ease-in-out infinite 0.8s}
                                    .sF{animation:twinkleC 1.8s ease-in-out infinite 1.4s}
                                    .sG{animation:twinkleA 2.3s ease-in-out infinite 0.7s}
                                    .sH{animation:twinkleB 2.5s ease-in-out infinite 1.2s}
                                    .sI{animation:twinkleC 2.0s ease-in-out infinite 0.4s}
                                    .cl{animation:linePulse 3s ease-in-out infinite}
                                `}</style>
                                <svg width="200" viewBox="0 0 160 175" xmlns="http://www.w3.org/2000/svg">
                                    {[[12, 15], [148, 22], [143, 72], [18, 68], [102, 10], [46, 8], [155, 55], [8, 45]].map(([x, y], i) => (
                                        <circle key={i} cx={x} cy={y} r="0.8" fill="rgba(167,139,250,0.28)" />
                                    ))}
                                    {constellation.lines.map(([a, b]: number[], i: number) => (
                                        <line key={i} className="cl"
                                            x1={constellation.stars[a].x} y1={constellation.stars[a].y}
                                            x2={constellation.stars[b].x} y2={constellation.stars[b].y}
                                            stroke="rgba(196,181,253,0.9)" strokeWidth="1.2" />
                                    ))}
                                    {constellation.stars.map((s: { x: number; y: number; r: number }, i: number) => (
                                        <circle key={i} className={['sA', 'sB', 'sC', 'sD', 'sE', 'sF', 'sG', 'sH', 'sI'][i % 9]}
                                            cx={s.x} cy={s.y} r={s.r}
                                            fill={s.r >= 3 ? 'rgba(255,255,255,0.95)' : s.r >= 2.5 ? 'rgba(216,180,254,0.9)' : 'rgba(167,139,250,0.8)'} />
                                    ))}
                                    <text x="80" y="108" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="rgba(167,139,250,0.5)" letterSpacing="2">
                                        {constellation.label} {constellation.name}
                                    </text>
                                    <line x1="25" y1="116" x2="135" y2="116" stroke="rgba(139,92,246,0.15)" strokeWidth="0.5" />
                                    <text x="80" y="133" textAnchor="middle" fontFamily="sans-serif" fontSize="10.5" fill="rgba(255,255,255,0.6)" fontStyle="italic">
                                        {`"${quote.text.length > 14 ? quote.text.slice(0, 14) : quote.text}`}
                                    </text>
                                    <text x="80" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="10.5" fill="rgba(255,255,255,0.6)" fontStyle="italic">
                                        {quote.text.length > 14 ? `${quote.text.slice(14, 26)}${quote.text.length > 26 ? '…"' : '"'}` : '"'}
                                    </text>
                                    <text x="80" y="166" textAnchor="middle" fontFamily="sans-serif" fontSize="9.5" fill="rgba(167,139,250,0.45)" letterSpacing="2">
                                        {quote.from}
                                    </text>
                                </svg>
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="mb-5">
                                <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-violet-400/50 block mb-2">Today's Pick</span>
                                <p className="text-white font-black text-2xl sm:text-3xl leading-tight tracking-tight">
                                    {todayLabel}요일 방영
                                    <span className="text-white/30 font-light text-xl sm:text-2xl ml-2">애니메이션</span>
                                </p>
                                <p className="text-[14px] sm:text-[15px] text-violet-300/70 mt-2 font-semibold">
                                    {[
                                        '월욜병 퇴치엔 애니메이션이 최고!',
                                        '화요일의 지루함, 애니로 날려버려!',
                                        '수요일의 힘! 주중 반환점 애니와 함께',
                                        '목요일도 버텨! 주말이 코앞이야',
                                        '불금엔 애니메이션과 함께 달려! 🔥',
                                        '토요일 정주행 시작! 오늘은 몇 편?',
                                        '일요일엔 느긋하게 애니 한 편 어때?',
                                    ][todayTabIdxRef.current]}
                                </p>
                            </div>
                            <div className="relative px-6">
                                <ScrollBtn dir="left" onClick={() => scroll(todayScrollRef, 'left')} />
                                <ul ref={todayScrollRef} className="flex gap-3 overflow-x-auto hide-scroll pb-1">
                                    {todayLoading
                                        ? Array.from({ length: 6 }).map((_, i) => <SkeletonSlide key={i} w={200} />)
                                        : todayList.slice(0, 8).map(ani => <SlideCard key={ani.id} ani={ani} w={200} />)
                                    }
                                </ul>
                                <ScrollBtn dir="right" onClick={() => scroll(todayScrollRef, 'right')} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 섹션 구분선 */}
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="border-t border-white/[0.04]" />
                </div>

                {/* ── 공지 배너 ─────────────────────────────── */}
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-400/20"
                        style={{ background: 'rgba(251,191,36,0.05)' }}>
                        <span className="text-amber-400/80 text-[13px] shrink-0">📢</span>
                        <p className="text-[11px] sm:text-[12px] text-white/45 leading-relaxed">
                            <span className="text-amber-400/70 font-semibold">〈이세계 사정은 사축 하기 나름〉 13화(OVA)</span>
                            {' '}는 판권사 요청으로 인해{' '}
                            <span className="text-white/60">2026년 5월 29일</span>
                            {' '}재오픈될 예정입니다. 서비스 이용에 참고 바랍니다.
                        </p>
                    </div>
                </div>

                {/* ── 최근 업데이트 ─────────────────────────── */}
                <section className="px-4 sm:px-6 lg:px-8 pt-8 pb-10 max-w-[1400px] mx-auto">
                    <SectionTitle>최근 업데이트</SectionTitle>
                    {recentLoading
                        ? (
                            <div className="flex gap-4">
                                <div className="shrink-0 rounded-2xl" style={{ width: 280, aspectRatio: '1/1', background: 'linear-gradient(90deg,#1e1b4b 25%,#2e2a6b 50%,#1e1b4b 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite' }} />
                                <div className="flex gap-3 overflow-hidden">
                                    {Array.from({ length: 4 }).map((_, i) => <SkeletonSlide key={i} w={160} />)}
                                </div>
                            </div>
                        )
                        : recentList.length > 0 && (
                            <div className="flex items-center gap-4">
                                {/* 첫번째 카드 — 크게 고정 */}
                                <Link href={`/anime/${recentList[0].id}`} className="shrink-0 cursor-pointer group block" style={{ width: 280 }}>
                                    <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '1/1', background: '#1e1b4b' }}>
                                        {recentList[0].backdrop_path
                                            ? <img src={`${IMG}/w780${recentList[0].backdrop_path}`} alt={recentList[0].name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            : recentList[0].poster_path
                                                ? <img src={`${IMG}/w342${recentList[0].poster_path}`} alt={recentList[0].name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                : null
                                        }
                                        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                                        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(109,40,217,0.8) 0%, transparent 60%)' }} />
                                        <span className={`absolute top-3 left-3 text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase z-10 ${recentList[0]._date === 'today' ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/50'}`}>
                                            {recentList[0]._date === 'today' ? 'New Today' : 'Yesterday'}
                                        </span>
                                        <div className="absolute inset-0 flex flex-col justify-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10"
                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 55%, transparent 100%)' }}>
                                            <p className="text-white font-bold text-[15px] leading-snug line-clamp-2 mb-1.5">{recentList[0].name}</p>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {recentList[0].genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2).map(g => (
                                                    <span key={g} className="text-[10px] text-white/50 border border-white/15 rounded-full px-2 py-0.5">{g}</span>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] text-violet-300/70">매주 {todayLabel}요일</p>
                                                {recentList[0].vote_average > 0 && <span className="text-[12px] font-semibold text-amber-400/90">★ {Math.round(recentList[0].vote_average * 10) / 10}</span>}
                                            </div>
                                        </div>
                                        <div className="absolute bottom-3 left-3 right-3 z-10 group-hover:opacity-0 transition-opacity">
                                            <p className="text-white font-semibold text-[13px] leading-snug line-clamp-1">{recentList[0].name}</p>
                                        </div>
                                    </div>
                                </Link>

                                {/* 나머지 카드 — 가로 스크롤 */}
                                <div className="relative flex-1 min-w-0 px-6">
                                    <ul className="flex items-center gap-3 overflow-x-auto hide-scroll pb-1">
                                        {recentList.slice(1, 20).map(ani => (
                                            <RecentCard key={`${ani.id}-${ani._date}`} ani={ani} dayLabel={todayLabel} featured={false} />
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )
                    }
                </section>

                {/* ── 요일 탭 + 그리드 ──────────────────────── */}
                <div style={{ background: 'linear-gradient(160deg, #1a0533 0%, #2d0f5e 30%, #1e0a4a 60%, #120728 100%)' }}>

                    {/* 인기 배너 */}
                    {popularAni && (
                        <div className="flex justify-center pt-4 pb-2 px-4">
                            <div className="flex items-center gap-0">
                                <img src="/images/daynow_emoji.png" alt="" className="w-24 h-24 sm:w-28 sm:h-28 object-contain shrink-0 relative z-10 -mr-1" style={{ filter: 'drop-shadow(0 4px 20px rgba(139,92,246,0.5))' }} />
                                <div className="relative">
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45"
                                        style={{ background: 'rgba(255,255,255,0.07)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
                                    <div className="relative rounded-2xl rounded-l-none px-7 sm:px-9 py-3 border border-white/[0.08] border-l-0"
                                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(139,92,246,0.08) 100%)', backdropFilter: 'blur(24px)' }}>
                                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-300/40 mb-1">Today's Popular</p>
                                        <p className="text-[14px] sm:text-[16px] font-medium text-white/80 whitespace-nowrap">
                                            오늘 가장 인기있는 애니는{' '}
                                            <span className="text-violet-300 font-bold">"{popularAni.name}"</span>
                                            {' '}<span className="text-white/70">입니다</span>
                                            {popularAni.vote_average > 0 && (
                                                <span className="ml-3 text-[11px] text-amber-400/60 font-semibold">★ {Math.round(popularAni.vote_average * 10) / 10} · 오늘의 추천</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* 탭 */}
                    <div className="tabs-wrap max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex overflow-x-auto hide-scroll">
                            {DAYS.map(d => (
                                <button key={d.id} onClick={() => setActiveDay(d.id)}
                                    className={[
                                        'tab-btn flex-1 min-w-[40px] py-4 text-[13px] font-semibold border-none cursor-pointer transition-all duration-200 relative whitespace-nowrap bg-transparent tracking-wide',
                                        activeDay === d.id ? 'text-white' : 'text-white/35 hover:text-white/60',
                                    ].join(' ')}
                                >
                                    {d.label}
                                    {activeDay === d.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-white/70 rounded-full" />}
                                    {d.id === todayTabIdxRef.current && <span className="absolute top-2.5 right-[calc(50%-12px)] w-1 h-1 rounded-full bg-violet-400/70" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 그리드 */}
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
                        <ul className="list-none m-0 p-0 grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {tabLoading
                                ? Array.from({ length: 10 }).map((_, i) => <SkeletonGrid key={i} />)
                                : tabList.length === 0
                                    ? (
                                        <li className="col-span-full flex flex-col items-center justify-center py-24 gap-3">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10">
                                                <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                                            </svg>
                                            <p className="text-[12px] text-white/20 tracking-wider">방영 정보가 없어요</p>
                                        </li>
                                    )
                                    : tabList.map(ani => <GridCard key={ani.id} ani={ani} />)
                            }
                        </ul>
                    </div>
                </div>

            </div>
        </>
    )
}