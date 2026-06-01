"use client"
import { useEffect, useState } from 'react'

interface Notice {
    id: number
    title: string
    zendesk_url: string
    published_datetime: string
}

export default function NoticePage() {
    const [notices, setNotices] = useState<Notice[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const limit = 20

    useEffect(() => {
        const fetch_ = async () => {
            setLoading(true)
            try {
                const res = await fetch(`https://api.laftel.net/api/notices/v1/list/?offset=${page * limit}&limit=${limit}`)
                const data = await res.json()
                setNotices(data.results)
                setTotal(data.count)
            } finally {
                setLoading(false)
            }
        }
        fetch_()
    }, [page])

    const totalPages = Math.ceil(total / limit)

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .nt-wrap { width: 90%; margin: 0 auto; }
                .nt-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 8px; border-bottom: 1px solid rgba(255,255,255,.06); text-decoration: none; transition: background .15s; }
                .nt-item:hover { background: rgba(255,255,255,.04); }
                .nt-item:hover .nt-title { color: #6c63ff; }
                .nt-item:hover .nt-arrow { opacity: .6; }
                .nt-num { font-size: 13px; color: rgba(255,255,255,.25); width: 36px; text-align: center; flex-shrink: 0; }
                .nt-title { font-size: 14px; color: rgba(255,255,255,.85); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color .15s; }
                .nt-date { font-size: 12px; color: rgba(255,255,255,.3); flex-shrink: 0; margin-left: 16px; }
                .nt-arrow { opacity: .2; flex-shrink: 0; margin-left: 10px; transition: opacity .15s; }
                .nt-page-btn { padding: 8px 14px; border-radius: 8px; background: rgba(255,255,255,.06); border: none; color: rgba(255,255,255,.6); font-size: 13px; cursor: pointer; transition: background .15s; }
                .nt-page-btn:hover:not(:disabled) { background: rgba(255,255,255,.12); color: #fff; }
                .nt-page-btn:disabled { opacity: .3; cursor: default; }
                .nt-page-num { width: 32px; height: 32px; border-radius: 8px; border: none; font-size: 13px; cursor: pointer; transition: all .15s; }
                .nt-page-num.on { background: #6c63ff; color: #fff; }
                .nt-page-num.off { background: rgba(255,255,255,.06); color: rgba(255,255,255,.5); }
                .nt-page-num.off:hover { background: rgba(255,255,255,.12); color: #fff; }
                .nt-spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,.1); border-top-color: #6c63ff; border-radius: 50%; animation: spin .7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg) } }
            `}</style>

            <div className="nt-wrap">
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 40px' }}>공지사항</h1>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                        <div className="nt-spinner" />
                    </div>
                ) : (
                    <>
                        <div>
                            {notices.map((notice, i) => (
                                <a key={notice.id} className="nt-item"
                                    href={`https://help.laftel.net${notice.zendesk_url}`}
                                    target="_blank" rel="noopener noreferrer">
                                    <span className="nt-num">{total - (page * limit) - i}</span>
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

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 40 }}>
                            <button className="nt-page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>이전</button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i} className={`nt-page-num ${page === i ? 'on' : 'off'}`} onClick={() => setPage(i)}>
                                    {i + 1}
                                </button>
                            ))}
                            <button className="nt-page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>다음</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}