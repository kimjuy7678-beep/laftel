'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import animeMeta from '@/data/animeMeta.json'
import { Suspense } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'

interface AnimeMeta {
    tmdbId: number
    title: string
    koTitle: string
    emotionCluster: string
    emotions: string[]
    recommendationLabels: string[]
    moods: string[]
    tasteDNA: Record<string, number>
    userTypes: string[]
    communityInsights: {
        commonReactions: string[]
        beginnerTips: string[]
        recommendedEpisodes: string[]
    }
    legendaryScenes: { episode: number; timestamp: string; label: string }[]
}

const meta = (animeMeta as any).animeMeta as AnimeMeta[]

const MOODS = [
    { id: 'emotional_damage', img: '/images/mood/mood1.png', label: '눈물이 멈추지 않아..', sub: '여운이 감게 남는 후유증 레전드 애니', color: '#6366f1', gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)', glow: 'rgba(99,102,241,0.3)', emoji: '😭' },
    { id: 'action_hype', img: '/images/mood/mood2.png', label: '스트레스 풀고 싶어 !!', sub: '화려한 전투씬을 자랑하는 애니', color: '#ef4444', gradient: 'linear-gradient(135deg, #450a0a, #7f1d1d)', glow: 'rgba(239,68,68,0.3)', emoji: '🔥' },
    { id: 'dopamine', img: '/images/mood/mood3.png', label: '어라..? 벌써 새벽 3시?!', sub: '중독성 미쳐서 멈출 수 없는 애니', color: '#f59e0b', gradient: 'linear-gradient(135deg, #451a03, #78350f)', glow: 'rgba(245,158,11,0.3)', emoji: '⚡' },
    { id: 'dark_fantasy', img: '/images/mood/mood4.png', label: '히키코모리가 되어 볼까..?', sub: '어두움의 대명사! 애니', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #2e1065, #4c1d95)', glow: 'rgba(139,92,246,0.3)', emoji: '🌑' },
    { id: 'healing', img: '/images/mood/mood5.png', label: '각박한 세상..힐링이 필요해', sub: '마음이 풍실풍실해지는 애니', color: '#10b981', gradient: 'linear-gradient(135deg, #022c22, #064e3b)', glow: 'rgba(16,185,129,0.3)', emoji: '🌿' },
    { id: 'random', img: '/images/mood/mood6.png', label: "애니 가차 Let's Go!", sub: '오늘의 운세에 맞는 애니 추천', color: '#94a3b8', gradient: 'linear-gradient(135deg, #111827, #1f2937)', glow: 'rgba(107,114,128,0.2)', emoji: '🎲' },
]

const tmdbCache: Record<number, { poster: string | null; backdrop: string | null }> = {}
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

async function fetchTmdbImages(tmdbId: number): Promise<{ poster: string | null; backdrop: string | null }> {
    if (tmdbCache[tmdbId]) return tmdbCache[tmdbId]
    try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=ko-KR`)
        const data = await res.json()
        const result = {
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : null,
        }
        tmdbCache[tmdbId] = result
        return result
    } catch { return { poster: null, backdrop: null } }
}

function getPoster(aniList: any[], tmdbId: number) {
    const found = aniList.find((a: any) => a.id === tmdbId)
    return found?.poster_path ? `https://image.tmdb.org/t/p/w500${found.poster_path}` : null
}

function getBackdrop(aniList: any[], tmdbId: number) {
    const found = aniList.find((a: any) => a.id === tmdbId)
    return found?.backdrop_path ? `https://image.tmdb.org/t/p/w780${found.backdrop_path}` : null
}

// ── 애니 카드 ─────────────────────────────────────────────────────────
function AnimeCard({ anime, aniList, accentColor, delay }: {
    anime: AnimeMeta; aniList: any[]; accentColor: string; delay: number
}) {
    const router = useRouter()
    const [hovered, setHovered] = useState(false)
    const [poster, setPoster] = useState<string | null>(getPoster(aniList, anime.tmdbId))

    useEffect(() => {
        if (!poster) {
            fetchTmdbImages(anime.tmdbId).then(r => { if (r.poster) setPoster(r.poster) })
        }
    }, [anime.tmdbId])

    return (
        <div
            onClick={() => router.push(`/anime/${anime.tmdbId}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: 'pointer', animation: `card-in .4s ease ${delay}ms both` }}
        >
            <div className="mood-card-poster" style={{
                position: 'relative', width: '100%', aspectRatio: '2/3',
                borderRadius: 10, overflow: 'hidden', marginBottom: 10,
                border: `2px solid ${hovered ? accentColor + '60' : 'transparent'}`,
                boxShadow: hovered ? `0 16px 40px rgba(0,0,0,.6)` : '0 4px 16px rgba(0,0,0,.4)',
                transition: 'transform .22s, border-color .2s, box-shadow .2s',
                transform: hovered ? 'translateY(-6px)' : 'none',
            }}>
                {poster
                    ? <img src={poster} alt={anime.koTitle} style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transition: 'transform .35s',
                        transform: hovered ? 'scale(1.05)' : 'scale(1)',
                    }} />
                    : <div style={{ width: '100%', height: '100%', background: '#141420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎌</div>
                }
                {hovered && (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.8) 0%, transparent 50%)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: accentColor, border: 'none', borderRadius: 20, color: 'var(--text-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                            지금 보기
                        </button>
                    </div>
                )}
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, color: hovered ? 'var(--text-primary)' : 'var(--text-high)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.3, transition: 'color .18s' }}>
                {anime.koTitle}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {anime.moods.slice(0, 2).join(' · ')}
            </p>
        </div>
    )
}

// ── 다른 기분 섹션 ────────────────────────────────────────────────────
function OtherMoodsSection({ currentId, onSelect }: { currentId: string; onSelect: (id: string) => void }) {
    const otherMoods = MOODS.filter(m => m.id !== currentId)
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    return (
        <div className="other-moods-wrap" style={{ width: '90%', margin: '0 auto', padding: '44px 0 56px' }}>
            <style>{`
                .other-moods-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 22px 16px;
                }
                .other-mood-thumb { aspect-ratio: 16 / 9; }
                /* Tablet */
                @media (max-width: 1180px) {
                    .other-moods-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px 14px;
                    }
                    .other-moods-wrap { padding: 36px 0 48px !important; }
                    .other-moods-title { font-size: 22px !important; }
                    .other-moods-sub { font-size: 13px !important; }
                }
                /* Mobile */
                @media (max-width: 767px) {
                    .other-moods-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 14px 10px;
                    }
                    .other-moods-wrap { padding: 28px 0 40px !important; }
                    .other-moods-title { font-size: 18px !important; }
                }
            `}</style>
            <div>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '14px 0', marginBottom: 24 }}>
                    <h2 className="other-moods-title" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>다른 감정으로 찾기</h2>
                    <p className="other-moods-sub" style={{ fontSize: 15, color: 'var(--text-subtle)', margin: '8px 0 0' }}>지금 내 기분에 맞는 애니를 골라보세요</p>
                </div>
                <div className="other-moods-grid">
                    {otherMoods.map(m => {
                        const isHovered = hoveredId === m.id
                        return (
                            <button
                                key={m.id}
                                onClick={() => onSelect(m.id)}
                                onMouseEnter={() => setHoveredId(m.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{
                                    padding: 0, background: 'none', border: 'none',
                                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                    transition: 'transform .22s cubic-bezier(.25,.46,.45,.94)',
                                    transform: isHovered ? 'translateY(-6px)' : 'none',
                                }}
                            >
                                <div className="other-mood-thumb" style={{
                                    position: 'relative', width: '100%',
                                    borderRadius: 12, overflow: 'hidden', marginBottom: 12,
                                    border: `2px solid ${isHovered ? m.color + '70' : 'rgba(255,255,255,.07)'}`,
                                    boxShadow: isHovered ? `0 16px 40px rgba(0,0,0,.6), 0 0 0 1px ${m.color}30` : '0 4px 16px rgba(0,0,0,.4)',
                                    transition: 'border-color .2s, box-shadow .2s',
                                }}>
                                    <img src={m.img} alt={m.label} style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        transition: 'transform .35s',
                                        transform: isHovered ? 'scale(1.07)' : 'scale(1)',
                                    }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 60%)' }} />
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '9px 14px' }}>
                                        <p style={{
                                            fontSize: 18, fontWeight: 600, margin: 0,
                                            color: '#fff',
                                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                        }}>{m.label}</p>
                                    </div>
                                    {isHovered && (
                                        <div style={{ position: 'absolute', inset: 0, background: `${m.color}15` }} />
                                    )}
                                </div>
                                <p style={{
                                    fontSize: 13, marginLeft: 15,
                                    color: isHovered ? 'var(--text-muted)' : 'var(--text-subtle)',
                                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                    transition: 'color .18s',
                                }}>{m.sub}</p>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── ResultView ────────────────────────────────────────────────────────
function ResultView({ moodId, aniList, onReset, onMoodChange }: {
    moodId: string
    aniList: any[]
    onReset: () => void
    onMoodChange: (id: string) => void
}) {
    const router = useRouter()
    const mood = MOODS.find(m => m.id === moodId)!
    const [showWishConfirm, setShowWishConfirm] = useState(false)
    const [showWishAdded, setShowWishAdded] = useState(false)
    const [isWishAdding, setIsWishAdding] = useState(false)
    const isRandom = moodId === 'random'

    const { user } = useAuthStore()
    const { addItem, removeItem, hasItem, fetchWatchlist } = useWatchlistStore()

    const [randomAnime] = useState<AnimeMeta | null>(() =>
        isRandom ? meta[Math.floor(Math.random() * meta.length)] : null
    )

    const allForMood = isRandom
        ? (randomAnime
            ? [randomAnime, ...meta.filter(a => a.tmdbId !== randomAnime.tmdbId).slice(0, 8)]
            : [])
        : meta.filter(a => a.emotionCluster === moodId)

    const hero = allForMood[0]
    const subs = allForMood.slice(1)

    const isWished = hero ? hasItem(hero.tmdbId, 'wishlist') : false

    const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null)
    const [heroPoster, setHeroPoster] = useState<string | null>(null)

    useEffect(() => {
        if (user?.uid) {
            fetchWatchlist(user.uid, user?.profileId || 'main')
        }
    }, [user?.uid])

    useEffect(() => {
        if (!hero) return
        setHeroBackdrop(null)
        setHeroPoster(null)

        const quickBackdrop = getBackdrop(aniList, hero.tmdbId)
        const quickPoster = getPoster(aniList, hero.tmdbId)
        if (quickBackdrop) setHeroBackdrop(quickBackdrop)
        if (quickPoster) setHeroPoster(quickPoster)

        if (!quickBackdrop || !quickPoster) {
            fetchTmdbImages(hero.tmdbId).then(r => {
                if (!quickBackdrop && r.backdrop) setHeroBackdrop(r.backdrop)
                if (!quickPoster && r.poster) setHeroPoster(r.poster)
            })
        }
    }, [moodId])

    const handleWishClick = () => {
        if (!user?.uid) {
            toast('로그인이 필요해요')
            return
        }
        setIsWishAdding(!isWished)
        setShowWishConfirm(true)
    }

    const handleWishConfirm = async () => {
        if (!user?.uid || !hero) return
        if (isWishAdding) {
            await addItem(user.uid, user?.profileId || 'main', {
                id: hero.tmdbId,
                title: hero.koTitle,
                poster: heroPoster || '',
                tab: 'wishlist'
            })
            setShowWishConfirm(false)
            setTimeout(() => setShowWishAdded(true), 150)
            return
        }
        await removeItem(user.uid, user?.profileId || 'main', hero.tmdbId, 'wishlist')
        setShowWishConfirm(false)
    }

    return (
        <>
            <style>{`
                @keyframes card-in { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
                @keyframes hero-in { from { opacity:0 } to { opacity:1 } }
                @keyframes slide-up { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
                @keyframes spin { to { transform:rotate(360deg) } }

                /* ── 히어로 내부 레이아웃 ── */
                .mood-hero-content {
                    width: 90%;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    gap: 48px;
                }
                .mood-hero-inner {
                    position: relative;
                    z-index: 1;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    padding-top: 150px;
                }
                .mood-hero-poster {
                    width: 250px;
                    height: 340px;
                    object-fit: cover;
                    border-radius: 14px;
                    flex-shrink: 0;
                    box-shadow: 0 32px 64px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.08);
                    animation: slide-up .45s ease .05s both;
                }
                .mood-hero-text { animation: slide-up .45s ease .1s both; max-width: 580px; }
                .mood-hero-title { font-size: 52px; font-weight: 700; color: #fff; margin: 0 0 8px; line-height: 1.1; letter-spacing: -0.03em; }
                .mood-hero-sub { font-size: 18px; color: rgba(255,255,255,.5); margin: 0 0 20px; letter-spacing: .02em; }
                .mood-play-btn {
                    display: flex; align-items: center; gap: 8px;
                    padding: 15px 35px;
                    background: var(--main); border: none; border-radius: 30;
                    color: #fff; font-size: 18px; font-weight: 600; cursor: pointer;
                    transition: all .18s; font-family: inherit; letter-spacing: -0.01em;
                    border-radius: 30px;
                }
                .mood-icon-btn {
                    width: 59px; height: 59px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 30px; cursor: pointer; transition: all .15s;
                }

                /* 관련 작품 그리드 */
                .mood-subs-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 22px 16px;
                    align-items: start;
                }
                .mood-card-poster { aspect-ratio: 2 / 3; }
                .mood-subs-title { font-size: 28px; }
                .mood-subs-sub { font-size: 15px; }
                .mood-section-wrap { width: 90%; margin: 0 auto; padding-top: 18px; padding-bottom: 10px; }

                @media (max-width: 1180px) {
                    .mood-hero-wrap { min-height: 560px !important; }
                    .mood-hero-inner { padding-top: 118px !important; }
                    .mood-hero-content {
                        gap: 26px;
                        align-items: flex-end;
                    }
                    .mood-hero-poster { width: 170px; height: 238px; }
                    .mood-hero-text { max-width: min(100%, 560px); padding-bottom: 24px; }
                    .mood-hero-title { font-size: 38px !important; }
                    .mood-hero-sub { font-size: 15px !important; margin-bottom: 14px !important; }
                    .mood-tag-row { margin-bottom: 16px !important; }
                    .mood-btn-row { flex-wrap: wrap; gap: 8px !important; padding-top: 8px !important; }
                    .mood-play-btn { padding: 12px 24px !important; font-size: 15px !important; }
                    .mood-icon-btn { width: 48px !important; height: 48px !important; }
                    .mood-subs-grid { grid-template-columns: repeat(5, 1fr); gap: 20px 14px; }
                    .mood-section-wrap { padding-top: 12px; padding-bottom: 8px; }
                }

                /* ── Tablet (768px ~ 1023px) ── */
                @media (max-width: 1023px) {
                    /* 히어로 높이 */
                    .mood-hero-wrap { min-height: 520px !important; }
                    .mood-hero-inner { padding-top: 108px !important; }

                    /* 포스터 + 텍스트 나란히, 크기 줄임 */
                    .mood-hero-content { gap: 24px; }
                    .mood-hero-poster { width: 180px; height: 245px; }
                    .mood-hero-title { font-size: 36px !important; }
                    .mood-hero-sub { font-size: 14px !important; }
                    .mood-play-btn { padding: 12px 26px !important; font-size: 15px !important; }
                    .mood-icon-btn { width: 48px !important; height: 48px !important; }

                    /* 관련 작품 */
                    .mood-subs-grid { grid-template-columns: repeat(4, 1fr); gap: 18px 12px; }
                    .mood-subs-title { font-size: 22px !important; }
                    .mood-subs-sub { font-size: 13px !important; }

                    /* 네비 상단 여백 */
                    .mood-nav-wrap { padding-top: 60px !important; }
                    .mood-label-wrap { top: 110px !important; }
                }

                /* ── Mobile (~ 767px) ── */
                @media (max-width: 767px) {
                    .mood-hero-wrap { min-height: 480px !important; height: auto !important; }

                    /* 포스터 숨기고 텍스트만 */
                    .mood-hero-poster { display: none; }
                    .mood-hero-content {
                        gap: 0;
                        align-items: flex-end;
                    }
                    .mood-hero-inner { padding-top: 104px !important; }
                    .mood-hero-text { max-width: 100%; padding-bottom: 28px; }
                    .mood-hero-title { font-size: 28px !important; }
                    .mood-hero-sub { font-size: 13px !important; margin-bottom: 14px !important; }

                    .mood-tag-row { flex-wrap: wrap; gap: 5px !important; margin-bottom: 20px !important; }
                    .mood-tag-row span { font-size: 10px !important; padding: 3px 8px !important; }

                    .mood-btn-row { gap: 8px !important; padding-top: 16px !important; }
                    .mood-play-btn { padding: 11px 22px !important; font-size: 14px !important; }
                    .mood-icon-btn { width: 44px !important; height: 44px !important; }

                    /* 관련 작품 */
                    .mood-subs-grid { grid-template-columns: repeat(3, 1fr); gap: 14px 10px; }
                    .mood-subs-title { font-size: 18px !important; }
                    .mood-subs-sub { font-size: 12px !important; }
                    .mood-section-wrap { padding-top: 12px; padding-bottom: 4px; }

                    /* 네비 */
                    .mood-nav-wrap { padding-top: 44px !important; }
                    .mood-nav-back { padding: 8px 12px !important; font-size: 12px !important; }
                    .mood-label-wrap { top: 88px !important; }
                    .mood-label-title { font-size: 18px !important; }
                    .mood-label-sub { font-size: 12px !important; }
                }

                /* ── Small Mobile (~ 480px) ── */
                @media (max-width: 480px) {
                    .mood-hero-title { font-size: 24px !important; }
                    .mood-subs-grid { grid-template-columns: repeat(2, 1fr); gap: 14px 8px; }
                    .mood-hero-wrap { min-height: 420px !important; }
                }
            `}</style>

            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80, color: 'var(--text-primary)' }}>

                {/* ── 히어로 ── */}
                {hero && (
                    <div className="mood-hero-wrap" style={{ position: 'relative', width: '100%', height: '50vh', minHeight: 680, overflow: 'hidden', animation: 'hero-in .5s ease' }}>
                        {heroBackdrop
                            ? <img src={heroBackdrop} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
                            : <div style={{ position: 'absolute', inset: 0, background: mood.gradient }} />
                        }
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,10,.98) 0%, rgba(10,10,10,.85) 40%, rgba(10,10,10,.2) 75%, transparent 100%)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,.6) 0%, transparent 20%, transparent 60%, rgba(10,10,10,1) 100%)' }} />

                        {/* 상단 네비 */}
                        <div className="mood-nav-wrap" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 80 }}>
                            <div style={{ width: '90%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <button
                                    className="mood-nav-back"
                                    onClick={onReset}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0)', border: '1px solid rgba(255,255,255,0.498)', borderRadius: 20, color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '10px 16px', fontFamily: 'inherit', transition: 'all .18s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--main)'; e.currentTarget.style.color = '#fff' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                                    홈으로
                                </button>
                            </div>
                        </div>

                        {/* 기분 레이블 */}
                        <div className="mood-label-wrap" style={{ position: 'absolute', top: 150, left: 0, right: 0, zIndex: 10 }}>
                            <div style={{ width: '90%', margin: '0 auto' }}>
                                <h1 className="mood-label-title" style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>{mood.label}</h1>
                                <p className="mood-label-sub" style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', margin: '4px 0 0' }}>{mood.sub}</p>
                            </div>
                        </div>

                        {/* 히어로 콘텐츠 */}
                        <div className="mood-hero-inner">
                            <div className="mood-hero-content">
                                {heroPoster && (
                                    <img src={heroPoster} alt={hero.koTitle} className="mood-hero-poster" />
                                )}

                                <div className="mood-hero-text">
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                                        <span style={{ fontSize: 22 }}>{mood.emoji}</span>
                                        <span style={{ fontSize: 15, fontWeight: 600, color: mood.color, padding: '6px 15px', borderRadius: 20 }}>{mood.label}</span>
                                    </div>

                                    <h1 className="mood-hero-title">{hero.koTitle}</h1>
                                    <p className="mood-hero-sub">{hero.title}</p>

                                    <div className="mood-tag-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28 }}>
                                        {hero.recommendationLabels.slice(0, 3).map((label, i) => (
                                            <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: '4px 11px', borderRadius: 10, color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.1)' }}># {label}</span>
                                        ))}
                                        {hero.moods.slice(0, 3).map((m, i) => (
                                            <span key={`m${i}`} style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 10, color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.1)' }}># {m}</span>
                                        ))}
                                    </div>

                                    {/* 버튼 */}
                                    <div className="mood-btn-row" style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 30 }}>
                                        <button
                                            className="mood-play-btn"
                                            onClick={() => router.push(`/anime/${hero.tmdbId}`)}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#5a52e0'; e.currentTarget.style.transform = 'scale(1.03)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--main)'; e.currentTarget.style.transform = 'scale(1)' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                            재생하기
                                        </button>

                                        {/* 보고싶다 버튼 */}
                                        <button
                                            className="mood-icon-btn"
                                            onClick={handleWishClick}
                                            style={{
                                                background: isWished ? 'rgba(108,99,255,0.35)' : 'rgba(255,255,255,.08)',
                                                border: isWished ? '1px solid rgba(108,99,255,0.6)' : '1px solid rgba(255,255,255,.12)',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isWished ? '#fff' : 'rgba(255,255,255,.8)'} strokeWidth="2.2">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                        </button>

                                        <button
                                            className="mood-icon-btn"
                                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/anime/${hero.tmdbId}`); toast('링크가 복사됐어요!') }}
                                            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.transform = 'scale(1.06)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.transform = 'scale(1)' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 보고싶다 확인 모달 */}
                        {showWishConfirm && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWishConfirm(false)}>
                                <div style={{ width: 'min(90vw, 410px)', background: '#1b1b1c', borderRadius: 22, padding: '34px 32px', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 24px 70px rgba(0,0,0,.42)' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        {isWishAdding ? (
                                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14" /></svg>
                                        ) : (
                                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 6 9 17l-5-5" /></svg>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                                        <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 8px' }}>
                                            {isWishAdding ? '보고싶다에 추가할까요?' : '보고싶다에서 삭제할까요?'}
                                        </p>
                                        <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 14, fontWeight: 600, margin: 0 }}>
                                            {isWishAdding ? '보관함에서 언제든 확인할 수 있어요' : '보관함에서 제거됩니다'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button onClick={() => setShowWishConfirm(false)} style={{ flex: 1, height: 50, borderRadius: 999, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.45)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                                        <button onClick={handleWishConfirm} style={{ flex: 1, height: 50, borderRadius: 999, border: 'none', background: isWishAdding ? '#7d68ff' : '#ef4444', color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>
                                            {isWishAdding ? '추가' : '삭제'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 보고싶다 추가 완료 모달 */}
                        {showWishAdded && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWishAdded(false)}>
                                <div style={{ width: 'min(90vw, 410px)', background: '#1b1b1c', borderRadius: 22, padding: '34px 32px', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 24px 70px rgba(0,0,0,.42)' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'rgba(125,104,255,.15)', color: '#8c7aff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                                    </div>
                                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                                        <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 8px' }}>보고싶다에 추가됐어요!</p>
                                        <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 14, fontWeight: 600, margin: 0 }}>보관함에서 언제든 확인할 수 있어요</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button onClick={() => setShowWishAdded(false)} style={{ flex: 1, height: 50, borderRadius: 999, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.45)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>닫기</button>
                                        <button onClick={() => { setShowWishAdded(false); router.push('/library?tab=wishlist') }} style={{ flex: 1, height: 50, borderRadius: 999, border: 'none', background: '#7d68ff', color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>보관함으로 이동</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 관련 작품 */}
                {subs.length > 0 && (
                    <div className="mood-section-wrap">
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '14px 0', marginBottom: 24 }}>
                            <h2 className="mood-subs-title" style={{ fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                                <span style={{ color: mood.color }}>{mood.emoji}</span> 이런 작품도 있어요
                            </h2>
                            <p className="mood-subs-sub" style={{ color: 'var(--text-subtle)', margin: '8px 0 0' }}>{mood.sub} · {subs.length}편</p>
                        </div>
                        <div className="mood-subs-grid">
                            {subs.map((anime, i) => (
                                <AnimeCard key={anime.tmdbId} anime={anime} aniList={aniList} accentColor={mood.color} delay={i * 40} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 다른 감정 */}
                <OtherMoodsSection currentId={moodId} onSelect={onMoodChange} />

            </div>
        </>
    )
}

// ── MoodPageInner ─────────────────────────────────────────────────────
function MoodPageInner() {
    const { aniList, onFetchAni } = useAniStore()
    const searchParams = useSearchParams()
    const router = useRouter()
    const emotionParam = searchParams.get('emotion')
    const [selectedMood, setSelectedMood] = useState<string | null>(emotionParam)
    const [randomKey, setRandomKey] = useState(0)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    useEffect(() => {
        if (emotionParam) setSelectedMood(emotionParam)
    }, [emotionParam])

    const handleMoodChange = (id: string) => {
        if (id === 'random') setRandomKey(k => k + 1)
        setSelectedMood(id)
        router.push(`/mood?emotion=${id}`, { scroll: false })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleReset = () => {
        setSelectedMood(null)
        router.push('/', { scroll: false })
    }

    useEffect(() => {
        if (!selectedMood) router.push('/')
    }, [selectedMood])

    if (!selectedMood) return null

    return (
        <ResultView
            key={selectedMood === 'random' ? `random-${randomKey}` : selectedMood}
            moodId={selectedMood}
            aniList={aniList}
            onReset={handleReset}
            onMoodChange={handleMoodChange}
        />
    )
}

export default function MoodPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <MoodPageInner />
        </Suspense>
    )
}
