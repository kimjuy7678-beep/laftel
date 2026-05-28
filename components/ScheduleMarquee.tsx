'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'

export default function ScheduleMarquee() {
    const router = useRouter()
    const channels = useMemo(() => buildChannels(getTodaySeed()), [])
    const nowMin = nowInMinutes()

    const allItems = channels.flatMap(ch => {
        const currentIdx = getCurrentIdx(ch.items, nowMin)
        return ch.items.map((item, i) => ({
            ...item,
            channelId: ch.id,
            isLive: i === currentIdx,
            isPast: i < currentIdx,
        }))
    }).filter(item => !item.isPast)

    const doubled = [...allItems, ...allItems, ...allItems]

    return (
        <div className="w-full overflow-hidden border-t border-b border-white/10 bg-black/30 py-2.5">
            <div className="flex w-max animate-marquee-left">
                {doubled.map((item, i) => (
                    <div
                        key={i}
                        onClick={() => {
                            if (item.isLive) {
                                router.push(`/live/party/dummy-${item.tmdbId}`)
                            } else {
                                const today = new Date()
                                const [h, m] = item.time.split(':').map(Number)
                                today.setHours(h, m, 0, 0)
                                router.push(`/live/party/dummy-${item.tmdbId}?scheduledAt=${today.toISOString()}`)
                            }
                        }}
                        className="flex items-center gap-2 px-5 border-r border-white/10 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                        {item.isLive ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                ON AIR
                            </span>
                        ) : (
                            <span className="text-[10px] text-white/40 border border-white/20 px-2 py-0.5 rounded-full">
                                예정
                            </span>
                        )}
                        <span className="text-[11px] text-white/40">{item.channelId.toUpperCase()}</span>
                        <span className="text-sm text-white/80">{item.koTitle}</span>
                        <span className="text-[11px] text-white/40 tabular-nums">{item.time}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}