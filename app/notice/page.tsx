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
        <div className="min-h-screen pt-20">
            <div className="inner px-6 py-10 max-w-4xl">
                <h1 className="text-2xl font-bold mb-8">공지사항</h1>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        <ul className="flex flex-col">
                            {notices.map((notice, i) => (
                                <li key={notice.id}>
                                    <a
                                        href={`https://help.laftel.net${notice.zendesk_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors border-b border-white/5 group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <span className="text-white/30 text-sm shrink-0 w-8 text-center">
                                                {total - (page * limit) - i}
                                            </span>
                                            <span className="text-sm group-hover:text-[#6c63ff] transition-colors truncate">
                                                {notice.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 ml-4">
                                            <span className="text-white/30 text-xs">
                                                {notice.published_datetime.slice(0, 10).replaceAll('-', '.')}
                                            </span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 group-hover:text-white/60 transition-colors">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/>
                                                <polyline points="15 3 21 3 21 9"/>
                                                <line x1="10" y1="14" x2="21" y2="3"/>
                                            </svg>
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                이전
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i)}
                                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                                        page === i
                                            ? 'bg-[#6c63ff] text-white'
                                            : 'bg-white/5 hover:bg-white/10 text-white/60'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                다음
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}