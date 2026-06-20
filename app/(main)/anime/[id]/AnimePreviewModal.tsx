'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePreviewStore } from '@/store/usePreviewStore'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import LoginAlert from '@/components/store/LoginAlert'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { toast } from 'sonner'
import EpisodesTab from './tabs/EpisodesTab'
import SimilarTab from './tabs/SimilarTab'
import ReviewTab from './tabs/ReviewTab'
import StoreTab from './tabs/StoreTab'
import { PurchaseModal } from './modals/PurchaseModals'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

type PreviewSeason = { season_number: number; episode_count: number }
type PreviewDetail = {
    name?: string
    backdrop_path?: string | null
    poster_path?: string | null
    vote_average?: number
    status?: string
    seasons?: PreviewSeason[]
    overview?: string
    genres?: { id: number; name: string }[]
    networks?: { name: string }[]
    first_air_date?: string
    production_companies?: { name: string }[]
}
type PreviewEpisode = {
    episode_number: number
    name?: string
    still_path?: string | null
    runtime?: number
    overview?: string
}
type SimilarItem = {
    id: number
    name?: string
    poster_path?: string | null
    backdrop_path?: string | null
    vote_average?: number
}
type CastItem = { id: number; name: string; character: string; profile_path: string | null }
type CrewItem = { job: string; name: string }
type Keyword = { id: number; name: string }

export default function AnimePreviewModal() {
    const { previewId, setPreviewId } = usePreviewStore()
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useAuthStore()
    const profileId = user?.profileId || 'main'
    const { addItem, hasItem, removeItem } = useWatchlistStore()

    const [detail, setDetail] = useState<PreviewDetail | null>(null)
    const [episodes, setEpisodes] = useState<PreviewEpisode[]>([])
    const [similar, setSimilar] = useState<SimilarItem[]>([])
    const [modalTab, setModalTab] = useState<'episodes' | 'similar' | 'review' | 'store'>('episodes')
    const [selectedSeason, setSelectedSeason] = useState(1)
    const [showMenu, setShowMenu] = useState(false)
    const [showLoginAlert, setShowLoginAlert] = useState(false)
    const [showWishConfirm, setShowWishConfirm] = useState(false)
    const [showWishAdded, setShowWishAdded] = useState(false)
    const [isWishAdding, setIsWishAdding] = useState(false)
    const [showPurchase, setShowPurchase] = useState(false)

    // 작품 정보 모달
    const [showInfoModal, setShowInfoModal] = useState(false)
    const [cast, setCast] = useState<CastItem[]>([])
    const [crew, setCrew] = useState<CrewItem[]>([])
    const [keywords, setKeywords] = useState<Keyword[]>([])

    const prevPathnameRef = useRef(pathname)

    useEffect(() => {
        if (!previewId) {
            queueMicrotask(() => { setDetail(null); setEpisodes([]); setSimilar([]) })
            return
        }
        fetch(`https://api.themoviedb.org/3/tv/${previewId}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then((data: PreviewDetail) => { setDetail(data); setSelectedSeason(1) })
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/similar?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then((data: { results?: SimilarItem[] }) => setSimilar((data.results || []).slice(0, 12)))
        // credits + keywords 미리 fetch
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/credits?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then((data: { cast?: CastItem[]; crew?: CrewItem[] }) => {
                setCast((data.cast || []).slice(0, 8))
                setCrew(data.crew || [])
            })
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/keywords?api_key=${TMDB_KEY}`)
            .then(r => r.json()).then((data: { results?: Keyword[] }) => setKeywords(data.results || []))
    }, [previewId])

    useEffect(() => {
        if (prevPathnameRef.current !== pathname) {
            prevPathnameRef.current = pathname
            setPreviewId(null)
            setShowWishConfirm(false)
            setShowWishAdded(false)
            setShowLoginAlert(false)
            setShowPurchase(false)
            setShowInfoModal(false)
        }
    }, [pathname])

    useEffect(() => {
        if (!previewId) return
        queueMicrotask(() => setEpisodes([]))
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/season/${selectedSeason}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then((s: { episodes?: PreviewEpisode[] }) => setEpisodes(s.episodes || []))
    }, [previewId, selectedSeason])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showInfoModal) setShowInfoModal(false)
                else setPreviewId(null)
            }
        }
        const clickHandler = () => setShowMenu(false)
        window.addEventListener('keydown', handler)
        window.addEventListener('click', clickHandler)
        return () => { window.removeEventListener('keydown', handler); window.removeEventListener('click', clickHandler) }
    }, [showInfoModal])

    if (!previewId) return null

    const backdrop = detail?.backdrop_path ? `${IMG}/w1280${detail.backdrop_path}` : null
    const poster = detail?.poster_path ? `${IMG}/w300${detail.poster_path}` : null
    const score = Math.round((detail?.vote_average || 0) * 10) / 10
    const status = detail?.status === 'Returning Series' ? '방영중' : '완결'
    const overview = detail?.overview || ''
    const director = crew.find(c => c.job === 'Director' || c.job === 'Series Director')
    const firstAirYear = detail?.first_air_date ? detail.first_air_date.slice(0, 4) : ''

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4 lg:p-6" onClick={() => setPreviewId(null)}>
            <div className="relative flex h-[96dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-2xl sm:h-[92vh] sm:rounded-2xl md:max-w-[820px] lg:max-w-[1080px] xl:max-w-[1200px]" onClick={e => e.stopPropagation()}>

                {/* 상단 backdrop */}
                <div className="relative h-[300px] shrink-0 overflow-hidden sm:h-[340px] md:h-[380px] lg:h-[420px] xl:h-[450px]">
                    {backdrop
                        ? <img src={backdrop} className="w-full h-full object-cover" alt={detail?.name} />
                        : <div className="w-full h-full bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-card)]" />
                    }
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)' }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, transparent 70%)' }} />

                    {/* 우측 상단 버튼들 */}
                    <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4">
                        <div className="relative">
                            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/60 transition-all hover:bg-black/80 hover:text-white sm:h-9 sm:w-9">
                                <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                                    <circle cx="2" cy="2" r="2" /><circle cx="2" cy="8" r="2" /><circle cx="2" cy="14" r="2" />
                                </svg>
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-10 z-10 w-[150px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl sm:top-11 sm:w-[160px]" onClick={e => e.stopPropagation()}>
                                    <button className="w-full px-4 py-3.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
                                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/anime/${previewId}`); toast('링크가 복사됐어요!'); setShowMenu(false) }}>공유하기</button>
                                    <button className="w-full px-4 py-3.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border-faint)]"
                                        onClick={async () => { if (!user?.uid) return; try { await setDoc(doc(db, 'users', user.uid), { watchHistory: [] }, { merge: true }); setShowMenu(false) } catch { } }}>시청기록 초기화</button>
                                    <button className="w-full px-4 py-3.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border-faint)]"
                                        onClick={() => setShowMenu(false)}>관심 없음</button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setPreviewId(null)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/60 transition-all hover:bg-black/80 hover:text-white sm:h-9 sm:w-9">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {poster && (
                        <div className="absolute bottom-8 right-6 hidden aspect-[2/3] w-[130px] overflow-hidden rounded-lg border border-[var(--border)] shadow-xl md:block lg:bottom-10 lg:right-8 lg:w-[170px] xl:right-10 xl:w-[200px]">
                            <img src={poster} className="w-full h-full object-cover" alt={detail?.name} />
                        </div>
                    )}

                    {/* 하단 텍스트 영역 */}
                    <div className="absolute bottom-5 left-4 right-4 sm:bottom-7 sm:left-6 sm:right-6 md:right-[180px] lg:bottom-9 lg:left-8 lg:right-[220px] xl:bottom-10 xl:left-10 xl:right-[250px]">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {score > 0 && <span className="text-xs font-semibold text-amber-400 sm:text-sm">★ {score}</span>}
                            {status && <span className={`text-[11px] font-semibold px-2 py-0.5 text-white rounded border ${status === '방영중' ? 'bg-green-500 border-green-500/25' : 'bg-white/10 text-white/60 border-white/15'}`}>{status}</span>}
                        </div>
                        <h2 className="mb-3 line-clamp-2 text-xl font-bold leading-tight text-white sm:text-2xl lg:text-[28px]">{detail?.name}</h2>

                        {/* 버튼들 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button className="flex h-10 items-center gap-2 rounded-full border border-white px-4 text-xs text-white transition-all hover:border-[var(--main)] hover:bg-[var(--main)] sm:h-11 sm:px-5 sm:text-sm"
                                onClick={() => { router.push(`/anime/${previewId}?ep=1`); setPreviewId(null) }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                1화 재생하기
                            </button>
                            <button onClick={() => { if (!user) { setShowLoginAlert(true); return }; setIsWishAdding(!hasItem(previewId, 'wishlist')); setShowWishConfirm(true) }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all sm:h-11 sm:w-11 lg:h-12 lg:w-12 ${hasItem(previewId, 'wishlist') ? 'bg-[var(--main)] border-[var(--main)] text-white' : 'border-white/30 text-white/60 hover:text-white hover:border-white'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
                            </button>
                            <button onClick={() => setShowPurchase(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white/60 transition-all hover:border-white hover:text-white sm:h-11 sm:w-11 lg:h-12 lg:w-12">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                            </button>
                        </div>

                        {/* 줄거리 + 더보기 */}
                        {overview && (
                            <div className="mt-1">
                                <p className="text-white/70 text-xs leading-relaxed line-clamp-2 sm:text-sm">
                                    {overview}
                                </p>
                                <button
                                    className="mt-1 text-white/50 hover:text-white text-xs sm:text-sm transition-colors font-medium"
                                    onClick={e => { e.stopPropagation(); setShowInfoModal(true) }}
                                >
                                    ...더보기
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex shrink-0 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 [scrollbar-width:none] sm:px-4 md:px-6 [&::-webkit-scrollbar]:hidden">
                    {(['episodes', 'similar', 'review', 'store'] as const).map(tab => (
                        <button key={tab} onClick={() => setModalTab(tab)}
                            className={`relative shrink-0 cursor-pointer border-none bg-transparent px-3 py-3 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${modalTab === tab ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]'}`}>
                            {tab === 'episodes' ? '에피소드' : tab === 'similar' ? '비슷한 작품' : tab === 'review' ? '사용자 평' : '스토어'}
                            {modalTab === tab && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6c63ff] rounded-sm" />}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="flex-1 overflow-y-auto bg-[var(--bg-card)] px-3 py-3 sm:px-5 sm:py-4 md:px-6">
                    {modalTab === 'episodes' && <EpisodesTab detail={detail} episodes={episodes} selectedSeason={selectedSeason} setSelectedSeason={setSelectedSeason} />}
                    {modalTab === 'similar' && <SimilarTab similar={similar} />}
                    {modalTab === 'review' && detail && (
                        <ReviewTab previewId={previewId} user={user} animeTitle={detail.name} animePoster={detail.poster_path} />
                    )}
                    {modalTab === 'store' && <StoreTab detail={detail} />}
                </div>
            </div>

            {/* ── 작품 정보 모달 ── */}
            {showInfoModal && detail && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setShowInfoModal(false)}
                >
                    <div
                        className="relative w-full max-w-[540px] max-h-[88dvh] overflow-y-auto rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-faint)] sticky top-0 bg-[var(--bg-card)] z-10">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">작품 정보</h3>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="px-6 py-5 flex flex-col gap-6">

                            {/* 줄거리 */}
                            {overview && (
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-faint)] uppercase tracking-widest mb-2">줄거리</p>
                                    <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">{overview}</p>
                                </div>
                            )}

                            {/* 태그 (keywords) */}
                            {keywords.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-faint)] uppercase tracking-widest mb-2">태그</p>
                                    <div className="flex flex-wrap gap-2">
                                        {keywords.slice(0, 10).map(kw => (
                                            <span key={kw.id} className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-faint)]">
                                                #{kw.name}
                                            </span>
                                        ))}
                                        {detail.genres?.map(g => (
                                            <span key={g.id} className="px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(108,99,255,0.12)] text-[#9d97ff] border border-[rgba(108,99,255,0.2)]">
                                                #{g.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 성우 정보 */}
                            {cast.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-faint)] uppercase tracking-widest mb-3">성우 정보</p>
                                    <div className="flex flex-col gap-2">
                                        {cast.slice(0, 6).map(c => (
                                            <div key={c.id} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-hover)] shrink-0">
                                                    {c.profile_path
                                                        ? <img src={`${IMG}/w92${c.profile_path}`} alt={c.name} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-[var(--text-faint)] text-xs font-bold">{c.name[0]}</div>
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{c.character} 역</p>
                                                    <p className="text-xs text-[var(--text-faint)] truncate">{c.name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 제작 정보 */}
                            <div>
                                <p className="text-xs font-bold text-[var(--text-faint)] uppercase tracking-widest mb-3">제작 정보</p>
                                <div className="flex flex-col gap-2">
                                    {director && (
                                        <div className="flex gap-3 text-sm">
                                            <span className="text-[var(--text-faint)] w-14 shrink-0">감독</span>
                                            <span className="text-[var(--text-muted)]">{director.name}</span>
                                        </div>
                                    )}
                                    {detail.production_companies && detail.production_companies.length > 0 && (
                                        <div className="flex gap-3 text-sm">
                                            <span className="text-[var(--text-faint)] w-14 shrink-0">제작</span>
                                            <span className="text-[var(--text-muted)]">{detail.production_companies.map(c => c.name).join(', ')}</span>
                                        </div>
                                    )}
                                    {firstAirYear && (
                                        <div className="flex gap-3 text-sm">
                                            <span className="text-[var(--text-faint)] w-14 shrink-0">출시</span>
                                            <span className="text-[var(--text-muted)]">{firstAirYear}년</span>
                                        </div>
                                    )}
                                    {detail.networks && detail.networks.length > 0 && (
                                        <div className="flex gap-3 text-sm">
                                            <span className="text-[var(--text-faint)] w-14 shrink-0">방송국</span>
                                            <span className="text-[var(--text-muted)]">{detail.networks.map(n => n.name).join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {showLoginAlert && <LoginAlert onClose={() => setShowLoginAlert(false)} />}
            {showPurchase && <PurchaseModal episodes={episodes} detail={detail} onClose={() => setShowPurchase(false)} />}

            {showWishConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWishConfirm(false)}>
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 flex flex-col items-center gap-4 border border-[var(--border)] w-[320px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
                        </div>
                        <div className="text-center">
                            <p className="text-[var(--text-primary)] font-bold text-base mb-1">{isWishAdding ? '보고싶다에 추가할까요?' : '보고싶다에서 삭제할까요?'}</p>
                            <p className="text-[var(--text-subtle)] text-xs">{isWishAdding ? '보관함에서 언제든 확인할 수 있어요' : '보관함에서 제거됩니다'}</p>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishConfirm(false)} className="flex-1 py-2.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors">취소</button>
                            <button
                                onClick={async () => {
                                    if (!isWishAdding) {
                                        await removeItem(user!.uid!, profileId, previewId, 'wishlist')
                                        setShowWishConfirm(false)
                                    } else {
                                        await addItem(user!.uid!, profileId, { id: previewId, title: detail?.name || '', poster: detail?.poster_path || '', tab: 'wishlist' })
                                        setShowWishConfirm(false)
                                        setTimeout(() => setShowWishAdded(true), 150)
                                    }
                                }}
                                className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${isWishAdding ? 'bg-[var(--main)] text-white hover:opacity-90' : 'bg-red-500/90 text-white hover:bg-red-500'}`}
                            >
                                {isWishAdding ? '추가' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWishAdded && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWishAdded(false)}>
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 flex flex-col items-center gap-4 border border-[var(--border)] w-[320px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-[var(--main)]/15 flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                        </div>
                        <div className="text-center">
                            <p className="text-[var(--text-primary)] font-bold text-base mb-1">보고싶다에 추가됐어요!</p>
                            <p className="text-[var(--text-subtle)] text-xs">보관함에서 언제든 확인할 수 있어요</p>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishAdded(false)} className="flex-1 py-2.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors">닫기</button>
                            <button onClick={() => { router.push('/library?tab=wishlist'); setShowWishAdded(false); setPreviewId(null) }} className="flex-1 py-2.5 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">보관함으로 이동</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
