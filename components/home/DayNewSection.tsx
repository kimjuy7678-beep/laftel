'use client'
import { useAniStore } from '@/store/useAniStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import { useEffect, useState } from 'react'
import { usePreviewStore } from '@/store/usePreviewStore'
import styles from './DayNewSection.module.css'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const today = new Date().getDay()
const todayIdx = today === 0 ? 6 : today - 1

export default function DayNewSection() {
    const { onFetchAni, contentRatings } = useAniStore()
    const [activeDay, setActiveDay] = useState(todayIdx)
    const { setPreviewId } = usePreviewStore()
    const aniList = useFilteredAniList()

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const dayItems = aniList.slice(activeDay * 6, activeDay * 6 + 6)

    return (
        <section>
            <div className={styles.wrap}>
                <h2 className={styles.title}>요일별 신작</h2>

                <div className={styles.tabs}>
                    {DAYS.map((d, i) => (
                        <button
                            key={d}
                            className={`${styles.tab} ${activeDay === i ? styles.tabActive : ''}`}
                            onClick={() => setActiveDay(i)}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <div className={styles.grid}>
                    {dayItems.map((ani: any, idx: number) => {
                        const ratingStr = contentRatings[ani.id] ?? 'ALL'
                        const age = ratingStr === 'ALL' ? 0 : Number(ratingStr)
                        const ageClass =
                            age === 19 ? styles.age19 :
                                age === 15 ? styles.age15 :
                                    age === 12 ? styles.age12 :
                                        age === 7 ? styles.age7 :
                                            styles.ageAll
                        const ageLabel = ratingStr === 'ALL' ? 'ALL' : `${ratingStr}`
                        const isExclusive = idx % 3 === 0
                        const isUp = idx % 2 === 0

                        return (
                            <div key={ani.id} className={styles.card} onClick={() => setPreviewId(ani.id)}>
                                {ani.backdrop_path
                                    ? <img className={styles.img} src={`https://image.tmdb.org/t/p/w780${ani.backdrop_path}`} alt={ani.name} />
                                    : <div className={styles.imgFallback}>{(ani.name || '?')[0]}</div>
                                }
                                <div className={styles.gradient} />
                                <div className={styles.play}>
                                    <svg viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" /></svg>
                                </div>
                                {isUp && <span className={styles.up}>UP</span>}
                                <div className={styles.bottom}>
                                    <p className={styles.name}>{ani.name}</p>
                                    <div className={styles.meta}>
                                        <div className={styles.tags}>
                                            <span>판타지·액션</span>
                                            <span className={styles.tagsSep}>|</span>
                                            <span>TVA</span>
                                            <span className={`${styles.age} ${ageClass}`}>{ageLabel}</span>
                                        </div>
                                        {isExclusive && <span className={styles.exclusive}>선독점</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}