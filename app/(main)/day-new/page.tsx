'use client'

import PageHeader from '@/components/PageHeader'
import { useEffect, useState, useRef } from 'react'
import CalendarModal from './CalendarModal'
import { useAniStore } from '@/store/useAniStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import { usePreviewStore } from '@/store/usePreviewStore'
import styles from './page.module.css'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const DAY_LABELS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
const today = new Date().getDay()
const todayIdx = today === 0 ? 6 : today - 1

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF·판타지', 9648: '미스터리', 10749: '로맨스',
    10751: '가족', 27: '호러', 53: '스릴러', 80: '범죄',
}

const getThumb = (ani: any, size: 'w342' | 'w780' = 'w342') =>
    ani.poster_path
        ? `https://image.tmdb.org/t/p/${size}${ani.poster_path}`
        : ani.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${ani.backdrop_path}`
            : null

export default function DayNewPage() {
    const { onFetchAni, contentRatings } = useAniStore()
    const [activeDay, setActiveDay] = useState(todayIdx)
    const [showCalendar, setShowCalendar] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const { setPreviewId } = usePreviewStore()
    const aniList = useFilteredAniList()
    const restScrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const todayItems = aniList.slice(todayIdx * 20, todayIdx * 20 + 20)
    const featured = todayItems[0] ?? null
    const restItems = todayItems.slice(1)


    const popularTitle = featured?.name ?? ''

    const allDayItems = aniList.slice(activeDay * 20, activeDay * 20 + 40)
    const SHOW_LIMIT = 21
    const dayItems = showAll ? allDayItems : allDayItems.slice(0, SHOW_LIMIT)
    const hasMore = allDayItems.length > SHOW_LIMIT

    const getAgeClass = (r: string) => {
        const n = r === 'ALL' ? 0 : Number(r)
        if (n === 19) return styles.age19
        if (n === 15) return styles.age15
        if (n === 12) return styles.age12
        if (n === 7) return styles.age7
        return styles.ageAll
    }
    const getGenre = (ani: any) =>
        (ani.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 2).join('·') || '애니메이션'

    const handleCalendarSelect = (dateStr: string) => {
        const d = new Date(dateStr)
        setActiveDay(d.getDay() === 0 ? 6 : d.getDay() - 1)
    }

    const scroll = (dir: 'left' | 'right') => {
        restScrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
    }

    return (
        <div className={styles.page}>
            <section className={styles.section}>
                <div className={styles.inner}>
                    <div className={styles.sectionHead}>
                        <PageHeader title="요일별 신작" sub="매일 업데이트되는 최신 애니메이션" />

                    </div>

                    <div className={styles.todayLayout}>
                        {/* 피처드 래퍼 — restCard와 동일 구조 */}
                        <div className={styles.featuredWrap}>
                            {featured ? (
                                <div className={styles.featuredCard} onClick={() => setPreviewId(featured.id)}>
                                    {getThumb(featured, 'w780')
                                        ? <img className={styles.featuredImg} src={getThumb(featured, 'w780')!} alt={featured.name} />
                                        : <div className={styles.featuredFallback}>{(featured.name || '?')[0]}</div>
                                    }
                                    <div className={styles.featuredGradient} />
                                    <span className={styles.badgeSel}>선독점</span>
                                    <div className={styles.featuredBottom}>
                                        <div className={styles.featuredGenres}>
                                            {(featured.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 3).map((g: string) => (
                                                <span key={g} className={styles.genreTag}>{g}</span>
                                            ))}
                                        </div>
                                        <p className={styles.featuredName}>{featured.name}</p>
                                        <p className={styles.featuredDesc}>{featured.overview || '줄거리 정보가 없습니다.'}</p>
                                        <button className={styles.watchBtn}>
                                            <svg width="11" height="11" viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" fill="currentColor" /></svg>
                                            지금 보기
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.featuredSkeleton} />
                            )}
                            {featured && <p className={styles.restName}>{featured.name}</p>}
                        </div>

                        {/* 우측 2행×5열 */}
                        <div className={styles.restGrid}>
                            {(restItems.slice(0, 10).length > 0 ? restItems.slice(0, 10) : Array(10).fill(null)).map((ani: any, idx: number) =>
                                ani ? (
                                    <div key={ani.id} className={styles.restCard} onClick={() => setPreviewId(ani.id)}>
                                        <div className={styles.restThumb}>
                                            {getThumb(ani)
                                                ? <img className={styles.restImg} src={getThumb(ani)!} alt={ani.name} />
                                                : <div className={styles.restFallback}>{(ani.name || '?')[0]}</div>
                                            }
                                            <div className={styles.restOverlay}>
                                                <div className={styles.restOverlayGenres}>
                                                    {(ani.genre_ids ?? []).map((g: number) => GENRE_MAP[g]).filter(Boolean).slice(0, 2).map((g: string) => (
                                                        <span key={g} className={styles.restOverlayTag}>{g}</span>
                                                    ))}
                                                </div>
                                                <p className={styles.restOverlayName}>{ani.name}</p>
                                                <p className={styles.restOverlayDesc}>{ani.overview || '줄거리 정보가 없습니다.'}</p>
                                                <button className={styles.restOverlayBtn}>
                                                    <svg width="9" height="9" viewBox="0 0 12 14"><path d="M1 1l10 6L1 13V1z" fill="currentColor" /></svg>
                                                    지금 보기
                                                </button>
                                            </div>
                                            {idx % 2 === 0 && <span className={styles.badgeUp}>UP</span>}
                                            {idx % 3 === 0 && <span className={styles.badgeSel}>선독점</span>}
                                        </div>
                                        <p className={styles.restName}>{ani.name}</p>
                                    </div>
                                ) : (
                                    <div key={idx} className={styles.restSkeleton} />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {popularTitle && (
                <div className={styles.popularBanner}>
                    <div className={styles.inner}>
                        <div className={styles.popularInner}>
                            <img
                                src="/images/laftel-icon/new.png"
                                alt="라프텔 캐릭터"
                                className={styles.popularChar}
                            />
                            <div className={styles.popularBubble}>
                                <p className={styles.popularText}>
                                    오늘 가장 인기있는 애니는{' '}
                                    <span className={styles.popularTitle}>"{popularTitle}"</span>
                                    {' '}입니다
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            <section className={styles.section}>
                <div className={styles.inner}>
                    <div className={styles.daysectionHead}>
                        <PageHeader title="요일별 신작" sub="매일 업데이트되는 최신 애니메이션" />
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

                    <div className={styles.dayTabs}>
                        {DAYS.map((d, i) => (
                            <button
                                key={d}
                                className={[
                                    styles.dayTab,
                                    activeDay === i ? styles.dayTabActive : '',
                                    i === todayIdx ? styles.dayTabToday : '',
                                ].join(' ')}
                                onClick={() => { setActiveDay(i); setShowAll(false) }}
                            >
                                <span className={styles.dayTabLabel}>{d}요일</span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.dayGrid}>
                        {(dayItems.length > 0 ? dayItems : Array(14).fill(null)).map((ani: any, idx: number) =>
                            ani ? (
                                <div key={ani.id} className={styles.dayCard} onClick={() => setPreviewId(ani.id)}>
                                    <div className={styles.dayThumb}>
                                        {getThumb(ani)
                                            ? <img className={styles.dayImg} src={getThumb(ani)!} alt={ani.name} />
                                            : <div className={styles.dayFallback}>{(ani.name || '?')[0]}</div>
                                        }
                                        {idx % 3 === 0 && <span className={styles.badgeSel}>선독점</span>}
                                        {idx % 2 === 0 && <span className={styles.badgeUp}>UP</span>}
                                    </div>
                                    <p className={styles.dayName}>{ani.name}</p>
                                </div>
                            ) : (
                                <div key={idx} className={styles.daySkeleton} />
                            )
                        )}
                    </div>

                    {hasMore && (
                        <div className={styles.moreWrap}>
                            <button className={styles.moreBtn} onClick={() => setShowAll(v => !v)}>
                                {showAll ? (
                                    <>
                                        접기
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>
                                    </>
                                ) : (
                                    <>
                                        더보기 ({allDayItems.length - SHOW_LIMIT}개 더)
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {showCalendar && (
                <CalendarModal
                    onClose={() => setShowCalendar(false)}
                    onSelectDate={handleCalendarSelect}
                />
            )}
        </div>
    )
}
