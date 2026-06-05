"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const SUGGESTIONS = ['귀멸의 칼날', '주술회전', '하이큐', '프리렌', '나루토', '원피스', '진격의 거인', '스파이 패밀리']
const CATEGORIES = [
    { label: '🔥 인기', genre: null },
    { label: '⚔️ 액션', genre: 10759 },
    { label: '💕 로맨스', genre: 10749 },
    { label: '✨ 판타지', genre: 10765 },
    { label: '😂 코미디', genre: 35 },
    { label: '😭 드라마', genre: 18 },
    { label: '🌑 미스터리', genre: 9648 },
    { label: '👻 호러', genre: 27 },
]

function PopularAnime({ onClose }: { onClose: () => void }) {
    const [items, setItems] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then(d => setItems((d.results || []).filter((r: any) => r.original_language === 'ja').slice(0, 6)))
            .catch(() => {})
    }, [])

    return (
        <>
            {items.map(item => (
                <div key={item.id}
                    onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.05)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                    <div style={{ width: 44, height: 62, borderRadius: 8, background: '#1a1a22', backgroundImage: item.poster_path ? `url(${IMG}/w92${item.poster_path})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 10, color: '#9d97ff', margin: '0 0 2px', fontWeight: 600 }}>애니메이션</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600 }}>{item.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{item.first_air_date?.slice(0, 4)}</p>
                    </div>
                </div>
            ))}
        </>
    )
}

export default function HeaderSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
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
        if (!q.trim()) { setResults([]); return }
        setLoading(true)
        try {
            const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ko-KR`)
            const data = await res.json()
            setResults((data.results || []).filter((r: any) => r.original_language === 'ja').slice(0, 8))
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
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
            onClick={onClose}
        >
            <style>{`
                @keyframes so-up { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
                @keyframes spin { to { transform:rotate(360deg) } }
                .so-wrap { animation: so-up .2s ease; }
                .so-scroll::-webkit-scrollbar { width: 4px; }
                .so-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
            `}</style>

            <div
                className="so-wrap"
                style={{ width: 'min(720px, 92vw)', background: '#111118', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.8)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                {/* 인풋 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 16, height: 50, borderRadius: 25, border: '1px solid rgba(255,255,255,.1)', padding: '0 18px', background: 'rgba(255,255,255,.05)', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={handleChange}
                        onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { onClose(); router.push(`/anime/search?q=${encodeURIComponent(query)}`) } }}
                        placeholder="애니메이션 제목, 장르로 검색해 보세요"
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
                    />
                    {loading && <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                    {query && (
                        <button onClick={() => { setQuery(''); setResults([]) }} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                {/* 바디 */}
                <div className="so-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* 자동완성 */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', margin: '0 0 10px' }}>자동완성</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                {(isSearching && results.length > 0
                                    ? results.map(r => r.name).slice(0, 6)
                                    : SUGGESTIONS
                                ).map(s => (
                                    <button key={s}
                                        onClick={() => { setQuery(s); search(s) }}
                                        style={{ padding: '5px 13px', borderRadius: 20, border: '1px solid rgba(255,255,255,.12)', background: 'none', color: 'rgba(255,255,255,.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#a5a0ff' }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = 'rgba(255,255,255,.55)' }}
                                    >{s}</button>
                                ))}
                            </div>
                        </div>

                        {/* 장르 */}
                        {!isSearching && (
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', margin: '0 0 10px' }}>장르</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                    {CATEGORIES.map(cat => (
                                        <button key={cat.label}
                                            onClick={() => { onClose(); router.push('/tag-search') }}
                                            style={{ padding: '5px 13px', borderRadius: 20, background: 'rgba(108,99,255,.15)', color: '#a5a0ff', fontSize: 12, fontWeight: 700, border: '1px solid rgba(108,99,255,.25)', cursor: 'pointer', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,.25)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,.15)' }}
                                        >{cat.label}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 결과 / 인기 */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', margin: '0 0 10px' }}>
                                {isSearching ? `검색 결과 ${results.length}개` : '인기 애니'}
                            </p>
                            {isSearching ? (
                                results.length === 0 && !loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, borderRadius: 12, background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.2)', fontSize: 13 }}>
                                        검색 결과가 없어요.
                                    </div>
                                ) : (
                                    results.map(item => (
                                        <div key={item.id}
                                            onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.05)'}
                                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                                        >
                                            <div style={{ width: 44, height: 62, borderRadius: 8, background: '#1a1a22', backgroundImage: item.poster_path ? `url(${IMG}/w92${item.poster_path})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 10, color: '#9d97ff', margin: '0 0 2px', fontWeight: 600 }}>애니메이션</p>
                                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600 }}>{item.name}</p>
                                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{item.first_air_date?.slice(0, 4)}</p>
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
