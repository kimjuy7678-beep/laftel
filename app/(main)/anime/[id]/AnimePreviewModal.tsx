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

export default function AnimePreviewModal() {
    const { previewId, setPreviewId } = usePreviewStore()
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useAuthStore()
    const { addItem, hasItem, removeItem } = useWatchlistStore()

    const [detail, setDetail] = useState<any>(null)
    const [episodes, setEpisodes] = useState<any[]>([])
    const [similar, setSimilar] = useState<any[]>([])
    const [modalTab, setModalTab] = useState<'episodes' | 'similar' | 'review' | 'store'>('episodes')
    const [selectedSeason, setSelectedSeason] = useState(1)
    const [showMenu, setShowMenu] = useState(false)
    const [showLoginAlert, setShowLoginAlert] = useState(false)
    const [showWishConfirm, setShowWishConfirm] = useState(false)
    const [showWishAdded, setShowWishAdded] = useState(false)
    const [isWishAdding, setIsWishAdding] = useState(false)
    const [showPurchase, setShowPurchase] = useState(false)

    const prevPathnameRef = useRef(pathname)

    useEffect(() => {
        if (!previewId) { setDetail(null); setEpisodes([]); setSimilar([]); return }
        fetch(`https://api.themoviedb.org/3/tv/${previewId}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then(data => { setDetail(data); setSelectedSeason(1) })
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/similar?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then(data => setSimilar((data.results || []).slice(0, 12)))
    }, [previewId])

    useEffect(() => {
        if (prevPathnameRef.current !== pathname) {
            prevPathnameRef.current = pathname
            setPreviewId(null)
            setShowWishConfirm(false)
            setShowWishAdded(false)
            setShowLoginAlert(false)
            setShowPurchase(false)
        }
    }, [pathname])

    useEffect(() => {
        if (!previewId) return
        setEpisodes([])
        fetch(`https://api.themoviedb.org/3/tv/${previewId}/season/${selectedSeason}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json()).then(s => setEpisodes(s.episodes || []))
    }, [previewId, selectedSeason])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewId(null) }
        const clickHandler = () => setShowMenu(false)
        window.addEventListener('keydown', handler)
        window.addEventListener('click', clickHandler)
        return () => { window.removeEventListener('keydown', handler); window.removeEventListener('click', clickHandler) }
    }, [])

    if (!previewId) return null

    const backdrop = detail?.backdrop_path ? `${IMG}/w1280${detail.backdrop_path}` : null
    const poster = detail?.poster_path ? `${IMG}/w300${detail.poster_path}` : null
    const score = Math.round((detail?.vote_average || 0) * 10) / 10
    const status = detail?.status === 'Returning Series' ? '방영중' : '완결'

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPreviewId(null)}>
            <div className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden w-full max-w-[1200px] h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

                {/* 상단 backdrop */}
                <div className="relative h-[450px] shrink-0 overflow-hidden">
                    {backdrop ? <img src={backdrop} className="w-full h-full object-cover" alt={detail?.name} /> : <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a1a1a 0%, transparent 60%)' }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #1a1a1a 0%, transparent 70%)' }} />

                    {/* 우측 상단 버튼들 */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <div className="relative">
                            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all">
                                <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                                    <circle cx="2" cy="2" r="2" /><circle cx="2" cy="8" r="2" /><circle cx="2" cy="14" r="2" />
                                </svg>
                            </button>
                            {showMenu && (
                                <div className="absolute top-11 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl w-[160px] z-10" onClick={e => e.stopPropagation()}>
                                    <button className="w-full px-4 py-3.5 text-left text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
                                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/anime/${previewId}`); toast('링크가 복사됐어요!'); setShowMenu(false) }}>공유하기</button>
                                    <button className="w-full px-4 py-3.5 text-left text-sm text-white/80 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                                        onClick={async () => { if (!user?.uid) return; try { await setDoc(doc(db, 'users', user.uid), { watchHistory: [] }, { merge: true }); setShowMenu(false) } catch { } }}>시청기록 초기화</button>
                                    <button className="w-full px-4 py-3.5 text-left text-sm text-white/80 hover:bg-white/[0.06] transition-colors border-t border-white/[0.06]"
                                        onClick={() => setShowMenu(false)}>관심 없음</button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setPreviewId(null)}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {poster && (
                        <div className="absolute bottom-10 right-10 w-[200px] aspect-[2/3] rounded-lg overflow-hidden shadow-xl border border-white/10">
                            <img src={poster} className="w-full h-full object-cover" alt={detail?.name} />
                        </div>
                    )}

                    <div className="absolute bottom-10 left-10 right-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                            {score > 0 && <span className="text-sm text-amber-400 font-semibold">★ {score}</span>}
                            {status && <span className={`text-[11px] font-semibold px-2 py-0.5 text-white rounded border ${status === '방영중' ? 'bg-green-500 border-green-500/25' : 'bg-white/10 text-white/50 border-white/15'}`}>{status}</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">{detail?.name}</h2>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-5 py-3 text-white rounded-full text-sm border border-white hover:bg-[var(--main)] hover:border-[var(--main)] transition-all"
                                onClick={() => { router.push(`/anime/${previewId}?ep=1`); setPreviewId(null) }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                1화 재생하기
                            </button>
                            <button onClick={() => { if (!user) { setShowLoginAlert(true); return }; setIsWishAdding(!hasItem(previewId, 'wishlist')); setShowWishConfirm(true) }}
                                className={`w-12 h-12 flex items-center justify-center rounded-full border transition-all ${hasItem(previewId, 'wishlist') ? 'bg-[var(--main)] border-[var(--main)] text-white' : 'border-white/30 text-white/70 hover:text-white hover:border-white'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
                            </button>
                            <button onClick={() => setShowPurchase(true)}
                                className="w-12 h-12 flex items-center justify-center rounded-full border border-white/30 text-white/70 hover:text-white hover:border-white transition-all">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-white/[0.08] px-6 shrink-0">
                    {(['episodes', 'similar', 'review', 'store'] as const).map(tab => (
                        <button key={tab} onClick={() => setModalTab(tab)}
                            className={`relative px-4 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer transition-colors ${modalTab === tab ? 'text-white' : 'text-white/35'}`}>
                            {tab === 'episodes' ? '에피소드' : tab === 'similar' ? '비슷한 작품' : tab === 'review' ? '사용자 평' : '스토어'}
                            {modalTab === tab && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6c63ff] rounded-sm" />}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {modalTab === 'episodes' && <EpisodesTab detail={detail} episodes={episodes} selectedSeason={selectedSeason} setSelectedSeason={setSelectedSeason} />}
                    {modalTab === 'similar' && <SimilarTab similar={similar} />}
                    {modalTab === 'review' && <ReviewTab />}
                    {modalTab === 'store' && <StoreTab detail={detail} />}
                </div>
            </div>

            {showLoginAlert && <LoginAlert onClose={() => setShowLoginAlert(false)} />}

            {showPurchase && <PurchaseModal episodes={episodes} detail={detail} onClose={() => setShowPurchase(false)} />}

            {showWishConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowWishConfirm(false)}>
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center gap-4 border border-white/10 w-[320px]" onClick={e => e.stopPropagation()}>
                        <p className="text-white font-bold text-base">{isWishAdding ? '보고싶다 보관함에 추가할까요?' : '보고싶다에서 삭제할까요?'}</p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishConfirm(false)} className="flex-1 py-2 rounded-full border border-white/20 text-white/50 text-sm hover:text-white transition-colors">취소</button>
                            <button onClick={async () => {
                                if (!isWishAdding) { await removeItem(user!.uid!, previewId, 'wishlist'); setShowWishConfirm(false) }
                                else { await addItem(user!.uid!, { id: previewId, title: detail?.name || '', poster: detail?.poster_path || '', tab: 'wishlist' }); setShowWishConfirm(false); setTimeout(() => setShowWishAdded(true), 150) }
                            }} className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">{isWishAdding ? '추가' : '삭제'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showWishAdded && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowWishAdded(false)}>
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center gap-4 border border-white/10 w-[320px]" onClick={e => e.stopPropagation()}>
                        <p className="text-white font-bold text-base">보고싶다에 추가됐어요!</p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishAdded(false)} className="flex-1 py-2 rounded-full border border-white/20 text-white/50 text-sm hover:text-white transition-colors">닫기</button>
                            <button onClick={() => { router.push('/library?tab=wishlist'); setShowWishAdded(false); setPreviewId(null) }}
                                className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">보관함으로 이동</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}