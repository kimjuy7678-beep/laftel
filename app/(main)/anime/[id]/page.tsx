'use client'
import OstSectionDetail from '@/components/anime/OstSectionDetail'
import SeasonSelect from '@/components/anime/SeasonSelect'
import { useAniStore } from '@/store/useAniStore'
import { useWatchProgressStore } from '@/store/useWatchProgressStore'
import { useAuthStore } from '@/store/useAuthStore'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/Button'
import VideoPlayer from '@/components/VideoPlayer'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 27: '공포',
    10751: '가족', 10762: '어린이', 10749: '로맨스', 80: '범죄',
    53: '스릴러', 99: '다큐멘터리',
}

export default function AnimeDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const numericId = Number(id)
    const searchParams = useSearchParams()

    // ✅ 컴포넌트 안으로 이동
    const { saveProgress } = useWatchProgressStore()
    const { user } = useAuthStore()

    const onFetchVideo = useAniStore(state => state.onFetchVideo)
    const videoInfo = useAniStore(state => state.aniVideos[numericId])

    const [detail, setDetail] = useState<any>(null)
    const [credits, setCredits] = useState<any[]>([])
    const [similar, setSimilar] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [liked, setLiked] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'cast' | 'similar' | 'seasons'>('seasons')

    const [seasonList, setSeasonList] = useState<any[]>([])
    const [selectedSeason, setSelectedSeason] = useState<number>(1)
    const [episodes, setEpisodes] = useState<any[]>([])
    const [episodeLoading, setEpisodeLoading] = useState(false)
    const [episodeCache, setEpisodeCache] = useState<Record<number, any[]>>({})

    const [modalOpen, setModalOpen] = useState(false)
    const [videoLoading, setVideoLoading] = useState(false)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([
            fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/aggregate_credits?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/similar?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
        ]).then(([det, cred, sim]) => {
            setDetail(det)
            setCredits((cred.cast || []).slice(0, 20))
            setSimilar((sim.results || []).slice(0, 12))

            const validSeasons = (det.seasons || []).filter((s: any) => s.season_number > 0)
            setSeasonList(validSeasons)
            if (validSeasons.length > 0) setSelectedSeason(validSeasons[0].season_number)
        }).finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        if (activeTab !== 'seasons' || !id || !selectedSeason) return
        if (episodeCache[selectedSeason]) {
            setEpisodes(episodeCache[selectedSeason])
            return
        }
        setEpisodeLoading(true)
        fetch(`https://api.themoviedb.org/3/tv/${id}/season/${selectedSeason}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then(data => {
                const eps = data.episodes || []
                setEpisodes(eps)
                setEpisodeCache(prev => ({ ...prev, [selectedSeason]: eps }))
            })
            .finally(() => setEpisodeLoading(false))
    }, [activeTab, selectedSeason, id])

    const openPlayer = useCallback(async () => {
        if (!detail) return
        setModalOpen(true)

        if (useAniStore.getState().aniVideos[numericId]) return

        setVideoLoading(true)
        await onFetchVideo(numericId, detail.original_name || detail.name)
        setVideoLoading(false)
    }, [detail, numericId, onFetchVideo])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setModalOpen(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [setModalOpen])

    useEffect(() => {
        if (!detail) return
        if (searchParams.get('play') === '1') {
            openPlayer()
        }
    }, [detail])

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-9 h-9 border-[3px] border-white/10 border-t-[#6c63ff] rounded-full animate-spin" />
        </div>
    )

    if (!detail || detail.status_code === 34) return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
            <p className="text-white/40 text-base">작품을 찾을 수 없어요</p>
            <button onClick={() => router.back()} className="px-6 py-2.5 bg-[#6c63ff] border-none rounded-lg text-white cursor-pointer text-sm">
                돌아가기
            </button>
        </div>
    )

    const backdrop = detail.backdrop_path ? `${IMG}/original${detail.backdrop_path}` : null
    const poster = detail.poster_path ? `${IMG}/w500${detail.poster_path}` : null
    const score = Math.round((detail.vote_average || 0) * 10) / 10
    const latestSeason = (detail.seasons || []).filter((s: any) => s.season_number > 0).at(-1)
    const year = latestSeason?.air_date?.slice(0, 4) || detail.first_air_date?.slice(0, 4) || ''
    const genres = (detail.genres || []).map((g: any) => GENRE_MAP[g.id] || g.name)
    const seasonCount = detail.number_of_seasons || 0
    const episodeCount = detail.number_of_episodes || 0
    const status = detail.status === 'Returning Series' ? '방영중' : detail.status === 'Ended' ? '완결' : detail.status || ''

    const TABS = [
        { key: 'seasons', label: '시즌 & 에피소드' },
        { key: 'info', label: '작품 정보' },
        { key: 'cast', label: '출연진' },
        { key: 'similar', label: '비슷한 작품' },
    ] as const

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-14">

            {modalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-5xl mx-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute -top-12 right-0 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                            닫기 (ESC)
                        </button>

                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
                            {videoLoading ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                    <div className="w-10 h-10 border-[3px] border-white/10 border-t-[#6c63ff] rounded-full animate-spin" />
                                    <p className="text-white/30 text-sm">영상 불러오는 중...</p>
                                </div>
                            ) : videoInfo ? (
                                <VideoPlayer id={numericId} mode="modal" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 8v4M12 16h.01" />
                                    </svg>
                                    <p className="text-white/25 text-sm">영상 정보가 없어요</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <p className="text-white/80 font-semibold">{detail.name}</p>
                            {videoInfo?.source === 'youtube' && (
                                <span className="text-[11px] text-white/30 px-2 py-0.5 rounded border border-white/10">YouTube</span>
                            )}
                            {videoInfo?.source === 'tmdb' && (
                                <span className="text-[11px] text-white/30 px-2 py-0.5 rounded border border-white/10">TMDB</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <button
                className="fixed top-[70px] left-6 z-[100] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white/60 text-[13px] cursor-pointer transition-all hover:text-white hover:bg-black/80"
                onClick={() => router.back()}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                뒤로
            </button>

            <div className="relative w-full h-[520px] overflow-hidden">
                <div className="absolute inset-0">
                    {backdrop
                        ? <img src={backdrop} alt={detail.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />
                    }
                </div>
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to right, rgba(10,10,10,1) 30%, rgba(10,10,10,0.4) 70%, rgba(10,10,10,0.2) 100%), linear-gradient(to top, rgba(10,10,10,1) 0%, transparent 60%)' }}
                />
                <div className="relative z-10 flex items-end h-full max-w-[1200px] mx-auto px-12 pb-12 gap-9">
                    <div className="w-[170px] min-w-[170px] h-[255px] rounded-xl overflow-hidden bg-[#1e1e1e] shadow-[0_20px_60px_rgba(0,0,0,0.7)] shrink-0">
                        {poster
                            ? <img src={poster} alt={detail.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/[0.08]">{(detail.name || '?')[0]}</div>
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                            {status && (
                                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${status === '방영중' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-[#6c63ff]/20 text-[#9d97ff] border-[#6c63ff]/30'}`}>
                                    {status}
                                </span>
                            )}
                            {genres.slice(0, 3).map((g: string) => (
                                <span key={g} className="text-[11px] font-semibold px-2.5 py-0.5 rounded border bg-[#6c63ff]/20 text-[#9d97ff] border-[#6c63ff]/30">{g}</span>
                            ))}
                        </div>
                        <h1 className="text-[34px] font-black leading-tight mb-2">{detail.name}</h1>
                        {detail.original_name !== detail.name && (
                            <p className="text-sm text-white/35 mb-3.5">{detail.original_name}</p>
                        )}
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                            {score > 0 && (
                                <div className="flex items-center gap-1.5 text-[22px] font-black text-amber-400">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                    </svg>
                                    {score}
                                </div>
                            )}
                            <span className="text-[13px] text-white/35">{detail.vote_count?.toLocaleString()}명 평가</span>
                        </div>
                        <div className="flex gap-2 flex-wrap mb-5">
                            {year && <span className="text-xs text-white/50 px-3 py-1 rounded-full border border-white/12 bg-white/[0.04]">{year}</span>}
                            {seasonCount > 0 && <span className="text-xs text-white/50 px-3 py-1 rounded-full border border-white/12 bg-white/[0.04]">시즌 {seasonCount}</span>}
                            {episodeCount > 0 && <span className="text-xs text-white/50 px-3 py-1 rounded-full border border-white/12 bg-white/[0.04]">{episodeCount}화</span>}
                            {detail.original_language && <span className="text-xs text-white/50 px-3 py-1 rounded-full border border-white/12 bg-white/[0.04]">{detail.original_language.toUpperCase()}</span>}
                        </div>
                        <div className="flex gap-2.5">
                            <Button
                                onClick={openPlayer}
                                className="bg-[#6c63ff] text-white px-7"
                                content="재생하기"
                            />
                            <button
                                className={`w-[46px] h-[46px] flex items-center justify-center rounded-[10px] border cursor-pointer transition-all ${liked ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/[0.08] border-white/12 text-white/60 hover:bg-white/[0.14] hover:text-white'}`}
                                onClick={() => setLiked(v => !v)}
                                title="찜하기"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                            </button>
                            <button className="w-[46px] h-[46px] flex items-center justify-center rounded-[10px] border bg-white/[0.08] border-white/12 text-white/60 cursor-pointer transition-all hover:bg-white/[0.14] hover:text-white" title="공유">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-12 pt-10 pb-20">
                <div className="flex border-b border-white/[0.08] mb-9">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`relative px-6 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer transition-colors ${activeTab === key ? 'text-white' : 'text-white/35'}`}
                        >
                            {label}
                            {activeTab === key && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6c63ff] rounded-sm" />}
                        </button>
                    ))}
                </div>

                {activeTab === 'info' && (
                    <div>
                        {detail.overview && (
                            <p className="text-[15px] leading-[1.9] text-white/65 mb-9 max-w-[720px]">{detail.overview}</p>
                        )}
                        {genres.length > 0 && (
                            <div className="mb-9">
                                <p className="text-base font-bold text-white/85 mb-4">장르</p>
                                <div className="flex gap-2 flex-wrap">
                                    {genres.map((g: string) => (
                                        <span key={g} className="text-[13px] px-4 py-1.5 rounded-full bg-[#6c63ff]/12 text-[#9d97ff] border border-[#6c63ff]/20">{g}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-4 gap-4 mb-9">
                            {[
                                { val: `★ ${score || '-'}`, label: 'TMDB 평점' },
                                { val: seasonCount || '-', label: '시즌' },
                                { val: episodeCount || '-', label: '총 에피소드' },
                                { val: year || '-', label: '첫 방영' },
                            ].map(({ val, label }) => (
                                <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
                                    <p className="text-2xl font-black text-white mb-1">{val}</p>
                                    <p className="text-xs text-white/35">{label}</p>
                                </div>
                            ))}
                        </div>
                        <OstSectionDetail animeName={detail.original_name || detail.name} />
                    </div>
                )}

                {activeTab === 'cast' && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4">
                        {credits.length === 0 ? (
                            <p className="text-white/25 text-sm">출연진 정보가 없어요</p>
                        ) : credits.map((c: any) => (
                            <div key={c.id} className="text-center">
                                <div className="w-full aspect-square rounded-full overflow-hidden bg-[#1e1e1e] mx-auto mb-2.5 max-w-[100px]">
                                    {c.profile_path
                                        ? <img src={`${IMG}/w185${c.profile_path}`} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[28px] font-black text-white/[0.08]">{(c.name || '?')[0]}</div>
                                    }
                                </div>
                                <p className="text-xs font-semibold text-white/80 mb-0.5">{c.name}</p>
                                <p className="text-[11px] text-white/30">{c.roles?.[0]?.character || ''}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'similar' && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-[13px] gap-y-5">
                        {similar.length === 0 ? (
                            <p className="text-white/25 text-sm">비슷한 작품이 없어요</p>
                        ) : similar.map((item: any) => (
                            <div key={item.id} className="cursor-pointer group" onClick={() => router.push(`/anime/${item.id}`)}>
                                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#181818] mb-2 transition-transform duration-300 group-hover:scale-[1.03]">
                                    {item.poster_path
                                        ? <img src={`${IMG}/w342${item.poster_path}`} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[32px] font-black text-white/[0.08]">{(item.name || '?')[0]}</div>
                                    }
                                </div>
                                <p className="text-[13px] font-semibold text-white/85 mb-0.5 line-clamp-2">{item.name}</p>
                                <p className="text-[11px] text-white/30">{item.first_air_date?.slice(0, 4) || ''}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'seasons' && (
                    <div>
                        {seasonList.length === 0 ? (
                            <p className="text-white/25 text-sm">시즌 정보가 없어요</p>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-7 flex-wrap">
                                    <SeasonSelect
                                        seasons={seasonList}
                                        value={selectedSeason}
                                        onChange={setSelectedSeason}
                                        episodeCount={episodes.length}
                                    />
                                </div>

                                {episodeLoading ? (
                                    <div className="flex items-center justify-center py-16 gap-2.5 text-white/30 text-sm">
                                        <div className="w-5 h-5 border-2 border-white/10 border-t-[#6c63ff] rounded-full animate-spin" />
                                        불러오는 중...
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {episodes.map((ep: any) => (
                                            <div
                                                key={ep.episode_number}
                                                className="flex gap-4 items-start bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all hover:bg-[#6c63ff]/[0.07] hover:border-[#6c63ff]/20 cursor-pointer group"
                                                onClick={openPlayer}
                                            >
                                                <div className="relative w-[140px] min-w-[140px] aspect-video rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                                                    {ep.still_path
                                                        ? <img src={`${IMG}/w300${ep.still_path}`} alt={ep.name} loading="lazy" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-[22px] font-black text-white/[0.06]">{ep.episode_number}</div>
                                                    }
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] text-white/30 mb-1">{ep.episode_number}화</p>
                                                    <p className="text-[15px] font-bold text-white/90 mb-1.5 truncate">{ep.name || `에피소드 ${ep.episode_number}`}</p>
                                                    {ep.overview && (
                                                        <p className="text-[13px] leading-[1.7] text-white/45 mb-2 line-clamp-2">{ep.overview}</p>
                                                    )}
                                                    <div className="flex gap-3">
                                                        {ep.air_date && <span className="text-[11px] text-white/25">{ep.air_date}</span>}
                                                        {ep.runtime && <span className="text-[11px] text-white/25">{ep.runtime}분</span>}
                                                        {ep.vote_average > 0 && <span className="text-[11px] text-white/25">★ {Math.round(ep.vote_average * 10) / 10}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}