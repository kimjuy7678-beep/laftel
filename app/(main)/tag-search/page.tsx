'use client'

import PageHeader from '@/components/PageHeader'
import LoginAlert from '@/components/store/LoginAlert'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { usePreviewStore } from '@/store/usePreviewStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Suspense } from 'react'

interface AniItem {
    id: number
    name: string
    original_name: string
    overview: string
    poster_path: string | null
    backdrop_path: string | null
    first_air_date: string
    vote_average: number
    vote_count: number
    genre_ids: number[]
    _ageBlocked?: boolean
}

interface TMDBAniResult {
    id: number
    name?: string
    title?: string
    original_name?: string
    original_title?: string
    original_language?: string
    overview?: string
    poster_path: string | null
    backdrop_path: string | null
    first_air_date?: string
    release_date?: string
    vote_average?: number
    vote_count?: number
    genre_ids?: number[]
}

interface Filters {
    genres: string[]
    excludeGenres: string[]
    tags: string[]
    excludeTags: string[]
    year: string[]
    airing: string[]
    mediaType: string[]
    sort: string
    watchable: boolean
    memberOnly: boolean
}

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'
const AGE_PRIORITY: Record<string, number> = { 'ALL': 0, '7': 7, '12': 12, '15': 15, '19': 19 }

interface GenreOption {
    key: string
    id: number | null
    label: string
    genreIds?: number[]
    textMatch?: string[]
    searchQueries?: string[]
}

interface TagOption {
    key: string
    id: string
    label: string
    genreIds: number[]
    searchQueries?: string[]
}

const ALL_GENRES: GenreOption[] = [
    { key: 'bl', id: null, label: 'BL', textMatch: ['boys love', 'boy love', 'boy-love', 'bl', 'yaoi'], searchQueries: ['Sasaki and Miyano', 'Yuri on Ice', 'Banana Fish', 'No. 6 anime', 'Junjou Romantica', 'Sekai Ichi Hatsukoi', 'Love Stage', 'Cherry Magic anime'] },
    { key: 'gl', id: null, label: 'GL 백합', textMatch: ['girls love', 'girl love', 'girl-love', 'yuri', 'gl'], searchQueries: ['Bloom Into You', 'Citrus anime', 'Adachi and Shimamura', 'Strawberry Panic', 'Sakura Trick', 'Yuri Is My Job', 'Magical Revolution Reincarnated Princess Genius Young Lady', 'Otherside Picnic', 'Whisper Me a Love Song', 'Maria Watches Over Us'] },
    { key: 'action', id: 10759, label: '액션' },
    { key: 'adventure', id: 10759, label: '모험' },
    { key: 'fantasy', id: 10765, label: '판타지', genreIds: [10765] },
    { key: 'romance', id: 18, label: '로맨스', genreIds: [18, 10766], textMatch: ['romance', 'love', '恋', '愛', '로맨스', '사랑'] },
    { key: 'comedy', id: 35, label: '코미디' },
    { key: 'daily', id: 35, label: '일상' },
    { key: 'drama', id: 18, label: '드라마' },
    { key: 'sf', id: 10765, label: 'SF' },
    { key: 'horror', id: 9648, label: '공포', genreIds: [9648, 10765], textMatch: ['horror', 'ghost', '괴담', '공포'] },
    { key: 'mystery', id: 9648, label: '미스터리' },
    { key: 'crime', id: 80, label: '범죄' },
    { key: 'thriller', id: 9648, label: '스릴러', genreIds: [9648, 80, 18] },
    { key: 'sports', id: null, label: '스포츠', genreIds: [18], textMatch: ['sport', 'baseball', 'soccer', 'football', 'basketball', 'volleyball', 'tennis', '스포츠', '야구', '축구', '농구', '배구'] },
    { key: 'period', id: 18, label: '시대물', genreIds: [18, 10759], textMatch: ['samurai', 'history', 'historical', 'period', '에도', '사무라이', '시대'] },
    { key: 'kids', id: 10762, label: '아동' },
    { key: 'idol', id: null, label: '아이돌', genreIds: [35, 18], textMatch: ['idol', '아이돌', '밴드', 'music', '뮤직', 'stage', '라이브'] },
    { key: 'magical-girl', id: 10765, label: '마법소녀', genreIds: [10765, 10762], textMatch: ['magical girl', '마법소녀', 'precure', 'pretty cure'] },
    { key: 'martial-arts', id: 10759, label: '무협', genreIds: [10759], textMatch: ['martial', 'kung fu', 'wuxia', '무협', '권법'] },
    { key: 'villainess', id: 10765, label: '악역영애', genreIds: [10765, 18, 10749], textMatch: ['villainess', '악역영애', '영애', 'duke', 'duchess', 'noble'] },
    { key: 'reverse-harem', id: 18, label: '역하렘', genreIds: [18, 10766], textMatch: ['reverse harem', '역하렘'] },
    { key: 'food', id: 35, label: '음식', genreIds: [35, 18], textMatch: ['food', 'cooking', 'restaurant', 'gourmet', '요리', '음식', '식당'] },
    { key: 'music', id: 18, label: '음악', genreIds: [18, 35], textMatch: ['music', 'band', 'idol', 'song', '뮤직', '음악', '밴드', '아이돌'] },
    { key: 'isekai', id: 10765, label: '이세계', genreIds: [10765, 10759], textMatch: ['isekai', 'another world', 'reincarnat', '이세계', '전생'] },
    { key: 'disaster', id: 18, label: '재난', genreIds: [18, 10765], textMatch: ['disaster', 'apocalypse', '재난', '종말'] },
    { key: 'detective', id: 9799, label: '추리' },
    { key: 'banished', id: 10765, label: '추방물', genreIds: [10765, 10759], textMatch: ['banished', 'exiled', '추방'] },
    { key: 'healing', id: 35, label: '치유', genreIds: [35, 18], textMatch: ['slice of life', 'healing', 'iyashikei', '힐링', '치유'] },
    { key: 'tokusatsu', id: 10764, label: '특촬' },
    { key: 'harem', id: 18, label: '하렘', genreIds: [18, 35], textMatch: ['harem', '하렘'] },
    { key: 'adult', id: 10768, label: '성인', genreIds: [10768, 18], textMatch: ['adult', 'mature', '성인'] },
]

const SIDEBAR_GENRES = ALL_GENRES.slice(0, 9)

const ALL_TAGS: TagOption[] = [
    { key: 'family', id: '10751', label: '가족', genreIds: [10751, 10762] },
    { key: 'touching', id: '9716', label: '감동적인', genreIds: [18, 10749] },
    { key: 'game', id: '9882', label: '게임', genreIds: [10765, 10759] },
    { key: 'animal', id: '10087', label: '동물', genreIds: [10751, 10762] },
    { key: 'asian-style', id: '10189', label: '동양풍', genreIds: [10759, 14] },
    { key: 'mind-game', id: '4159', label: '두뇌싸움', genreIds: [9648, 53] },
    { key: 'robot', id: '4565', label: '로봇', genreIds: [10765, 10759] },
    { key: 'loop', id: '4159', label: '루프물', genreIds: [10765, 9648] },
    { key: 'overpowered', id: '9799', label: '먼치킨', genreIds: [10759, 14] },
    { key: 'heavy', id: '1701', label: '무거운', genreIds: [18, 9648] },
    { key: 'novel-original', id: '818', label: '소설원작', genreIds: [18, 10765, 14] },
    { key: 'manga-original', id: '9717', label: '만화원작', genreIds: [10759, 35, 18] },
    { key: 'ninja', id: '4290', label: '닌자', genreIds: [10759] },
    { key: 'school', id: '158718', label: '학원물', genreIds: [35, 18, 10749] },
    { key: 'magic', id: '9882', label: '마법', genreIds: [10765, 10759], searchQueries: ['Frieren Beyond Journey End', 'Black Clover', 'Fairy Tail', 'Little Witch Academia', 'MASHLE', 'The Ancient Magus Bride', 'Puella Magi Madoka Magica', 'Cardcaptor Sakura', 'The Irregular at Magic High School', 'Magi anime'] },
]
const SIDEBAR_TAGS = [...ALL_TAGS.slice(0, 8), ALL_TAGS.find(t => t.key === 'magic')].filter((t): t is TagOption => Boolean(t))

const QUARTER_YEARS = [
    { value: '2026-Q2', label: '2026년 2분기' }, { value: '2026-Q1', label: '2026년 1분기' },
    { value: '2025-Q4', label: '2025년 4분기' }, { value: '2025-Q3', label: '2025년 3분기' },
    { value: '2025-Q2', label: '2025년 2분기' }, { value: '2025-Q1', label: '2025년 1분기' },
    { value: '2024', label: '2024년' }, { value: '2023', label: '2023년' },
    { value: '2022', label: '2022년' }, { value: '2010s', label: '2010년대' },
    { value: '2000s', label: '2000년대' }, { value: '1990s', label: '1990년대' },
]
const SIDEBAR_YEARS = QUARTER_YEARS.slice(0, 4)

const SORT_OPTIONS = [
    { value: 'popularity.desc', label: '인기순' }, { value: 'first_air_date.desc', label: '신작순' },
    { value: 'vote_count.desc', label: '업데이트순' }, { value: 'vote_average.desc', label: '별점 높은순' },
]

const GENRE_LABEL: Record<number, string> = {
    16: '애니', 10759: '액션', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 27: '호러',
    10751: '가족', 10762: '어린이', 10749: '로맨스',
}

const DEFAULT_FILTERS: Filters = {
    genres: [], excludeGenres: [], tags: [], excludeTags: [],
    year: [], airing: [], mediaType: [], sort: 'popularity.desc',
    watchable: false, memberOnly: false,
}

function quarterToRange(val: string) {
    if (val === '2026-Q2') return { gte: '2026-04-01', lte: '2026-06-30' }
    if (val === '2026-Q1') return { gte: '2026-01-01', lte: '2026-03-31' }
    if (val === '2025-Q4') return { gte: '2025-10-01', lte: '2025-12-31' }
    if (val === '2025-Q3') return { gte: '2025-07-01', lte: '2025-09-30' }
    if (val === '2025-Q2') return { gte: '2025-04-01', lte: '2025-06-30' }
    if (val === '2025-Q1') return { gte: '2025-01-01', lte: '2025-03-31' }
    if (val === '2024') return { gte: '2024-01-01', lte: '2024-12-31' }
    if (val === '2023') return { gte: '2023-01-01', lte: '2023-12-31' }
    if (val === '2022') return { gte: '2022-01-01', lte: '2022-12-31' }
    if (val === '2010s') return { gte: '2010-01-01', lte: '2019-12-31' }
    if (val === '2000s') return { gte: '2000-01-01', lte: '2009-12-31' }
    if (val === '1990s') return { gte: '1990-01-01', lte: '1999-12-31' }
    return null
}

function getGenreSearchGroups(keys: string[]) {
    return keys.map(key => { const genre = ALL_GENRES.find(g => g.key === key); if (!genre) return []; return genre.genreIds || (typeof genre.id === 'number' ? [genre.id] : []) }).filter(group => group.length > 0)
}
function getTagSearchGroups(keys: string[]) {
    return keys.map(key => ALL_TAGS.find(t => t.key === key)?.genreIds || []).filter(group => group.length > 0)
}
function buildGenreFilter(selectedGenreGroups: number[][], selectedTagGroups: number[][]) {
    const requiredGroups = [...selectedGenreGroups, ...selectedTagGroups].map(group => [...new Set(group.map(String))].join('|'))
    return ['16', ...requiredGroups].join(',')
}
function filterBySelectedGroups(items: AniItem[], filters: Filters) {
    const requiredGroups = [...getGenreSearchGroups(filters.genres), ...getTagSearchGroups(filters.tags)]
    if (requiredGroups.length === 0) return items
    return items.filter(item => requiredGroups.every(group => group.some(id => item.genre_ids.includes(id))))
}
function getSpecialGenreQueries(filters: Filters) {
    return [...new Set([...filters.genres.flatMap(key => ALL_GENRES.find(g => g.key === key)?.searchQueries || []), ...filters.tags.flatMap(key => ALL_TAGS.find(t => t.key === key)?.searchQueries || [])])]
}
function mapTmdbResult(r: TMDBAniResult): AniItem {
    return { id: r.id, name: r.name || r.title || '', original_name: r.original_name || r.original_title || '', overview: r.overview || '', poster_path: r.poster_path, backdrop_path: r.backdrop_path, first_air_date: r.first_air_date || r.release_date || '', vote_average: r.vote_average || 0, vote_count: r.vote_count || 0, genre_ids: r.genre_ids || [] }
}
async function fetchSpecialGenreResults(queries: string[], mediaType: string) {
    if (!TMDB_KEY || queries.length === 0) return []
    const responses = await Promise.all(queries.map(async query => { const params = new URLSearchParams({ api_key: TMDB_KEY, query, language: 'ko-KR', page: '1' }); const res = await fetch(`https://api.themoviedb.org/3/${getSearchPath(mediaType)}?${params}`); const data = await res.json(); return (((data.results || []) as TMDBAniResult[]).filter(r => (r.genre_ids || []).includes(16) || r.original_language === 'ja').slice(0, 2).map(mapTmdbResult)) }))
    const byId = new Map<number, AniItem>(); responses.flat().forEach(item => { if (item.id && !byId.has(item.id)) byId.set(item.id, item) }); return [...byId.values()]
}
function getDiscoverPath(mediaType: string) { return mediaType === 'movie' ? 'discover/movie' : 'discover/tv' }
function getSearchPath(mediaType: string) { return mediaType === 'movie' ? 'search/movie' : 'search/tv' }
function getDateParamPrefix(mediaType: string) { return mediaType === 'movie' ? 'primary_release_date' : 'air_date' }
function applyMediaTypeParams(params: URLSearchParams, mediaType: string) { if (mediaType === 'tva') params.set('with_type', '4'); if (mediaType === 'ova') params.set('with_type', '6') }
function selectedOrDefault(values: string[]) { return values.length > 0 ? values : [''] }
function matchesYearFilter(item: AniItem, yearValue: string) { const range = quarterToRange(yearValue); if (!range) return true; return item.first_air_date >= range.gte && item.first_air_date <= range.lte }
function sortByLocalTextGenres(items: AniItem[], filters: Filters) {
    const matchers = filters.genres.map(key => ALL_GENRES.find(g => g.key === key)?.textMatch || []).flat().map(v => v.toLowerCase())
    if (matchers.length === 0) return items
    return [...items].sort((a, b) => { const aText = `${a.name} ${a.original_name} ${a.overview}`.toLowerCase(); const bText = `${b.name} ${b.original_name} ${b.overview}`.toLowerCase(); const aHit = matchers.some(m => aText.includes(m)) ? 1 : 0; const bHit = matchers.some(m => bText.includes(m)) ? 1 : 0; return bHit - aHit })
}
function countLocalTextMatches(items: AniItem[], genre: GenreOption) {
    const matchers = (genre.textMatch || []).map(v => v.toLowerCase()); if (matchers.length === 0) return null
    return items.filter(item => { const text = `${item.name} ${item.original_name} ${item.overview}`.toLowerCase(); return matchers.some(m => text.includes(m)) }).length
}

function buildParams(f: Filters, pg: number, genreFilter: string, mediaType: string, yearValue: string, airing: string, excludedKeywordIds: string[], excludedGenreIds: number[]) {
    const yr = quarterToRange(yearValue)
    const params = new URLSearchParams({ api_key: TMDB_KEY || '', with_genres: genreFilter, with_original_language: 'ja', sort_by: f.sort === '0' ? 'vote_count.desc' : f.sort, language: 'ko-KR', page: String(pg), 'vote_count.gte': '5' })
    const dateParam = getDateParamPrefix(mediaType)
    if (yr) { params.set(`${dateParam}.gte`, yr.gte); params.set(`${dateParam}.lte`, yr.lte) }
    applyMediaTypeParams(params, mediaType)
    if (excludedKeywordIds.length > 0) params.set('without_keywords', [...new Set(excludedKeywordIds)].join(','))
    if (excludedGenreIds.length > 0) params.set('without_genres', [...new Set(excludedGenreIds)].join(','))
    if (mediaType !== 'movie' && airing === 'ongoing') params.set('with_status', '0')
    if (mediaType !== 'movie' && airing === 'ended') params.set('with_status', '4')
    return params
}

function Checkbox({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
    return (
        <label className="cb-row" onClick={(e) => { e.preventDefault(); onChange() }}>
            <span className={`cb-box${checked ? ' checked' : ''}`}>
                {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
            <span className="cb-label">{label}</span>
        </label>
    )
}

function GenreModal({ selected, onToggle, onReset, onClose }: { selected: string[]; onToggle: (key: string) => void; onReset: () => void; onClose: () => void }) {
    return (
        <div className="modal-bg" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head"><h2>장르 전체</h2><button className="modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>
                <p className="modal-desc">원치 않는 장르는 다시 클릭하면 제외할 수 있어요.</p>
                <div className="modal-grid">{ALL_GENRES.map(g => { const isOn = selected.includes(g.key); return (<label key={g.key} className={`modal-cb${isOn ? ' on' : ''}`} onClick={(e) => { e.preventDefault(); onToggle(g.key) }}><span className={`cb-box${isOn ? ' checked' : ''}`}>{isOn && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span><span>{g.label}</span></label>) })}</div>
                <div className="modal-foot"><button className="modal-reset" onClick={onReset}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>전체 초기화</button><button className="modal-confirm" onClick={onClose}>확인</button></div>
            </div>
        </div>
    )
}

function TagModal({ selected, onToggle, onReset, onClose }: { selected: string[]; onToggle: (key: string) => void; onReset: () => void; onClose: () => void }) {
    return (
        <div className="modal-bg" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head"><h2>태그 전체</h2><button className="modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>
                <p className="modal-desc">원치 않는 태그는 다시 클릭하면 제외할 수 있어요.</p>
                <div className="modal-grid">{ALL_TAGS.map(t => { const isOn = selected.includes(t.key); return (<label key={t.key} className={`modal-cb${isOn ? ' on' : ''}`} onClick={(e) => { e.preventDefault(); onToggle(t.key) }}><span className={`cb-box${isOn ? ' checked' : ''}`}>{isOn && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span><span>{t.label}</span></label>) })}</div>
                <div className="modal-foot"><button className="modal-reset" onClick={onReset}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>전체 초기화</button><button className="modal-confirm" onClick={onClose}>확인</button></div>
            </div>
        </div>
    )
}

function AniCard({ item }: { item: AniItem }) {
    const [hov, setHov] = useState(false)
    const [showLoginAlert, setShowLoginAlert] = useState(false)
    const [showWishConfirm, setShowWishConfirm] = useState(false)
    const [showWishAdded, setShowWishAdded] = useState(false)
    const [isWishAdding, setIsWishAdding] = useState(false)
    const { setPreviewId } = usePreviewStore()
    const { user } = useAuthStore()
    const { addItem, hasItem, removeItem } = useWatchlistStore()
    const router = useRouter()
    const t = useRef<ReturnType<typeof setTimeout> | null>(null)
    const poster = item.poster_path ? `${IMG}/w342${item.poster_path}` : null
    const backdrop = item.backdrop_path ? `${IMG}/w780${item.backdrop_path}` : null
    const score = Math.round(item.vote_average * 10) / 10
    const year = item.first_air_date?.slice(0, 4) || ''
    const genres = item.genre_ids.map(g => GENRE_LABEL[g]).filter(Boolean).slice(0, 2)
    const isWished = hasItem(item.id, 'wishlist')

    const handleWishClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        if (!user?.uid) { setShowLoginAlert(true); return }
        setIsWishAdding(!isWished)
        setShowWishConfirm(true)
    }

    const handleWishConfirm = async () => {
        if (!user?.uid) return
        if (isWishAdding) {
            await addItem(user.uid, { id: item.id, title: item.name, poster: item.poster_path || '', tab: 'wishlist' })
            setShowWishConfirm(false)
            setTimeout(() => setShowWishAdded(true), 150)
            return
        }
        await removeItem(user.uid, item.id, 'wishlist')
        setShowWishConfirm(false)
    }

    return (
        <li className="fc"
            onMouseEnter={() => { t.current = setTimeout(() => setHov(true), 160) }}
            onMouseLeave={() => { if (t.current) clearTimeout(t.current); setHov(false) }}>
            <div className="fc-thumb">
                {poster ? <img src={poster} alt={item.name} loading="lazy" /> : <div className="fc-np"><span>{(item.name || '?')[0]}</span></div>}
                {score > 0 && <span className="fc-score">★ {score}</span>}
            </div>
            <div className="fc-info">
                <p className="fc-name">{item.name}</p>
                <p className="fc-meta">{year && <span>· 애니메이션</span>}{genres.map(g => <span key={g}> · {g}</span>)}</p>
            </div>
            {hov && (
                <div className="fc-hover" onClick={() => setPreviewId(item.id)}>
                    {backdrop ? <div className="fh-bg"><img src={backdrop} alt="" /><div className="fh-dim" /></div> : <div className="fh-fallback" />}
                    <div className="fh-body">
                        <p className="fh-name">{item.name}</p>
                        {genres.length > 0 && <div className="fh-genres">{genres.map(g => <span key={g} className="fh-tag">{g}</span>)}</div>}
                        <p className="fh-ov">{item.overview ? item.overview.slice(0, 88) + (item.overview.length > 88 ? '…' : '') : '줄거리 정보가 없습니다.'}</p>
                        <div className="fh-acts">
                            <button className="fh-play" onClick={(e) => { e.stopPropagation(); setPreviewId(item.id) }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>재생
                            </button>
                            <button className="fh-add" aria-label="보고싶다" onClick={handleWishClick} style={isWished ? { background: '#6c63ff', borderColor: '#6c63ff', color: '#fff' } : undefined}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showLoginAlert && <LoginAlert onClose={() => setShowLoginAlert(false)} />}
            {showWishConfirm && (
                <div className="wish-modal-bg" onClick={() => setShowWishConfirm(false)}>
                    <div className="wish-modal" onClick={e => e.stopPropagation()}>
                        <p className="wish-modal-title">{isWishAdding ? '보고싶다 보관함에 추가할까요?' : '보고싶다에서 삭제할까요?'}</p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishConfirm(false)} className="wish-modal-cancel">취소</button>
                            <button onClick={handleWishConfirm} className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">{isWishAdding ? '추가' : '삭제'}</button>
                        </div>
                    </div>
                </div>
            )}
            {showWishAdded && (
                <div className="wish-modal-bg" onClick={() => setShowWishAdded(false)}>
                    <div className="wish-modal" onClick={e => e.stopPropagation()}>
                        <p className="wish-modal-title">보고싶다에 추가됐어요!</p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishAdded(false)} className="wish-modal-cancel">닫기</button>
                            <button onClick={() => { router.push('/library?tab=wishlist'); setShowWishAdded(false) }} className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">보관함으로 이동</button>
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

function sortItems(items: AniItem[], sort: string): AniItem[] {
    const sorted = [...items]
    switch (sort) {
        case 'first_air_date.desc':
            return sorted.sort((a, b) => b.first_air_date.localeCompare(a.first_air_date))
        case 'vote_count.desc':
        case '0':
            return sorted.sort((a, b) => b.vote_count - a.vote_count)
        case 'vote_average.desc':
            return sorted.sort((a, b) => b.vote_average - a.vote_average)
        default:
            return items
    }
}
// ─── 메인 ─────────────────────────────────────────────────────
function TagSearchInner() {
    const searchParams = useSearchParams()
    const { user } = useAuthStore()
    const { contentRatings, onFetchContentRatings, aniList, onFetchAni } = useAniStore()

    const [filters, setFilters] = useState<Filters>(() => {
        const genreParam = searchParams.get('genre')
        if (!genreParam) return DEFAULT_FILTERS
        const matched = ALL_GENRES.find(g => g.key === genreParam)
        if (!matched) return DEFAULT_FILTERS
        return { ...DEFAULT_FILTERS, genres: [matched.key] }
    })
    const [results, setResults] = useState<AniItem[]>([])
    const [countBaseResults, setCountBaseResults] = useState<AniItem[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotal] = useState(1)
    const [totalResults, setTotalResults] = useState(0)
    const [sortOpen, setSortOpen] = useState(false)
    const [filterOpen, setFilterOpen] = useState(true)
    const [genreModal, setGenreModal] = useState(false)
    const [tagModal, setTagModal] = useState(false)
    const pending = useRef(false)
    const sortRef = useRef<HTMLDivElement>(null)

    // 연령 필터 — 통과 못하면 제거
    const applyAgeFilter = useCallback((items: AniItem[]): AniItem[] => {
        const ageLimit = user?.ageLimit ?? '19'
        const limitNum = AGE_PRIORITY[ageLimit] ?? 19
        return items.filter(ani => {
            if ((ani as any).adult === true && ageLimit !== '19') return false
            const rating = contentRatings[ani.id]
            if (!rating) return true
            return (AGE_PRIORITY[rating] ?? 0) <= limitNum
        })
    }, [user, contentRatings])

    // aniList를 AniItem 형태로 변환 + 연령 필터 적용
    const aniItems = useMemo((): AniItem[] => {
        if (aniList.length === 0) return []
        const items = aniList.map((a: any) => ({
            id: a.id,
            name: a.name || a.title || '',
            original_name: a.original_name || a.original_title || '',
            overview: a.overview || '',
            poster_path: a.poster_path,
            backdrop_path: a.backdrop_path,
            first_air_date: a.first_air_date || a.release_date || '',
            vote_average: a.vote_average || 0,
            vote_count: a.vote_count || 0,
            genre_ids: a.genre_ids || [],
        }))
        return applyAgeFilter(items)
    }, [aniList, applyAgeFilter])

    const activeCount = filters.genres.length + filters.tags.length + filters.excludeGenres.length + filters.excludeTags.length + filters.year.length + filters.airing.length + filters.mediaType.length

    useEffect(() => {
        const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    useEffect(() => {
        const media = window.matchMedia('(max-width: 900px)')
        const syncFilterState = () => setFilterOpen(!media.matches)
        syncFilterState()
        media.addEventListener('change', syncFilterState)
        return () => media.removeEventListener('change', syncFilterState)
    }, [])

    // contentRatings 업데이트 시 재필터링
    useEffect(() => {
        if (results.length === 0) return
        setResults(prev => applyAgeFilter(prev))
    }, [contentRatings])

    const toggleGenre = (key: string) => setFilters(f => ({ ...f, genres: f.genres.includes(key) ? f.genres.filter(g => g !== key) : [...f.genres, key] }))
    const toggleTag = (key: string) => setFilters(f => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter(t => t !== key) : [...f.tags, key], excludeTags: f.excludeTags.filter(t => t !== key) }))
    const toggleYear = (y: string) => setFilters(f => ({ ...f, year: f.year.includes(y) ? f.year.filter(v => v !== y) : [...f.year, y] }))
    const toggleAiring = (a: string) => setFilters(f => ({ ...f, airing: f.airing.includes(a) ? f.airing.filter(v => v !== a) : [...f.airing, a] }))
    const toggleMedia = (m: string) => setFilters(f => ({ ...f, mediaType: f.mediaType.includes(m) ? f.mediaType.filter(v => v !== m) : [...f.mediaType, m] }))
    const reset = () => { setFilters(DEFAULT_FILTERS); setPage(1) }

    // 한 페이지 fetch 유틸
    const PAGE_SIZE = 60

    // aniList 필터 헬퍼
    const filterByYear = (items: AniItem[], f: Filters) => {
        if (f.year.length === 0) return items
        return items.filter(item => f.year.some(y => matchesYearFilter(item, y)))
    }
    const filterByAiring = (items: AniItem[], f: Filters) => f.airing.length === 0 ? items : items  // aniList에 status 없음
    const filterByMediaType = (items: AniItem[], f: Filters) => f.mediaType.length === 0 ? items : items  // aniList에 타입 없음

    // 더보기 — aniList 기반으로 다음 슬라이스 추가
    const fetchResults = useCallback((f: Filters, pg: number) => {
        if (pending.current) return
        pending.current = true
        setLoading(true)
        try {
            const filtered = sortItems(
                sortByLocalTextGenres(
                    filterBySelectedGroups(filterByYear(filterByAiring(filterByMediaType(aniItems, f), f), f), f),
                    f
                ),
                f.sort
            )
            const start = pg * PAGE_SIZE
            const slice = filtered.slice(start, start + PAGE_SIZE)
            setResults(prev => {
                const byId = new Map(prev.map(item => [item.id, item]))
                slice.forEach(item => byId.set(item.id, item))
                return [...byId.values()]
            })
            setTotal(Math.ceil(filtered.length / PAGE_SIZE))
            setPage(pg)
        } finally {
            setLoading(false)
            pending.current = false
        }
    }, [aniItems])

    // 초기 로드 — aniList 기반으로 즉시 필터링
    const initialLoad = useCallback((f: Filters) => {
        if (pending.current) return
        pending.current = true
        setLoading(true)
        setResults([])
        try {
            if (aniItems.length === 0) return  // aniList 아직 로딩 중
            const filtered = sortItems(
                sortByLocalTextGenres(
                    filterBySelectedGroups(filterByYear(filterByAiring(filterByMediaType(aniItems, f), f), f), f),
                    f
                ),
                f.sort
            )

            const slice = filtered.slice(0, PAGE_SIZE)
            setResults(slice)
            setTotal(Math.ceil(filtered.length / PAGE_SIZE))
            setTotalResults(filtered.length)
            setPage(0)
            if (f.genres.length === 0 && f.tags.length === 0 && f.excludeGenres.length === 0 && f.excludeTags.length === 0 && f.year.length === 0 && f.airing.length === 0 && f.mediaType.length === 0) {
                setCountBaseResults(filtered)
            }
        } finally {
            setLoading(false)
            pending.current = false
        }
    }, [aniItems])


    // aniList 없으면 fetch
    useEffect(() => { if (aniList.length === 0) onFetchAni() }, [])

    useEffect(() => { const id = window.setTimeout(() => { initialLoad(filters) }, 0); return () => window.clearTimeout(id) }, [filters, initialLoad, aniItems])
    useEffect(() => { if (page === 0) return; const id = window.setTimeout(() => { fetchResults(filters, page) }, 0); return () => window.clearTimeout(id) }, [page])

    const genreCountSource = countBaseResults.length > 0 ? countBaseResults : results
    const genreCounts = useMemo(() => {
        const counts: Record<number, number> = {}
        genreCountSource.forEach(item => { item.genre_ids.forEach(gid => { counts[gid] = (counts[gid] || 0) + 1 }) })
        return counts
    }, [genreCountSource])

    const currentSortLabel = SORT_OPTIONS.find(o => o.value === filters.sort)?.label || '인기순'
    const activeGenres = filters.genres.map(key => ALL_GENRES.find(g => g.key === key)).filter((g): g is GenreOption => Boolean(g))
    const activeTags = filters.tags.map(key => ALL_TAGS.find(t => t.key === key)).filter((t): t is TagOption => Boolean(t))
    const hasActiveFilters = activeGenres.length > 0 || activeTags.length > 0 || filters.year.length > 0 || filters.airing.length > 0 || filters.mediaType.length > 0
    const getGenreCount = (genre: GenreOption) => {
        if (filters.genres.includes(genre.key)) return results.length
        const textCount = countLocalTextMatches(genreCountSource, genre)
        if (textCount !== null && textCount > 0) return textCount
        const ids = genre.genreIds || (typeof genre.id === 'number' ? [genre.id] : [])
        return Math.max(0, ...ids.map(id => genreCounts[id] || 0))
    }

    return (
        <>
            <style>{`
                .fp { --fp-bg:var(--bg-primary); --fp-panel:var(--bg-card); --fp-panel-2:var(--bg-secondary); --fp-hover:var(--bg-hover); --fp-text:var(--text-primary); --fp-high:var(--text-high); --fp-muted:var(--text-muted); --fp-subtle:var(--text-subtle); --fp-faint:var(--text-faint); --fp-border:var(--border); --fp-border-subtle:var(--border-subtle); --fp-border-faint:var(--border-faint); --fp-soft:var(--border-faint); --fp-soft-strong:var(--bg-hover); --fp-check-border:var(--text-subtle); --fp-shadow:rgba(0,0,0,.45); --fp-skeleton-a:#161616; --fp-skeleton-b:#202020; min-height:100vh; background:var(--fp-bg); padding-top:64px; color:var(--fp-text); transition:background .2s, color .2s; }
                html.light .fp { --fp-check-border:rgba(0,0,0,.28); --fp-shadow:rgba(25,25,35,.14); --fp-skeleton-a:#ececf2; --fp-skeleton-b:#f7f7fb; }
                .fp-inner { width:90%; margin:0 auto; }
                .fp-body { display:flex; gap:0; align-items:flex-start; }
                .fp-sidebar { overflow:hidden; transition:width .3s cubic-bezier(.4,0,.2,1), opacity .3s ease; flex-shrink:0; }
                .fp-sidebar.open { width:280px; opacity:1; }
                .fp-sidebar.closed { width:0; opacity:0; }
                .fp-sidebar-inner { width:280px; padding-right:28px; padding-top:24px; }
                .sb-top { display:flex; align-items:center; justify-content:space-between; padding:0 20px 20px; }
                .sb-top h2 { font-size:16px; font-weight:700; color:var(--fp-text); margin:0; }
                .btn-reset-all { display:flex; align-items:center; gap:4px; background:none; border:none; color:var(--fp-subtle); font-size:12px; cursor:pointer; padding:0; transition:color .2s; }
                .btn-reset-all:hover { color:var(--fp-high); }
                .sb-divider { border:none; border-top:1px solid var(--fp-border-subtle); margin:0 0 16px; }
                .sb-sec { padding:18px 20px 8px; }
                .sb-sec-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
                .sb-sec-title { font-size:12px; font-weight:700; color:var(--fp-muted); margin:0; }
                .btn-more-sec { font-size:11px; color:var(--fp-subtle); background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:2px; padding:0; transition:color .2s; }
                .btn-more-sec:hover { color:#9d97ff; }
                .sb-checks { display:flex; flex-direction:column; gap:1px; }
                .cb-row { display:flex; align-items:center; gap:9px; padding:5px 0; cursor:pointer; user-select:none; }
                .cb-box { width:16px; height:16px; min-width:16px; border-radius:3px; border:1.5px solid var(--fp-check-border); background:var(--fp-panel); display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; box-shadow:inset 0 0 0 1px var(--fp-border-faint); }
                .cb-box.checked { background:#6c63ff; border-color:#6c63ff; }
                .cb-label { font-size:13px; color:var(--fp-muted); flex:1; }
                .cb-row:hover .cb-label { color:var(--fp-high); }
                .cb-row:hover .cb-box { border-color:var(--fp-high); background:var(--fp-hover); }
                .cb-row:hover .cb-box.checked { background:#6c63ff; border-color:#6c63ff; }
                .fm { flex:1; display:flex; flex-direction:column; min-width:0; }
                .fm-top { min-height:52px; padding:20px 0 20px; display:flex; align-items:center; justify-content:space-between; gap:14px; }
                .sort-wrap { position:relative; }
                .btn-sort { display:flex; align-items:center; gap:5px; background:none; border:none; color:var(--fp-muted); font-size:13px; cursor:pointer; padding:6px 10px; border-radius:6px; transition:all .2s; }
                .btn-sort:hover { color:var(--fp-text); background:var(--fp-soft); }
                .sort-dd { position:absolute; right:0; top:calc(100% + 4px); width:140px; background:var(--fp-panel); border:1px solid var(--fp-border); border-radius:10px; box-shadow:0 12px 40px var(--fp-shadow); z-index:9000; }
                .sort-item { display:flex; align-items:center; gap:8px; width:100%; padding:10px 14px; background:none; border:none; color:var(--fp-muted); font-size:13px; cursor:pointer; text-align:left; transition:all .15s; }
                .sort-item:hover { background:var(--fp-soft); color:var(--fp-text); }
                .sort-item.active { color:var(--fp-text); }
                .result-summary { display:flex; align-items:center; flex-wrap:nowrap; gap:10px; min-width:0; flex:1; overflow:hidden; }
                .filter-chips-container { display:flex; align-items:center; flex-wrap:nowrap; gap:8px; min-width:0; overflow-x:auto; scrollbar-width:none; }
                .filter-chips-container::-webkit-scrollbar { display:none; }
                .filter-chip { display:flex; align-items:center; gap:6px; flex-shrink:0; padding:6px 12px; background:rgba(108,99,255,.15); border:1px solid rgba(108,99,255,.3); border-radius:20px; color:var(--fp-text); font-size:12px; font-weight:500; cursor:pointer; transition:all .2s; white-space:nowrap; }
                .filter-chip:hover { background:rgba(108,99,255,.25); border-color:rgba(108,99,255,.5); }
                .filter-chip.tag-chip { background:rgba(236,72,153,.12); border-color:rgba(236,72,153,.3); }
                .filter-chip.tag-chip:hover { background:rgba(236,72,153,.2); border-color:rgba(236,72,153,.5); }
                .fm-body { padding:0 0 60px; flex:1; }
                .result-info { font-size:13px; color:var(--fp-faint); margin:0; flex-shrink:0; }
                .finder-grid { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(148px,1fr)); gap:20px 13px; }
                .fc { position:relative; cursor:pointer; }
                .fc-thumb { position:relative; width:100%; aspect-ratio:2/3; border-radius:8px; overflow:hidden; background:var(--fp-panel); }
                .fc-thumb img { width:100%; height:100%; object-fit:cover; transition:transform .28s; }
                .fc:hover .fc-thumb img { transform:scale(1.04); }
                .fc-np { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,var(--fp-panel),var(--fp-panel-2)); }
                .fc-np span { font-size:34px; font-weight:800; color:var(--fp-faint); }
                .fc-score { position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,.72); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.1); border-radius:4px; padding:2px 6px; font-size:11px; font-weight:700; color:#fbbf24; }
                .fc-info { margin-top:8px; }
                .fc-name { font-size:13px; font-weight:600; color:var(--fp-high); line-height:1.4; margin:0 0 3px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
                .fc-meta { font-size:11px; color:var(--fp-faint); margin:0; }
                .fc-hover { position:absolute; top:0; left:50%; transform:translateX(-50%); width:248px; border-radius:10px; overflow:hidden; background:var(--fp-panel); border:1px solid var(--fp-border); box-shadow:0 18px 50px var(--fp-shadow); color:var(--fp-text); z-index:200; animation:pop .15s cubic-bezier(.34,1.56,.64,1); }
                @keyframes pop { from{opacity:0;transform:translateX(-50%) scale(.92)}to{opacity:1;transform:translateX(-50%) scale(1)} }
                .fh-bg { position:relative; width:100%; aspect-ratio:16/9; }
                .fh-bg img { width:100%; height:100%; object-fit:cover; }
                .fh-dim { position:absolute; inset:0; background:linear-gradient(to bottom,transparent 30%,var(--fp-panel) 100%); }
                .fh-fallback { width:100%; aspect-ratio:16/9; background:linear-gradient(135deg,var(--fp-panel),var(--fp-panel-2)); }
                .fh-body { padding:10px 14px 13px; background:var(--fp-panel); }
                .fh-name { font-size:13px; font-weight:700; color:var(--fp-text); margin:0 0 6px; line-height:1.3; }
                .fh-genres { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
                .fh-tag { font-size:10px; color:var(--fp-subtle); background:var(--fp-soft); border-radius:3px; padding:2px 6px; }
                .fh-ov { font-size:11px; color:var(--fp-subtle); line-height:1.6; margin:0 0 10px; }
                .fh-acts { display:flex; gap:7px; }
                .fh-play { flex:1; display:flex; align-items:center; justify-content:center; gap:5px; height:31px; background:#6c63ff; border:none; border-radius:6px; color:#fff; font-size:12px; font-weight:600; cursor:pointer; transition:background .2s; }
                .fh-play:hover { background:#5a52e0; }
                .fh-add { width:31px; height:31px; display:flex; align-items:center; justify-content:center; background:var(--fp-soft); border:1px solid var(--fp-border); border-radius:6px; color:var(--fp-muted); cursor:pointer; transition:all .2s; }
                .fh-add:hover { background:var(--fp-soft-strong); color:var(--fp-text); border-color:var(--fp-check-border); }
                .fc-sk { list-style:none; }
                .sk-t { width:100%; aspect-ratio:2/3; border-radius:8px; background:linear-gradient(90deg,var(--fp-skeleton-a) 25%,var(--fp-skeleton-b) 50%,var(--fp-skeleton-a) 75%); background-size:200% 100%; animation:shim 1.4s infinite; }
                .sk-l { height:12px; border-radius:4px; margin-top:10px; background:linear-gradient(90deg,var(--fp-skeleton-a) 25%,var(--fp-skeleton-b) 50%,var(--fp-skeleton-a) 75%); background-size:200% 100%; animation:shim 1.4s infinite; }
                @keyframes shim { 0%{background-position:200% 0}100%{background-position:-200% 0} }
                .btn-more { display:flex; align-items:center; justify-content:center; width:100%; max-width:200px; margin:36px auto 0; height:42px; border-radius:21px; border:1px solid var(--fp-border); background:var(--fp-soft); color:var(--fp-muted); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
                .btn-more:hover { background:var(--fp-soft-strong); color:var(--fp-text); border-color:var(--fp-muted); }
                .modal-bg { --fp-panel:var(--bg-card); --fp-text:var(--text-primary); --fp-muted:var(--text-muted); --fp-subtle:var(--text-subtle); --fp-border:var(--border); --fp-border-subtle:var(--border-subtle); --fp-border-faint:var(--border-faint); --fp-soft:var(--bg-hover); --fp-check-border:var(--text-subtle); position:fixed; inset:0; background:rgba(0,0,0,.58); backdrop-filter:blur(4px); z-index:500; display:flex; align-items:center; justify-content:center; padding:24px; }
                html.light .modal-bg { --fp-check-border:rgba(0,0,0,.28); background:rgba(10,10,18,.34); }
                .modal { background:var(--fp-panel); border:1px solid var(--fp-border); border-radius:14px; width:660px; max-width:90vw; max-height:80vh; overflow:hidden; display:flex; flex-direction:column; }
                .modal-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 0; }
                .modal-head h2 { font-size:18px; font-weight:700; color:var(--fp-text); margin:0; }
                .modal-close { background:none; border:none; color:var(--fp-subtle); cursor:pointer; padding:4px; transition:color .2s; }
                .modal-close:hover { color:var(--fp-text); }
                .modal-desc { font-size:12px; color:var(--fp-subtle); padding:8px 24px 16px; margin:0; border-bottom:1px solid var(--fp-border-subtle); }
                .modal-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:2px 0; padding:16px 24px; overflow-y:auto; }
                .modal-cb { display:flex; align-items:center; gap:9px; padding:9px 8px; border-radius:6px; cursor:pointer; transition:background .15s; user-select:none; }
                .modal-cb:hover { background:var(--fp-soft); }
                .modal-cb span:last-child { font-size:13px; color:var(--fp-muted); }
                .modal-cb.on span:last-child { color:var(--fp-text); }
                .wish-modal-bg { position:fixed; inset:0; z-index:500; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.58); backdrop-filter:blur(4px); padding:24px; }
                html.light .wish-modal-bg { background:rgba(10,10,18,.34); }
                .wish-modal { width:320px; max-width:calc(100vw - 40px); display:flex; flex-direction:column; align-items:center; gap:16px; border-radius:16px; border:1px solid var(--border); background:var(--bg-card); padding:24px; box-shadow:0 18px 50px rgba(0,0,0,.28); color:var(--text-primary); }
                .wish-modal-title { margin:0; color:var(--text-primary); font-size:16px; font-weight:700; line-height:1.45; text-align:center; }
                .wish-modal-cancel { flex:1; padding:8px 0; border-radius:999px; border:1px solid var(--border); background:transparent; color:var(--text-muted); font-size:14px; transition:all .18s; }
                .wish-modal-cancel:hover { background:var(--bg-hover); color:var(--text-primary); border-color:var(--text-subtle); }
                .modal-foot { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:14px 24px; border-top:1px solid var(--fp-border-subtle); }
                .modal-reset { display:flex; align-items:center; gap:5px; background:none; border:none; color:var(--fp-subtle); font-size:13px; cursor:pointer; margin-right:auto; padding:0; transition:color .2s; }
                .modal-reset:hover { color:var(--fp-text); }
                .modal-confirm { padding:9px 24px; background:#6c63ff; border:none; border-radius:8px; color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:background .2s; }
                .modal-confirm:hover { background:#5a52e0; }
                .empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; gap:10px; grid-column:1/-1; }
                .empty svg { color:var(--fp-faint); }
                .empty p { font-size:14px; color:var(--fp-faint); margin:0; }
                .fp-page-head { border-bottom:1px solid var(--fp-border-subtle); display:flex; align-items:center; justify-content:space-between; padding:18px 0; }
                .filter-toggle { display:flex; align-items:center; gap:8px; padding:9px 18px; border-radius:10px; color:#6c63ff; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; flex-shrink:0; }
                .filter-toggle.is-open { background:rgba(108,99,255,.2); border:1px solid rgba(108,99,255,.5); }
                .filter-toggle:not(.is-open) { background:rgba(108,99,255,.1); border:1px solid rgba(108,99,255,.25); }
                .filter-count { background:#6c63ff; color:#fff; font-size:11px; font-weight:700; padding:1px 6px; border-radius:10px; }
                .filter-scrim { display:none; }
                @media (max-width:1100px) { .fp-inner { width:calc(100% - 40px); } .finder-grid { grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:18px 12px; } }
                @media (max-width:900px) {
                    .fp { --fp-mobile-header:75px; padding-top:54px; }
                    .fp-inner { width:calc(100% - 28px); }
                    .fp-page-head { gap:12px; padding:12px 0; }
                    .fp-page-head > div { padding:28px 0 22px !important; min-width:0; }
                    .filter-toggle { padding:8px 12px; font-size:12px; }
                    .fp-body { display:block; }
                    .fp-sidebar { position:fixed; top:var(--fp-mobile-header); bottom:0; left:0; width:min(86vw,320px) !important; opacity:1 !important; z-index:140; background:var(--fp-panel); border-right:1px solid var(--fp-border); box-shadow:18px 0 50px var(--fp-shadow); transform:translateX(-105%); transition:transform .28s cubic-bezier(.4,0,.2,1); overflow-y:auto; }
                    .fp-sidebar.open { transform:translateX(0); }
                    .fp-sidebar.closed { transform:translateX(-105%); }
                    .fp-sidebar-inner { width:100%; padding:22px 18px 32px 0; }
                    .filter-scrim { display:block; position:fixed; top:var(--fp-mobile-header); right:0; bottom:0; left:0; z-index:130; background:rgba(0,0,0,.45); border:0; padding:0; }
                    .fm { width:100%; }
                    .fm-top { padding:16px 0 18px; }
                    .finder-grid { grid-template-columns:repeat(auto-fill,minmax(126px,1fr)); gap:18px 10px; }
                    .fc-hover { display:none; }
                    .modal-bg { padding:14px; align-items:flex-end; }
                    .modal { width:100%; max-width:none; max-height:min(78vh,680px); border-radius:14px 14px 0 0; }
                    .modal-grid { grid-template-columns:repeat(2,1fr); padding:14px 18px; }
                    .modal-foot { padding:12px 18px calc(12px + env(safe-area-inset-bottom)); }
                }
                @media (max-width:560px) {
                    .fp-inner { width:calc(100% - 20px); }
                    .finder-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px 8px; }
                    .fc-name { font-size:12px; }
                    .modal-grid { grid-template-columns:1fr; }
                }
            `}</style>

            <div className="fp">
                <div className="fp-inner">
                    <div className="fp-page-head">
                        <PageHeader title="태그 검색" sub="장르, 태그, 년도로 작품을 찾아보세요" />
                        <button onClick={() => setFilterOpen(v => !v)} className={`filter-toggle${filterOpen ? ' is-open' : ''}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
                            {filterOpen ? '필터 닫기' : '필터 열기'}
                            {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
                        </button>
                    </div>

                    <div className="fp-body">
                        {filterOpen && <button type="button" className="filter-scrim" aria-label="필터 닫기" onClick={() => setFilterOpen(false)} />}
                        <div className={`fp-sidebar ${filterOpen ? 'open' : 'closed'}`}>
                            <aside className="fp-sidebar-inner">
                                <div className="sb-top">
                                    <h2>필터</h2>
                                    <button className="btn-reset-all" onClick={reset}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>전체 초기화</button>
                                </div>
                                <hr className="sb-divider" />
                                <div className="sb-sec">
                                    <div className="sb-sec-head"><p className="sb-sec-title">장르</p><button className="btn-more-sec" onClick={() => setGenreModal(true)}>더 보기<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button></div>
                                    <div className="sb-checks">{SIDEBAR_GENRES.map(g => <Checkbox key={g.key} checked={filters.genres.includes(g.key)} onChange={() => toggleGenre(g.key)} label={g.label} count={getGenreCount(g)} />)}</div>
                                </div>
                                <hr className="sb-divider" style={{ margin: '12px 0 0' }} />
                                <div className="sb-sec">
                                    <div className="sb-sec-head"><p className="sb-sec-title">태그</p><button className="btn-more-sec" onClick={() => setTagModal(true)}>더 보기<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button></div>
                                    <div className="sb-checks">{SIDEBAR_TAGS.map(t => <Checkbox key={t.key} checked={filters.tags.includes(t.key)} onChange={() => toggleTag(t.key)} label={t.label} />)}</div>
                                </div>
                                <hr className="sb-divider" style={{ margin: '12px 0 0' }} />
                                <div className="sb-sec">
                                    <div className="sb-sec-head"><p className="sb-sec-title">년도</p></div>
                                    <div className="sb-checks">
                                        {SIDEBAR_YEARS.map(y => {
                                            const cnt = results.filter(r => { const yr = r.first_air_date?.slice(0, 4); if (!yr) return false; if (y.value.includes('-Q')) { const q = parseInt(y.value.split('-Q')[1]); const yy = y.value.split('-Q')[0]; const month = parseInt(r.first_air_date?.slice(5, 7) || '0'); const qM = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]; return yr === yy && qM[q - 1]?.includes(month) } if (y.value === '2010s') return parseInt(yr) >= 2010 && parseInt(yr) <= 2019; if (y.value === '2000s') return parseInt(yr) >= 2000 && parseInt(yr) <= 2009; if (y.value === '1990s') return parseInt(yr) >= 1990 && parseInt(yr) <= 1999; return yr === y.value }).length
                                            return <Checkbox key={y.value} checked={filters.year.includes(y.value)} onChange={() => toggleYear(y.value)} label={y.label} count={cnt} />
                                        })}
                                    </div>
                                </div>
                                <hr className="sb-divider" style={{ margin: '12px 0 0' }} />
                                <div className="sb-sec">
                                    <div className="sb-sec-head"><p className="sb-sec-title">방영</p></div>
                                    <div className="sb-checks">
                                        <Checkbox checked={filters.airing.includes('ongoing')} onChange={() => toggleAiring('ongoing')} label="방영중" count={results.length} />
                                        <Checkbox checked={filters.airing.includes('ended')} onChange={() => toggleAiring('ended')} label="완결" count={results.length} />
                                    </div>
                                </div>
                                <hr className="sb-divider" style={{ margin: '12px 0 0' }} />
                                <div className="sb-sec">
                                    <div className="sb-sec-head"><p className="sb-sec-title">출시타입</p></div>
                                    <div className="sb-checks">
                                        <Checkbox checked={filters.mediaType.includes('tva')} onChange={() => toggleMedia('tva')} label="TVA" count={results.length} />
                                        <Checkbox checked={filters.mediaType.includes('movie')} onChange={() => toggleMedia('movie')} label="극장판" count={results.length} />
                                        <Checkbox checked={filters.mediaType.includes('ova')} onChange={() => toggleMedia('ova')} label="OVA" count={results.length} />
                                    </div>
                                </div>
                            </aside>
                        </div>

                        <div className="fm">
                            <div className="fm-top">
                                <div className="result-summary">
                                    {!loading && results.length > 0 ? <p className="result-info">총 {(totalResults || results.length).toLocaleString()}개의 작품</p> : <span />}
                                    {hasActiveFilters && (
                                        <div className="filter-chips-container">
                                            {activeGenres.map(g => <button key={`genre-${g.key}`} className="filter-chip" onClick={() => toggleGenre(g.key)}>{g.label}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>)}
                                            {activeTags.map(t => <button key={`tag-${t.key}`} className="filter-chip tag-chip" onClick={() => toggleTag(t.key)}>{t.label}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>)}
                                            {filters.year.map(yearValue => <button key={`year-${yearValue}`} className="filter-chip" onClick={() => toggleYear(yearValue)}>{QUARTER_YEARS.find(y => y.value === yearValue)?.label}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>)}
                                            {filters.airing.map(airing => <button key={`airing-${airing}`} className="filter-chip" onClick={() => toggleAiring(airing)}>{airing === 'ongoing' ? '방영중' : '완결'}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>)}
                                            {filters.mediaType.map(mediaType => <button key={`media-${mediaType}`} className="filter-chip" onClick={() => toggleMedia(mediaType)}>{mediaType === 'tva' ? 'TVA' : mediaType === 'movie' ? '극장판' : 'OVA'}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>)}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
                                    <div className="sort-wrap" ref={sortRef}>
                                        <button className="btn-sort" onClick={() => setSortOpen(v => !v)}>
                                            {currentSortLabel}
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={sortOpen ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} /></svg>
                                        </button>
                                        {sortOpen && (
                                            <div className="sort-dd">
                                                {SORT_OPTIONS.map(o => (
                                                    <button key={o.value} className={`sort-item${filters.sort === o.value ? ' active' : ''}`} onClick={() => { setFilters(f => ({ ...f, sort: o.value })); setSortOpen(false) }}>
                                                        {filters.sort === o.value && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>}
                                                        {filters.sort !== o.value && <span style={{ width: 13 }} />}
                                                        {o.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="fm-body">
                                <ul className="finder-grid">
                                    {loading && results.length === 0 ? Array.from({ length: 60 }).map((_, i) => <Skeleton key={i} />)
                                        : results.length === 0 && !loading ? (
                                            <li className="empty">
                                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                                <p>검색 결과가 없어요</p>
                                            </li>
                                        ) : results.map(item => <AniCard key={item.id} item={item} />)
                                    }
                                    {loading && results.length > 0 && Array.from({ length: 20 }).map((_, i) => <Skeleton key={`m${i}`} />)}
                                </ul>
                                {!loading && (page + 1) < totalPages && results.length > 0 && <button className="btn-more" onClick={() => setPage(p => p + 1)}>더보기</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {genreModal && <GenreModal selected={filters.genres} onToggle={toggleGenre} onReset={() => setFilters(f => ({ ...f, genres: [] }))} onClose={() => setGenreModal(false)} />}
            {tagModal && <TagModal selected={filters.tags} onToggle={toggleTag} onReset={() => setFilters(f => ({ ...f, tags: [] }))} onClose={() => setTagModal(false)} />}
        </>
    )
}
export default function TagSearch() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
            <TagSearchInner />
        </Suspense>
    )
}
