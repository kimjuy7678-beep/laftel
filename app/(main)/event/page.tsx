"use client"
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

    useEffect(() => {
        onFetchEvents()
    }, [])

    const filtered = activeFilter === "all"
        ? events
        : events.filter((e) => e.status === activeFilter)

    return (
        <div className="min-h-screen">
            <div className="inner px-6 py-16">
                <h1 className="text-2xl font-bold mb-6 text-white">이벤트</h1>

                {/* 필터 탭 */}
                <div className="flex gap-2 mb-8">
                    {filters.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setActiveFilter(f.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === f.value
                                ? 'bg-[#6c63ff] text-white'
                                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {f.label}
                            {f.value !== "all" && (
                                <span className="ml-1.5 text-xs opacity-70">
                                    {events.filter(e => e.status === f.value).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <ul className="grid grid-cols-3 gap-6">
                        {filtered.map((event) => {
                            const isPast = event.status === "past"
                            return (
                                <li key={event.id}>
                                    <Link href={`/event/${event.id}`} className="group flex flex-col gap-3">
                                        <div className="relative overflow-hidden rounded-xl aspect-video">
                                            <img
                                                src={event.img}
                                                alt={event.name}
                                                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isPast ? 'brightness-50' : ''}`}
                                            />
                                            {event.status !== "ongoing" && (
                                                <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[event.status]}`}>
                                                    {statusLabel[event.status]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-sm font-medium leading-snug group-hover:text-[#6c63ff] transition-colors ${isPast ? 'text-white/50' : 'text-white'}`}>
                                                {event.name}
                                            </span>
                                            <span className="text-white/30 text-xs">
                                                {event.start_datetime.slice(0, 10).replaceAll('-', '.')} ~ {event.end_datetime.slice(0, 10).replaceAll('-', '.')}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}

                {/* 필터 결과 없을 때 */}
                {!loading && filtered.length === 0 && (
                    <div className="flex justify-center py-20 text-white/30 text-sm">
                        해당하는 이벤트가 없어요.
                    </div>
                )}
            </div>
        </div>
    )
}