'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import animeMeta from '@/data/animeMeta.json'
import { Suspense } from 'react'

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
    { id: 'emotional_damage', img: '/images/mood/mood1.png', label: '눈물이 멈추지 않아..', sub: '여운이 감게 남는 후유증 레전드 애니', color: '#6366f1', gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)', glow: 'rgba(99,102,241,0.3)' },
    { id: 'action_hype', img: '/images/mood/mood2.png', label: '스트레스 풀고 싶어 !!', sub: '화려한 전투씬을 자랑하는 애니', color: '#ef4444', gradient: 'linear-gradient(135deg, #450a0a, #7f1d1d)', glow: 'rgba(239,68,68,0.3)' },
    { id: 'dopamine', img: '/images/mood/mood3.png', label: '어라..? 벌써 새벽 3시?!', sub: '중독성 미쳐서 멈출 수 없는 애니', color: '#f59e0b', gradient: 'linear-gradient(135deg, #451a03, #78350f)', glow: 'rgba(245,158,11,0.3)' },
    { id: 'dark_fantasy', img: '/images/mood/mood4.png', label: '히키코모리가 되어 볼까..?', sub: '어두움의 대명사! 애니', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #2e1065, #4c1d95)', glow: 'rgba(139,92,246,0.3)' },
    { id: 'healing', img: '/images/mood/mood5.png', label: '각박한 세상..힐링이 필요해', sub: '마음이 풍실풍실해지는 애니', color: '#10b981', gradient: 'linear-gradient(135deg, #022c22, #064e3b)', glow: 'rgba(16,185,129,0.3)' },
    { id: 'random', img: '/images/mood/mood6.png', label: "애니 가차 Let's Go!", sub: '오늘의 운세에 맞는 애니 추천', color: '#94a3b8', gradient: 'linear-gradient(135deg, #111827, #1f2937)', glow: 'rgba(107,114,128,0.2)' },
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

    const genreTags = anime.moods.slice(0, 2)

    return (
        <div
            onClick={() => router.push(`/anime/${anime.tmdbId}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                cursor: 'pointer',
                animation: `card-in .4s ease ${delay}ms both`,
            }}
        >
            {/* 이미지 — 배경/border 없이 그냥 꽉 차게 */}
            <div style={{
                position: 'relative', width: '100%', aspectRatio: '3/4',
                borderRadius: 10, overflow: 'hidden',
                marginBottom: 10,
                transition: 'transform .22s cubic-bezier(.25,.46,.45,.94)',
                transform: hovered ? 'translateY(-4px)' : 'none',
            }}>
                {poster
                    ? <img src={poster} alt={anime.koTitle} style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transition: 'transform .35s',
                        transform: hovered ? 'scale(1.04)' : 'scale(1)',
                    }} />
                    : <div style={{ width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎌</div>
                }
            </div>

            {/* 텍스트 */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e8e8e8', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {anime.koTitle}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                TV · {genreTags.join(' · ')}
            </p>
        </div>
    )
}

// ── 다른 무드 카드 ────────────────────────────────────────────────────
function OtherMoodCard({ mood, onSelect }: { mood: typeof MOODS[0]; onSelect: () => void }) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onSelect}
            style={{
                width: 200,
                flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                cursor: 'pointer', border: 'none', padding: 0,
                background: 'none', fontFamily: 'inherit',
                transition: 'transform .22s cubic-bezier(.25,.46,.45,.94)',
                transform: hovered ? 'translateY(-5px)' : 'none',
            }}
        >
            {/* 이미지 */}
            <div style={{
                width: '100%', aspectRatio: '16/9',
                borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${hovered ? mood.color + '90' : 'rgba(255,255,255,.07)'}`,
                position: 'relative',
                transition: 'border-color .2s',
                marginBottom: 12,
                boxShadow: hovered ? `0 12px 32px rgba(0,0,0,.5)` : 'none',
            }}>
                <img src={mood.img} alt={mood.label} style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transition: 'transform .35s',
                    transform: hovered ? 'scale(1.07)' : 'scale(1)',
                }} />
                <div style={{
                    position: 'absolute', inset: 0,
                    background: hovered
                        ? 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 60%)'
                        : 'linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 55%)',
                    transition: 'background .3s',
                }} />
                {hovered && (
                    <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: mood.color, padding: '3px 12px', borderRadius: 20 }}>보러가기</span>
                    </div>
                )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: hovered ? '#fff' : 'rgba(255,255,255,.7)', margin: '0 0 4px', textAlign: 'center', lineHeight: 1.3, transition: 'color .18s' }}>{mood.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>{mood.sub}</p>
        </button>
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
    const isRandom = moodId === 'random'

    const allForMood = isRandom
        ? [...meta].sort(() => Math.random() - 0.5).slice(0, 9)
        : meta.filter(a => a.emotionCluster === moodId)

    const hero = allForMood[0]
    const subs = allForMood.slice(1)

    const [heroBackdrop, setHeroBackdrop] = useState<string | null>(getBackdrop(aniList, hero?.tmdbId))
    const [heroPoster, setHeroPoster] = useState<string | null>(getPoster(aniList, hero?.tmdbId))

    const otherMoods = MOODS.filter(m => m.id !== moodId)

    useEffect(() => {
        if (hero && (!heroBackdrop || !heroPoster)) {
            fetchTmdbImages(hero.tmdbId).then(r => {
                if (r.backdrop) setHeroBackdrop(r.backdrop)
                if (r.poster) setHeroPoster(r.poster)
            })
        }
    }, [hero?.tmdbId])

    return (
        <>
            <style>{`
                @keyframes card-in { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
                @keyframes hero-in { from { opacity:0 } to { opacity:1 } }
                @keyframes slide-up { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
                .rv-inner { width: 90%; margin: 0 auto; }
            `}</style>

            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 80, color: '#fff' }}>

                {/* ── 1. 무드 헤더 ── */}
                <div className="rv-inner" style={{ padding: '80px 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={onReset}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1, borderRadius: 6, transition: 'color .15s', fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.8)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.4)')}
                            >←</button>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>{mood.label}</h1>
                                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', margin: '4px 0 0' }}>{mood.sub}</p>
                            </div>
                        </div>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, color: 'rgba(255,255,255,.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}
                            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,.1)'); (e.currentTarget.style.color = '#fff') }}
                            onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,.06)'); (e.currentTarget.style.color = 'rgba(255,255,255,.55)') }}
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                alert('링크가 복사되었어요!')
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                            공유하기
                        </button>
                    </div>
                </div>

                {/* ── 2. 히어로 ── */}
                {hero && (
                    <div style={{ position: 'relative', width: '100%', height: 900, overflow: 'hidden', animation: 'hero-in .5s ease' }}>
                        {heroBackdrop
                            ? <img src={heroBackdrop} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
                            : <div style={{ position: 'absolute', inset: 0, background: mood.gradient }} />
                        }
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,10,1) 0%, rgba(10,10,10,.85) 35%, rgba(10,10,10,.3) 65%, rgba(10,10,10,.0) 100%)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,.5) 0%, transparent 25%, transparent 65%, rgba(10,10,10,1) 100%)' }} />

                        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
                            <div className="rv-inner" style={{ display: 'flex', alignItems: 'center', gap: 40 }}>

                                {heroPoster && (
                                    <img src={heroPoster} alt={hero.koTitle}
                                        style={{ width: 160, height: 240, objectFit: 'cover', borderRadius: 12, flexShrink: 0, boxShadow: '0 24px 48px rgba(0,0,0,.7)', animation: 'slide-up .45s ease .05s both' }} />
                                )}

                                <div style={{ animation: 'slide-up .45s ease .1s both' }}>
                                    {/* 레이블 태그 */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                                        {hero.recommendationLabels.map((label, i) => (
                                            <span key={i} style={{
                                                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                                                background: i === 0 ? mood.color : 'rgba(255,255,255,.1)',
                                                color: i === 0 ? '#000' : 'rgba(255,255,255,.7)',
                                            }}>{label}</span>
                                        ))}
                                    </div>
                                    {/* 제목 */}
                                    <h2 style={{ fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.15, letterSpacing: '-.02em' }}>{hero.koTitle}</h2>
                                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', margin: '0 0 16px' }}>{hero.title}</p>
                                    {/* 평점 + 장르 태그 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                            <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                                                {(Object.values(hero.tasteDNA).reduce((a: number, b) => a + (b as number), 0) / Object.values(hero.tasteDNA).length / 10).toFixed(1)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                            {hero.moods.slice(0, 4).map((m, i) => (
                                                <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'rgba(255,255,255,.07)', padding: '3px 8px', borderRadius: 4 }}>{m}</span>
                                            ))}
                                        </div>
                                    </div>
                                    {/* 버튼 */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <button onClick={() => router.push(`/anime/${hero.tmdbId}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#6c63ff', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background .18s', fontFamily: 'inherit' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#5a52e0')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#6c63ff')}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                            재생하기
                                        </button>
                                        <button
                                            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.14)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                        </button>
                                        <button
                                            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.14)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* ── 4. 관련 작품 그리드 ── */}
                <div className="rv-inner" style={{ paddingTop: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,.65)', margin: 0 }}>
                            {mood.label} 관련 작품 {subs.length} 작품
                        </h2>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '32px 20px' }}>
                        {subs.map((anime, i) => (
                            <AnimeCard key={anime.tmdbId} anime={anime} aniList={aniList} accentColor={mood.color} delay={i * 50} />
                        ))}
                    </div>
                </div>

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

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    useEffect(() => {
        if (emotionParam) setSelectedMood(emotionParam)
    }, [emotionParam])

    const handleMoodChange = (id: string) => {
        setSelectedMood(id)
        router.push(`/mood?emotion=${id}`, { scroll: false })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleReset = () => {
        setSelectedMood(null)
        router.push('/', { scroll: false })
    }

    if (!selectedMood) {
        router.replace('/')
        return null
    }

    return (
        <ResultView
            moodId={selectedMood}
            aniList={aniList}
            onReset={handleReset}
            onMoodChange={handleMoodChange}
        />
    )
}

// ── export ────────────────────────────────────────────────────────────
export default function MoodPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <MoodPageInner />
        </Suspense>
    )
}