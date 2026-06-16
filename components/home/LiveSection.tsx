'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { buildChannels, getCurrentIdx, getTodaySeed, nowInMinutes } from '@/utils/scheduleUtils'
import { useAniStore } from '@/store/useAniStore'
import channels from '@/data/channels.json'
import styles from './LiveSection.module.css'

export default function LiveSection() {
    const router = useRouter()
    const { aniDetails, onFetchDetail } = useAniStore()
    const schedule = useMemo(() => buildChannels(getTodaySeed()), [])
    const [nowMin, setNowMin] = useState(0)          // ← 초기값 0으로 고정
    const [mounted, setMounted] = useState(false)    // ← 마운트 여부

    useEffect(() => {
        setNowMin(nowInMinutes())   // 클라이언트에서만 실제 시간 적용
        setMounted(true)
        const timer = setInterval(() => setNowMin(nowInMinutes()), 60_000)
        return () => clearInterval(timer)
    }, [])

    const nowPlaying = useMemo(() => {
        return schedule.map((sch) => {
            const currentIdx = getCurrentIdx(sch.items, nowMin)
            const item = sch.items[currentIdx]
            const next = sch.items[currentIdx + 1]

            let progress = 0
            if (item && mounted) {  // ← mounted일 때만 progress 계산
                const [startH, startM] = item.time.split(':').map(Number)
                const startMin = startH * 60 + startM
                const endMin = next
                    ? (() => { const [h, m] = next.time.split(':').map(Number); return h * 60 + m })()
                    : startMin + 30
                const duration = endMin - startMin
                progress = Math.min(100, Math.max(0, ((nowMin - startMin) / duration) * 100))
            }
            return { channelId: sch.id, item, next, progress }
        })
    }, [schedule, nowMin, mounted])

    useEffect(() => {
        nowPlaying.forEach(({ item }) => {
            if (item?.tmdbId) onFetchDetail(item.tmdbId)
        })
    }, [nowPlaying])

    return (
        <section>
            <div className={styles.wrap}>
                <div className={styles.head}>
                    <span className={styles.dot} />
                    <h2 className={styles.title}>지금 실시간 방송 중</h2>
                    <button className={styles.scheduleBtn} onClick={() => router.push('/live')}>
                        편성표
                    </button>
                </div>

                <div className={styles.grid}>
                    {nowPlaying.map(({ channelId, item, next, progress }) => {
                        const ch = channels.find((c) => c.id === channelId)
                        if (!ch || !item) return null
                        const detail = aniDetails[item.tmdbId]
                        const backdropUrl = detail?.backdrop_path
                            ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}`
                            : null

                        return (
                            <div key={channelId} className={styles.card} onClick={() => router.push(`/live/${ch.slug}`)}>
                                <div className={styles.thumb}>
                                    {backdropUrl
                                        ? <img className={styles.img} src={backdropUrl} alt={item.koTitle} />
                                        : <div className={styles.imgFallback}>{item.koTitle[0]}</div>
                                    }
                                    <div className={styles.overlay} />
                                    <span className={styles.badge}>
                                        <span className={styles.badgeDot} />
                                        LIVE
                                    </span>
                                    <div className={styles.play}>
                                        <svg viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" /></svg>
                                    </div>
                                    <div className={styles.progressWrap}>
                                        <div
                                            className={styles.progressBar}
                                            style={{ width: mounted ? `${progress}%` : '0%' }}  // ← mounted 전엔 0%
                                        />
                                    </div>
                                </div>

                                <div className={styles.info}>
                                    <p className={styles.name}>{item.koTitle}</p>
                                    <p className={styles.ep}>10화 진실을 알아버린 아이들을 기다리는 운명은...?!</p>
                                    <div className={styles.meta}>
                                        <img src={ch.logo} alt={ch.name} className={styles.metaLogo} />
                                        방영 중
                                    </div>
                                    {next && (
                                        <p className={styles.next}>다음 · {next.time} {next.koTitle}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}