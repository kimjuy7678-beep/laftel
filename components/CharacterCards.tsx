"use client"
import { useState } from 'react'

const characters = [
    {
        id: 1,
        name: "짱구",
        sub: "크레용 신짱",
        gif: "/images/cha/shinchnag.gif",
        bg: "linear-gradient(160deg, #fff0f0 0%, #ffe4e4 100%)",
        accentColor: "#ff4757",
        badge: "HOT",
    },
    {
        id: 2,
        name: "도라에몽",
        sub: "도라에몽",
        gif: "/images/cha/doraemon.gif",
        bg: "linear-gradient(160deg, #e8f4ff 0%, #d0e8ff 100%)",
        accentColor: "#2e86de",
        badge: "NEW",
    },
]

export default function CharacterCards() {
    const [hovered, setHovered] = useState<number | null>(null)

    return (
        <div style={{ padding: '40px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ fontSize: 12, letterSpacing: '0.2em', color: '#6c63ff', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Character</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 48, textAlign: 'center' }}>지금 인기 캐릭터</h2>

            <div style={{ display: 'flex', gap: 32 }}>
                {characters.map((ch) => (
                    <div
                        key={ch.id}
                        onMouseEnter={() => setHovered(ch.id)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            position: 'relative',
                            width: 180,
                            paddingTop: 90,
                            cursor: 'pointer',
                        }}
                    >
                        {/* 캐릭터 GIF */}
                        <img
                            src={hovered === ch.id ? ch.gif : ch.gif}
                            alt={ch.name}
                            style={{
                                position: 'absolute',
                                bottom: 90,
                                left: '50%',
                                width: 160,
                                zIndex: 20,
                                pointerEvents: 'none',
                                transform: hovered === ch.id
                                    ? 'translateX(-50%) translateY(-8px)'
                                    : 'translateX(-50%) translateY(0px)',
                                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                filter: hovered === ch.id
                                    ? 'drop-shadow(0 20px 24px rgba(0,0,0,0.2))'
                                    : 'drop-shadow(0 8px 12px rgba(0,0,0,0.1))',
                                contentVisibility: 'auto',
                            }}
                        />

                        {/* 카드 */}
                        <div style={{
                            width: 180,
                            height: 220,
                            borderRadius: 24,
                            background: ch.bg,
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            transform: hovered === ch.id ? 'translateY(-4px)' : 'translateY(0)',
                            boxShadow: hovered === ch.id
                                ? `0 24px 48px ${ch.accentColor}33, 0 8px 16px rgba(0,0,0,0.08)`
                                : '0 4px 20px rgba(0,0,0,0.08)',
                        }}>
                            {/* 배지 */}
                            <div style={{
                                position: 'absolute',
                                top: 14,
                                right: 14,
                                background: ch.accentColor,
                                color: 'white',
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6,
                                letterSpacing: '0.1em',
                            }}>
                                {ch.badge}
                            </div>

                            {/* 배경 원 장식 */}
                            <div style={{
                                position: 'absolute',
                                bottom: -20,
                                right: -20,
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                background: ch.accentColor,
                                opacity: 0.06,
                            }} />
                            <div style={{
                                position: 'absolute',
                                bottom: 20,
                                left: -30,
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: ch.accentColor,
                                opacity: 0.04,
                            }} />

                            {/* 하단 텍스트 */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '16px 18px',
                            }}>
                                <p style={{
                                    fontSize: 16,
                                    fontWeight: 800,
                                    color: '#1a1a2e',
                                    margin: 0,
                                    letterSpacing: '-0.02em',
                                }}>{ch.name}</p>
                                <p style={{
                                    fontSize: 11,
                                    color: '#888',
                                    margin: '2px 0 0',
                                    fontWeight: 500,
                                }}>{ch.sub}</p>
                            </div>

                            {/* 호버 시 하단 컬러 라인 */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                background: ch.accentColor,
                                borderRadius: '0 0 24px 24px',
                                opacity: hovered === ch.id ? 1 : 0,
                                transition: 'opacity 0.3s',
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}