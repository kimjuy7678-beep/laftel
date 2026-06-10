'use client'
import Link from 'next/link'

export default function MembershipBanner() {
    return (
        <section className="mb-section">
            <style>{`
                .mb-section { padding: 80px 0 0; }
                .mb-inner { position: relative; width: 100%; aspect-ratio: 5 / 1; overflow: hidden; }
                .mb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .mb-link {
                    position: absolute;
                    bottom: 8%;
                    left: 11.5%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-height: clamp(18px, 2.25vw, 42px);
                    padding: 0 clamp(8px, 1.45vw, 26px);
                    border-radius: 50px;
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.4);
                    color: #fff;
                    font-size: clamp(8px, 0.82vw, 15px);
                    font-weight: 600;
                    text-decoration: none;
                    white-space: nowrap;
                    backdrop-filter: blur(4px);
                    transition: background .2s;
                }
                .mb-link:hover { background: rgba(255,255,255,0.48); }
                @media (max-width: 900px) {
                    .mb-section { padding-top: 52px; }
                    .mb-link {
                        left: 11.5%;
                        bottom: 7%;
                        min-height: clamp(14px, 3vw, 22px);
                        padding: 0 clamp(6px, 1.8vw, 10px);
                        font-size: clamp(7px, 1.45vw, 9px);
                    }
                }
                @media (max-width: 480px) {
                    .mb-section { padding-top: 36px; }
                    .mb-link {
                        bottom: 6%;
                        min-height: clamp(12px, 4.8vw, 18px);
                        padding: 0 clamp(5px, 2.4vw, 7px);
                        font-size: clamp(6px, 2.2vw, 8px);
                    }
                }
            `}</style>
            <div className="mb-inner">
                <img
                    className="mb-img"
                    src="/images/banner/membership-banner.png"
                    alt="멤버십 배너"
                />
                <Link
                    href="/membership"
                    className="mb-link"
                >
                    멤버십 가입하기
                </Link>
            </div>
        </section>
    )
}
