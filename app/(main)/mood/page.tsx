'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import animeMeta from '@/data/animeMeta.json'
import { Suspense } from 'react'
import { toast } from 'sonner'

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
            <div style={{
                position: 'relative', width: '100%', aspectRatio: '3/4',
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
            <p style={{ fontSize: 13, fontWeight: 700, color: hovered ? '#fff' : 'rgba(255,255,255,.8)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.3, transition: 'color .18s' }}>
                {anime.koTitle}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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
        <div style={{ width: '90%', margin: '0 auto', padding: '80px 0' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '18px 0', marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>다른 감정으로 찾기</h2>
                <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: '8px 0 0' }}>지금 내 기분에 맞는 애니를 골라보세요</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '28px 16px' }}>
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
                            <div style={{
                                position: 'relative', width: '100%', aspectRatio: '16/9',
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
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
                                    <p style={{
                                        fontSize: 13, fontWeight: 800, margin: 0,
                                        color: 'var(--text-primary)',
                                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                    }}>{m.label}</p>
                                </div>
                                {isHovered && (
                                    <div style={{ position: 'absolute', inset: 0, background: `${m.color}15` }} />
                                )}
                            </div>
                            <p style={{
                                fontSize: 11, margin: 0,
                                color: isHovered ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.3)',
                                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                transition: 'color .18s',
                            }}>{m.sub}</p>
                        </button>
                    )
                })}
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
    const isRandom = moodId === 'random'

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

    const [heroBackdrop, setHeroBackdrop] = useState<string | null>(null)
    const [heroPoster, setHeroPoster] = useState<string | null>(null)

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

    return (
        <>
            <style>{`
                @keyframes card-in { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
                @keyframes hero-in { from { opacity:0 } to { opacity:1 } }
                @keyframes slide-up { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
                @keyframes spin { to { transform:rotate(360deg) } }
            `}</style>

            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80, color: 'var(--text-primary)' }}>

                {/* ── 헤더 ── */}
                <div className="rv-inner" style={{ padding: '80px 0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={onReset}
                                style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', fontSize: 16, cursor: 'pointer', padding: '4px 6px', lineHeight: 1, borderRadius: 6, transition: 'color .15s', fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.8)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.4)')}
                            >← 돌아가기</button>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{mood.label}</h1>
                                <p style={{ fontSize: 14, color: 'var(--text-subtle)', margin: '4px 0 0' }}>{mood.sub}</p>
                            </div>
                        </div>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, color: 'rgba(255,255,255,.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}
                            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,.1)'); (e.currentTarget.style.color = '#fff') }}
                            onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,.06)'); (e.currentTarget.style.color = 'rgba(255,255,255,.55)') }}
                            onClick={() => { navigator.clipboard.writeText(window.location.href); toast('링크가 복사되었어요!') }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                            공유하기
                        </button>
                    </div>
                </div>

                {/* ── 히어로 ── */}
                {hero && (
                    <div style={{ position: 'relative', width: '100%', height: '100vh', minHeight: 680, overflow: 'hidden', animation: 'hero-in .5s ease' }}>
                        {heroBackdrop
                            ? <img src={heroBackdrop} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
                            : <div style={{ position: 'absolute', inset: 0, background: mood.gradient }} />
                        }
                        {/* 그라디언트 오버레이 */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,10,.98) 0%, rgba(10,10,10,.85) 40%, rgba(10,10,10,.2) 75%, transparent 100%)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,.6) 0%, transparent 20%, transparent 60%, rgba(10,10,10,1) 100%)' }} />

                        {/* 상단 네비 */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 80 }}>
                            <div style={{ width: '90%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <button
                                    onClick={onReset}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 16px', fontFamily: 'inherit', transition: 'all .18s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.color = '#fff' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                                    홈으로
                                </button>
                                <button
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 16px', fontFamily: 'inherit', transition: 'all .18s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.color = '#fff' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)' }}
                                    onClick={() => { navigator.clipboard.writeText(window.location.href); alert('링크가 복사되었어요!') }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                    공유하기
                                </button>
                            </div>
                        </div>

                        {/* 히어로 콘텐츠 */}
                        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '90%', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 48 }}>
                                {/* 포스터 */}
                                {heroPoster && (
                                    <img src={heroPoster} alt={hero.koTitle}
                                        style={{ width: 180, height: 270, objectFit: 'cover', borderRadius: 14, flexShrink: 0, boxShadow: `0 32px 64px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.08)`, animation: 'slide-up .45s ease .05s both' }} />
                                )}

                                {/* 텍스트 */}
                                <div style={{ animation: 'slide-up .45s ease .1s both', maxWidth: 580 }}>
                                    {/* 무드 뱃지 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <span style={{ fontSize: 22 }}>{mood.emoji}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: mood.color, background: `${mood.color}20`, border: `1px solid ${mood.color}40`, padding: '4px 12px', borderRadius: 20 }}>{mood.label}</span>
                                    </div>

                                    {/* 타이틀 */}
                                    <h1 style={{ fontSize: 52, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{hero.koTitle}</h1>
                                    <p style={{ fontSize: 14, color: 'var(--text-subtle)', margin: '0 0 20px', letterSpacing: '.02em' }}>{hero.title}</p>

                                    {/* 태그 */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28 }}>
                                        {hero.recommendationLabels.slice(0, 3).map((label, i) => (
                                            <span key={i} style={{
                                                fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
                                                background: i === 0 ? mood.color : 'rgba(255,255,255,.08)',
                                                color: i === 0 ? '#fff' : 'rgba(255,255,255,.6)',
                                                border: i === 0 ? 'none' : '1px solid rgba(255,255,255,.1)',
                                            }}>{label}</span>
                                        ))}
                                        {hero.moods.slice(0, 3).map((m, i) => (
                                            <span key={`m${i}`} style={{ fontSize: 11, color: 'var(--text-subtle)', background: 'rgba(255,255,255,.05)', padding: '4px 11px', borderRadius: 20, border: '1px solid rgba(255,255,255,.08)' }}>{m}</span>
                                        ))}
                                    </div>

                                    {/* 버튼 */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <button onClick={() => router.push(`/anime/${hero.tmdbId}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 32px', background: '#6c63ff', border: 'none', borderRadius: 10, color: 'var(--text-primary)', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all .18s', fontFamily: 'inherit', letterSpacing: '-0.01em' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#5a52e0'; e.currentTarget.style.transform = 'scale(1.03)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#6c63ff'; e.currentTarget.style.transform = 'scale(1)' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                            재생하기
                                        </button>
                                        <button
                                            style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, cursor: 'pointer', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.transform = 'scale(1.06)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.transform = 'scale(1)' }}>
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                        </button>
                                        <button
                                            style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, cursor: 'pointer', transition: 'all .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.transform = 'scale(1.06)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.transform = 'scale(1)' }}>
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 관련 작품 ── */}
                {subs.length > 0 && (
                    <div style={{ width: '90%', margin: '0 auto', paddingTop: 80, paddingBottom: 20 }}>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '18px 0', marginBottom: 32 }}>
                            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                                <span style={{ color: mood.color }}>{mood.emoji}</span> 이런 작품도 있어요
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: '8px 0 0' }}>{mood.sub} · {subs.length}편</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '32px 16px' }}>
                            {subs.map((anime, i) => (
                                <AnimeCard key={anime.tmdbId} anime={anime} aniList={aniList} accentColor={mood.color} delay={i * 40} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 다른 감정 ── */}
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
