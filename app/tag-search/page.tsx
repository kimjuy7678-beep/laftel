'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

// ─── 타입 ──────────────────────────────────────────────────────
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

interface Filters {
    genres: number[]
    excludeGenres: number[]
    tags: string[]
    excludeTags: string[]
    year: string
    airing: string
    mediaType: string
    sort: string
    watchable: boolean    // 감상 가능한 작품만
    memberOnly: boolean   // 멤버십 포함 작품만
}

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

// ─── 라프텔 장르 목록 (모달용 전체) ───────────────────────────
const ALL_GENRES = [
    { id: 10759, label: 'BL' },         // 실제 BL은 TMDB에 없어서 근사
    { id: 10766, label: 'GL 백합' },
    { id: 10765, label: 'SF' },
    { id: 27,    label: '공포' },
    { id: 18,    label: '드라마' },
    { id: 10749, label: '로맨스' },
    { id: 10408, label: '마법소녀' },
    { id: 10759, label: '모험' },
    { id: 4344,  label: '무협' },
    { id: 9648,  label: '미스터리' },
    { id: 80,    label: '범죄' },
    { id: 10768, label: '성인' },
    { id: 53,    label: '스릴러' },
    { id: 11602, label: '스포츠' },
    { id: 36,    label: '시대물' },
    { id: 10762, label: '아동' },
    { id: 155030,label: '아이돌' },
    { id: 10714, label: '악역영애' },
    { id: 28,    label: '액션' },
    { id: 210024,label: '역하렘' },
    { id: 6075,  label: '음식' },
    { id: 6075,  label: '음악' },
    { id: 210024,label: '이세계' },
    { id: 35,    label: '일상' },
    { id: 10,    label: '재난' },
    { id: 9799,  label: '추리' },
    { id: 158718,label: '추방물' },
    { id: 14,    label: '치유' },
    { id: 35,    label: '코미디' },
    { id: 10764, label: '특촬' },
    { id: 14,    label: '판타지' },
    { id: 210025,label: '하렘' },
]

// 사이드바 기본 노출 (상위 9개)
const SIDEBAR_GENRES = ALL_GENRES.slice(0, 9)

const ALL_TAGS = [
    { id: '10751', label: '가족' },
    { id: '9716',  label: '감동적인' },
    { id: '9882',  label: '게임' },
    { id: '10087', label: '동물' },
    { id: '10189', label: '동양풍' },
    { id: '4159',  label: '두뇌싸움' },
    { id: '4565',  label: '로봇' },
    { id: '4159',  label: '루프물' },
    { id: '9799',  label: '먼치킨' },
    { id: '1701',  label: '무거운' },
    { id: '818',   label: '소설원작' },
    { id: '9717',  label: '만화원작' },
    { id: '4290',  label: '닌자' },
    { id: '158718',label: '학원물' },
    { id: '9882',  label: '마법' },
]
const SIDEBAR_TAGS = ALL_TAGS.slice(0, 9)

// 분기별 년도 목록
const QUARTER_YEARS = [
    { value: '2026-Q2', label: '2026년 2분기' },
    { value: '2026-Q1', label: '2026년 1분기' },
    { value: '2025-Q4', label: '2025년 4분기' },
    { value: '2025-Q3', label: '2025년 3분기' },
    { value: '2025-Q2', label: '2025년 2분기' },
    { value: '2025-Q1', label: '2025년 1분기' },
    { value: '2024',    label: '2024년' },
    { value: '2023',    label: '2023년' },
    { value: '2022',    label: '2022년' },
    { value: '2010s',   label: '2010년대' },
    { value: '2000s',   label: '2000년대' },
    { value: '1990s',   label: '1990년대' },
]
const SIDEBAR_YEARS = QUARTER_YEARS.slice(0, 4)

const SORT_OPTIONS = [
    { value: 'popularity.desc',     label: '인기순' },
    { value: 'first_air_date.desc', label: '신작순' },
    { value: 'vote_count.desc',     label: '업데이트순' },
    { value: '0',                   label: '리뷰 많은순' },
    { value: 'vote_average.desc',   label: '별점 높은순' },
]

const GENRE_LABEL: Record<number, string> = {
    16:'애니', 10759:'액션', 35:'코미디', 18:'드라마',
    14:'판타지', 10765:'SF', 9648:'미스터리', 27:'호러',
    10751:'가족', 10762:'어린이', 10749:'로맨스',
}

const DEFAULT_FILTERS: Filters = {
    genres: [], excludeGenres: [], tags: [], excludeTags: [],
    year: '', airing: '', mediaType: '', sort: 'popularity.desc',
    watchable: false, memberOnly: false,
}

// 분기 → 날짜 범위
function quarterToRange(val: string) {
    if (val === '2026-Q2') return { gte: '2026-04-01', lte: '2026-06-30' }
    if (val === '2026-Q1') return { gte: '2026-01-01', lte: '2026-03-31' }
    if (val === '2025-Q4') return { gte: '2025-10-01', lte: '2025-12-31' }
    if (val === '2025-Q3') return { gte: '2025-07-01', lte: '2025-09-30' }
    if (val === '2025-Q2') return { gte: '2025-04-01', lte: '2025-06-30' }
    if (val === '2025-Q1') return { gte: '2025-01-01', lte: '2025-03-31' }
    if (val === '2024')    return { gte: '2024-01-01', lte: '2024-12-31' }
    if (val === '2023')    return { gte: '2023-01-01', lte: '2023-12-31' }
    if (val === '2022')    return { gte: '2022-01-01', lte: '2022-12-31' }
    if (val === '2010s')   return { gte: '2010-01-01', lte: '2019-12-31' }
    if (val === '2000s')   return { gte: '2000-01-01', lte: '2009-12-31' }
    if (val === '1990s')   return { gte: '1990-01-01', lte: '1999-12-31' }
    return null
}

// ─── 체크박스 컴포넌트 ─────────────────────────────────────────
function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
    return (
        <label className="cb-row" onClick={onChange}>
            <span className={`cb-box${checked ? ' checked' : ''}`}>
                {checked && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </span>
            <span className="cb-label">{label}</span>
        </label>
    )
}

// ─── 장르 전체 모달 ────────────────────────────────────────────
function GenreModal({
    selected, excluded, onToggle, onExclude, onReset, onClose
}: {
    selected: number[]; excluded: number[];
    onToggle: (id: number) => void; onExclude: (id: number) => void;
    onReset: () => void; onClose: () => void;
}) {
    return (
        <div className="modal-bg" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <h2>장르 전체</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <p className="modal-desc">원치 않는 필터는 체크 박스를 한번 더 누르면 제외 할 수 있어요.</p>
                <div className="modal-grid">
                    {ALL_GENRES.map(g => {
                        const isOn  = selected.includes(g.id)
                        const isEx  = excluded.includes(g.id)
                        return (
                            <label
                                key={g.label}
                                className={`modal-cb${isOn ? ' on' : ''}${isEx ? ' ex' : ''}`}
                                onClick={() => isOn ? onExclude(g.id) : onToggle(g.id)}
                            >
                                <span className={`cb-box${isOn ? ' checked' : ''}${isEx ? ' ex' : ''}`}>
                                    {isOn && !isEx && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                    {isEx && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="2" y1="6" x2="10" y2="6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                                </span>
                                <span>{g.label}</span>
                            </label>
                        )
                    })}
                </div>
                <div className="modal-foot">
                    <button className="modal-reset" onClick={onReset}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        전체 초기화
                    </button>
                    <button className="modal-confirm" onClick={onClose}>확인</button>
                </div>
            </div>
        </div>
    )
}

// ─── 카드 ─────────────────────────────────────────────────────
function AniCard({ item }: { item: AniItem }) {
    const [hov, setHov] = useState(false)
    const t = useRef<ReturnType<typeof setTimeout> | null>(null)
    const poster   = item.poster_path   ? `${IMG}/w342${item.poster_path}`   : null
    const backdrop = item.backdrop_path ? `${IMG}/w780${item.backdrop_path}` : null
    const score    = Math.round(item.vote_average * 10) / 10
    const year     = item.first_air_date?.slice(0, 4) || ''
    const genres   = item.genre_ids.map(g => GENRE_LABEL[g]).filter(Boolean).slice(0, 2)
    return (
        <li className="fc"
            onMouseEnter={() => { t.current = setTimeout(() => setHov(true), 160) }}
            onMouseLeave={() => { if (t.current) clearTimeout(t.current); setHov(false) }}>
            <div className="fc-thumb">
                {poster
                    ? <img src={poster} alt={item.name} loading="lazy" />
                    : <div className="fc-np"><span>{(item.name||'?')[0]}</span></div>}
                {score > 0 && <span className="fc-score">★ {score}</span>}
            </div>
            <div className="fc-info">
                <p className="fc-name">{item.name}</p>
                <p className="fc-meta">
                    {year && <span>· 애니메이션</span>}
                    {genres.map(g => <span key={g}> · {g}</span>)}
                </p>
            </div>
            {hov && (
                <div className="fc-hover">
                    {backdrop
                        ? <div className="fh-bg"><img src={backdrop} alt="" /><div className="fh-dim" /></div>
                        : <div className="fh-fallback" />}
                    <div className="fh-body">
                        <p className="fh-name">{item.name}</p>
                        {genres.length > 0 && (
                            <div className="fh-genres">
                                {genres.map(g => <span key={g} className="fh-tag">{g}</span>)}
                            </div>
                        )}
                        <p className="fh-ov">
                            {item.overview
                                ? item.overview.slice(0, 88) + (item.overview.length > 88 ? '…' : '')
                                : '줄거리 정보가 없습니다.'}
                        </p>
                        <div className="fh-acts">
                            <button className="fh-play">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                재생
                            </button>
                            <button className="fh-add" aria-label="찜">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </li>
    )
}

function Skeleton() {
    return (
        <li className="fc-sk">
            <div className="sk-t" />
            <div className="sk-l" style={{ width: '75%' }} />
            <div className="sk-l" style={{ width: '50%', marginTop: 5, height: 10 }} />
        </li>
    )
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function TagSearch() {
    const [filters, setFilters]     = useState<Filters>(DEFAULT_FILTERS)
    const [results, setResults]     = useState<AniItem[]>([])
    const [loading, setLoading]     = useState(false)
    const [page, setPage]           = useState(1)
    const [totalPages, setTotal]    = useState(1)
    const [sortOpen, setSortOpen]   = useState(false)
    const [genreModal, setGenreModal] = useState(false)
    const [tagModal, setTagModal]   = useState(false)
    const pending = useRef(false)
    const sortRef = useRef<HTMLDivElement>(null)

    const activeCount =
        filters.genres.length + filters.tags.length + filters.excludeGenres.length +
        (filters.year ? 1 : 0) + (filters.airing ? 1 : 0) + (filters.mediaType ? 1 : 0)

    // 정렬 드롭다운 바깥 클릭 닫기
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    const toggleGenre = (id: number) =>
        setFilters(f => ({ ...f, genres: f.genres.includes(id) ? f.genres.filter(g => g !== id) : [...f.genres, id] }))
    const excludeGenre = (id: number) =>
        setFilters(f => ({
            ...f,
            genres: f.genres.filter(g => g !== id),
            excludeGenres: f.excludeGenres.includes(id) ? f.excludeGenres.filter(g => g !== id) : [...f.excludeGenres, id]
        }))
    const toggleTag = (id: string) =>
        setFilters(f => ({ ...f, tags: f.tags.includes(id) ? f.tags.filter(t => t !== id) : [...f.tags, id] }))
    const toggleYear = (y: string) =>
        setFilters(f => ({ ...f, year: f.year === y ? '' : y }))
    const toggleAiring = (a: string) =>
        setFilters(f => ({ ...f, airing: f.airing === a ? '' : a }))
    const toggleMedia = (m: string) =>
        setFilters(f => ({ ...f, mediaType: f.mediaType === m ? '' : m }))
    const reset = () => { setFilters(DEFAULT_FILTERS); setPage(1) }

    const fetchResults = useCallback(async (f: Filters, pg: number) => {
        if (pending.current) return
        pending.current = true
        setLoading(true)
        try {
            const yr = quarterToRange(f.year)
            const genreIds = ['16', ...f.genres.map(String)]
            const params = new URLSearchParams({
                api_key: TMDB_KEY || '',
                with_genres: genreIds.join(','),
                with_original_language: 'ja',
                sort_by: f.sort === '0' ? 'vote_count.desc' : f.sort,
                language: 'ko-KR',
                page: String(pg),
                'vote_count.gte': '5',
            })
            if (yr) { params.set('air_date.gte', yr.gte); params.set('air_date.lte', yr.lte) }
            if (f.tags.length > 0) params.set('with_keywords', f.tags.join('|'))
            if (f.excludeGenres.length > 0) params.set('without_genres', f.excludeGenres.join(','))
            if (f.airing === 'ongoing') params.set('with_status', '0')
            if (f.airing === 'ended')   params.set('with_status', '4')

            const isMovie = f.mediaType === 'movie'
            const res  = await fetch(`https://api.themoviedb.org/3/discover/tv?${params}`)
            const data = await res.json()
            const items: AniItem[] = (data.results || []).map((r: any) => ({
                ...r, name: r.name || r.title, first_air_date: r.first_air_date || r.release_date,
            }))
            setResults(pg === 1 ? items : prev => [...prev, ...items])
            setTotal(Math.min(data.total_pages || 1, 50))
        } catch {
            if (pg === 1) setResults([])
        } finally {
            setLoading(false)
            pending.current = false
        }
    }, [])

    // 초기 로드: 3페이지 연속
    const initialLoad = useCallback(async (f: Filters) => {
        if (pending.current) return
        pending.current = true
        setLoading(true)
        setResults([])
        try {
            const yr = quarterToRange(f.year)
            const genreIds = ['16', ...f.genres.map(String)]
            let all: AniItem[] = []
            for (let pg = 1; pg <= 3; pg++) {
                const params = new URLSearchParams({
                    api_key: TMDB_KEY || '',
                    with_genres: genreIds.join(','),
                    with_original_language: 'ja',
                    sort_by: f.sort === '0' ? 'vote_count.desc' : f.sort,
                    language: 'ko-KR',
                    page: String(pg),
                    'vote_count.gte': '5',
                })
                if (yr) { params.set('air_date.gte', yr.gte); params.set('air_date.lte', yr.lte) }
                if (f.tags.length > 0) params.set('with_keywords', f.tags.join('|'))
                if (f.excludeGenres.length > 0) params.set('without_genres', f.excludeGenres.join(','))
                if (f.airing === 'ongoing') params.set('with_status', '0')
                if (f.airing === 'ended')   params.set('with_status', '4')
                const res  = await fetch(`https://api.themoviedb.org/3/discover/tv?${params}`)
                const data = await res.json()
                if (!data.results?.length) break
                const items: AniItem[] = data.results.map((r: any) => ({
                    ...r, name: r.name || r.title, first_air_date: r.first_air_date || r.release_date,
                }))
                all = [...all, ...items]
                setTotal(Math.min(data.total_pages || 1, 50))
            }
            setResults(all)
            setPage(3)
        } catch {
            setResults([])
        } finally {
            setLoading(false)
            pending.current = false
        }
    }, [])

    useEffect(() => {
        initialLoad(filters)
    }, [filters])

    useEffect(() => {
        if (page <= 3) return
        fetchResults(filters, page)
    }, [page])

    const currentSortLabel = SORT_OPTIONS.find(o => o.value === filters.sort)?.label || '인기순'

    return (
        <>
            <style>{`
                .fp { min-height:100vh; background:#0a0a0a; padding-top:56px; display:flex; }

                /* ── 사이드바 ── */
                .sb { width:220px; min-width:220px; border-right:1px solid rgba(255,255,255,.07); padding:28px 0 60px; overflow-y:auto; }
                .sb-top { display:flex; align-items:center; justify-content:space-between; padding:0 20px 20px; }
                .sb-top h2 { font-size:16px; font-weight:700; color:#fff; margin:0; }
                .btn-reset-all { display:flex; align-items:center; gap:4px; background:none; border:none; color:rgba(255,255,255,.35); font-size:12px; cursor:pointer; padding:0; transition:color .2s; }
                .btn-reset-all:hover { color:rgba(255,255,255,.7); }
                .sb-divider { border:none; border-top:1px solid rgba(255,255,255,.07); margin:0 0 16px; }

                /* 토글 스위치 */
                .toggle-row { display:flex; align-items:center; gap:10px; padding:5px 20px; cursor:pointer; }
                .toggle-sw { width:36px; height:20px; border-radius:10px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); position:relative; transition:background .2s; flex-shrink:0; }
                .toggle-sw.on { background:#6c63ff; border-color:#6c63ff; }
                .toggle-knob { width:14px; height:14px; border-radius:50%; background:#fff; position:absolute; top:2px; left:2px; transition:left .2s; }
                .toggle-sw.on .toggle-knob { left:18px; }
                .toggle-label { font-size:12.5px; color:rgba(255,255,255,.55); }
                .toggle-sw.on + .toggle-label { color:rgba(255,255,255,.85); }

                /* 섹션 */
                .sb-sec { padding:18px 20px 8px; }
                .sb-sec-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
                .sb-sec-title { font-size:12px; font-weight:700; color:rgba(255,255,255,.55); margin:0; }
                .btn-more-sec { font-size:11px; color:rgba(255,255,255,.3); background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:2px; padding:0; transition:color .2s; }
                .btn-more-sec:hover { color:#9d97ff; }
                .sb-checks { display:flex; flex-direction:column; gap:1px; }

                /* 체크박스 */
                .cb-row { display:flex; align-items:center; gap:9px; padding:5px 0; cursor:pointer; user-select:none; }
                .cb-box { width:16px; height:16px; min-width:16px; border-radius:3px; border:1.5px solid rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
                .cb-box.checked { background:#6c63ff; border-color:#6c63ff; }
                .cb-box.ex { background:rgba(239,68,68,.2); border-color:#ef4444; }
                .cb-label { font-size:13px; color:rgba(255,255,255,.5); }
                .cb-row:hover .cb-label { color:rgba(255,255,255,.8); }
                .cb-row:hover .cb-box { border-color:rgba(255,255,255,.4); }

                /* ── 메인 ── */
                .fm { flex:1; display:flex; flex-direction:column; min-width:0; }

                /* 상단 바 */
                .fm-top { padding:16px 28px; border-bottom:1px solid rgba(255,255,255,.07); display:flex; align-items:center; justify-content:space-between; }
                .fm-top h1 { font-size:18px; font-weight:700; color:#fff; margin:0; }

                /* 정렬 드롭다운 */
                .sort-wrap { position:relative; }
                .btn-sort { display:flex; align-items:center; gap:5px; background:none; border:none; color:rgba(255,255,255,.55); font-size:13px; cursor:pointer; padding:6px 10px; border-radius:6px; transition:all .2s; }
                .btn-sort:hover { color:#fff; background:rgba(255,255,255,.06); }
                .sort-dd { position:absolute; right:0; top:calc(100% + 4px); width:140px; background:#1c1c1e; border:1px solid rgba(255,255,255,.1); border-radius:10px; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.6); z-index:300; }
                .sort-item { display:flex; align-items:center; gap:8px; width:100%; padding:10px 14px; background:none; border:none; color:rgba(255,255,255,.55); font-size:13px; cursor:pointer; text-align:left; transition:all .15s; }
                .sort-item:hover { background:rgba(255,255,255,.06); color:#fff; }
                .sort-item.active { color:#fff; }

                /* 결과 영역 */
                .fm-body { padding:22px 28px 60px; flex:1; }
                .result-info { font-size:13px; color:rgba(255,255,255,.26); margin:0 0 18px; }

                /* 그리드 */
                .finder-grid { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(148px,1fr)); gap:20px 13px; }

                /* 카드 */
                .fc { position:relative; cursor:pointer; }
                .fc-thumb { position:relative; width:100%; aspect-ratio:2/3; border-radius:8px; overflow:hidden; background:#181818; }
                .fc-thumb img { width:100%; height:100%; object-fit:cover; transition:transform .28s; }
                .fc:hover .fc-thumb img { transform:scale(1.04); }
                .fc-np { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1a1a2e,#16213e); }
                .fc-np span { font-size:34px; font-weight:800; color:rgba(255,255,255,.1); }
                .fc-score { position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,.72); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.1); border-radius:4px; padding:2px 6px; font-size:11px; font-weight:700; color:#fbbf24; }
                .fc-info { margin-top:8px; }
                .fc-name { font-size:13px; font-weight:600; color:rgba(255,255,255,.88); line-height:1.4; margin:0 0 3px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
                .fc-meta { font-size:11px; color:rgba(255,255,255,.27); margin:0; }

                /* 호버 패널 */
                .fc-hover { position:absolute; top:0; left:50%; transform:translateX(-50%); width:248px; border-radius:10px; overflow:hidden; background:#1c1c1e; border:1px solid rgba(255,255,255,.1); box-shadow:0 18px 50px rgba(0,0,0,.8); z-index:200; animation:pop .15s cubic-bezier(.34,1.56,.64,1); }
                @keyframes pop { from{opacity:0;transform:translateX(-50%) scale(.92)}to{opacity:1;transform:translateX(-50%) scale(1)} }
                .fh-bg { position:relative; width:100%; aspect-ratio:16/9; }
                .fh-bg img { width:100%; height:100%; object-fit:cover; }
                .fh-dim { position:absolute; inset:0; background:linear-gradient(to bottom,transparent 30%,#1c1c1e 100%); }
                .fh-fallback { width:100%; aspect-ratio:16/9; background:linear-gradient(135deg,#1a1a2e,#16213e); }
                .fh-body { padding:10px 14px 13px; }
                .fh-name { font-size:13px; font-weight:700; color:#fff; margin:0 0 6px; line-height:1.3; }
                .fh-genres { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
                .fh-tag { font-size:10px; color:rgba(255,255,255,.4); background:rgba(255,255,255,.07); border-radius:3px; padding:2px 6px; }
                .fh-ov { font-size:11px; color:rgba(255,255,255,.38); line-height:1.6; margin:0 0 10px; }
                .fh-acts { display:flex; gap:7px; }
                .fh-play { flex:1; display:flex; align-items:center; justify-content:center; gap:5px; height:31px; background:#6c63ff; border:none; border-radius:6px; color:#fff; font-size:12px; font-weight:600; cursor:pointer; transition:background .2s; }
                .fh-play:hover { background:#5a52e0; }
                .fh-add { width:31px; height:31px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); border-radius:6px; color:rgba(255,255,255,.6); cursor:pointer; transition:all .2s; }
                .fh-add:hover { background:rgba(255,255,255,.14); color:#fff; }

                /* 스켈레톤 */
                .fc-sk { list-style:none; }
                .sk-t { width:100%; aspect-ratio:2/3; border-radius:8px; background:linear-gradient(90deg,#161616 25%,#202020 50%,#161616 75%); background-size:200% 100%; animation:shim 1.4s infinite; }
                .sk-l { height:12px; border-radius:4px; margin-top:10px; background:linear-gradient(90deg,#161616 25%,#202020 50%,#161616 75%); background-size:200% 100%; animation:shim 1.4s infinite; }
                @keyframes shim { 0%{background-position:200% 0}100%{background-position:-200% 0} }

                /* 더보기 */
                .btn-more { display:flex; align-items:center; justify-content:center; width:100%; max-width:200px; margin:36px auto 0; height:42px; border-radius:21px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.04); color:rgba(255,255,255,.55); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
                .btn-more:hover { background:rgba(255,255,255,.09); color:#fff; border-color:rgba(255,255,255,.28); }

                /* 모달 */
                .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px); z-index:500; display:flex; align-items:center; justify-content:center; }
                .modal { background:#1a1a1a; border:1px solid rgba(255,255,255,.1); border-radius:14px; width:660px; max-width:90vw; max-height:80vh; overflow:hidden; display:flex; flex-direction:column; }
                .modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 0; }
                .modal-head h2 { font-size:18px; font-weight:700; color:#fff; margin:0; }
                .modal-close { background:none; border:none; color:rgba(255,255,255,.4); cursor:pointer; padding:4px; transition:color .2s; }
                .modal-close:hover { color:#fff; }
                .modal-desc { font-size:12px; color:rgba(255,255,255,.3); padding:8px 24px 16px; margin:0; border-bottom:1px solid rgba(255,255,255,.07); }
                .modal-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:2px 0; padding:16px 24px; overflow-y:auto; }
                .modal-cb { display:flex; align-items:center; gap:9px; padding:9px 8px; border-radius:6px; cursor:pointer; transition:background .15s; user-select:none; }
                .modal-cb:hover { background:rgba(255,255,255,.05); }
                .modal-cb span:last-child { font-size:13px; color:rgba(255,255,255,.55); }
                .modal-cb.on span:last-child { color:#fff; }
                .modal-foot { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:14px 24px; border-top:1px solid rgba(255,255,255,.07); }
                .modal-reset { display:flex; align-items:center; gap:5px; background:none; border:none; color:rgba(255,255,255,.3); font-size:13px; cursor:pointer; margin-right:auto; padding:0; transition:color .2s; }
                .modal-reset:hover { color:rgba(255,255,255,.7); }
                .modal-confirm { padding:9px 24px; background:#6c63ff; border:none; border-radius:8px; color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:background .2s; }
                .modal-confirm:hover { background:#5a52e0; }

                /* 빈 상태 */
                .empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; gap:10px; grid-column:1/-1; }
                .empty svg { color:rgba(255,255,255,.1); }
                .empty p { font-size:14px; color:rgba(255,255,255,.22); margin:0; }
            `}</style>

            <div className="fp">
                {/* ── 사이드바 ── */}
                <aside className="sb">
                    <div className="sb-top">
                        <h2>필터</h2>
                        <button className="btn-reset-all" onClick={reset}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                            </svg>
                            전체 초기화
                        </button>
                    </div>
                    <hr className="sb-divider" />

                    {/* 감상/멤버십 토글 */}
                    <div style={{ marginBottom: 16 }}>
                        <label className="toggle-row" onClick={() => setFilters(f => ({ ...f, watchable: !f.watchable }))}>
                            <div className={`toggle-sw${filters.watchable ? ' on' : ''}`}>
                                <div className="toggle-knob" />
                            </div>
                            <span className="toggle-label">감상 가능한 작품만 보기</span>
                        </label>
                        <label className="toggle-row" onClick={() => setFilters(f => ({ ...f, memberOnly: !f.memberOnly }))}>
                            <div className={`toggle-sw${filters.memberOnly ? ' on' : ''}`}>
                                <div className="toggle-knob" />
                            </div>
                            <span className="toggle-label">멤버십 포함 작품만 보기</span>
                        </label>
                    </div>
                    <hr className="sb-divider" />

                    {/* 장르 */}
                    <div className="sb-sec">
                        <div className="sb-sec-head">
                            <p className="sb-sec-title">장르</p>
                            <button className="btn-more-sec" onClick={() => setGenreModal(true)}>
                                더 보기
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>
                        <div className="sb-checks">
                            {SIDEBAR_GENRES.map(g => (
                                <Checkbox
                                    key={g.label}
                                    checked={filters.genres.includes(g.id)}
                                    onChange={() => toggleGenre(g.id)}
                                    label={g.label}
                                />
                            ))}
                        </div>
                    </div>
                    <hr className="sb-divider" style={{ margin: '12px 0 0' }} />

                    {/* 태그 */}
                    <div className="sb-sec">
                        <div className="sb-sec-head">
                            <p className="sb-sec-title">태그</p>
                            <button className="btn-more-sec" onClick={() => setTagModal(true)}>
                                더 보기
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>
                        <div className="sb-checks">
                            {SIDEBAR_TAGS.map(t => (
                                <Checkbox
                                    key={t.id}
                                    checked={filters.tags.includes(t.id)}
                                    onChange={() => toggleTag(t.id)}
                                    label={t.label}
                                />
                            ))}
                        </div>
                    </div>
                    <hr className="sb-divider" style={{ margin: '12px 0 0' }} />

                    {/* 년도 */}
                    <div className="sb-sec">
                        <div className="sb-sec-head">
                            <p className="sb-sec-title">년도</p>
                            <button className="btn-more-sec">
                                더 보기
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>
                        <div className="sb-checks">
                            {SIDEBAR_YEARS.map(y => (
                                <Checkbox
                                    key={y.value}
                                    checked={filters.year === y.value}
                                    onChange={() => toggleYear(y.value)}
                                    label={y.label}
                                />
                            ))}
                        </div>
                    </div>
                    <hr className="sb-divider" style={{ margin: '12px 0 0' }} />

                    {/* 방영 */}
                    <div className="sb-sec">
                        <div className="sb-sec-head">
                            <p className="sb-sec-title">방영</p>
                        </div>
                        <div className="sb-checks">
                            <Checkbox checked={filters.airing === 'ongoing'} onChange={() => toggleAiring('ongoing')} label="방영중" />
                            <Checkbox checked={filters.airing === 'ended'}   onChange={() => toggleAiring('ended')}   label="완결" />
                        </div>
                    </div>
                    <hr className="sb-divider" style={{ margin: '12px 0 0' }} />

                    {/* 출시타입 */}
                    <div className="sb-sec">
                        <div className="sb-sec-head">
                            <p className="sb-sec-title">출시타입</p>
                        </div>
                        <div className="sb-checks">
                            <Checkbox checked={filters.mediaType === 'tva'}   onChange={() => toggleMedia('tva')}   label="TVA" />
                            <Checkbox checked={filters.mediaType === 'movie'}  onChange={() => toggleMedia('movie')} label="극장판" />
                            <Checkbox checked={filters.mediaType === 'ova'}    onChange={() => toggleMedia('ova')}   label="OVA" />
                        </div>
                    </div>
                </aside>

                {/* ── 메인 ── */}
                <div className="fm">
                    <div className="fm-top">
                        <h1>태그검색</h1>
                        {/* 정렬 드롭다운 */}
                        <div className="sort-wrap" ref={sortRef}>
                            <button className="btn-sort" onClick={() => setSortOpen(v => !v)}>
                                {currentSortLabel}
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d={sortOpen ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
                                </svg>
                            </button>
                            {sortOpen && (
                                <div className="sort-dd">
                                    {SORT_OPTIONS.map(o => (
                                        <button
                                            key={o.value}
                                            className={`sort-item${filters.sort === o.value ? ' active' : ''}`}
                                            onClick={() => { setFilters(f => ({ ...f, sort: o.value })); setSortOpen(false) }}
                                        >
                                            {filters.sort === o.value && (
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2.5">
                                                    <path d="M20 6L9 17l-5-5"/>
                                                </svg>
                                            )}
                                            {filters.sort !== o.value && <span style={{ width: 13 }} />}
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="fm-body">
                        {!loading && results.length > 0 && (
                            <p className="result-info">{results.length.toLocaleString()}개의 작품</p>
                        )}

                        <ul className="finder-grid">
                            {loading && results.length === 0
                                ? Array.from({ length: 60 }).map((_, i) => <Skeleton key={i} />)
                                : results.length === 0 && !loading
                                    ? (
                                        <li className="empty">
                                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                                            </svg>
                                            <p>검색 결과가 없어요</p>
                                        </li>
                                    )
                                    : results.map(item => <AniCard key={item.id} item={item} />)
                            }
                            {loading && results.length > 0 &&
                                Array.from({ length: 20 }).map((_, i) => <Skeleton key={`m${i}`} />)
                            }
                        </ul>

                        {!loading && page < totalPages && results.length > 0 && (
                            <button className="btn-more" onClick={() => setPage(p => p + 1)}>더보기</button>
                        )}
                    </div>
                </div>
            </div>

            {/* 장르 모달 */}
            {genreModal && (
                <GenreModal
                    selected={filters.genres}
                    excluded={filters.excludeGenres}
                    onToggle={toggleGenre}
                    onExclude={excludeGenre}
                    onReset={() => setFilters(f => ({ ...f, genres: [], excludeGenres: [] }))}
                    onClose={() => setGenreModal(false)}
                />
            )}
        </>
    )
}
