"use client"
import PageHeader from '@/components/PageHeader'
import { useEffect, useState } from 'react'
import { useEventStore } from '@/store/useEventStore'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
    "ongoing": "진행중",
    "result": "결과 발표",
    "past": "이벤트 종료",
}

const statusStyle: Record<string, string> = {
    "ongoing": "bg-[#6c63ff] text-white",
    "result": "bg-yellow-500/20 text-yellow-400",
    "past": "bg-black/50 text-white/50",
}

const filters = [
    { label: "전체", value: "all" },
    { label: "진행중", value: "ongoing" },
    { label: "이벤트 종료", value: "past" },
    { label: "결과 발표", value: "result" },
]

export default function EventPage() {
    const { events, loading, onFetchEvents } = useEventStore()
    const [activeFilter, setActiveFilter] = useState("all")

    useEffect(() => { onFetchEvents() }, [])

    const filtered = activeFilter === "all" ? events : events.filter((e) => e.status === activeFilter)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div style={{ width: '90%', margin: '0 auto', paddingTop: 64 }}>
                <div style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0' }}>
                    <PageHeader title="이벤트" sub="라프텔의 다양한 이벤트에 참여하세요" />
                </div>

                <div style={{ padding: '28px 0 60px' }}>
                    {/* 필터 탭 — 모바일에서 가로 스크롤 */}
                    <div className="flex gap-2 mb-7 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {filters.map((f) => (
                            <button key={f.value} onClick={() => setActiveFilter(f.value)}
                                className="shrink-0"
                                style={{
                                    padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                    fontSize: 13, fontWeight: 500, transition: 'all .15s',
                                    background: activeFilter === f.value ? '#6c63ff' : 'var(--bg-card)',
                                    color: activeFilter === f.value ? '#fff' : 'var(--text-muted)',
                                }}>
                                {f.label}
                                {f.value !== "all" && (
                                    <span style={{ marginLeft: 6, fontSize: 11, opacity: .7 }}>
                                        {events.filter(e => e.status === f.value).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                            <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    ) : (
                        // 그리드: 모바일 1열 → sm 2열 → lg 3열 (데스크탑 3열은 원본 유지)
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((event) => {
                                const isPast = event.status === "past"
                                return (
                                    <li key={event.id}>
                                        <Link href={`/event/${event.id}`} className="group flex flex-col gap-3">
                                            <div className="relative overflow-hidden rounded-xl aspect-video">
                                                <img src={event.img} alt={event.name}
                                                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isPast ? 'brightness-50' : ''}`} />
                                                {event.status !== "ongoing" && (
                                                    <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[event.status]}`}>
                                                        {statusLabel[event.status]}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span style={{
                                                    fontSize: 14, fontWeight: 500,
                                                    color: isPast ? 'var(--text-subtle)' : 'var(--text-primary)',
                                                    lineHeight: 1.4
                                                }} className="group-hover:text-[#6c63ff] transition-colors">
                                                    {event.name}
                                                </span>
                                                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                                                    {event.start_datetime.slice(0, 10).replaceAll('-', '.')} ~ {event.end_datetime.slice(0, 10).replaceAll('-', '.')}
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-faint)', fontSize: 14 }}>
                            해당하는 이벤트가 없어요.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}