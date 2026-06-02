'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePreviewStore } from '@/store/usePreviewStore'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

export default function AnimePreviewModal() {
    const { previewId, setPreviewId } = usePreviewStore()
    const router = useRouter()
    const [detail, setDetail] = useState<any>(null)
    const [episodes, setEpisodes] = useState<any[]>([])
    const [similar, setSimilar] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'episodes' | 'similar' | 'review' | 'store'>('episodes')
    const [selectedSeason, setSelectedSeason] = useState(1)

    useEffect(() => {
        if (!previewId) { setDetail(null); setEpisodes([]); setSimilar([]); return }
        fetch(`https://api.themoviedb.org/3/tv/${previewId}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then(data => {
                setDetail(data)
                const first = (data.seasons || []).find((s: any) => s.season_number === 1)
                if (first) setSelectedSeason(1)
            })
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/similar?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then(data => setSimilar((data.results || []).slice(0, 12)))
    }, [previewId])

    useEffect(() => {
        if (!previewId) return
        setEpisodes([])
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/season/${selectedSeason}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then(s => setEpisodes(s.episodes || []))
    }, [previewId, selectedSeason])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewId(null) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    if (!previewId) return null

    const backdrop = detail?.backdrop_path ? `${IMG}/w1280${detail.backdrop_path}` : null
    const poster = detail?.poster_path ? `${IMG}/w300${detail.poster_path}` : null
    const score = Math.round((detail?.vote_average || 0) * 10) / 10
    const status = detail?.status === 'Returning Series' ? '방영중' : '완결'

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}
        >
            <div
                className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden w-full max-w-[860px] max-h-[90vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* 상단 backdrop */}
                <div className="relative h-[280px] shrink-0 overflow-hidden">
                    {backdrop
                        ? <img src={backdrop} className="w-full h-full object-cover" alt={detail?.name} />
                        : <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />
                    }
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a1a1a 0%, transparent 60%)' }} />

                    <button
                        onClick={() => setPreviewId(null)}
                        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>

                    {poster && (
                        <div className="absolute bottom-4 right-6 w-[90px] aspect-[2/3] rounded-lg overflow-hidden shadow-xl border border-white/10">
                            <img src={poster} className="w-full h-full object-cover" alt={detail?.name} />
                        </div>
                    )}

                    <div className="absolute bottom-4 left-6 right-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                            {score > 0 && <span className="text-sm text-amber-400 font-bold">★ {score}</span>}
                            {status && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${status === '방영중' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-white/10 text-white/50 border-white/15'}`}>
                                    {status}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-white mb-3">{detail?.name}</h2>
                        <div className="flex gap-2">
                            <button
                                className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
                                onClick={() => { router.push(`/anime/${previewId}?play=1`); setPreviewId(null) }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                1화 재생하기
                            </button>
                            <button
                                className="w-9 h-9 flex items-center justify-center rounded-full border border-white/30 text-white/70 hover:text-white hover:border-white transition-all"
                                onClick={() => { router.push(`/anime/${previewId}`); setPreviewId(null) }}
                                title="상세보기"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-white/[0.08] px-6 shrink-0">
                    {(['episodes', 'similar', 'review', 'store'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative px-4 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer transition-colors ${activeTab === tab ? 'text-white' : 'text-white/35'}`}
                        >
                            {tab === 'episodes' ? '에피소드'
                                : tab === 'similar' ? '비슷한 작품'
                                    : tab === 'review' ? '사용자 평'
                                        : '스토어'}
                            {activeTab === tab && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6c63ff] rounded-sm" />}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {activeTab === 'episodes' && (
                        <div className="flex flex-col gap-2">
                            <select
                                value={selectedSeason}
                                onChange={e => setSelectedSeason(Number(e.target.value))}
                                className="mb-3 bg-white/[0.06] border border-white/10 text-white text-sm rounded-lg px-3 py-2 w-fit cursor-pointer"
                            >
                                {(detail?.seasons || [])
                                    .filter((s: any) => s.season_number > 0)
                                    .map((s: any) => (
                                        <option key={s.season_number} value={s.season_number} className="bg-[#1a1a1a]">
                                            시즌 {s.season_number} ({s.episode_count}화)
                                        </option>
                                    ))
                                }
                            </select>
                            {episodes.length === 0 ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-5 h-5 border-2 border-white/10 border-t-[#6c63ff] rounded-full animate-spin" />
                                </div>
                            ) : episodes.map((ep: any) => (
                                <div
                                    key={ep.episode_number}
                                    className="flex gap-3 items-center p-3 rounded-xl hover:bg-white/[0.05] cursor-pointer group transition-colors"
                                    onClick={() => { router.push(`/anime/${previewId}?play=1`); setPreviewId(null) }}
                                >
                                    <div className="relative w-[120px] min-w-[120px] aspect-video rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                                        {ep.still_path
                                            ? <img src={`${IMG}/w300${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-white/10 text-xl font-black">{ep.episode_number}</div>
                                        }
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-white/30 mb-0.5">{ep.episode_number}화</p>
                                        <p className="text-sm font-semibold text-white/90 truncate">{ep.name}</p>
                                        {ep.runtime && <p className="text-[11px] text-white/30 mt-0.5">{ep.runtime}분</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'similar' && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                            {similar.length === 0 ? (
                                <div className="flex items-center justify-center py-10 col-span-full">
                                    <div className="w-5 h-5 border-2 border-white/10 border-t-[#6c63ff] rounded-full animate-spin" />
                                </div>
                            ) : similar.map((item: any) => (
                                <div key={item.id} className="cursor-pointer group" onClick={() => setPreviewId(item.id)}>
                                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#181818] mb-2 transition-transform duration-300 group-hover:scale-[1.03]">
                                        {item.poster_path
                                            ? <img src={`${IMG}/w342${item.poster_path}`} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/10">{(item.name || '?')[0]}</div>
                                        }
                                    </div>
                                    <p className="text-xs font-semibold text-white/80 line-clamp-2">{item.name}</p>
                                    <p className="text-[11px] text-white/30">{item.first_air_date?.slice(0, 4)}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'review' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <p className="text-white/25 text-sm">사용자 평 준비 중이에요</p>
                        </div>
                    )}

                    {activeTab === 'store' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <p className="text-white/25 text-sm">스토어 준비 중이에요</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}