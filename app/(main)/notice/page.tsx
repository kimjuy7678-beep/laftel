import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import fallbackNotices from '@/data/notices.json'

type Notice = {
    id: number
    title: string
    zendesk_url: string
    published_datetime: string
}

type NoticeResponse = {
    results?: Notice[]
    count?: number
}

type PageProps = {
    searchParams: Promise<{ page?: string }>
}

const LIMIT = 20
const API_BASE = 'https://api.laftel.net/api/notices/v1/list/'

export const dynamic = 'force-dynamic'

function toPage(value: string | undefined) {
    const page = Number(value)
    if (!Number.isFinite(page) || page < 1) return 0
    return Math.floor(page) - 1
}

function toNoticeHref(notice: Notice) {
    if (notice.zendesk_url.startsWith('http')) return notice.zendesk_url
    return `https://help.laftel.net${notice.zendesk_url}`
}

async function getNotices(page: number) {
    const offset = page * LIMIT

    try {
        const params = new URLSearchParams({
            offset: String(offset),
            limit: String(LIMIT),
        })
        const res = await fetch(`${API_BASE}?${params.toString()}`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://laftel.net',
                'Referer': 'https://laftel.net/',
            },
        })

        if (!res.ok) throw new Error(`notice fetch failed: ${res.status}`)

        const data = await res.json() as NoticeResponse
        return {
            notices: data.results ?? [],
            total: data.count ?? data.results?.length ?? 0,
            fallback: false,
        }
    } catch {
        const allNotices = fallbackNotices as Notice[]
        return {
            notices: allNotices.slice(offset, offset + LIMIT),
            total: allNotices.length,
            fallback: true,
        }
    }
}

export default async function NoticePage({ searchParams }: PageProps) {
    const { page: pageParam } = await searchParams
    const page = toPage(pageParam)
    const { notices, total, fallback } = await getNotices(page)
    const totalPages = Math.max(1, Math.ceil(total / LIMIT))

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .nt-wrap { width: 90%; margin: 0 auto; }
                .nt-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 8px; border-bottom: 1px solid rgba(255,255,255,.06); text-decoration: none; transition: background .15s; }
                .nt-item:hover { background: rgba(255,255,255,.04); }
                .nt-item:hover .nt-title { color: #6c63ff; }
                .nt-item:hover .nt-arrow { opacity: .6; }
                .nt-num { font-size: 13px; color: rgba(255,255,255,.25); width: 36px; text-align: center; flex-shrink: 0; }
                .nt-title { font-size: 14px; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color .15s; }
                .nt-date { font-size: 12px; color: rgba(255,255,255,.3); flex-shrink: 0; margin-left: 16px; }
                .nt-arrow { opacity: .2; flex-shrink: 0; margin-left: 10px; transition: opacity .15s; }
                .nt-empty { padding: 72px 0; text-align: center; color: var(--text-subtle); font-size: 14px; }
                .nt-fallback { margin: -16px 0 20px; color: var(--text-faint); font-size: 12px; }
                .nt-page-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 34px; padding: 0 14px; border-radius: 8px; background: rgba(255,255,255,.06); border: none; color: rgba(255,255,255,.6); font-size: 13px; text-decoration: none; transition: background .15s; }
                .nt-page-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
                .nt-page-btn.disabled { opacity: .3; pointer-events: none; }
                .nt-page-num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: none; font-size: 13px; text-decoration: none; transition: all .15s; }
                .nt-page-num.on { background: #6c63ff; color: #fff; }
                .nt-page-num.off { background: rgba(255,255,255,.06); color: rgba(255,255,255,.5); }
                .nt-page-num.off:hover { background: rgba(255,255,255,.12); color: #fff; }
            `}</style>

            <div className="nt-wrap">
                <PageHeader title="공지사항" />


                {notices.length === 0 ? (
                    <div className="nt-empty">등록된 공지사항이 없어요.</div>
                ) : (
                    <div>
                        {notices.map((notice, i) => (
                            <a key={notice.id} className="nt-item"
                                href={toNoticeHref(notice)}
                                target="_blank" rel="noopener noreferrer">
                                <span className="nt-num">{total - (page * LIMIT) - i}</span>
                                <span className="nt-title">{notice.title}</span>
                                <span className="nt-date">{notice.published_datetime.slice(0, 10).replaceAll('-', '.')}</span>
                                <svg className="nt-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 40 }}>
                        <Link className={`nt-page-btn ${page === 0 ? 'disabled' : ''}`} href={`/notice?page=${page}`}>이전</Link>
                        {[...Array(totalPages)].map((_, i) => (
                            <Link key={i} className={`nt-page-num ${page === i ? 'on' : 'off'}`} href={`/notice?page=${i + 1}`}>
                                {i + 1}
                            </Link>
                        ))}
                        <Link className={`nt-page-btn ${page >= totalPages - 1 ? 'disabled' : ''}`} href={`/notice?page=${page + 2}`}>다음</Link>
                    </div>
                )}
            </div>
        </div>
    )
}
