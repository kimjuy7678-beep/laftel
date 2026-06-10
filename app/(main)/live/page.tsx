'use client'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import channels from '@/data/channels.json'
import PartySection from '@/components/PartySection'
import MyPartySection from '@/components/MyPartySection'
import ScheduleBoard from '@/components/ScheduleBoard'
import { useEffect, useMemo } from 'react'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'
import { useAniStore } from '@/store/useAniStore'
import ScheduleMarquee from '@/components/ScheduleMarquee'

export default function LivePage() {
    const schedule = useMemo(() => buildChannels(getTodaySeed()), [])
    const nowMin = nowInMinutes()
    const { onFetchDetail, aniDetails } = useAniStore()

    const nowPlaying = useMemo(() => {
        return schedule.map(sch => {
            const idx = getCurrentIdx(sch.items, nowMin)
            const item = sch.items[idx]
            return { channelId: sch.id, tmdbId: item?.tmdbId, title: item?.koTitle }
        })
    }, [schedule, nowMin])

    useEffect(() => {
        nowPlaying.forEach(({ tmdbId }) => {
            if (tmdbId) onFetchDetail(tmdbId)
        })
    }, [])

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="pb-20" style={{ width: '90%', margin: '0 auto', paddingTop: 64 }}>
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] py-4 mb-6 sm:gap-3 sm:py-[18px] sm:mb-7">
                    <PageHeader title="라이브" sub="지금 이 순간, 함께 보는 애니메이션" />
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                    </span>
                </div>

                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {channels.map((ch) => {
                        const now = nowPlaying.find(n => n.channelId === ch.id)
                        const detail = now?.tmdbId ? aniDetails[now.tmdbId] : null
                        const backdropUrl = detail?.backdrop_path
                            ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}`
                            : `https://img.youtube.com/vi/${ch.videoId}/maxresdefault.jpg`

                        return (
                            <li key={ch.id}>
                                <Link href={`/live/${ch.slug}`} className="group block">
                                    <div className="relative aspect-video rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-faint)] hover:border-[var(--border)] transition-colors">

                                        <img
                                            src={backdropUrl}
                                            alt={now?.title || ch.name}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                                        <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white z-10">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                            LIVE
                                        </span>

                                        <div className="absolute bottom-0 left-0 right-0 p-3 z-10 sm:p-4">
                                            {now?.title && (
                                                <p className="text-white text-sm font-semibold truncate">
                                                    {now.title}
                                                </p>
                                            )}
                                        </div>

                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="opacity-100 transition-opacity w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 sm:w-14 sm:h-14">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                                                    <polygon points="5,3 19,12 5,21" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <img src={ch.logo} alt={ch.name} className="h-6 w-auto object-contain shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[var(--text-primary)] font-medium text-sm">{ch.name}</p>
                                            <p className="text-[var(--text-faint)] text-xs mt-0.5 truncate">{ch.description}</p>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        )
                    })}
                </ul>

                <MyPartySection />
                <PartySection />
                <ScheduleBoard />
                <div className="fixed bottom-0 left-0 z-50 w-full bg-[var(--bg-primary)]">
                    <ScheduleMarquee />
                </div>
            </div>
        </div>
    )
}
