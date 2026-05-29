'use client'
import Link from 'next/link'

export default function MembershipBanner() {
    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
              .mb-wrap { width: 100%; }
                .mb-inner {
                    position: relative; overflow: hidden;
          
                
                }
                .mb-bg {
                    width: 100%; height: auto; padding:100px 0;
                    display: block;
                }
                .mb-content {
                    position: absolute; z-index: 1;
                    right: 80px; top: 50%; transform: translateY(-50%);
                    display: flex; flex-direction: column;
                    align-items: flex-start;
                }
                .mb-logo {
                    font-size: 36px; font-weight: 900; color: #fff;
                    letter-spacing: 2px; margin-bottom: 8px;
                    font-style: italic;
                }
                .mb-desc {
                    font-size: 18px; font-weight: 700; color: #fff;
                    margin: 0 0 20px; line-height: 1.4;
                    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
                }
            .mb-btn {
    display: inline-flex; align-items: center;
    padding: 15px 30px; border-radius: 50px;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.4);
    color: #fff; font-size: 24px; font-weight: 600;
    text-decoration: none; transition: background .2s;
    backdrop-filter: blur(4px);
    position: absolute;
    white-space: nowrap;   
    top: 180px;
    right: 425px;
}
                .mb-btn:hover { background: rgba(255,255,255,0.48); }
            `}</style>
            <div className="mb-wrap">
                <div className="mb-inner">
                    <img className="mb-bg" src="/images/banner/membership-banner.png" alt="멤버십 배너" />
                    <div className="mb-content">

                        <Link href="/membership" className="mb-btn">멤버십 가입하기</Link>
                    </div>
                </div>
            </div>
        </section>
    )
}