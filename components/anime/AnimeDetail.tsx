'use client'
import { useState, useEffect } from "react"
import { useAnimeDetail, IMG, GENRE_MAP } from "@/app/(main)/anime/[id]/useAnimeDetail"
import { useEpisodes } from "@/app/(main)/anime/[id]/useEpisodes"
import { usePreviewStore } from "@/store/usePreviewStore"
import SimilarPreviewModal from "@/app/(main)/anime/[id]/SimilarPreviewModal"
import OstSectionDetail from "@/components/anime/OstSectionDetail"
import SeasonSelect from "@/components/anime/SeasonSelect"
// import EpisodeComments from "./Episodecomments"
import EpisodeComments from "@/app/(main)/anime/[id]/Episodecomments"
import Button from "@/components/Button"
import VideoPlayer from "@/components/Videoplayer"

export default function AnimeDetailPage() {
    const {
        id, numericId, router,
        detail, credits, similar, loading,
        liked, setLiked,
        activeTab, setActiveTab,
        modalOpen, setModalOpen,
        videoLoading, videoInfo,
        openPlayer,
    } = useAnimeDetail()

    const {
        seasonList, selectedSeason, setSelectedSeason,
        episodes, episodeLoading, initSeasons,
    } = useEpisodes(id as string, activeTab)

    const [previewItem, setPreviewItem] = useState<any>(null)
    const [currentEpisode, setCurrentEpisode] = useState<any>(null)
    const { setPreviewId } = usePreviewStore()

    useEffect(() => {
        if (detail) initSeasons(detail)
    }, [detail])

    if (loading) return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="w-9 h-9 border-[3px] border-[var(--border-subtle)] border-t-[#6c63ff] rounded-full animate-spin" />
        </div>
    )

    if (!detail || detail.status_code === 34) return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4">
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
        <div className="min-h-screen bg-[var(--bg-primary)] text-white pt-16">
            <SimilarPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />

            {modalOpen && (
                <div className="fixed inset-0 z-[2100] bg-[var(--bg-primary)] flex flex-col">
                    {/* 헤더 제거됨 — 뒤로/X 버튼 없음 */}

                    <div className="flex flex-1 overflow-hidden">
                        {/* 좌측: 영상 + 에피소드 정보 + 댓글 */}
                        <div className="flex-1 flex flex-col bg-black min-w-0">
                            {/* 영상 영역 */}
                            <div className="flex-1 relative">
                                {videoLoading ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                        <div className="w-10 h-10 border-[3px] border-[var(--border-subtle)] border-t-[#6c63ff] rounded-full animate-spin" />
                                        <p className="text-white/30 text-sm">영상 불러오는 중...</p>
                                    </div>
                                ) : videoInfo ? (
                                    <VideoPlayer
                                        id={numericId}
                                        mode="modal"
                                        title={detail.name}
                                        episodeNumber={currentEpisode?.episode_number || 1}
                                        episodeTitle={currentEpisode?.name || episodes[0]?.name || ''}
                                        onNext={() => {
                                            const idx = episodes.findIndex(e => e.episode_number === currentEpisode?.episode_number)
                                            if (idx !== -1 && episodes[idx + 1]) setCurrentEpisode(episodes[idx + 1])
                                        }}
                                        onClose={() => setModalOpen(false)}
                                    />
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

                            {/* 에피소드 정보 + 댓글 — 스크롤 가능 */}
                            <div className="overflow-y-auto border-t border-white/[0.06]">
                                <div className="px-6 py-4 border-b border-white/[0.06]">
                                    <p className="text-white font-bold mb-1">
                                        {currentEpisode?.name || episodes[0]?.name}
                                    </p>
                                    {currentEpisode?.overview && (
                                        <p className="text-white/40 text-sm leading-relaxed">{currentEpisode.overview}</p>
                                    )}
                                </div>
                                <EpisodeComments
                                    episodeId={currentEpisode?.episode_number ?? episodes[0]?.episode_number}
                                />
                            </div>
                        </div>

                        {/* 우측: 에피소드 목록 */}
                        <div className="w-[320px] shrink-0 border-l border-white/[0.08] flex flex-col">
                            <div className="px-4 py-3 border-b border-white/[0.08] shrink-0">
                                <select
                                    value={selectedSeason}
                                    onChange={e => setSelectedSeason(Number(e.target.value))}
                                    className="bg-white/[0.06] border border-[var(--border-subtle)] text-white text-sm rounded-lg px-3 py-1.5 w-full cursor-pointer"
                                >
                                    {seasonList.map((s: any) => (
                                        <option key={s.season_number} value={s.season_number} className="bg-[var(--bg-card)]">
                                            시즌 {s.season_number} ({s.episode_count}화)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {episodes.map((ep: any) => (
                                    <div
                                        key={ep.episode_number}
                                        className={`flex gap-3 p-3 cursor-pointer transition-colors hover:bg-white/[0.05] ${currentEpisode?.episode_number === ep.episode_number ? 'bg-[#6c63ff]/15 border-l-2 border-[#6c63ff]' : ''}`}
                                        onClick={() => setCurrentEpisode(ep)}
                                    >
                                        <div className="relative w-[100px] min-w-[100px] aspect-video rounded-lg overflow-hidden bg-[var(--bg-card)] shrink-0">
                                            {ep.still_path
                                                ? <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-white/10 font-black">{ep.episode_number}</div>
                                            }
                                            {currentEpisode?.episode_number === ep.episode_number && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-white/30 mb-0.5">{ep.episode_number}화</p>
                                            <p className="text-xs font-semibold text-white/80 line-clamp-2">{ep.name}</p>
                                            {ep.runtime && <p className="text-[11px] text-white/25 mt-0.5">{ep.runtime}분</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button
                className="fixed top-[70px] left-6 z-[100] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-[var(--border-subtle)] text-white/60 text-[13px] cursor-pointer transition-all hover:text-white hover:bg-black/80"
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
                            <div key={item.id} className="cursor-pointer group" onClick={() => setPreviewId(item.id)}>
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
                                        <div className="w-5 h-5 border-2 border-[var(--border-subtle)] border-t-[#6c63ff] rounded-full animate-spin" />
                                        불러오는 중...
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {episodes.map((ep: any) => (
                                            <div
                                                key={ep.episode_number}
                                                className="flex gap-4 items-start bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all hover:bg-[#6c63ff]/[0.07] hover:border-[#6c63ff]/20 cursor-pointer group"
                                                onClick={() => { setCurrentEpisode(ep); openPlayer() }}
                                            >
                                                <div className="relative w-[140px] min-w-[140px] aspect-video rounded-lg overflow-hidden bg-[var(--bg-card)] shrink-0">
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
