'use client'
import Link from 'next/link'
import channels from '@/data/channels.json'
import PartySection from '@/components/PartySection'
import MyPartySection from '@/components/MyPartySection'
import ScheduleBoard from '@/components/ScheduleBoard'
import { useEffect, useMemo, useState } from 'react'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'
import { useAniStore } from '@/store/useAniStore'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

export default function LivePage() {
    const schedule = useMemo(() => buildChannels(getTodaySeed()), [])
    const nowMin = nowInMinutes()
    const { onFetchDetail, aniDetails } = useAniStore()

    // 각 채널의 현재 방영 중 tmdbId 추출
    const nowPlaying = useMemo(() => {
        return schedule.map(sch => {
            const idx = getCurrentIdx(sch.items, nowMin)
            const item = sch.items[idx]
            return { channelId: sch.id, tmdbId: item?.tmdbId, title: item?.koTitle }
        })
    }, [schedule, nowMin])

    // detail fetch
    useEffect(() => {
        nowPlaying.forEach(({ tmdbId }) => {
            if (tmdbId) onFetchDetail(tmdbId)
        })
    }, [])

    return (
        <div className="min-h-screen">
            <div style={{ width: '90%', margin: '0 auto', padding: '64px 0' }}>
                <div className="flex items-center gap-3 mb-8">
                    <h1 className="text-2xl font-bold">라이브</h1>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                    </span>
                </div>

                <ul className="grid grid-cols-3 gap-6">
                    {channels.map((ch) => {
                        const now = nowPlaying.find(n => n.channelId === ch.id)
                        const detail = now?.tmdbId ? aniDetails[now.tmdbId] : null
                        const backdropUrl = detail?.backdrop_path
                            ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}`
                            : `https://img.youtube.com/vi/${ch.videoId}/maxresdefault.jpg`

                        return (
                            <li key={ch.id}>
                                <Link href={`/live/${ch.slug}`} className="group block">
                                    <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 hover:border-white/20 transition-colors">

                                        {/* 썸네일 — 현재 방영 중인 애니 backdrop */}
                                        <img
                                            src={backdropUrl}
                                            alt={now?.title || ch.name}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                        />

                                        {/* 그라디언트 */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                                        {/* LIVE 뱃지 */}
                                        <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white z-10">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                            LIVE
                                        </span>



                                        {/* 현재 방영 중 타이틀 — 하단 */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                            {now?.title && (
                                                <p className="text-white text-sm font-semibold truncate">
                                                    {now.title}
                                                </p>
                                            )}
                                        </div>

                                        {/* 호버 재생 버튼 */}
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                                                    <polygon points="5,3 19,12 5,21" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <img src={ch.logo} alt={ch.name} className="h-6 w-auto object-contain shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-white font-medium text-sm">{ch.name}</p>
                                            <p className="text-white/40 text-xs mt-0.5 truncate">{ch.description}</p>
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
            </div>
        </div>
    )
}