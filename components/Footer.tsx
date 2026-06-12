import Link from 'next/link'
import React from 'react'

const FooterLinks = [
    { title: "회사소개", path: "https://laftel.oopy.io/" },
    { title: "고객센터", path: "https://laftel.net/help-center" },
    { title: "공지사항", path: "https://laftel.net/help-center?return_to=/sections/5987589202959" },
    { title: "이용약관", path: "https://policy.laftel.net/service/2025/" },
    { title: "청소년보호정책", path: "https://policy.laftel.net/youth/2026/" },
    { title: "개인정보 처리방침", path: "https://policy.laftel.net/privacy/2025_08/", bold: true },
    { title: "저작권 표기", path: "https://laftel.net/copyrights/" },
]

type FooterProps = {
    variant?: "default" | "store";
};

export default function Footer({ variant = "default" }: FooterProps) {
    const isStore = variant === "store"
    const lightFooter = {
        bg: '#f2f2f7',
        textPrimary: 'rgba(0,0,0,0.85)',
        textMuted: 'rgba(0,0,0,0.55)',
        textSubtle: 'rgba(0,0,0,0.38)',
        border: 'rgba(0,0,0,0.1)',
        borderFaint: 'rgba(0,0,0,0.04)',
    }

    return (
        <footer
            className="mt-auto"
            style={{
                background: isStore ? lightFooter.bg : 'var(--bg-primary)',
                color: isStore ? lightFooter.textMuted : 'var(--text-muted)',
                borderTop: `1px solid ${isStore ? lightFooter.borderFaint : 'var(--border-faint)'}`,
            }}
        >
            <style>{`
                /* ─── Footer 반응형 ─── */
                .footer-inner {
                    width: 90%;
                    margin: 0 auto;
                    padding: 40px 0;
                }

                /* 상단: 로고+사업자 / 소셜 아이콘 */
                .footer-top {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 24px;
                }

                /* 소셜 아이콘 묶음 */
                .footer-social {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex-shrink: 0;
                }

                /* 링크 목록 */
                .footer-nav-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px 24px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                /* ── 모바일 (≤ 480px) ── */
                @media (max-width: 480px) {
                    .footer-inner {
                        padding: 28px 0;
                    }

                    /* 로고+아이콘 세로 스택 */
                    .footer-top {
                        flex-direction: column;
                        gap: 20px;
                    }

                    /* 아이콘 간격 살짝 줄이기 */
                    .footer-social {
                        gap: 16px;
                    }

                    /* 링크 간격 줄이기 */
                    .footer-nav-list {
                        gap: 8px 16px;
                    }

                    .footer-nav-list li a {
                        font-size: 12px;
                    }
                }

                /* ── 태블릿 (481px ~ 768px) ── */
                @media (min-width: 481px) and (max-width: 768px) {
                    .footer-top {
                        align-items: center;
                    }

                    .footer-social {
                        gap: 16px;
                    }

                    .footer-nav-list {
                        gap: 8px 18px;
                    }
                }
            `}</style>

            <div className="footer-inner">
                <div className="footer-top">
                    {/* 로고 + 사업자 정보 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span>
                            {isStore ? (
                                <img
                                    src="/images/logo-dark.png"
                                    alt="logo"
                                    style={{ width: '120px' }}
                                />
                            ) : (
                                <>
                                    <img
                                        src="/images/logo-white.svg"
                                        alt="logo"
                                        className="dark:block hidden"
                                        style={{ width: '120px' }}
                                    />
                                    <img
                                        src="/images/logo-dark.png"
                                        alt="logo"
                                        className="dark:hidden block"
                                        style={{ width: '120px' }}
                                    />
                                </>
                            )}
                        </span>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            className={`transition-colors ${isStore ? "text-[rgba(0,0,0,0.38)] hover:text-[rgba(0,0,0,0.85)]" : "text-[var(--text-subtle)] hover:text-[var(--text-primary)]"}`}
                        >
                            (주)라프텔 사업자 정보
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                    </div>

                    {/* 소셜 아이콘 */}
                    <div className="footer-social">
                        {[
                            {
                                href: "https://x.com/laftel_net", label: "X",
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" /></svg>
                            },
                            {
                                href: "https://www.youtube.com/channel/UCI7lPoS1I3zOOePX9ph4iAA", label: "YouTube",
                                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                            },
                            {
                                href: "https://www.instagram.com/laftel_net/", label: "Instagram",
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            },
                            {
                                href: "https://www.tiktok.com/@laftel_official", label: "TikTok",
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" /></svg>
                            },
                        ].map(({ href, label, icon }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`transition-colors ${isStore ? "text-[rgba(0,0,0,0.38)] hover:text-[rgba(0,0,0,0.85)]" : "text-[var(--text-subtle)] hover:text-[var(--text-primary)]"}`}
                                aria-label={label}
                            >
                                {icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* 구분선 */}
                <div
                    style={{ margin: '24px 0', borderTop: `1px solid ${isStore ? lightFooter.border : 'var(--border)'}` }}
                />

                {/* 링크 목록 */}
                <nav>
                    <ul className="footer-nav-list">
                        {FooterLinks.map((link) => (
                            <li key={link.title}>
                                <Link
                                    href={link.path}
                                    className={`text-sm transition-colors ${link.bold
                                        ? isStore
                                            ? 'font-medium text-[rgba(0,0,0,0.85)] hover:text-[#826cff]'
                                            : 'font-medium text-[var(--text-primary)] hover:text-[#826cff]'
                                        : isStore
                                            ? 'text-[rgba(0,0,0,0.38)] hover:text-[rgba(0,0,0,0.85)]'
                                            : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {link.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </footer>
    )
}
