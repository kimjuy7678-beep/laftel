'use client'
import Link from 'next/link'

export default function MembershipBanner() {
    return (
        <section style={{ padding: '80px 0 0' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '5 / 1', overflow: 'hidden' }}>
                <img
                    src="/images/banner/membership-banner.png"
                    alt="멤버십 배너"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* 멤버십 가입 버튼 */}
                <Link
                    href="/membership"
                    style={{
                        position: 'absolute',
                        bottom: '6%',
                        left: '11.5%',
                        display: 'inline-flex', alignItems: 'center',
                        padding: '12px 28px', borderRadius: 50,
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        color: '#fff', fontSize: 'clamp(14px, 1vw, 22px)', fontWeight: 600,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        backdropFilter: 'blur(4px)',
                        transition: 'background .2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.48)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                >
                    멤버십 가입하기
                </Link>
            </div>
        </section>
    )
}
