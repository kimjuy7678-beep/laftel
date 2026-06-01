'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { useRouter } from 'next/navigation'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes, ScheduleItem } from '@/utils/scheduleUtils'

function ChannelBlock({
    label,
    items,
    currentIdx,
}: {
    label: string
    items: ScheduleItem[]
    currentIdx: number
}) {
    const router = useRouter()
    const { aniDetails } = useAniStore()
    const currentRef = useRef<HTMLLIElement>(null)

    useEffect(() => {
        if (currentRef.current) {
            currentRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
    }, [currentIdx])

    return (
        <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] sticky top-0 z-10 backdrop-blur-xl bg-white/[0.01]">
                <h3 className="flex items-center justify-center flex-1">
                    <img src={label} alt="img" className="h-8 w-30 object-contain" />
                </h3>
            </div>

            <ul>
                {items.map((item, i) => {
                    const isCurrent = i === currentIdx
                    const isPast    = i < currentIdx
                    const detail    = aniDetails[item.tmdbId]
                    const posterPath = detail?.poster_path ?? null

                    return (
                        <li
                            key={item.tmdbId}
                            ref={isCurrent ? currentRef : null}
                            onClick={() => {
                                if (isCurrent) {
                                    router.push(`/live/party/dummy-${item.tmdbId}`)
                                } else if (!isPast) {
                                    const today = new Date()
                                    const h = Math.floor(item.minutesFromStart / 60) % 24
                                    const m = item.minutesFromStart % 60
                                    today.setHours(h, m, 0, 0)
                                    if (item.minutesFromStart >= 24 * 60) {
                                        today.setDate(today.getDate() + 1)
                                    }
                                    router.push(`/live/party/dummy-${item.tmdbId}?scheduledAt=${today.toISOString()}`)
                                }
                            }}
                            className={[
                                'relative flex items-center transition-all duration-200',
                                i < items.length - 1 ? 'border-b border-white/[0.05]' : '',
                                isCurrent ? 'gap-5 px-5 py-5' : 'gap-4 px-5 py-3',
                                isCurrent
                                    ? 'bg-[#ff6b3d]/[0.08] hover:bg-[#ff6b3d]/[0.12] cursor-pointer'
                                    : isPast
                                    ? 'cursor-default opacity-60'
                                    : 'hover:bg-white/[0.03] cursor-pointer',
                            ].join(' ')}
                        >
                            {isCurrent && (
                                <span className="absolute left-0 top-4 bottom-4 w-[3px] bg-[#ff6b3d] rounded-r" />
                            )}

                            <span
                                className={[
                                    'font-bold tracking-wider flex-shrink-0 tabular-nums',
                                    isCurrent
                                        ? 'text-[#ff6b3d] text-[15px] min-w-[52px]'
                                        : 'text-[13px] min-w-[46px]',
                                    !isCurrent && isPast  ? 'text-white/15' : '',
                                    !isCurrent && !isPast ? 'text-white/35' : '',
                                ].join(' ')}
                            >
                                {item.time}
                            </span>

                            <div
                                className={[
                                    'flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.06] transition-all duration-200',
                                    isCurrent  ? 'w-[72px] h-[100px]' : 'w-[58px] h-[80px]',
                                    isPast ? 'opacity-30' : 'opacity-100',
                                ].join(' ')}
                            >
                                {posterPath ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w154${posterPath}`}
                                        alt={item.koTitle}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                            const ph = e.currentTarget.parentElement?.querySelector('[data-ph]') as HTMLElement | null
                                            if (ph) ph.style.display = 'flex'
                                        }}
                                    />
                                ) : null}
                                <div
                                    data-ph=""
                                    style={{ display: posterPath ? 'none' : 'flex' }}
                                    className="w-full h-full items-center justify-center text-white/15"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                        <rect x="2" y="5" width="20" height="14" rx="2" />
                                        <path d="M8 2l4 3 4-3" />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                <p
                                    className={[
                                        'font-semibold leading-snug tracking-tight line-clamp-2 transition-all duration-200',
                                        isCurrent  ? 'text-white text-[17px]' : 'text-[15px]',
                                        !isCurrent && isPast  ? 'text-white/30' : '',
                                        !isCurrent && !isPast ? 'text-white/70' : '',
                                    ].join(' ')}
                                >
                                    {item.koTitle}
                                </p>

                                {isCurrent && (
                                    <span className="inline-flex items-center gap-1.5 bg-[#ff4b28] text-white text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded w-fit uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                                        ON AIR
                                    </span>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default function ScheduleBoard() {
    const { onFetchDetail } = useAniStore()
    const channels = useMemo(() => buildChannels(getTodaySeed()), [])
    const [nowMin, setNowMin] = useState(nowInMinutes)

    useEffect(() => {
        const timer = setInterval(() => setNowMin(nowInMinutes()), 60_000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const allIds = channels.flatMap((ch) => ch.items.map((item) => item.tmdbId))
        ;[...new Set(allIds)].forEach((id) => onFetchDetail(id))
    }, [])

    return (
        <section className="rounded-xl overflow-hidden mt-10">
            <div className="px-5 py-5 border-b border-white/[0.06]">
                <h2 className="text-[17px] font-bold text-white tracking-tight">한눈에 보는 지상파 애니메이션 편성표</h2>
            </div>

            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                {channels.map((ch) => {
                    const currentIdx = getCurrentIdx(ch.items, nowMin)
                    return (
                        <div key={ch.id} className="overflow-y-auto max-h-[680px] [&::-webkit-scrollbar]:w-0">
                            <ChannelBlock label={ch.label} items={ch.items} currentIdx={currentIdx} />
                        </div>
                    )
                })}
            </div>
        </section>
    )
}