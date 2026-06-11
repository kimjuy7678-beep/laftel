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
import { useWatchlistStore } from "@/store/useWatchlistStore"
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

    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showMembershipModal, setShowMembershipModal] = useState(false)

    const { user } = useAuthStore()
    const { items, fetchWatchlist } = useWatchlistStore()

    // 멤버십 여부
    const hasMembership = user?.membership && user.membership !== 'none'

    // 구매 여부 확인 (현재 에피소드)
    const isPurchased = (epNum: number) => {
        const profileId = user?.currentProfileId || user?.profileId || 'main'
        const purchased = items.filter(i => i.tab === 'purchased' && i.id === numericId)
        const item = purchased.find(i => i.episodeNumber === epNum)
        if (!item) return false
        if (item.purchaseType === 'own') return true
        return item.rentExpiry ? Date.now() < item.rentExpiry : false
    }

    // 현재 에피소드 시청 가능 여부
    const canWatchEpisode = (epNum: number) => {
        if (!user) return false
        if (hasMembership) return true
        return isPurchased(epNum)
    }

    useEffect(() => {
        if (user?.uid) {
            const profileId = user.currentProfileId || user.profileId || 'main'
            fetchWatchlist(user.uid, profileId)
        }
    }, [user?.uid])

    useEffect(() => {
        if (detail) initSeasons(detail)
    }, [detail])

    useEffect(() => {
        if (episodes.length === 0) return
        if (epParam !== null) {
            const target = episodes.find(e => e.episode_number === epParam) ?? episodes[0]
            setCurrentEpisode(target)
        } else if (!currentEpisode) {
            setCurrentEpisode(episodes[0])
        }
    }, [episodes, epParam])

    const handlePlayerAreaClick = () => {
        if (!user) {
            setShowLoginModal(true)
            return
        }
        setShowMembershipModal(true)
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
    const activeEpNum = activeEpisode?.episode_number
    const canWatch = canWatchEpisode(activeEpNum)

    // 구매는 했지만 멤버십이 없는 경우 → 구매한 에피소드만 재생 가능
    const hasPurchasedCurrent = activeEpNum ? isPurchased(activeEpNum) : false

    return (
        <div className={styles.pageRoot}>
            <SimilarPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => {
                    const freshUser = useAuthStore.getState().user
                    const freshHasMembership = freshUser?.membership && freshUser.membership !== 'none'
                    if (!freshHasMembership) setShowMembershipModal(true)
                }}
            />
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
                        /* 비로그인 */
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
                        /* 로그인 O, 멤버십/구매 없음 */
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
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                                <p className="text-white font-bold text-lg">
                                    {hasPurchasedCurrent ? '대여 기간이 만료됐어요' : '이 에피소드를 시청하려면'}
                                </p>
                                <p className="text-white/50 text-sm text-center">
                                    {hasPurchasedCurrent
                                        ? '다시 구매하거나 멤버십을 시작해보세요'
                                        : '멤버십 가입 또는 에피소드를 구매해주세요'}
                                </p>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={e => { e.stopPropagation(); setShowMembershipModal(true) }}
                                        className="px-4 py-2 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-80"
                                        style={{ background: '#6c63ff' }}
                                    >
                                        멤버십 시작
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); router.push(`/store`) }}
                                        className="px-4 py-2 rounded-full text-sm font-bold transition-colors"
                                        style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
                                    >
                                        에피소드 구매
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : videoInfo ? (
                        /* 정상 재생 */
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