'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEventStore } from '@/store/useEventStore'

interface EventDetail {
    id: number
    name: string
    img: string
    banner_img: string
    start_datetime: string
    end_datetime: string
    status: string
    type: string
    content?: string
    description?: string
    url?: string
    items?: any[]
}

const STATUS_LABEL: Record<string, string> = {
    ongoing: '진행중',
    result: '결과 발표',
    past: '이벤트 종료',
}
const STATUS_COLOR: Record<string, string> = {
    ongoing: '#6c63ff',
    result: '#f59e0b',
    past: 'rgba(255,255,255,0.3)',
}

export default function EventDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string
    const { events, onFetchEvents } = useEventStore()

    const [detail, setDetail] = useState<EventDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [imgError, setImgError] = useState(false)

    useEffect(() => {
        if (events.length === 0) onFetchEvents()
    }, [])

    useEffect(() => {
        if (!id) return
        const load = async () => {
            setLoading(true)
            try {
                // 1. 상세 API 시도
                const res = await fetch(`https://api.laftel.net/api/events/${id}/`)
                if (res.ok) {
                    const data = await res.json()
                    setDetail(data)
                } else {
                    // 2. 목록에서 찾기 (fallback)
                    const found = events.find(e => String(e.id) === String(id))
                    if (found) setDetail(found as EventDetail)
                }
            } catch {
                // 3. 목록 fallback
                const found = events.find(e => String(e.id) === String(id))
                if (found) setDetail(found as EventDetail)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id, events])

    const formatDate = (dt: string) => dt?.slice(0, 10).replaceAll('-', '.')
    const isPast = detail?.status === 'past'
    const isOngoing = detail?.status === 'ongoing'

    // 관련 이벤트 (같은 type 또는 status)
    const related = events
        .filter(e => String(e.id) !== String(id) && e.status === detail?.status)
        .slice(0, 3)

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    if (!detail) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ fontSize: 48 }}>🎪</p>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 16 }}>이벤트를 찾을 수 없어요</p>
            <button onClick={() => router.push('/event')} style={{ padding: '10px 24px', borderRadius: 10, background: '#6c63ff', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                이벤트 목록으로
            </button>
        </div>
    )

    const bannerSrc = !imgError && (detail.banner_img || detail.img)

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: 80 }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes fade-in { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
                .ev-content img { max-width: 100%; border-radius: 12px; }
                .ev-content a { color: #9d97ff; }
            `}</style>

            {/* 히어로 배너 */}
            <div style={{ position: 'relative', width: '100%', maxHeight: 520, overflow: 'hidden' }}>
                {bannerSrc ? (
                    <img
                        src={bannerSrc}
                        alt={detail.name}
                        onError={() => setImgError(true)}
                        style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', filter: isPast ? 'brightness(0.5)' : 'none' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: 360, background: 'linear-gradient(135deg, #1a1535, #0f0f2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
                        🎪
                    </div>
                )}
                {/* 하단 그라디언트 */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, #0a0a0a, transparent)', pointerEvents: 'none' }} />

                {/* 상태 배지 */}
                <div style={{ position: 'absolute', top: 20, left: 24 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, background: STATUS_COLOR[detail.status] || '#6c63ff', color: '#fff' }}>
                        {STATUS_LABEL[detail.status] || detail.status}
                    </span>
                </div>
            </div>

            {/* 본문 */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px', animation: 'fade-in .4s ease' }}>

                {/* 브레드크럼 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.3)', margin: '24px 0 20px' }}>
                    <Link href="/event" style={{ color: 'rgba(255,255,255,.35)', textDecoration: 'none' }}>이벤트</Link>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                    <span style={{ color: 'rgba(255,255,255,.6)' }}>{detail.name}</span>
                </div>

                {/* 제목 + 메타 */}
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.3 }}>
                    {detail.name}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
                        📅 {formatDate(detail.start_datetime)} ~ {formatDate(detail.end_datetime)}
                    </span>
                    {detail.type && (
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.1)' }}>
                            {detail.type}
                        </span>
                    )}
                </div>

                {/* 구분선 */}
                <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 32 }} />

                {/* 이벤트 내용 */}
                {detail.content ? (
                    <div
                        className="ev-content"
                        style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.8, fontSize: 15 }}
                        dangerouslySetInnerHTML={{ __html: detail.content }}
                    />
                ) : detail.description ? (
                    <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap' }}>
                        {detail.description}
                    </p>
                ) : (
                    /* content/description 없으면 배너 이미지 크게 보여줌 */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        {(detail.img) && (
                            <img
                                src={detail.img}
                                alt={detail.name}
                                style={{ width: '100%', borderRadius: 16, objectFit: 'cover' }}
                            />
                        )}
                        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>
                            이벤트 상세 내용은 라프텔 앱에서 확인해주세요
                        </p>
                    </div>
                )}

                {/* 외부 링크 버튼 */}
                {detail.url && (
                    <a href={detail.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 32, padding: '12px 24px', background: '#6c63ff', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'background .2s' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        이벤트 참여하기
                    </a>
                )}

                {/* 상태별 안내 */}
                {isPast && (
                    <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(255,255,255,.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>📦</span>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', margin: 0 }}>종료된 이벤트예요. 다음 이벤트를 기대해주세요!</p>
                    </div>
                )}

                {/* 목록으로 */}
                <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/event"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: 'rgba(255,255,255,.06)', borderRadius: 10, color: 'rgba(255,255,255,.6)', fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,.1)', transition: 'all .2s' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                        이벤트 목록
                    </Link>
                </div>

                {/* 관련 이벤트 */}
                {related.length > 0 && (
                    <div style={{ marginTop: 56 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 20px' }}>
                            {isOngoing ? '🎪 진행중인 다른 이벤트' : '📋 관련 이벤트'}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {related.map(ev => (
                                <Link key={ev.id} href={`/event/${ev.id}`} style={{ textDecoration: 'none' }}>
                                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', background: '#111', transition: 'transform .2s, border-color .2s', cursor: 'pointer' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(108,99,255,.3)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.07)' }}>
                                        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#1a1a2e' }}>
                                            <img src={ev.img} alt={ev.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: ev.status === 'past' ? 'brightness(.5)' : 'none' }} />
                                        </div>
                                        <div style={{ padding: '10px 12px 12px' }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                {ev.name}
                                            </p>
                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', margin: 0 }}>
                                                {formatDate(ev.start_datetime)} ~ {formatDate(ev.end_datetime)}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
