'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import animeMeta from '@/data/animeMeta.json'

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

// ── 감정 선택지 ───────────────────────────────────────────────
const MOODS = [
    {
        id: 'emotional_damage',
        emoji: '😭',
        label: '울고 싶어',
        sub: '후유증 심한 거 줘',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        glow: 'rgba(99,102,241,0.3)',
    },
    {
        id: 'action_hype',
        emoji: '🔥',
        label: '소리 지르고 싶어',
        sub: '폭발하는 전투씬',
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
        glow: 'rgba(239,68,68,0.3)',
    },
    {
        id: 'dopamine',
        emoji: '⚡',
        label: '계속 보고 싶어',
        sub: '멈출 수 없는 중독성',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #451a03, #78350f)',
        glow: 'rgba(245,158,11,0.3)',
    },
    {
        id: 'dark_fantasy',
        emoji: '🌑',
        label: '어두운 거 보고 싶어',
        sub: '두뇌게임/디스토피아',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #2e1065, #4c1d95)',
        glow: 'rgba(139,92,246,0.3)',
    },
    {
        id: 'healing',
        emoji: '🌿',
        label: '힐링이 필요해',
        sub: '지쳤을 때 보는 애니',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #022c22, #064e3b)',
        glow: 'rgba(16,185,129,0.3)',
    },
    {
        id: 'random',
        emoji: '🎲',
        label: '아무거나 줘',
        sub: '오늘의 운세',
        color: '#6b7280',
        gradient: 'linear-gradient(135deg, #111827, #1f2937)',
        glow: 'rgba(107,114,128,0.2)',
    },
]

// ── 추천 카드 라벨 스타일 ─────────────────────────────────────
const CARD_LABEL_ICONS: Record<string, string> = {
    '입문자 추천': '🌱', '후유증': '💀', '밤새': '🌙', 'GOAT': '🏆',
    '명작': '⭐', '레전드': '👑', '눈물': '😭', '소름': '🔥',
    '중독': '⚡', '힐링': '🌿', '반전': '🎭', '작화': '🎨',
}

function getCardIcon(label: string) {
    for (const [key, icon] of Object.entries(CARD_LABEL_ICONS)) {
        if (label.includes(key)) return icon
    }
    return '✨'
}

// TMDB 이미지 캐시
const tmdbCache: Record<number, { poster: string | null; backdrop: string | null }> = {}

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

async function fetchTmdbImages(tmdbId: number, _koTitle?: string): Promise<{ poster: string | null; backdrop: string | null }> {
    if (tmdbCache[tmdbId]) return tmdbCache[tmdbId]
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=ko-KR`
        )
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
    if (found?.poster_path) return `https://image.tmdb.org/t/p/w500${found.poster_path}`
    return null
}

function getBackdrop(aniList: any[], tmdbId: number) {
    const found = aniList.find((a: any) => a.id === tmdbId)
    if (found?.backdrop_path) return `https://image.tmdb.org/t/p/w780${found.backdrop_path}`
    return null
}

// ── 추천 카드 ─────────────────────────────────────────────────
function AnimeCard({ anime, aniList, accentColor, delay }: {
    anime: AnimeMeta; aniList: any[]; accentColor: string; delay: number
}) {
    const router = useRouter()
    const [hovered, setHovered] = useState(false)
    const [poster, setPoster] = useState<string | null>(getPoster(aniList, anime.tmdbId))

    useEffect(() => {
        if (!poster) {
            fetchTmdbImages(anime.tmdbId, anime.koTitle).then(r => { if (r.poster) setPoster(r.poster) })
        }
    }, [anime.tmdbId])
    const label = anime.recommendationLabels[0]

    return (
        <>
            <style>{`
                @keyframes card-in {
                    from { opacity: 0; transform: translateY(20px) }
                    to   { opacity: 1; transform: translateY(0) }
                }
            `}</style>
            <div
                onClick={() => router.push(`/anime/${anime.tmdbId}`)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    cursor: 'pointer',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#111',
                    border: `1px solid ${hovered ? accentColor + '60' : 'rgba(255,255,255,0.07)'}`,
                    transition: 'all .25s',
                    transform: hovered ? 'translateY(-6px)' : 'none',
                    boxShadow: hovered ? `0 20px 48px ${accentColor}30` : '0 4px 16px rgba(0,0,0,0.4)',
                    animation: `card-in .4s ease ${delay}ms both`,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* 포스터 */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: '#1a1a2e', overflow: 'hidden' }}>
                    {poster
                        ? <img src={poster} alt={anime.koTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s', transform: hovered ? 'scale(1.05)' : 'none' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'linear-gradient(135deg,#1a1535,#0f0f2a)' }}>🎌</div>
                    }
                    {/* 추천 라벨 배지 */}
                    <div style={{
                        position: 'absolute', top: 10, left: 10,
                        background: accentColor, color: '#000',
                        fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        {getCardIcon(label)} {label.length > 14 ? label.slice(0, 14) + '…' : label}
                    </div>
                    {/* 그라디언트 오버레이 */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', pointerEvents: 'none' }} />
                    {/* 감정 태그 */}
                    <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {anime.emotions.slice(0, 3).map(e => (
                            <span key={e} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>{e}</span>
                        ))}
                    </div>
                </div>

                {/* 정보 */}
                <div style={{ padding: '12px 14px 14px', flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{anime.koTitle}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: '0 0 10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{anime.title}</p>
                    {/* 커뮤니티 반응 */}
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
                        "{anime.communityInsights.commonReactions[0]}"
                    </p>
                    {/* DNA 바 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {Object.entries(anime.tasteDNA).slice(0, 2).map(([key, val]) => {
                            const labels: Record<string, string> = {
                                storyImmersion: '스토리 몰입',
                                emotionalDamage: '감정 폭발',
                                visualImpact: '작화 임팩트',
                                rewatchability: '정주행 중독',
                                dopamine: '도파민',
                            }
                            return (
                                <div key={key}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{labels[key] || key}</span>
                                        <span style={{ fontSize: 10, color: accentColor, fontWeight: 700 }}>{val}</span>
                                    </div>
                                    <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
                                        <div style={{ height: '100%', width: `${val}%`, background: accentColor, borderRadius: 2, transition: 'width .6s ease' }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}

// ── 결과 페이지 ───────────────────────────────────────────────
function ResultView({ moodId, aniList, onReset }: { moodId: string; aniList: any[]; onReset: () => void }) {
    const router = useRouter()
    const mood = MOODS.find(m => m.id === moodId)!
    const isRandom = moodId === 'random'

    const recommended = isRandom
        ? [...meta].sort(() => Math.random() - 0.5).slice(0, 8)
        : meta.filter(a => a.emotionCluster === moodId)

    // HERO: 추천 1순위
    const hero = recommended[0]
    const [heroBackdrop, setHeroBackdrop] = useState<string | null>(getBackdrop(aniList, hero?.tmdbId))
    const [heroPoster, setHeroPoster] = useState<string | null>(getPoster(aniList, hero?.tmdbId))

    useEffect(() => {
        if (hero && (!heroBackdrop || !heroPoster)) {
            fetchTmdbImages(hero.tmdbId, hero.koTitle).then(r => {
                if (r.backdrop) setHeroBackdrop(r.backdrop)
                if (r.poster) setHeroPoster(r.poster)
            })
        }
    }, [hero?.tmdbId])

    // 서브 추천
    const subs = recommended.slice(1)

    // 태그별 추가 추천 (현재 감정 클러스터가 아닌 작품 중 관련 태그)
    const related = isRandom ? [] : meta
        .filter(a => a.emotionCluster !== moodId && a.moods.some(m => hero?.moods.includes(m)))
        .slice(0, 4)

    return (
        <>
            <style>{`
                @keyframes hero-in { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slide-up { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
                @keyframes pulse-ring { 0% { transform: scale(1); opacity: .6 } 100% { transform: scale(1.4); opacity: 0 } }
            `}</style>

            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: 80 }}>

                {/* 히어로 */}
                {hero && (
                    <div style={{ position: 'relative', width: '100%', height: 520, overflow: 'hidden', animation: 'hero-in .6s ease' }}>
                        {/* 배경 */}
                        {heroBackdrop
                            ? <img src={heroBackdrop} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) saturate(1.2)', transform: 'scale(1.05)' }} />
                            : <div style={{ position: 'absolute', inset: 0, background: mood.gradient }} />
                        }
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, rgba(10,10,10,0.95) 35%, rgba(10,10,10,0.5) 70%, rgba(10,10,10,0.2) 100%), linear-gradient(to top, rgba(10,10,10,1) 0%, transparent 50%)` }} />

                        {/* 콘텐츠 */}
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', height: '100%', padding: '0 64px 48px', gap: 32 }}>
                            {/* 포스터 */}
                            {heroPoster && (
                                <img src={heroPoster} alt={hero.koTitle} style={{ width: 140, height: 210, objectFit: 'cover', borderRadius: 12, boxShadow: `0 20px 48px rgba(0,0,0,0.7), 0 0 0 2px ${mood.color}60`, flexShrink: 0, animation: 'slide-up .5s ease .1s both' }} />
                            )}

                            <div style={{ flex: 1, minWidth: 0, animation: 'slide-up .5s ease .2s both' }}>
                                {/* 감정 배지 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <span style={{ fontSize: 24 }}>{mood.emoji}</span>
                                    <div style={{ padding: '4px 14px', borderRadius: 20, background: mood.color + '30', border: `1px solid ${mood.color}60`, fontSize: 12, fontWeight: 700, color: mood.color }}>
                                        {mood.label} 추천 1순위
                                    </div>
                                </div>

                                <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 6px', lineHeight: 1.15 }}>{hero.koTitle}</h1>
                                <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', margin: '0 0 16px' }}>{hero.title}</p>

                                {/* 추천 라벨들 */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                    {hero.recommendationLabels.map((label, i) => (
                                        <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: i === 0 ? mood.color : 'rgba(255,255,255,0.08)', color: i === 0 ? '#000' : 'rgba(255,255,255,0.7)', border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                                            {getCardIcon(label)} {label}
                                        </span>
                                    ))}
                                </div>

                                {/* 커뮤니티 반응 */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                    {hero.communityInsights.commonReactions.slice(0, 3).map((r, i) => (
                                        <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.06)', padding: '4px 10px', borderRadius: 8, fontStyle: 'italic' }}>
                                            "{r}"
                                        </span>
                                    ))}
                                </div>

                                {/* 버튼 */}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => router.push(`/anime/${hero.tmdbId}`)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: mood.color, border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'transform .15s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = ''}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                        바로 보기
                                    </button>
                                    <button onClick={onReset}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                                        다시 선택
                                    </button>
                                </div>
                            </div>

                            {/* 명장면 미리보기 */}
                            {hero.legendaryScenes.length > 0 && (
                                <div style={{ flexShrink: 0, width: 200, animation: 'slide-up .5s ease .3s both' }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>명장면</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {hero.legendaryScenes.map((s, i) => (
                                            <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,.06)', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)' }}>
                                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: '0 0 3px' }}>EP.{s.episode} · {s.timestamp}</p>
                                                <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 서브 추천 그리드 */}
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 48px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
                            {mood.emoji} {mood.label} 추천 {subs.length + 0}선
                        </h2>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                        <button onClick={onReset} style={{ padding: '6px 16px', borderRadius: 20, background: 'none', border: `1px solid ${mood.color}60`, color: mood.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            기분 다시 선택
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        {subs.map((anime, i) => (
                            <AnimeCard key={anime.tmdbId} anime={anime} aniList={aniList} accentColor={mood.color} delay={i * 60} />
                        ))}
                    </div>

                    {/* 이런 것도 좋을 수 있어요 */}
                    {related.length > 0 && (
                        <div style={{ marginTop: 56 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.75)', margin: 0 }}>🎯 이런 것도 좋을 수 있어요</h2>
                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                                {related.map((anime, i) => (
                                    <AnimeCard key={anime.tmdbId} anime={anime} aniList={aniList} accentColor="#6b7280" delay={i * 60} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 비기너 팁 */}
                    {hero && (
                        <div style={{ marginTop: 48, padding: '24px 28px', background: 'rgba(255,255,255,.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,.07)' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.5)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                💡 보기 전에 알면 좋은 것 <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>— {hero.koTitle}</span>
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {hero.communityInsights.beginnerTips.map((tip, i) => (
                                    <span key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', background: 'rgba(255,255,255,.06)', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)' }}>
                                        {tip}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

// ── 감정 선택 화면 ────────────────────────────────────────────
function MoodSelect({ onSelect }: { onSelect: (id: string) => void }) {
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 48px' }}>
            <style>{`
                @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
                @keyframes fade-in { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
            `}</style>

            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 56, animation: 'fade-in .5s ease' }}>
                <div style={{ fontSize: 48, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🎭</div>
                <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>
                    오늘 어떤 기분이에요?
                </h1>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,.4)', margin: 0 }}>
                    기분에 맞는 애니를 골라드릴게요
                </p>
            </div>

            {/* 감정 카드 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 860, width: '100%' }}>
                {MOODS.map((mood, i) => {
                    const isHovered = hoveredId === mood.id
                    return (
                        <button
                            key={mood.id}
                            onClick={() => onSelect(mood.id)}
                            onMouseEnter={() => setHoveredId(mood.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            style={{
                                padding: '28px 24px',
                                borderRadius: 20,
                                background: isHovered ? mood.gradient : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isHovered ? mood.color + '80' : 'rgba(255,255,255,0.08)'}`,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all .25s',
                                transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'none',
                                boxShadow: isHovered ? `0 20px 48px ${mood.glow}` : 'none',
                                animation: `fade-in .4s ease ${i * 60}ms both`,
                            }}
                        >
                            <div style={{ fontSize: 36, marginBottom: 12, filter: isHovered ? 'none' : 'grayscale(30%)' }}>
                                {mood.emoji}
                            </div>
                            <p style={{ fontSize: 18, fontWeight: 800, color: isHovered ? '#fff' : 'rgba(255,255,255,.75)', margin: '0 0 5px' }}>
                                {mood.label}
                            </p>
                            <p style={{ fontSize: 13, color: isHovered ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.35)', margin: 0 }}>
                                {mood.sub}
                            </p>
                            {isHovered && (
                                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {meta.filter(a => mood.id === 'random' || a.emotionCluster === mood.id).slice(0, 3).map(a => (
                                        <span key={a.tmdbId} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: mood.color + '30', color: mood.color, border: `1px solid ${mood.color}40` }}>
                                            {a.koTitle}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* 하단 힌트 */}
            <p style={{ marginTop: 36, fontSize: 13, color: 'rgba(255,255,255,.2)', animation: 'fade-in .5s ease .4s both' }}>
                41개 작품 · 감정 기반 큐레이션
            </p>
        </div>
    )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function MoodPage() {
    const { aniList, onFetchAni } = useAniStore()
    const searchParams = useSearchParams()
    const emotionParam = searchParams.get('emotion')
    const [selectedMood, setSelectedMood] = useState<string | null>(emotionParam)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    // URL 파라미터 변경 반영
    useEffect(() => {
        if (emotionParam) setSelectedMood(emotionParam)
    }, [emotionParam])

    return selectedMood
        ? <ResultView moodId={selectedMood} aniList={aniList} onReset={() => setSelectedMood(null)} />
        : <MoodSelect onSelect={setSelectedMood} />
}
