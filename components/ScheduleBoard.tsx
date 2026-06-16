'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { useRouter } from 'next/navigation'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes, ScheduleItem } from '@/utils/scheduleUtils'
import channels from '@/data/channels.json'

function ChannelBlock({
    label,
    channelSlug,
    items,
    currentIdx,
}: {
    label: string
    channelSlug: string
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
        <div className="flex flex-col min-w-0 h-full rounded-xl border border-[var(--border-faint)] bg-[var(--bg-card)] xl:rounded-none xl:border-0 xl:bg-transparent">
            {/* 헤더 — 채널 로고 클릭 시 해당 채널 페이지로 이동 */}
            <div
                className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-faint)] shrink-0 backdrop-blur-xl bg-[var(--bg-card)]/[0.9] sm:px-5 sm:py-4 xl:bg-[var(--bg-primary)]/[0.85] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => router.push(`/live/${channelSlug}`)}
            >
                <h3 className="flex items-center justify-center flex-1">
                    <img src={label} alt="img" className="h-7 w-28 object-contain sm:h-8 sm:w-30" />
                </h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-faint)] shrink-0">
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </div>

            <ul className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-0">
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
                                // 현재 방영중 → 채널 페이지로
                                if (isCurrent) {
                                    router.push(`/live/${channelSlug}`)
                                } else if (!isPast) {
                                    // 예정 → 채널 페이지로 (scheduledAt 쿼리)
                                    const today = new Date()
                                    const h = Math.floor(item.minutesFromStart / 60) % 24
                                    const m = item.minutesFromStart % 60
                                    today.setHours(h, m, 0, 0)
                                    if (item.minutesFromStart >= 24 * 60) {
                                        today.setDate(today.getDate() + 1)
                                    }
                                    router.push(`/live/${channelSlug}?scheduledAt=${today.toISOString()}`)
                                }
                            }}
                            className={[
                                'relative flex items-center transition-all duration-200',
                                i < items.length - 1 ? 'border-b border-[var(--border-faint)]' : '',
                                isCurrent ? 'gap-4 px-4 py-4 sm:gap-5 sm:px-5 sm:py-5' : 'gap-3 px-4 py-3 sm:gap-4 sm:px-5',
                                isCurrent
                                    ? 'bg-[#ff6b3d]/[0.08] hover:bg-[#ff6b3d]/[0.12] cursor-pointer'
                                    : isPast
                                    ? 'cursor-default opacity-60'
                                    : 'hover:bg-[var(--border-faint)] cursor-pointer',
                            ].join(' ')}
                        >
                            {isCurrent && (
                                <span className="absolute left-0 top-4 bottom-4 w-[3px] bg-[#ff6b3d] rounded-r" />
                            )}

                            <span
                                className={[
                                    'font-bold tracking-wider flex-shrink-0 tabular-nums',
                                    isCurrent
                                        ? 'text-[#ff6b3d] text-[14px] min-w-[48px] sm:text-[15px] sm:min-w-[52px]'
                                        : 'text-[12px] min-w-[42px] sm:text-[13px] sm:min-w-[46px]',
                                    !isCurrent && isPast  ? 'text-[var(--text-faint)]' : '',
                                    !isCurrent && !isPast ? 'text-[var(--text-subtle)]' : '',
                                ].join(' ')}
                            >
                                {item.time}
                            </span>

                            <div
                                className={[
                                    'flex-shrink-0 rounded-lg overflow-hidden bg-[var(--border-subtle)] transition-all duration-200',
                                    isCurrent  ? 'w-[62px] h-[88px] sm:w-[72px] sm:h-[100px]' : 'w-[50px] h-[70px] sm:w-[58px] sm:h-[80px]',
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
                                    className="w-full h-full items-center justify-center text-[var(--text-faint)]"
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
                                        isCurrent  ? 'text-[var(--text-primary)] text-[15px] sm:text-[17px]' : 'text-[14px] sm:text-[15px]',
                                        !isCurrent && isPast  ? 'text-[var(--text-subtle)]' : '',
                                        !isCurrent && !isPast ? 'text-[var(--text-muted)]' : '',
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
    const scheduleChannels = useMemo(() => buildChannels(getTodaySeed()), [])
    const [nowMin, setNowMin] = useState(nowInMinutes)

    useEffect(() => {
        const timer = setInterval(() => setNowMin(nowInMinutes()), 60_000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const allIds = scheduleChannels.flatMap((ch) => ch.items.map((item) => item.tmdbId))
        ;[...new Set(allIds)].forEach((id) => onFetchDetail(id))
    }, [])

    return (
        <section className="mt-10 pb-6">
            <div className="mb-4 flex flex-col gap-1 sm:mb-5">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">편성표</h2>
                <p className="text-sm text-[var(--text-muted)]">지금 방송 중인 작품과 다음 방송을 확인해보세요</p>
            </div>

            <div className="grid grid-flow-col auto-cols-[minmax(292px,86vw)] gap-3 overflow-x-auto pb-2 sm:auto-cols-[minmax(340px,42vw)] xl:grid-flow-row xl:grid-cols-3 xl:gap-0 xl:divide-x xl:divide-[var(--border-subtle)] xl:overflow-hidden xl:rounded-xl xl:border xl:border-[var(--border-faint)]">
                {scheduleChannels.map((sch) => {
                    const currentIdx = getCurrentIdx(sch.items, nowMin)
                    // channels.json에서 slug 매칭
                    const channelInfo = channels.find(c => c.id === sch.id)
                    const slug = channelInfo?.slug ?? sch.id
                    return (
                        <div key={sch.id} className="flex flex-col max-h-[520px] sm:max-h-[640px] xl:max-h-[680px]">
                            <ChannelBlock
                                label={sch.label}
                                channelSlug={slug}
                                items={sch.items}
                                currentIdx={currentIdx}
                            />
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
