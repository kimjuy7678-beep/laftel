'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchProgressStore } from '@/store/useWatchProgressStore'

const GRADES = [
    {
        level: 0,
        name: '베이비',
        req: 0,
        color: '#a78bfa',
        desc: '라프텔 입문',
        condition: '라프텔에서의 첫 걸음마를 축하드려요!',
        image: 'https://thumbnail.laftel.net/profiles/default/48363a65-24d6-45a0-9eac-8c1726656c63.png',
    },
    {
        level: 1,
        name: '루키',
        req: 1,
        color: '#34d399',
        desc: '애니 1편 시청',
        condition: '첫 애니를 봤어요! 이제 진짜 시작이에요.',
        image: 'https://thumbnail.laftel.net/profiles/default/7478566c-4b3c-4a10-a7c0-2f8c05fb2370.jpg',
    },
    {
        level: 2,
        name: '뉴비',
        req: 3,
        color: '#60a5fa',
        desc: '애니 3편 시청',
        condition: '슬슬 애니의 매력에 빠지고 있군요...',
        image: 'https://thumbnail.laftel.net/profiles/default/fb48c8c7-ad22-4aa9-9038-c0637ba7e275.png',
    },
    {
        level: 3,
        name: '입문자',
        req: 5,
        color: '#f97316',
        desc: '애니 5편 시청',
        condition: '이제 애니 입문자라고 할 수 있어요!',
        image: 'https://thumbnail.laftel.net/profiles/default/b700435b-3ad2-4a31-9b72-3e9ae631dc47.png',
    },
    {
        level: 4,
        name: '덕후',
        req: 10,
        color: '#f43f5e',
        desc: '애니 10편 시청',
        condition: '이미 덕후의 기운이 느껴져요...',
        image: 'https://thumbnail.laftel.net/profiles/default/c38a5328-857c-4c12-a404-53d288460e2a.jpg',
    },
    {
        level: 5,
        name: '중독자',
        req: 30,
        color: '#ec4899',
        desc: '애니 30편 시청',
        condition: '이건... 중독이에요. 좋은 의미로.',
        image: 'https://thumbnail.laftel.net/profiles/default/40028ff2-895a-4606-b759-2674b1cdc18e.jpg',
    },
    {
        level: 6,
        name: '오타쿠',
        req: 50,
        color: '#facc15',
        desc: '애니 50편 시청',
        condition: '이 정도면 진정한 오타쿠죠!',
        image: 'https://thumbnail.laftel.net/profiles/default/37710afc-0caa-4ea3-bd6d-1c900674141e.jpg',
    },
    {
        level: 7,
        name: '신',
        req: 100,
        color: '#6c63ff',
        desc: '애니 100편 시청',
        condition: '당신은 이미 애니의 신입니다.',
        image: 'https://thumbnail.laftel.net/profiles/default/8c6f615f-b949-4ed8-b027-bcf2bee4ea4a.jpg',
    },
]

interface Props {
    onClose: () => void
}

export default function GradeModal({ onClose }: Props) {
    const { user } = useAuthStore()
    const { items, fetchProgress } = useWatchProgressStore()
    const profileId = user?.currentProfileId || user?.profileId || 'main'

    useEffect(() => {
        if (user?.uid) fetchProgress(user.uid, profileId)
    }, [user?.uid, profileId])

    // 고유 작품 수 (중복 제거)
    const watched = items.length

    const currentGrade = [...GRADES].reverse().find(g => watched >= g.req) || GRADES[0]
    const nextGrade = GRADES[currentGrade.level + 1] ?? null
    const [activeIdx, setActiveIdx] = useState(currentGrade.level)

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    // watched 바뀌면 현재 등급으로 슬라이드 이동
    useEffect(() => {
        setActiveIdx(currentGrade.level)
    }, [currentGrade.level])

    const viewing = GRADES[activeIdx]

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <style>{`
                @keyframes grade-in { from { opacity:0; transform:scale(.94) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
                .grade-modal { animation: grade-in .25s ease; }
            `}</style>

            <div className="grade-modal" style={{ background: 'var(--bg-card)', borderRadius: 24, width: '100%', maxWidth: 400, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>

                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h2 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 800, margin: 0 }}>라프텔 등급</h2>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: 'var(--text-subtle)', fontSize: 11, fontWeight: 700 }}>i</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
                </div>

                {/* 슬라이더 */}
                <div style={{ overflow: 'hidden', position: 'relative' }}>
                    <div style={{ display: 'flex', transform: `translateX(-${activeIdx * 100}%)`, transition: 'transform .3s cubic-bezier(.25,.46,.45,.94)' }}>
                        {GRADES.map((g) => {
                            const isCurrentGrade = g.level === currentGrade.level
                            const isUnlocked = watched >= g.req
                            const ng = GRADES[g.level + 1] ?? null
                            const progress = ng ? Math.min((watched / ng.req) * 100, 100) : 100

                            return (
                                <div key={g.level} style={{ minWidth: '100%', padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

                                    {/* 내 등급 뱃지 */}
                                    {isCurrentGrade && (
                                        <div style={{ background: 'rgba(108,99,255,.2)', border: '1px solid rgba(108,99,255,.4)', borderRadius: 20, padding: '3px 14px', fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                                            내 등급
                                        </div>
                                    )}
                                    {!isCurrentGrade && !isUnlocked && (
                                        <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '3px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>
                                            🔒 미달성
                                        </div>
                                    )}
                                    {!isCurrentGrade && isUnlocked && (
                                        <div style={{ background: `${g.color}20`, border: `1px solid ${g.color}40`, borderRadius: 20, padding: '3px 14px', fontSize: 12, fontWeight: 700, color: g.color }}>
                                            ✓ 달성
                                        </div>
                                    )}

                                    {/* 등급명 */}
                                    <div style={{ textAlign: 'center' }}>
                                        <h3 style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-faint)', fontSize: 32, fontWeight: 900, margin: '0 0 4px' }}>{g.name}</h3>
                                        <p style={{ color: 'var(--text-subtle)', fontSize: 13, margin: 0 }}>{g.desc}</p>
                                    </div>

                                    {/* 이미지 */}
                                    <div style={{ width: 180, height: 180, borderRadius: 24, overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: isUnlocked ? `0 0 40px ${g.color}44` : 'none', filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.4)', transition: 'all .3s' }}>
                                        <img src={g.image} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>

                                    {/* 조건 문구 */}
                                    <p style={{ color: isUnlocked ? 'var(--text-primary)' : 'var(--text-faint)', fontSize: 15, fontWeight: 700, textAlign: 'center', margin: 0 }}>
                                        {isUnlocked ? g.condition : `애니 ${g.req}편을 시청하면 달성!`}
                                    </p>

                                    {/* 진행도 */}
                                    {isCurrentGrade && ng && (
                                        <div style={{ width: '100%', marginTop: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>다음 등급: {ng.name}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{watched} / {ng.req}편</span>
                                            </div>
                                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                                                <div style={{ height: '100%', background: g.color, borderRadius: 2, width: `${progress}%`, transition: 'width .5s ease' }} />
                                            </div>
                                        </div>
                                    )}
                                    {isCurrentGrade && !ng && (
                                        <p style={{ fontSize: 13, color: g.color, fontWeight: 700, margin: 0 }}>🎉 최고 등급 달성!</p>
                                    )}
                                    {!isCurrentGrade && ng && (
                                        <div style={{ width: '100%', marginTop: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>달성 조건</span>
                                                <span style={{ fontSize: 12, color: isUnlocked ? g.color : 'var(--text-faint)' }}>{Math.min(watched, ng.req)} / {ng.req}편</span>
                                            </div>
                                            <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2 }}>
                                                <div style={{ height: '100%', background: isUnlocked ? g.color : 'rgba(255,255,255,.15)', borderRadius: 2, width: `${Math.min((watched / ng.req) * 100, 100)}%`, transition: 'width .5s ease' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 인디케이터 + 화살표 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px 24px' }}>
                    <button onClick={() => setActiveIdx(v => Math.max(0, v - 1))}
                        style={{ background: 'none', border: 'none', color: activeIdx === 0 ? 'var(--text-faint)' : 'var(--text-muted)', cursor: activeIdx === 0 ? 'default' : 'pointer', fontSize: 18, padding: 4 }}>‹</button>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {GRADES.map((g, i) => {
                            const unlocked = watched >= g.req
                            return (
                                <button key={i} onClick={() => setActiveIdx(i)}
                                    style={{
                                        width: i === activeIdx ? 20 : 7,
                                        height: 7,
                                        borderRadius: 4,
                                        background: i === activeIdx ? GRADES[i].color : unlocked ? 'var(--border-subtle)' : 'var(--border-faint)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all .2s',
                                        padding: 0,
                                    }}
                                />
                            )
                        })}
                    </div>
                    <button onClick={() => setActiveIdx(v => Math.min(GRADES.length - 1, v + 1))}
                        style={{ background: 'none', border: 'none', color: activeIdx === GRADES.length - 1 ? 'var(--text-faint)' : 'var(--text-muted)', cursor: activeIdx === GRADES.length - 1 ? 'default' : 'pointer', fontSize: 18, padding: 4 }}>›</button>
                </div>
                {/* 하단 총 시청 수 */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 24px', textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>총 시청 작품 </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: currentGrade.color }}>{watched}편</span>
                </div>
            </div>
        </div>
    )
}
