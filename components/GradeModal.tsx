// components/GradeModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

const GRADES = [
    {
        level: 0,
        name: '베이비',
        emoji: '👶',
        color: '#a78bfa',
        desc: '프로필 만들기 완료',
        condition: '라프텔에서의 첫 걸음마를 축하드려요!',
        req: 0,
        image: 'https://thumbnail.laftel.net/profiles/default/48363a65-24d6-45a0-9eac-8c1726656c63.png',
    },
    {
        level: 1,
        name: '루키',
        emoji: '🌱',
        color: '#34d399',
        desc: '애니 1편 시청 완료',
        condition: '첫 애니를 완주했어요! 이제 진짜 시작이에요.',
        req: 1,
        image: 'https://thumbnail.laftel.net/profiles/default/7478566c-4b3c-4a10-a7c0-2f8c05fb2370.jpg',
    },
    {
        level: 2,
        name: '덕후',
        emoji: '🔥',
        color: '#f97316',
        desc: '애니 10편 시청 완료',
        condition: '이미 덕후의 기운이 느껴져요...',
        req: 10,
        image: 'https://thumbnail.laftel.net/profiles/default/c38a5328-857c-4c12-a404-53d288460e2a.jpg',
    },
    {
        level: 3,
        name: '오타쿠',
        emoji: '⭐',
        color: '#facc15',
        desc: '애니 30편 시청 완료',
        condition: '이 정도면 진정한 오타쿠죠!',
        req: 30,
        image: 'https://thumbnail.laftel.net/profiles/default/40028ff2-895a-4606-b759-2674b1cdc18e.jpg',
    },
    {
        level: 4,
        name: '신',
        emoji: '👑',
        color: '#6c63ff',
        desc: '애니 100편 시청 완료',
        condition: '당신은 이미 애니의 신입니다.',
        req: 100,
        image: 'https://thumbnail.laftel.net/profiles/default/37710afc-0caa-4ea3-bd6d-1c900674141e.jpg',
    },
]

interface Props {
    onClose: () => void
}

export default function GradeModal({ onClose }: Props) {
    const { user } = useAuthStore()
    const watched = 0 // 나중에 실제 시청 수로 교체
    const currentGrade = [...GRADES].reverse().find(g => watched >= g.req) || GRADES[0]
    const nextGrade = GRADES[GRADES.indexOf(currentGrade) + 1]
    const [activeIdx, setActiveIdx] = useState(GRADES.indexOf(currentGrade))

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    const viewing = GRADES[activeIdx]

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <style>{`
                @keyframes grade-in { from { opacity:0; transform:scale(.94) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
                .grade-modal { animation: grade-in .25s ease; }
                .grade-slide { transition: transform .3s cubic-bezier(.25,.46,.45,.94); }
            `}</style>

            <div className="grade-modal" style={{ background: '#0e0e16', borderRadius: 24, width: '100%', maxWidth: 400, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)', position: 'relative' }}>

                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>라프텔 등급</h2>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontWeight: 700 }}>i</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
                </div>

                {/* 슬라이더 영역 */}
                <div style={{ overflow: 'hidden', position: 'relative' }}>
                    <div style={{ display: 'flex', transform: `translateX(-${activeIdx * 100}%)`, transition: 'transform .3s cubic-bezier(.25,.46,.45,.94)' }}>
                        {GRADES.map((g, i) => (
                            <div key={g.level} style={{ minWidth: '100%', padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                {/* 내 등급 뱃지 */}
                                {g.level === currentGrade.level && (
                                    <div style={{ background: 'rgba(108,99,255,.2)', border: '1px solid rgba(108,99,255,.4)', borderRadius: 20, padding: '3px 14px', fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                                        내 등급
                                    </div>
                                )}

                                {/* 등급명 */}
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 6px' }}>{g.name}</h3>
                                    <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: 0 }}>{g.desc}</p>
                                </div>

                                {/* 이미지 */}
                                <div style={{ width: 200, height: 200, borderRadius: 28, overflow: 'hidden', background: '#1a1a22', boxShadow: `0 0 40px ${g.color}33` }}>
                                    <img src={g.image} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>

                                {/* 설명 */}
                                <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center', margin: 0 }}>
                                    {g.condition}
                                </p>

                                {/* 진행도 (현재 등급일 때만) */}
                                {g.level === currentGrade.level && nextGrade && (
                                    <div style={{ width: '100%', marginTop: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>다음 등급: {nextGrade.name}</span>
                                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{watched} / {nextGrade.req}편</span>
                                        </div>
                                        <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2 }}>
                                            <div style={{ height: '100%', background: g.color, borderRadius: 2, width: `${Math.min((watched / nextGrade.req) * 100, 100)}%`, transition: 'width .5s ease' }} />
                                        </div>
                                    </div>
                                )}
                                {g.level === currentGrade.level && !nextGrade && (
                                    <p style={{ fontSize: 13, color: g.color, fontWeight: 700 }}>🎉 최고 등급 달성!</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 인디케이터 + 화살표 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px 24px' }}>
                    <button onClick={() => setActiveIdx(v => Math.max(0, v - 1))}
                        style={{ background: 'none', border: 'none', color: activeIdx === 0 ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.5)', cursor: activeIdx === 0 ? 'default' : 'pointer', fontSize: 18, padding: 4 }}>‹</button>

                    <div style={{ display: 'flex', gap: 6 }}>
                        {GRADES.map((g, i) => (
                            <button key={i} onClick={() => setActiveIdx(i)}
                                style={{ width: i === activeIdx ? 20 : 7, height: 7, borderRadius: 4, background: i === activeIdx ? '#6c63ff' : 'rgba(255,255,255,.2)', border: 'none', cursor: 'pointer', transition: 'all .2s', padding: 0 }} />
                        ))}
                    </div>

                    <button onClick={() => setActiveIdx(v => Math.min(GRADES.length - 1, v + 1))}
                        style={{ background: 'none', border: 'none', color: activeIdx === GRADES.length - 1 ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.5)', cursor: activeIdx === GRADES.length - 1 ? 'default' : 'pointer', fontSize: 18, padding: 4 }}>›</button>
                </div>
            </div>
        </div>
    )
}