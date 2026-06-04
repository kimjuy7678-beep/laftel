'use client'

import { useEffect, useState } from 'react'
import CalendarModal from './CalendarModal'
import { useAniStore } from '@/store/useAniStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import { usePreviewStore } from '@/store/usePreviewStore'
import styles from './page.module.css'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const today = new Date().getDay()
const todayIdx = today === 0 ? 6 : today - 1

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF·판타지', 9648: '미스터리', 10749: '로맨스',
    10751: '가족', 27: '호러', 53: '스릴러', 80: '범죄',
}

const getThumb = (ani: any) =>
    ani.poster_path
        ? `https://image.tmdb.org/t/p/w342${ani.poster_path}`
        : ani.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${ani.backdrop_path}`
        : null

export default function DayNewPage() {
    const { onFetchAni, contentRatings } = useAniStore()
    const [activeDay, setActiveDay] = useState(todayIdx)
    const [showCalendar, setShowCalendar] = useState(false)
    const { setPreviewId } = usePreviewStore()
    const aniList = useFilteredAniList()

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const dayItems = aniList.slice(activeDay * 20, activeDay * 20 + 20)

    const getAgeClass = (ratingStr: string) => {
        const age = ratingStr === 'ALL' ? 0 : Number(ratingStr)
        if (age === 19) return styles.age19
        if (age === 15) return styles.age15
        if (age === 12) return styles.age12
        if (age === 7)  return styles.age7
        return styles.ageAll
    }
    const getGenre = (ani: any) =>
        (ani.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 2).join('·') || '애니메이션'

    const handleCalendarSelect = (dateStr: string) => {
        const d = new Date(dateStr)
        const jsDay = d.getDay()
        setActiveDay(jsDay === 0 ? 6 : jsDay - 1)
    }

    const renderCard = (ani: any, idx: number, extraClass?: string) => {
        const ratingStr = contentRatings[ani.id] ?? 'ALL'
        return (
            <div
                key={ani.id}
                className={`${styles.card} ${extraClass ?? ''}`}
                onClick={() => setPreviewId(ani.id)}
            >
                {getThumb(ani)
                    ? <img className={styles.cardImg} src={getThumb(ani)!} alt={ani.name} />
                    : <div className={styles.cardFallback}>{(ani.name || '?')[0]}</div>
                }
                <div className={styles.cardGradient} />
                <div className={styles.cardPlay}>
                    <svg viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" /></svg>
                </div>
                {idx % 2 === 0 && <span className={styles.badgeUp}>UP</span>}
                {idx % 3 === 0 && <span className={styles.badgeEx}>선독점</span>}
                <div className={styles.cardBottom}>
                    <p className={styles.cardName}>{ani.name}</p>
                    <div className={styles.cardTags}>
                        <span>{getGenre(ani)}</span>
                        <span className={styles.sep}>|</span>
                        <span>TVA</span>
                        <span className={`${styles.age} ${getAgeClass(ratingStr)}`}>
                            {ratingStr}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>

            <div className={styles.pageHeader}>
                <div className={styles.pageHeaderInner}>
                    <h1 className={styles.pageTitle}>{DAYS[activeDay]}요일 업데이트</h1>

                    <div className={styles.tabs}>
                        {DAYS.map((d, i) => (
                            <button
                                key={d}
                                className={[
                                    styles.tab,
                                    activeDay === i ? styles.tabActive : '',
                                    i === todayIdx ? styles.tabToday : '',
                                ].join(' ')}
                                onClick={() => setActiveDay(i)}
                            >
                                {d}
                            </button>
                        ))}
                        <button className={styles.calBtn} onClick={() => setShowCalendar(true)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            전체 일정
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.mainGrid}>
                    {dayItems.length > 0 ? (
                        dayItems.map((ani: any, idx: number) => {
                            if (idx === 0) return renderCard(ani, idx, styles.heroFirst)
                            if (idx === 1) return renderCard(ani, idx, styles.heroSecond)
                            return renderCard(ani, idx)
                        })
                    ) : (
                        <>
                            <div className={styles.skeletonHero3} />
                            <div className={styles.skeletonHero4} />
                            {Array.from({ length: 14 }).map((_, i) => (
                                <div key={i} className={styles.skeleton} />
                            ))}
                        </>
                    )}
                </div>
            </div>

            {showCalendar && (
                <CalendarModal
                    onClose={() => setShowCalendar(false)}
                    onSelectDate={handleCalendarSelect}
                />
            )}
        </div>
    )
}
