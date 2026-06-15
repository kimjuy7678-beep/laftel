'use client'
import { useState, useEffect, useRef } from "react"
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
import { use } from "react"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id: pageId } = use(params)

    const { id, numericId, router, detail, loading, videoLoading, videoInfo, epParam } = useAnimeDetail()
    const { seasonList, selectedSeason, setSelectedSeason, episodes, initSeasons } = useEpisodes(id as string, 'seasons')

    const [currentEpisode, setCurrentEpisode] = useState<any>(null)
    const [previewItem, setPreviewItem] = useState<any>(null)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showMembershipModal, setShowMembershipModal] = useState(false)
    const [immersive, setImmersive] = useState(false)

    const { user } = useAuthStore()
    const { items, fetchWatchlist } = useWatchlistStore()
    const hasMembership = user?.membership === 'anime' || user?.membership === 'allinone'

    const isPurchased = (epNum: number) => {
        const profileId = user?.currentProfileId || user?.profileId || 'main'
        const purchased = items.filter(i => i.tab === 'purchased' && i.id === numericId)
        const item = purchased.find(i => i.episodeNumber === epNum)
        if (!item) return false
        if (item.purchaseType === 'own') return true
        return item.rentExpiry ? Date.now() < item.rentExpiry : false
    }

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

    useEffect(() => { if (detail) initSeasons(detail) }, [detail])

    useEffect(() => {
        if (episodes.length === 0) return
        if (epParam !== null) {
            const target = episodes.find(e => e.episode_number === epParam) ?? episodes[0]
            setCurrentEpisode(target)
        } else if (!currentEpisode) {
            setCurrentEpisode(episodes[0])
        }
    }, [episodes, epParam])

    // 몰입 모드 시 헤더 + 퀵메뉴 + 모바일 하단바 숨기기
    useEffect(() => {
        const header = document.querySelector('header') as HTMLElement
        const quickMenu = document.getElementById('quick-menu') as HTMLElement
        const bottomTabBar = document.getElementById('bottom-tab-bar') as HTMLElement

        if (header) {
            header.style.transition = 'opacity .3s ease'
            header.style.opacity = immersive ? '0' : '1'
            header.style.pointerEvents = immersive ? 'none' : 'auto'
        }
        if (quickMenu) {
            quickMenu.style.transition = 'opacity .3s ease'
            quickMenu.style.opacity = immersive ? '0' : '1'
            quickMenu.style.pointerEvents = immersive ? 'none' : 'auto'
        }
        if (bottomTabBar) {
            bottomTabBar.style.transition = 'opacity .3s ease, transform .3s ease'
            bottomTabBar.style.opacity = immersive ? '0' : '1'
            bottomTabBar.style.pointerEvents = immersive ? 'none' : 'auto'
            bottomTabBar.style.transform = immersive ? 'translateY(100%)' : 'translateY(0)'
        }

        return () => {
            if (header) { header.style.opacity = '1'; header.style.pointerEvents = 'auto' }
            if (quickMenu) { quickMenu.style.opacity = '1'; quickMenu.style.pointerEvents = 'auto' }
            if (bottomTabBar) {
                bottomTabBar.style.opacity = '1'
                bottomTabBar.style.pointerEvents = 'auto'
                bottomTabBar.style.transform = 'translateY(0)'
            }
        }
    }, [immersive])

    // ESC로 몰입 모드 해제
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
        const base = iframe.src.split('?')[0]
        const p = new URLSearchParams(iframe.src.split('?')[1] || '')
        p.set('start', String(Math.floor(timeSeconds)))
        p.set('autoplay', '1')
        iframe.src = `${base}?${p.toString()}`
    }

    const handlePlayerAreaClick = () => {
        if (!user) { setShowLoginModal(true); return }
        setShowMembershipModal(true)
    }

    if (loading) return <div className={styles.loadingScreen}><div className={styles.spinner} /></div>

    if (!detail || detail.status_code === 34) return (
        <div className={styles.errorScreen}>
            <p>작품을 찾을 수 없어요</p>
            <button onClick={() => router.back()}>돌아가기</button>
        </div>
    )

    const activeEpisode = currentEpisode || episodes[0]
    const activeEpNum = activeEpisode?.episode_number
    const canWatch = canWatchEpisode(activeEpNum)
    const hasPurchasedCurrent = activeEpNum ? isPurchased(activeEpNum) : false

    return (
        <div className={styles.pageRoot}>
            <SimilarPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => {
                    const freshUser = useAuthStore.getState().user
                    const freshHasMembership = freshUser?.membership === 'anime' || freshUser?.membership === 'allinone'
                    if (!freshHasMembership) setShowMembershipModal(true)
                }}
            />
            <MembershipRequiredModal isOpen={showMembershipModal} onClose={() => setShowMembershipModal(false)} type="anime" />

            {!immersive && (
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    뒤로
                </button>
            )}

            <div className={styles.playerRow}>
                <div
                    className={styles.playerArea}
                    style={immersive ? {
                        position: 'fixed', top: 0, left: 0,
                        width: '100vw', height: '100vh',
                        zIndex: 100, background: '#000',
                    } : {}}
                >
                    {videoLoading ? (
                        <div className={styles.playerState}>
                            <div className={styles.spinner} /><span>영상 불러오는 중...</span>
                        </div>
                    ) : !user ? (
                        <div className={styles.playerState} style={{ position: 'relative', cursor: 'pointer' }} onClick={handlePlayerAreaClick}>
                            <img src={`https://image.tmdb.org/t/p/w780${detail.backdrop_path}`} className="absolute inset-0 w-full h-full object-cover opacity-25" alt="" />
                            <div className="absolute inset-0 bg-black/65" />
                            <div className="relative flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <p className="text-white font-bold text-lg">로그인 후 시청할 수 있어요</p>
                                <p className="text-white/40 text-sm">클릭해서 로그인하기</p>
                            </div>
                        </div>
                    ) : !canWatch ? (
                        <div className={styles.playerState} style={{ position: 'relative', cursor: 'pointer' }} onClick={handlePlayerAreaClick}>
                            <img src={`https://image.tmdb.org/t/p/w780${detail.backdrop_path}`} className="absolute inset-0 w-full h-full object-cover opacity-25" alt="" />
                            <div className="absolute inset-0 bg-black/65" />
                            <div className="relative flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                                <p className="text-white font-bold text-lg">{hasPurchasedCurrent ? '대여 기간이 만료됐어요' : '이 에피소드를 시청하려면'}</p>
                                <p className="text-white/50 text-sm text-center">{hasPurchasedCurrent ? '다시 구매하거나 멤버십을 시작해보세요' : '멤버십 가입 또는 에피소드를 구매해주세요'}</p>
                                <div className="flex gap-2 mt-1">
                                    <button onClick={e => { e.stopPropagation(); setShowMembershipModal(true) }} className="px-4 py-2 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-80" style={{ background: '#6c63ff' }}>멤버십 시작</button>
                                    <button onClick={e => { e.stopPropagation(); router.push(`/store`) }} className="px-4 py-2 rounded-full text-sm font-bold transition-colors" style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>에피소드 구매</button>
                                </div>
                            </div>
                        </div>
                    ) : videoInfo ? (
                        <VideoPlayer
                            key={activeEpisode?.episode_number || 1}
                            id={numericId}
                            mode="modal"
                            title={detail.name}
                            episodeNumber={activeEpisode?.episode_number || 1}
                            episodeTitle={activeEpisode?.name || ''}
                            immersive={immersive}
                            onImmersiveChange={setImmersive}
                            onNext={() => {
                                const idx = episodes.findIndex(e => e.episode_number === activeEpisode?.episode_number)
                                if (idx !== -1 && episodes[idx + 1]) setCurrentEpisode(episodes[idx + 1])
                            }}
                            onClose={() => router.back()}
                        />
                    ) : (
                        <div className={styles.playerState}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                            </svg>
                            <span>영상 정보가 없어요</span>
                        </div>
                    )}
                </div>

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

            {!immersive && (
                <div className={styles.bottomRow}>
                    <EpisodeInfo episode={activeEpisode} seriesTitle={detail.name} />
                    <EpisodeComments
                        episodeId={activeEpisode?.episode_number ?? episodes[0]?.episode_number}
                        animeId={Number(pageId)}
                        animeTitle={detail.name}
                        animePoster={detail.poster_path}
                        onBookmarkSeek={handleBookmarkSeek}
                    />
                </div>
            )}
        </div>
    )
}
