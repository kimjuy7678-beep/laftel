'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const MOODS = [
    { id: 'emotional_damage', emoji: '😭', label: '울고 싶어',       sub: '후유증 심한 거 줘',    color: '#6366f1', bg: 'rgba(99,102,241,0.13)',  border: 'rgba(99,102,241,0.3)' },
    { id: 'action_hype',      emoji: '🔥', label: '소리 지르고 싶어', sub: '폭발하는 전투씬',     color: '#ef4444', bg: 'rgba(239,68,68,0.13)',    border: 'rgba(239,68,68,0.3)' },
    { id: 'dopamine',         emoji: '⚡', label: '멈출 수가 없어',   sub: '중독성 갑 작품',      color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',   border: 'rgba(245,158,11,0.3)' },
    { id: 'dark_fantasy',     emoji: '🌑', label: '어두운 거 보고 싶어', sub: '두뇌게임/디스토피아', color: '#8b5cf6', bg: 'rgba(139,92,246,0.13)', border: 'rgba(139,92,246,0.3)' },
    { id: 'healing',          emoji: '🌿', label: '힐링이 필요해',    sub: '지쳤을 때 보는 애니',  color: '#10b981', bg: 'rgba(16,185,129,0.13)',   border: 'rgba(16,185,129,0.3)' },
    { id: 'random',           emoji: '🎲', label: '아무거나 줘',      sub: '오늘의 운세',          color: '#94a3b8', bg: 'rgba(148,163,184,0.08)',  border: 'rgba(148,163,184,0.18)' },
]

export default function MoodSection() {
    const router = useRouter()
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    return (
        <section style={{ padding: '56px 0 0' }}>
            <style>{`
                @keyframes mood-in {
                    from { opacity: 0; transform: translateY(10px) }
                    to   { opacity: 1; transform: translateY(0) }
                }
                .mood-wrap {
                    max-width: 1820px;
                    margin: 0 auto;
                    padding: 0 48px;
                }
                .mood-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 12px;
                }
                .mood-card {
                    padding: 24px 20px 22px;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all .22s;
                    border: 1px solid;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    width: 100%;
                    box-sizing: border-box;
                }
                .mood-card:hover {
                    transform: translateY(-4px);
                }
                .mood-emoji {
                    font-size: 30px;
                    margin-bottom: 14px;
                    display: block;
                    transition: transform .2s;
                    line-height: 1;
                }
                .mood-card:hover .mood-emoji {
                    transform: scale(1.15);
                }
                .mood-label {
                    font-size: 15px;
                    font-weight: 800;
                    color: #fff;
                    margin: 0 0 5px;
                    line-height: 1.3;
                }
                .mood-sub {
                    font-size: 11px;
                    color: rgba(255,255,255,.38);
                    margin: 0 0 0;
                    line-height: 1.4;
                }
                .mood-cta {
                    margin-top: 14px;
                    font-size: 11px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    opacity: 0;
                    transition: opacity .18s;
                }
                .mood-card:hover .mood-cta {
                    opacity: 1;
                }
            `}</style>

            <div className="mood-wrap">
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.32)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                            감정 기반 추천
                        </p>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
                            오늘 어떤 기분이에요? 🎭
                        </h2>
                    </div>
                    <button
                        onClick={() => router.push('/mood')}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,.32)', fontSize: 13, cursor: 'pointer', padding: 0, transition: 'color .2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.7)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.32)'}
                    >
                        전체보기
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>

                {/* 6열 그리드 */}
                <div className="mood-grid">
                    {MOODS.map((mood, i) => {
                        const isHovered = hoveredId === mood.id
                        return (
                            <button
                                key={mood.id}
                                className="mood-card"
                                style={{
                                    background: isHovered ? mood.bg : 'rgba(255,255,255,0.03)',
                                    borderColor: isHovered ? mood.border : 'rgba(255,255,255,0.07)',
                                    boxShadow: isHovered ? `0 12px 32px ${mood.bg}` : 'none',
                                    animation: `mood-in .35s ease ${i * 45}ms both`,
                                }}
                                onMouseEnter={() => setHoveredId(mood.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => router.push(`/mood?emotion=${mood.id}`)}
                            >
                                <span className="mood-emoji">{mood.emoji}</span>
                                <p className="mood-label">{mood.label}</p>
                                <p className="mood-sub">{mood.sub}</p>
                                <span className="mood-cta" style={{ color: mood.color }}>
                                    추천 받기
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
