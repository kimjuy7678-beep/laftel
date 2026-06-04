'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePreviewStore } from '@/store/usePreviewStore'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore, WatchlistTab } from '@/store/useWatchlistStore'
import LoginAlert from '../store/LoginAlert'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

export default function AnimePreviewModal() {
    const { previewId, setPreviewId } = usePreviewStore()
    const router = useRouter()
    const [detail, setDetail] = useState<any>(null)
    const [episodes, setEpisodes] = useState<any[]>([])
    const [similar, setSimilar] = useState<any[]>([])
    const [modalTab, setModalTab] = useState<'episodes' | 'similar' | 'review' | 'store'>('episodes')
    const [selectedSeason, setSelectedSeason] = useState(1)
    const pathname = usePathname()
    const { user } = useAuthStore()
    const { addItem, hasItem, removeItem } = useWatchlistStore()
    const [showLoginAlert, setShowLoginAlert] = useState(false)
    const [showWishConfirm, setShowWishConfirm] = useState(false)
    const [showWishAdded, setShowWishAdded] = useState(false)
    const [isWishAdding, setIsWishAdding] = useState(false)
    const [showPurchase, setShowPurchase] = useState(false)
    const [showRentPeriod, setShowRentPeriod] = useState(false)
    const [showPayment, setShowPayment] = useState(false)
    const [showPayComplete, setShowPayComplete] = useState(false)
    const [purchaseType, setPurchaseType] = useState<'rent' | 'own' | null>(null)
    const [rentDays, setRentDays] = useState<number>(7)
    const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())
    const [password, setPassword] = useState('')
    const [paying, setPaying] = useState(false)
    const [payMethod, setPayMethod] = useState<'laftel' | 'card' | 'kakao' | 'naver' | 'phone'>('laftel')
    const [paidTotal, setPaidTotal] = useState(0)

    const [cards, setCards] = useState<{ id: string, brand: string, last4: string, expiry: string }[]>([])
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [showAddCard, setShowAddCard] = useState(false)
    const [cardNumber, setCardNumber] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardError, setCardError] = useState('')
    const [cardLoading, setCardLoading] = useState(false)

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
        if (user?.uid) {
        }
    }, [previewId])

    useEffect(() => {
        setPreviewId(null)
        setShowWishConfirm(false)
        setShowWishAdded(false)
        setShowLoginAlert(false)
        setShowPurchase(false)
        setShowRentPeriod(false)
        setShowPayment(false)
        setShowPayComplete(false)
        setPassword('')
        setSelectedEpisodes(new Set())
    }, [pathname])

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

    useEffect(() => {
        if (showPayment) loadCards()
    }, [showPayment])

    const RENT_OPTIONS = [
        { days: 2, price: 500 },
        { days: 7, price: 700 },
        { days: 14, price: 900 },
        { days: 30, price: 1000 },
    ]
    const pricePerEp = purchaseType === 'rent'
        ? (RENT_OPTIONS.find(o => o.days === rentDays)?.price ?? 700)
        : 1500
    const totalPrice = selectedEpisodes.size * pricePerEp

    const loadCards = async () => {
        if (!user?.uid) return
        try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            const data = snap.data()
            if (data?.cards) {
                setCards(data.cards)
                const def = data.cards.find((c: any) => c.isDefault)
                if (def) setSelectedCardId(def.id)
            }
        } catch { }
    }

    const detectBrand = (num: string) => {
        const n = num.replace(/\s/g, '')
        if (/^4/.test(n)) return 'VISA'
        if (/^5[1-5]/.test(n)) return 'Mastercard'
        return '카드'
    }

    const formatCardNumber = (val: string) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    const formatExpiry = (val: string) => {
        const nums = val.replace(/\D/g, '').slice(0, 4)
        return nums.length >= 3 ? nums.slice(0, 2) + '/' + nums.slice(2) : nums
    }

    const handleAddCard = async () => {
        setCardError('')
        const rawNum = cardNumber.replace(/\s/g, '')
        if (rawNum.length < 15) { setCardError('카드번호를 올바르게 입력해주세요.'); return }
        if (cardExpiry.length < 5) { setCardError('유효기간을 올바르게 입력해주세요.'); return }
        if (cardCvc.length < 3) { setCardError('CVC를 올바르게 입력해주세요.'); return }
        if (!cardName.trim()) { setCardError('카드 소유자 이름을 입력해주세요.'); return }
        if (!user?.uid) return
        setCardLoading(true)
        try {
            const newCard = {
                id: `card_${Date.now()}`,
                brand: detectBrand(rawNum),
                last4: rawNum.slice(-4),
                expiry: cardExpiry,
                isDefault: cards.length === 0,
            }
            const newCards = [...cards, newCard]
            await setDoc(doc(db, 'users', user.uid), { cards: newCards }, { merge: true })
            setCards(newCards)
            setSelectedCardId(newCard.id)
            setShowAddCard(false)
            setCardNumber(''); setCardExpiry(''); setCardCvc(''); setCardName('')
        } catch { setCardError('카드 등록에 실패했어요.') }
        finally { setCardLoading(false) }
    }

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
                className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden w-full max-w-[1200px] h-[90vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >

                <div className="relative h-[450px] shrink-0 overflow-hidden">
                    {backdrop
                        ? <img src={backdrop} className="w-full h-full object-cover" alt={detail?.name} />
                        : <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />
                    }
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a1a1a 0%, transparent 60%)' }} /><div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #1a1a1a 0%, transparent 70%)' }} />

                    <button
                        onClick={() => setPreviewId(null)}
                        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>

                    {poster && (
                        <div className="absolute bottom-10 right-10 w-[200px] aspect-[2/3] rounded-lg overflow-hidden shadow-xl border border-white/10">
                            <img src={poster} className="w-full h-full object-cover" alt={detail?.name} />
                        </div>
                    )}

                    <div className="absolute bottom-10 left-10 right-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                            {score > 0 && <span className="text-sm text-amber-400 font-semibold">★ {score}</span>}
                            {status && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5  text-white rounded border ${status === '방영중' ? 'bg-green-500 text-white-400 border-green-500/25' : 'bg-white/10 text-white/50 border-white/15'}`}>
                                    {status}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">{detail?.name}</h2>
                        <div className="flex gap-2">
                            <button
                                className="flex items-center gap-2 px-5 py-3 text-white rounded-full text-sm font-regular border-[1px] border-white hover:bg-[var(--main)] hover:border-[var(--main)] hover:font-bold transition-all "
                                onClick={() => { router.push(`/anime/${previewId}?play=1`); setPreviewId(null) }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                1화 재생하기
                            </button>
                            <button
                                onClick={() => {
                                    if (!user) { setShowLoginAlert(true); return }
                                    setIsWishAdding(!hasItem(previewId, 'wishlist'))
                                    setShowWishConfirm(true)
                                }}
                                className={`w-12 h-12 flex items-center justify-center rounded-full border transition-all ${hasItem(previewId, 'wishlist')
                                    ? 'bg-[var(--main)] border-[var(--main)] text-white'
                                    : 'border-white/30 text-white/70 hover:text-white hover:border-white'
                                    }`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </button>
                            <button
                                onClick={() => { setSelectedEpisodes(new Set()); setShowPurchase(true) }}
                                className="w-12 h-12 flex items-center justify-center rounded-full border border-white/30 text-white/70 hover:text-white hover:border-white transition-all"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-white/[0.08] px-6 shrink-0">
                    {(['episodes', 'similar', 'review', 'store'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setModalTab(tab)}
                            className={`relative px-4 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer transition-colors ${modalTab === tab ? 'text-white' : 'text-white/35'}`}
                        >
                            {tab === 'episodes' ? '에피소드'
                                : tab === 'similar' ? '비슷한 작품'
                                    : tab === 'review' ? '사용자 평'
                                        : '스토어'}
                            {modalTab === tab && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6c63ff] rounded-sm" />}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {modalTab === 'episodes' && (
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

                    {modalTab === 'similar' && (
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

                    {modalTab === 'review' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <p className="text-white/25 text-sm">사용자 평 준비 중이에요</p>
                        </div>
                    )}

                    {modalTab === 'store' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <p className="text-white/25 text-sm">스토어 준비 중이에요</p>
                        </div>
                    )}
                </div>
            </div>
            {showLoginAlert && <LoginAlert onClose={() => setShowLoginAlert(false)} />}

            {showWishConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowWishConfirm(false)}>
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center gap-4 border border-white/10 w-[320px]" onClick={e => e.stopPropagation()}>
                        <p className="text-white font-bold text-base">
                            {isWishAdding ? '보고싶다 보관함에 추가할까요?' : '보고싶다에서 삭제할까요?'}
                        </p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishConfirm(false)}
                                className="flex-1 py-2 rounded-full border border-white/20 text-white/50 text-sm hover:text-white transition-colors">
                                취소
                            </button>
                            <button onClick={async () => {
                                if (!isWishAdding) {
                                    await removeItem(user!.uid!, previewId, 'wishlist')
                                    setShowWishConfirm(false)
                                } else {
                                    await addItem(user!.uid!, {
                                        id: previewId,
                                        title: detail?.name || '',
                                        poster: detail?.poster_path || '',
                                        tab: 'wishlist'
                                    })
                                    setShowWishConfirm(false)
                                    setTimeout(() => setShowWishAdded(true), 150)
                                }
                            }}
                                className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">
                                {isWishAdding ? '추가' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showWishAdded && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowWishAdded(false)}>
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center gap-4 border border-white/10 w-[320px]" onClick={e => e.stopPropagation()}>
                        <p className="text-white font-bold text-base">보고싶다에 추가됐어요!</p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setShowWishAdded(false)}
                                className="flex-1 py-2 rounded-full border border-white/20 text-white/50 text-sm hover:text-white transition-colors">
                                닫기
                            </button>
                            <button onClick={() => { router.push('/library?tab=wishlist'); setShowWishAdded(false); setPreviewId(null) }}
                                className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">
                                보관함으로 이동
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPurchase && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowPurchase(false)}>
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden w-[480px] max-h-[80vh] flex flex-col border border-white/10" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                            <h2 className="text-white font-bold text-lg">에피소드 구매</h2>
                            <button onClick={() => setShowPurchase(false)} className="text-white/50 hover:text-white transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div
                                    onClick={() => {
                                        if (selectedEpisodes.size === episodes.length) {
                                            setSelectedEpisodes(new Set())
                                        } else {
                                            setSelectedEpisodes(new Set(episodes.map(ep => ep.episode_number)))
                                        }
                                    }}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${selectedEpisodes.size === episodes.length
                                        ? 'bg-[var(--main)] border-[var(--main)]'
                                        : 'border-white/30'
                                        }`}
                                >
                                    {selectedEpisodes.size === episodes.length && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-white/70 text-sm">전체선택 ({selectedEpisodes.size})</span>
                            </label>
                            <div className="flex gap-3 text-sm">
                                <span className="text-[var(--main)] cursor-pointer font-semibold">첫화부터</span>
                                <span className="text-white/40 cursor-pointer">최신화부터</span>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {episodes.map(ep => (
                                <div
                                    key={ep.episode_number}
                                    className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedEpisodes(prev => {
                                            const next = new Set(prev)
                                            next.has(ep.episode_number) ? next.delete(ep.episode_number) : next.add(ep.episode_number)
                                            return next
                                        })
                                    }}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedEpisodes.has(ep.episode_number)
                                        ? 'bg-[var(--main)] border-[var(--main)]'
                                        : 'border-white/30'
                                        }`}>
                                        {selectedEpisodes.has(ep.episode_number) && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                <polyline points="20,6 9,17 4,12" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="w-[100px] min-w-[100px] aspect-video rounded-lg overflow-hidden bg-[#111]">
                                        {ep.still_path
                                            ? <img src={`${IMG}/w300${ep.still_path}`} className="w-full h-full object-cover" alt={ep.name} />
                                            : <div className="w-full h-full flex items-center justify-center text-white/10 font-black">{ep.episode_number}</div>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{ep.episode_number}화 {ep.name}</p>
                                        <p className="text-white/40 text-xs mt-0.5">대여 700원 · 소장 1,500원</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex border-t border-white/10">
                            <button
                                onClick={() => { setPurchaseType('rent'); setShowPurchase(false); setShowRentPeriod(true) }}
                                disabled={selectedEpisodes.size === 0}
                                className="flex-1 py-4 text-white/70 font-bold text-base hover:bg-white/[0.05] transition-colors disabled:opacity-30"
                            >
                                대여
                            </button>
                            <button
                                onClick={() => { setPurchaseType('own'); setShowPurchase(false); setShowPayment(true) }}
                                disabled={selectedEpisodes.size === 0}
                                className="flex-1 py-4 bg-[var(--main)] text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-30"
                            >
                                소장
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {
                showRentPeriod && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowRentPeriod(false)}>
                        <div className="bg-[#1a1a1a] rounded-2xl w-[360px] border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                                <h2 className="text-white font-bold text-lg">대여 기간 선택</h2>
                                <button onClick={() => setShowRentPeriod(false)} className="text-white/50 hover:text-white">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex flex-col gap-2 p-4">
                                {RENT_OPTIONS.map(opt => (
                                    <div
                                        key={opt.days}
                                        onClick={() => setRentDays(opt.days)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${rentDays === opt.days ? 'border-[var(--main)] bg-[var(--main)]/10' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <span className="text-white font-semibold">{opt.days}일 대여</span>
                                        <span className="text-white/50 text-sm">편당 {opt.price.toLocaleString()}원</span>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pb-4 flex flex-col gap-2">
                                <div className="flex justify-between text-sm px-1">
                                    <span className="text-white/50">총 결제금액</span>
                                    <span className="text-[var(--main)] font-bold">{(selectedEpisodes.size * (RENT_OPTIONS.find(o => o.days === rentDays)?.price ?? 700)).toLocaleString()}원</span>
                                </div>
                                <button
                                    onClick={() => { setShowRentPeriod(false); setShowPayment(true) }}
                                    className="w-full py-3 bg-[var(--main)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showPayment && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => { if (!paying) setShowPayment(false) }}>
                        <div className="bg-[#1a1a1a] rounded-2xl w-[380px] border border-white/10 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                                <h2 className="text-white font-bold text-lg">라프텔 페이</h2>
                                {!paying && (
                                    <button onClick={() => setShowPayment(false)} className="text-white/50 hover:text-white">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                            <div className="px-6 py-5 flex flex-col gap-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">구매 유형</span>
                                    <span className="text-white font-semibold">
                                        {purchaseType === 'rent' ? `${rentDays}일 대여` : '소장'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">선택 에피소드</span>
                                    <span className="text-white font-semibold">{selectedEpisodes.size}화</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                                    <span className="text-white font-bold">총 결제금액</span>
                                    <span className="text-[var(--main)] font-bold text-base">{totalPrice.toLocaleString()}원</span>
                                </div>

                                {payMethod === 'laftel' && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-white/50 text-xs">등록된 결제수단</p>
                                        {cards.length === 0 ? (
                                            <p className="text-white/30 text-sm">등록된 카드가 없어요</p>
                                        ) : cards.map(card => (
                                            <div
                                                key={card.id}
                                                onClick={() => setSelectedCardId(card.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedCardId === card.id ? 'border-[var(--main)] bg-[var(--main)]/10' : 'border-white/10 hover:border-white/30'}`}
                                            >
                                                <div className="w-10 h-7 rounded bg-[var(--main)]/20 border border-[var(--main)]/30 flex items-center justify-center">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="2">
                                                        <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                                    </svg>
                                                </div>
                                                <span className="text-white text-sm font-semibold">{card.brand} **** {card.last4}</span>
                                            </div>
                                        ))}
                                        {!showAddCard && (
                                            <button
                                                onClick={() => setShowAddCard(true)}
                                                className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white/60 transition-all text-sm"
                                            >
                                                <span className="text-lg">+</span> 카드 추가
                                            </button>
                                        )}
                                        {showAddCard && (
                                            <div className="rounded-xl p-4 border border-white/10 bg-white/[0.03] flex flex-col gap-4">
                                                <p className="text-white text-sm font-bold">카드 등록</p>
                                                <div>
                                                    <p className="text-xs text-white/40 mb-1">카드번호</p>
                                                    <input
                                                        className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-sm py-2 text-white placeholder-white/25"
                                                        value={cardNumber}
                                                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                                        placeholder="0000 0000 0000 0000"
                                                        maxLength={19}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-white/40 mb-1">유효기간</p>
                                                        <input
                                                            className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-sm py-2 text-white placeholder-white/25"
                                                            value={cardExpiry}
                                                            onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                                                            placeholder="MM/YY"
                                                            maxLength={5}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-white/40 mb-1">CVC</p>
                                                        <input
                                                            className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-sm py-2 text-white placeholder-white/25"
                                                            value={cardCvc}
                                                            onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                            placeholder="000"
                                                            maxLength={4}
                                                            type="password"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white/40 mb-1">카드 소유자 이름</p>
                                                    <input
                                                        className="w-full bg-transparent border-b border-white/20 focus:border-white/60 outline-none text-sm py-2 text-white placeholder-white/25"
                                                        value={cardName}
                                                        onChange={e => setCardName(e.target.value)}
                                                        placeholder="홍길동"
                                                    />
                                                </div>
                                                {cardError && <p className="text-xs text-red-400">{cardError}</p>}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setShowAddCard(false); setCardError('') }}
                                                        className="flex-1 py-2 rounded-xl border border-white/20 text-white/50 text-sm hover:text-white transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleAddCard}
                                                        disabled={cardLoading}
                                                        className="flex-1 py-2 rounded-xl bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                                                    >
                                                        {cardLoading ? '등록 중...' : '등록'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {payMethod === 'laftel' && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-white/50 text-sm">결제 비밀번호 6자리</p>
                                        <div className="flex gap-2 justify-center">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${password.length > i ? 'border-[var(--main)] bg-[var(--main)]/10' : 'border-white/20'}`}>
                                                    {password.length > i && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, i) => (
                                                <button
                                                    key={i}
                                                    disabled={paying}
                                                    onClick={() => {
                                                        if (key === '⌫') setPassword(prev => prev.slice(0, -1))
                                                        else if (key !== '' && password.length < 6) setPassword(prev => prev + key)
                                                    }}
                                                    className={`py-3 rounded-xl text-white font-semibold text-lg transition-all ${key === '' ? '' : 'hover:bg-white/10 active:bg-white/20'} disabled:opacity-50`}
                                                >
                                                    {key}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 pb-6">
                                <button
                                    disabled={(payMethod === 'laftel' && (password.length < 6 || !selectedCardId)) || paying}
                                    onClick={async () => {
                                        setPaying(true)
                                        setPaidTotal(totalPrice)
                                        await new Promise(res => setTimeout(res, 3000))
                                        if (user?.uid) {
                                            for (const epNum of selectedEpisodes) {
                                                await addItem(user.uid, {
                                                    id: previewId,
                                                    title: detail?.name || '',
                                                    poster: detail?.poster_path || '',
                                                    tab: 'purchased'
                                                })
                                            }
                                        }
                                        setPaying(false)
                                        setShowPayment(false)
                                        setPassword('')
                                        setSelectedEpisodes(new Set())
                                        setTimeout(() => setShowPayComplete(true), 150)
                                    }}
                                    className="w-full py-4 bg-[var(--main)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    {paying ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            결제 중...
                                        </>
                                    ) : '결제하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showPayComplete && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowPayComplete(false)}>
                        <div className="bg-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center gap-4 border border-white/10 w-[320px]" onClick={e => e.stopPropagation()}>
                            <div className="w-14 h-14 rounded-full bg-[var(--main)]/20 flex items-center justify-center">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--main)" strokeWidth="2.5"><polyline points="20,6 9,17 4,12" /></svg>
                            </div>
                            <p className="text-white font-bold text-base">결제가 완료됐어요!</p>
                            <p className="text-white/40 text-sm">{paidTotal.toLocaleString()}원 결제됨</p>
                            <div className="flex gap-2 w-full">
                                <button onClick={() => setShowPayComplete(false)}
                                    className="flex-1 py-2 rounded-full border border-white/20 text-white/50 text-sm hover:text-white transition-colors">
                                    닫기
                                </button>
                                <button onClick={() => { router.push('/library?tab=purchased'); setShowPayComplete(false); setPreviewId(null) }}
                                    className="flex-1 py-2 rounded-full bg-[var(--main)] text-white text-sm font-bold hover:opacity-90 transition-opacity">
                                    구매한 작품 보기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}