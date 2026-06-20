"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const SUGGESTIONS = ['귀멸의 칼날', '주술회전', '하이큐', '프리렌', '나루토', '원피스', '진격의 거인', '스파이 패밀리']
const CATEGORIES = [
    { label: '⚔️ 액션', key: 'action' },
    { label: '💕 로맨스', key: 'romance' },
    { label: '✨ 판타지', key: 'fantasy' },
    { label: '😂 코미디', key: 'comedy' },
    { label: '😭 드라마', key: 'drama' },
    { label: '🌑 미스터리', key: 'mystery' },
    { label: '👻 공포', key: 'horror' },
]

type AnimeSearchResult = {
    id: number
    name: string
    original_language?: string
    poster_path?: string | null
    first_air_date?: string
}

function normalize(v: string) { return v.toLowerCase().replace(/[\s\-_·.,!?'"()\[\]]+/g, '') }

const CHARACTER_MAP: Record<string, string> = {
    '탄지로': '귀멸의 칼날', '네즈코': '귀멸의 칼날', '이노스케': '귀멸의 칼날', '젠이츠': '귀멸의 칼날',
    '고죠': '주술회전', '이타도리': '주술회전', '메구미': '주술회전', '노바라': '주술회전',
    '히나타': '하이큐', '카게야마': '하이큐', '니시노야': '하이큐', '아사히': '하이큐',
    '프리렌': '장송의 프리렌', '페른': '장송의 프리렌', '슈타르크': '장송의 프리렌',
    '나루토': '나루토', '사스케': '나루토', '사쿠라': '나루토', '카카시': '나루토',
    '루피': '원피스', '조로': '원피스', '나미': '원피스', '상디': '원피스',
    '에렌': '진격의 거인', '미카사': '진격의 거인', '아르민': '진격의 거인', '리바이': '진격의 거인',
    '로이드': '스파이 패밀리', '아냐': '스파이 패밀리', '요르': '스파이 패밀리',
    '데쿠': '나의 히어로 아카데미아', '바쿠고': '나의 히어로 아카데미아', '쇼토': '나의 히어로 아카데미아',
    '엔': '블루 록', '이사기': '블루 록', '바기': '블루 록',
}

function resolveQuery(q: string): string {
    const norm = normalize(q)
    for (const [char, anime] of Object.entries(CHARACTER_MAP)) {
        if (normalize(char).includes(norm) || norm.includes(normalize(char))) return anime
    }
    return q
}

function PopularAnime({ onClose }: { onClose: () => void }) {
    const [items, setItems] = useState<AnimeSearchResult[]>([])
    const router = useRouter()

    useEffect(() => {
        fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then((d: { results?: AnimeSearchResult[] }) => setItems((d.results || []).filter((r) => r.original_language === 'ja').slice(0, 6)))
            .catch(() => { })
    }, [])

    return (
        <>
            {items.map(item => (
                <div key={item.id}
                    onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                    <div style={{ width: 44, height: 62, borderRadius: 8, background: 'var(--bg-card)', backgroundImage: item.poster_path ? `url(${IMG}/w92${item.poster_path})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 10, color: '#9d97ff', margin: '0 0 2px', fontWeight: 600 }}>애니메이션</p>
                        <p style={{ fontSize: 13, color: 'var(--text-high)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600 }}>{item.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: 0 }}>{item.first_air_date?.slice(0, 4)}</p>
                    </div>
                </div>
            ))}
        </>
    )
}

export default function HeaderSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<AnimeSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [charHint, setCharHint] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        inputRef.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); setCharHint(null); return }
        setLoading(true)
        const resolved = resolveQuery(q)
        if (normalize(resolved) !== normalize(q)) setCharHint(resolved)
        else setCharHint(null)
        const trimmed = resolved.replace(/\s+/g, ' ').trim()
        const noSpace = resolved.replace(/\s/g, '')
        const queries = Array.from(new Set([trimmed, noSpace]))
        try {
            const allResults = await Promise.all(queries.map(async tq => {
                const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(tq)}&language=ko-KR`)
                const data = await res.json() as { results?: AnimeSearchResult[] }
                return (data.results || []).filter((r) => r.original_language === 'ja')
            }))
            const seen = new Set<number>()
            const merged = allResults.flat().filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
            setResults(merged.slice(0, 8))
        } catch { }
        finally { setLoading(false) }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        setQuery(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => search(v), 320)
    }

    const isSearching = query.trim().length > 0

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
            onClick={onClose}
        >
            <style>{`
                @keyframes so-up { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
                @keyframes spin { to { transform:rotate(360deg) } }
                .so-wrap { animation: so-up .2s ease; }
                .so-scroll::-webkit-scrollbar { width: 4px; }
                .so-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
            `}</style>

            <div
                className="so-wrap"
                style={{ width: 'min(720px, 92vw)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.45)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 16, height: 50, borderRadius: 25, border: '1px solid var(--border)', padding: '0 18px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={handleChange}
                        onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { onClose(); router.push(`/anime/search?q=${encodeURIComponent(query)}`) } }}
                        placeholder="애니메이션 제목, 캐릭터명으로 검색해 보세요"
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14 }}
                    />
                    {loading && <div style={{ width: 15, height: 15, border: '2px solid var(--border)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--border-faint)', color: 'var(--text-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 2 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {charHint && (
                    <div style={{ margin: '-8px 16px 8px', padding: '6px 14px', background: 'rgba(108,99,255,.12)', borderRadius: 8, border: '1px solid rgba(108,99,255,.2)', fontSize: 12, color: '#a5a0ff' }}>
                        💡 <strong>&quot;{query}&quot;</strong> 캐릭터 기준으로 <strong>&quot;{charHint}&quot;</strong> 검색 중
                    </div>
                )}

                <div className="so-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', margin: '0 0 10px' }}>자동완성</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                {(isSearching && results.length > 0 ? results.map(r => r.name).slice(0, 6) : SUGGESTIONS).map(s => (
                                    <button key={s}
                                        onClick={() => { setQuery(s); search(s) }}
                                        style={{ padding: '5px 13px', borderRadius: 20, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#a5a0ff' }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                                    >{s}</button>
                                ))}
                            </div>
                        </div>

                        {!isSearching && (
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', margin: '0 0 10px' }}>장르</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                    {CATEGORIES.map(cat => (
                                        <button key={cat.label}
                                            onClick={() => { onClose(); router.push(`/tag-search${cat.key ? `?genre=${cat.key}` : ''}`) }}
                                            style={{ padding: '5px 13px', borderRadius: 20, background: 'rgba(108,99,255,.15)', color: '#a5a0ff', fontSize: 12, fontWeight: 700, border: '1px solid rgba(108,99,255,.25)', cursor: 'pointer', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,.25)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,.15)' }}
                                        >{cat.label}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', margin: '0 0 10px' }}>
                                {isSearching ? `검색 결과 ${results.length}개` : '인기 애니'}
                            </p>
                            {isSearching ? (
                                results.length === 0 && !loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, borderRadius: 12, background: 'var(--bg-hover)', color: 'var(--text-faint)', fontSize: 13 }}>
                                        검색 결과가 없어요.
                                    </div>
                                ) : (
                                    results.map(item => (
                                        <div key={item.id}
                                            onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'}
                                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                                        >
                                            <div style={{ width: 44, height: 62, borderRadius: 8, background: 'var(--bg-card)', backgroundImage: item.poster_path ? `url(${IMG}/w92${item.poster_path})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 10, color: '#9d97ff', margin: '0 0 2px', fontWeight: 600 }}>애니메이션</p>
                                                <p style={{ fontSize: 13, color: 'var(--text-high)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600 }}>{item.name}</p>
                                                <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: 0 }}>{item.first_air_date?.slice(0, 4)}</p>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                <PopularAnime onClose={onClose} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
