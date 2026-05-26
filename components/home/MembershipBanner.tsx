'use client'
import Link from 'next/link'

export default function MembershipBanner() {
    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .mb-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .mb-inner {
                    position: relative; overflow: hidden;
                    border-radius: 20px;
                    background: linear-gradient(135deg, #1a1535 0%, #0f0f1a 50%, #1a1535 100%);
                    border: 1px solid rgba(108,99,255,0.2);
                    padding: 48px 60px;
                    display: flex; align-items: center; justify-content: space-between;
                }
                .mb-glow {
                    position: absolute; width: 400px; height: 400px;
                    border-radius: 50%; background: rgba(108,99,255,0.15);
                    filter: blur(80px); top: -100px; right: 100px;
                    pointer-events: none;
                }
                .mb-left { position: relative; z-index: 1; }
                .mb-eyebrow { font-size: 12px; font-weight: 700; color: #9d97ff; letter-spacing: .08em; margin: 0 0 12px; text-transform: uppercase; }
                .mb-title { font-size: 32px; font-weight: 900; color: #fff; margin: 0 0 10px; line-height: 1.2; }
                .mb-desc { font-size: 15px; color: rgba(255,255,255,0.5); margin: 0; }
                .mb-btn {
                    position: relative; z-index: 1;
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 14px 32px; border-radius: 12px;
                    background: #6c63ff; color: #fff;
                    font-size: 15px; font-weight: 700;
                    text-decoration: none; transition: background .2s, transform .2s;
                    white-space: nowrap;
                }
                .mb-btn:hover { background: #5a52e0; transform: translateY(-2px); }
            `}</style>
            <div className="mb-wrap">
                <div className="mb-inner">
                    <div className="mb-glow" />
                    <div className="mb-left">
                        <p className="mb-eyebrow">Laftel Membership</p>
                        <h2 className="mb-title">지금 바로 무제한으로<br />즐겨보세요</h2>
                        <p className="mb-desc">월 9,900원으로 광고 없이 모든 애니를 FHD로</p>
                    </div>
                    <Link href="/membership" className="mb-btn">
                        멤버십 시작하기
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m9 18 6-6-6-6"/>
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    )
}
