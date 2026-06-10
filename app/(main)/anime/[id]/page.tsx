'use client'
import { useState, useEffect } from "react"
import { useAnimeDetail, IMG, GENRE_MAP } from "./useAnimeDetail"
import { useEpisodes } from "./useEpisodes"
import { usePreviewStore } from "@/store/usePreviewStore"
import SimilarPreviewModal from "./SimilarPreviewModal"
import VideoPlayer from "@/components/Videoplayer"
import EpisodeComments from "./Episodecomments"
import EpisodeSidebar from "./Episodesidebar"
import EpisodeInfo from "./EpisodeInfo"
import MembershipRequiredModal from "@/components/MembershipRequiredModal"
import styles from "./scss/AnimeDeatilpage.module.scss"
import { useAuthStore } from "@/store/useAuthStore"
import LoginModal from "@/components/LoginModal"
import AnimeDetailPage from "@/components/anime/AnimeDetail"
import { use } from "react"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id: pageId } = use(params)

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

    // 팝업 상태
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showMembershipModal, setShowMembershipModal] = useState(false)

    const { user } = useAuthStore()

    // 애니 시청 가능 여부: anime 또는 allinone 멤버십 필요
    const canWatch = user && (user.membership === 'anime' || user.membership === 'allinone')

    useEffect(() => {
        if (detail) initSeasons(detail)
    }, [detail])

    useEffect(() => {
        if (episodes.length > 0 && !currentEpisode) {
            const target = episodes.find(e => e.episode_number === epParam) || episodes[0]
            setCurrentEpisode(target)
        }
    }, [episodes, epParam])

    // 영상 영역 클릭 핸들러 — 로그인/멤버십 게이트
    const handlePlayerAreaClick = () => {
        if (!user) {
            setShowLoginModal(true)
            return
        }
        if (!canWatch) {
            setShowMembershipModal(true)
        }
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

            {/* 로그인 팝업 */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => {
                    const freshUser = useAuthStore.getState().user
                    const canWatchAfterLogin = freshUser?.membership === 'anime' || freshUser?.membership === 'allinone'
                    if (!canWatchAfterLogin) setShowMembershipModal(true)
                }}
            />
            {/* 멤버십 안내 팝업 */}
            <MembershipRequiredModal
                isOpen={showMembershipModal}
                onClose={() => setShowMembershipModal(false)}
                type="anime"
            />

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
                    ) : !user ? (
                        /* ── 비로그인 상태 ── */
                        <div
                            className={styles.playerState}
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={handlePlayerAreaClick}
                        >
                            <img
                                src={`https://image.tmdb.org/t/p/w780${detail.backdrop_path}`}
                                className="absolute inset-0 w-full h-full object-cover opacity-25"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-black/65" />
                            <div className="relative flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <p className="text-white font-bold text-lg">로그인 후 시청할 수 있어요</p>
                                <p className="text-white/40 text-sm">클릭해서 로그인하기</p>
                            </div>
                        </div>
                    ) : !canWatch ? (
                        /* ── 로그인 O, 멤버십 없음 ── */
                        <div
                            className={styles.playerState}
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={handlePlayerAreaClick}
                        >
                            <img
                                src={`https://image.tmdb.org/t/p/w780${detail.backdrop_path}`}
                                className="absolute inset-0 w-full h-full object-cover opacity-25"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-black/65" />
                            <div className="relative flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                                    style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}>
                                    🎬
                                </div>
                                <p className="text-white font-bold text-lg">멤버십이 필요해요</p>
                                <p className="text-white/40 text-sm">클릭해서 멤버십 시작하기</p>
                            </div>
                        </div>
                    ) : videoInfo ? (
                        /* ── 정상 재생 ── */
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
                    animeId={Number(pageId)}
                    animeTitle={detail.name}
                    animePoster={detail.poster_path}
                />
            </div>
        </div>
    )
}
