'use client'
import Link from 'next/link'

export default function MembershipBanner() {
    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .mb-wrap { width: 100%; }
                .mb-inner {
                    position: relative;
                    overflow: hidden;
                    padding-top: 26.1%;
                    height: 0;
                    margin-top: 80px;
                }
                .mb-bg {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .mb-btn {
                    position: absolute;
                    top: 83%;
                    right: 19%;
                    display: inline-flex; align-items: center;
                    padding: 15px 30px; border-radius: 50px;
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.4);
                    color: #fff; font-size: clamp(12px, 1.5vw, 24px); font-weight: 600;
                    text-decoration: none; white-space: nowrap;
                    backdrop-filter: blur(4px); transition: background .2s;
                }
                .mb-btn:hover { background: rgba(255,255,255,0.48); }
                @media (max-width: 1920px) {
                    .mb-btn { right: 16.3%; }
                }
            `}</style>
            <div className="mb-wrap">
                <div className="mb-inner">
                    <img className="mb-bg" src="/images/banner/membership-banner.png" alt="멤버십 배너" />
                    <Link href="/membership" className="mb-btn">멤버십 가입하기</Link>
                </div>
            </div>
        </section>
    )
}