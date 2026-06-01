'use client'
import { useEffect, useState } from 'react'
import { useEventStore } from '@/store/useEventStore'
import { useRouter } from 'next/navigation'

const STATUS_LABEL: Record<string, string> = {
    ongoing: '진행중',
    result: '결과발표',
    past: '종료',
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    ongoing: { bg: 'rgba(108,99,255,0.9)', color: '#fff' },
    result: { bg: 'rgba(234,179,8,0.85)', color: '#fff' },
    past: { bg: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.5)' },
}

const FILTERS = [
    { label: '진행중', value: 'ongoing' },

]

export default function EventSection() {
    const { events, loading, onFetchEvents } = useEventStore()
    const router = useRouter()
    const [activeFilter, setActiveFilter] = useState('all')

    useEffect(() => {
        if (events.length === 0) onFetchEvents()
    }, [])

    const filtered = activeFilter === 'all'
        ? events
        : events.filter(e => e.status === activeFilter)

    // 상단 6개만 홈에 노출
    const display = filtered.slice(0, 6)

    return (
        <section style={{ padding: '56px 0 0' }}>
            <style>{`
                .ev-wrap { width: 90%; margin: 0 auto; }

                .ev-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .ev-title { font-size: 25px; font-weight: 700; color: #fff; margin: 0; }
                .ev-more { font-size: 12px; color: rgba(255,255,255,.35); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 3px; transition: color .2s; }
                .ev-more:hover { color: rgba(255,255,255,.7); }

                .ev-filters { display: flex; gap: 8px; margin-bottom: 24px; }
                .ev-filter {
                    padding: 7px 18px; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: transparent; color: rgba(255,255,255,0.45);
                    font-size: 13px; font-weight: 600; cursor: pointer; transition: all .18s;
                }
                .ev-filter:hover { color: #fff; border-color: rgba(255,255,255,.3); }
                .ev-filter.active { background: #6c5ce7; border-color: #6c5ce7; color: #fff; }

                .ev-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }

                .ev-card {
                    cursor: pointer;
                    border-radius: 14px;
                    overflow: hidden;
                    background: #1a1a22;
                    transition: transform .22s cubic-bezier(.25,.46,.45,.94);
                }
                .ev-card:hover { transform: translateY(-4px); }
                .ev-card:hover .ev-thumb-img { transform: scale(1.04); }

                .ev-thumb {
                    width: 100%; aspect-ratio: 16 / 9;
                    overflow: hidden; position: relative; background: #111;
                }
                .ev-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
                .ev-thumb-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: rgba(255,255,255,.05); }

                .ev-status {
                    position: absolute; top: 10px; left: 10px;
                    font-size: 11px; font-weight: 700;
                    padding: 3px 9px; border-radius: 5px; line-height: 1.6;
                }

                .ev-info { padding: 12px 14px 14px; }
                .ev-name {
                    font-size: 16px; font-weight: 600; color: rgba(255,255,255,.88);
                    margin: 0 0 5px; line-height: 1.4;
                    overflow: hidden;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                }
                .ev-period { font-size: 13px; color: rgba(255,255,255,.3); margin: 0; }

                .ev-loading { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.25); font-size: 13px; height: 200px; }
                .ev-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.1); border-top-color: #6c63ff; border-radius: 50%; animation: ev-spin .7s linear infinite; }
                @keyframes ev-spin { to { transform: rotate(360deg) } }
                .ev-empty { text-align: center; padding: 60px 0; color: rgba(255,255,255,.2); font-size: 14px; }
            `}</style>

            <div className="ev-wrap">
                <div className="ev-head">
                    <h2 className="ev-title">오직 라프텔 유저만을 위한 특별한 혜택</h2>
                    <button className="ev-more" onClick={() => router.push('/event')}>
                        전체보기
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="ev-filters">
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            className={`ev-filter${activeFilter === f.value ? ' active' : ''}`}
                            onClick={() => setActiveFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="ev-loading">
                        <div className="ev-spinner" />
                        이벤트 불러오는 중...
                    </div>
                ) : display.length === 0 ? (
                    <div className="ev-empty">해당 이벤트가 없어요</div>
                ) : (
                    <div className="ev-grid">
                        {display.map(ev => {
                            const st = STATUS_STYLE[ev.status] || STATUS_STYLE.past

                            // period 파싱
                            const start = ev.start_datetime?.slice(0, 10).replace(/-/g, '.')
                            const end = ev.end_datetime?.slice(0, 10).replace(/-/g, '.')
                            const period = start && end ? `${start} ~ ${end}` : ''

                            return (
                                <div
                                    key={ev.id}
                                    className="ev-card"
                                    onClick={() => router.push(`/event/${ev.id}`)}
                                >
                                    <div className="ev-thumb">
                                        {ev.img
                                            ? <img className="ev-thumb-img" src={ev.img} alt={ev.name} />
                                            : <div className="ev-thumb-np">{(ev.name || '?')[0]}</div>
                                        }
                                        <span
                                            className="ev-status"
                                            style={{ background: st.bg, color: st.color }}
                                        >
                                            {STATUS_LABEL[ev.status] || ev.status}
                                        </span>
                                    </div>
                                    <div className="ev-info">
                                        <p className="ev-name">{ev.name}</p>
                                        {period && <p className="ev-period">{period}</p>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}