'use client'
import { useState, useEffect, useRef } from "react"
import { useAnimeDetail } from "@/app/(main)/anime/[id]/useAnimeDetail"
import { useEpisodes } from "@/app/(main)/anime/[id]/useEpisodes"
import SimilarPreviewModal from "@/app/(main)/anime/[id]/SimilarPreviewModal"
import VideoPlayer from "@/components/Videoplayer"
import EpisodeComments from "./Episodecomments"
import EpisodeSidebar from "./Episodesidebar"
import EpisodeInfo from "./EpisodeInfo"
import styles from "./scss/AnimeDeatilpage.module.scss"
import { useAuthStore } from "@/store/useAuthStore"
import { useParams } from "next/navigation"

export default function AnimeDetailPage({ animeId }: { animeId: number }) {
    const params = useParams()

    const {
        id, numericId, router,
        detail, loading,
        videoLoading, videoInfo,
        epParam,
    } = useAnimeDetail()

    const {
        seasonList, selectedSeason, setSelectedSeason,
        episodes, initSeasons,
    } = useEpisodes(id as string, 'seasons')

    const [currentEpisode, setCurrentEpisode] = useState<any>(null)
    const [previewItem, setPreviewItem] = useState<any>(null)
    const [immersive, setImmersive] = useState(false)

    const { user } = useAuthStore()

    useEffect(() => {
        if (detail) initSeasons(detail)
    }, [detail])

    useEffect(() => {
        if (episodes.length > 0 && !currentEpisode) {
            const target = episodes.find(e => e.episode_number === epParam) || episodes[0]
            setCurrentEpisode(target)
        }
    }, [episodes, epParam])

    // 몰입 모드 시 헤더 + 모바일 하단바 숨기기
    useEffect(() => {
        const header = document.querySelector('header') as HTMLElement
        const bottomTabBar = document.getElementById('bottom-tab-bar') as HTMLElement
        if (header) {
            header.style.transition = 'opacity .3s ease'
            header.style.opacity = immersive ? '0' : '1'
            header.style.pointerEvents = immersive ? 'none' : 'auto'
        }
        if (bottomTabBar) {
            bottomTabBar.style.transition = 'opacity .3s ease, transform .3s ease'
            bottomTabBar.style.opacity = immersive ? '0' : '1'
            bottomTabBar.style.pointerEvents = immersive ? 'none' : 'auto'
            bottomTabBar.style.transform = immersive ? 'translateY(100%)' : 'translateY(0)'
        }
        return () => {
            if (header) {
                header.style.opacity = '1'
                header.style.pointerEvents = 'auto'
            }
            if (bottomTabBar) {
                bottomTabBar.style.opacity = '1'
                bottomTabBar.style.pointerEvents = 'auto'
                bottomTabBar.style.transform = 'translateY(0)'
            }
        }
    }, [immersive])

    // ESC로 몰입 모드 해제 (VideoPlayer 밖에서도 대응)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && immersive) setImmersive(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [immersive])

    // 댓글 시간 클릭 → 영상 해당 시간으로 점프
    const handleBookmarkSeek = (timeSeconds: number) => {
        const iframe = document.querySelector('iframe') as HTMLIFrameElement
        if (!iframe) return
        // start 파라미터로 재로드 (seekTo 대신)
        const currentSrc = iframe.src
        const base = currentSrc.split('?')[0]
        const params = new URLSearchParams(currentSrc.split('?')[1] || '')
        params.set('start', String(Math.floor(timeSeconds)))
        params.set('autoplay', '1')
        iframe.src = `${base}?${params.toString()}`
    }

    if (loading) return (
        <div className={styles.loadingScreen}>
            <div className={styles.spinner} />
        </div>
    )

    if (!detail || detail.status_code === 34) return (
        <div className={styles.errorScreen}>
            <p>작품을 찾을 수 없어요</p>
            <button onClick={() => router.back()}>돌아가기</button>
        </div>
    )

    const activeEpisode = currentEpisode || episodes[0]

    return (
        <div className={styles.pageRoot}>
            <SimilarPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />

            {/* 뒤로 버튼 — 몰입 모드에서 숨김 */}
            {!immersive && (
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    뒤로
                </button>
            )}

            <div className={styles.playerRow}>
                {/* playerArea — 몰입 모드 시 fixed 전체화면 */}
                <div
                    className={styles.playerArea}
                    style={immersive ? {
                        position: 'fixed',
                        top: 0, left: 0,
                        width: '100vw', height: '100vh',
                        zIndex: 100,
                        background: '#000',
                    } : {}}
                >
                    {videoLoading ? (
                        <div className={styles.playerState}>
                            <div className={styles.spinner} />
                            <span>영상 불러오는 중...</span>
                        </div>
                    ) : !user ? (
                        <div className={styles.playerState} style={{ position: 'relative' }}>
                            <img
                                src={`https://image.tmdb.org/t/p/w780${detail.backdrop_path}`}
                                className="absolute inset-0 w-full h-full object-cover opacity-30"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-black/60" />
                            <div className="relative flex flex-col items-center gap-4">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <p className="text-white font-bold text-lg">로그인 후 이용할 수 있어요</p>
                                <button
                                    onClick={() => router.push('/login')}
                                    className="px-6 py-2.5 bg-[#6c63ff] text-white rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
                                >
                                    로그인하기
                                </button>
                            </div>
                        </div>
                    ) : videoInfo ? (
                        <VideoPlayer
                            id={numericId}
                            mode="modal"
                            title={detail.name}
                            episodeNumber={activeEpisode?.episode_number || 1}
                            episodeTitle={activeEpisode?.name || ''}
                            poster={detail.poster_path}
                            onImmersiveChange={setImmersive}
                            onNext={() => {
                                const idx = episodes.findIndex(
                                    e => e.episode_number === activeEpisode?.episode_number
                                )
                                if (idx !== -1 && episodes[idx + 1])
                                    setCurrentEpisode(episodes[idx + 1])
                            }}
                            onClose={() => router.back()}
                        />
                    ) : (
                        <div className={styles.playerState}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                                stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4M12 16h.01" />
                            </svg>
                            <span>영상 정보가 없어요</span>
                        </div>
                    )}
                </div>

                {/* 사이드바 — 몰입 모드에서 숨김 */}
                {!immersive && (
                    <EpisodeSidebar
                        seasonList={seasonList}
                        selectedSeason={selectedSeason}
                        onSeasonChange={setSelectedSeason}
                        episodes={episodes}
                        currentEpisode={activeEpisode}
                        onEpisodeClick={setCurrentEpisode}
                        seriesTitle={detail.name}
                    />
                )}
            </div>

            {/* 하단 — 몰입 모드에서 숨김 */}
            {!immersive && (
                <div className={styles.bottomRow}>
                    <EpisodeComments
                        episodeId={activeEpisode?.episode_number ?? episodes[0]?.episode_number}
                        animeId={animeId}
                        animeTitle={detail.name}
                        animePoster={detail.poster_path}
                        onBookmarkSeek={handleBookmarkSeek}
                    />
                </div>
            )}
        </div>
    )
}
