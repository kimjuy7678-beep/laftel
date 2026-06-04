'use client'
import { useState, useEffect } from "react"
import { useAnimeDetail, IMG, GENRE_MAP } from "./useAnimeDetail"
import { useEpisodes } from "./useEpisodes"
import { usePreviewStore } from "@/store/usePreviewStore"
import SimilarPreviewModal from "./SimilarPreviewModal"
import VideoPlayer from "@/components/VideoPlayer"
import EpisodeComments from "./Episodecomments"
import EpisodeSidebar from "./Episodesidebar"
import EpisodeInfo from "./EpisodeInfo"
import styles from "./scss/AnimeDeatilpage.module.scss"

export default function AnimeDetailPage() {
    const {
        id, numericId, router,
        detail, loading,
        videoLoading, videoInfo,
    } = useAnimeDetail()

    const {
        seasonList, selectedSeason, setSelectedSeason,
        episodes, initSeasons,
    } = useEpisodes(id as string, 'seasons')

    const [currentEpisode, setCurrentEpisode] = useState<any>(null)
    const [previewItem, setPreviewItem] = useState<any>(null)

    useEffect(() => {
        if (detail) initSeasons(detail)
    }, [detail])

    useEffect(() => {
        if (episodes.length > 0 && !currentEpisode) {
            setCurrentEpisode(episodes[0])
        }
    }, [episodes])

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

            <button className={styles.backBtn} onClick={() => router.back()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                뒤로
            </button>

            <div className={styles.playerRow}>

                <div className={styles.playerArea}>
                    {videoLoading ? (
                        <div className={styles.playerState}>
                            <div className={styles.spinner} />
                            <span>영상 불러오는 중...</span>
                        </div>
                    ) : videoInfo ? (
                        <VideoPlayer
                            id={numericId}
                            mode="modal"
                            title={detail.name}
                            episodeNumber={activeEpisode?.episode_number || 1}
                            episodeTitle={activeEpisode?.name || ''}
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

                <EpisodeSidebar
                    seasonList={seasonList}
                    selectedSeason={selectedSeason}
                    onSeasonChange={setSelectedSeason}
                    episodes={episodes}
                    currentEpisode={activeEpisode}
                    onEpisodeClick={setCurrentEpisode}
                    seriesTitle={detail.name}
                />
            </div>

            <div className={styles.bottomRow}>
                <EpisodeInfo episode={activeEpisode} seriesTitle={detail.name} />
                <EpisodeComments
                    episodeId={activeEpisode?.episode_number ?? episodes[0]?.episode_number}
                />
            </div>
        </div>
    )
}