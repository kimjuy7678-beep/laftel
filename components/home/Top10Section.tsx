'use client'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import { usePreviewStore } from '@/store/usePreviewStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import Image from 'next/image'

const POSTER_W = 340
const POSTER_H = 510
const NUM_W = 160
const OVERLAP = 60
const CARD_W = NUM_W + POSTER_W - OVERLAP
const NUM_FONT = 220

const FILTERS = ['실시간', '주간', '역대'] as const
type Filter = typeof FILTERS[number]

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 10749: '로맨스',
    10751: '가족', 27: '공포', 53: '스릴러', 80: '범죄',
}

export default function Top10Section() {
    const { onFetchAni } = useAniStore()
    const { setPreviewId } = usePreviewStore()
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)
    const [activeFilter, setActiveFilter] = useState<Filter>('실시간')
    const aniList = useFilteredAniList();

    const bindNavigation = (swiper: SwiperType) => {
        const navigation = swiper.params.navigation
        if (!navigation || typeof navigation === 'boolean') return
        navigation.prevEl = prevRef.current
        navigation.nextEl = nextRef.current
    }

    useEffect(() => { if (aniList.length === 0) onFetchAni() }, [])

    const getTop10 = (filter: Filter) => {
        const sorted = [...aniList]
        switch (filter) {
            case '실시간': return sorted.sort((a: any, b: any) => b.popularity - a.popularity).slice(0, 10)
            case '주간': return sorted.sort((a: any, b: any) => b.vote_count - a.vote_count).slice(0, 10)
            case '역대': return sorted.filter((a: any) => a.vote_count > 100).sort((a: any, b: any) => b.vote_average - a.vote_average).slice(0, 10)
        }
    }

    const top10 = getTop10(activeFilter)
    if (!top10 || top10.length === 0) return null

    return (
        <section style={{ padding: '56px 0 0' }}>
            <style>{`
                .t10-wrap { width: 90%; margin: 0 auto; }
                .t10-eyebrow { font-size: 13px; font-weight: 700; color: var(--text-faint); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 6px; }
                .t10-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
                .t10-title { font-size: 25px; font-weight: 700; color: var(--text-primary); margin: 0; }
                .t10-nav { display: flex; gap: 8px; }
                .t10-nav-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--border-subtle); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; }
                .t10-nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
                .t10-filters { display: flex; gap: 8px; margin-bottom: 28px; overflow-x: auto; scrollbar-width: none; }
                .t10-filters::-webkit-scrollbar { display: none; }
                .t10-filter-btn { padding: 7px 18px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); font-size: 15px; font-weight: 600; cursor: pointer; transition: all .18s; }
                .t10-filter-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
                .t10-filter-btn.active { background: #6c5ce7; border-color: #6c5ce7; color: #fff; }
                .t10-desktop-slider { margin-left: ${-(NUM_W - OVERLAP)}px; }
                .t10-swiper { touch-action: pan-y; user-select: none; }
                .t10-card { position: relative; width: ${CARD_W}px; cursor: pointer; transition: transform .25s; }
                .t10-card:hover { transform: translateY(-6px); }
                .t10-rank { position: absolute; left: -20px; bottom: 37px; width: ${NUM_W + 20}px; font-size: ${NUM_FONT}px; font-weight: 900; line-height: 1; color: #ffffff; text-align: right; z-index: 3; user-select: none; letter-spacing: -0.06em; text-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4); }
                .t10-thumb { position: absolute; right: 0; top: 0; width: ${POSTER_W}px; height: ${POSTER_H}px; border-radius: 12px; overflow: hidden; background: var(--bg-card); box-shadow: 0 10px 32px rgba(0,0,0,0.7); z-index: 2; transition: transform .25s, box-shadow .25s; }
                .t10-card:hover .t10-thumb { transform: translateY(-4px); box-shadow: 0 18px 48px rgba(0,0,0,0.9); }
                .t10-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .25s; }
                .t10-card:hover .t10-thumb img { transform: scale(1.04); }
                .t10-thumb-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; color: var(--border-subtle); }
                .t10-info { position: relative; z-index: 1; padding-top: ${POSTER_H + 14}px; padding-left: ${NUM_W - OVERLAP}px; text-align: center; top: 10px; }
                .t10-name { font-size: 24px; font-weight: 700; color: var(--text-primary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 4px; line-height: 1.3; }
                .t10-tags { font-size: 18px; color: var(--text-subtle); }
                .t10-mobile-scroll { display: none; }
                @media (max-width: 640px) {
                    .t10-wrap { width: calc(100% - 32px); }
                    .t10-eyebrow { font-size: 11px; }
                    .t10-title { font-size: 20px; line-height: 1.35; }
                    .t10-nav { display: none; }
                    .t10-filters { margin-right: -16px; padding-right: 16px; }
                    .t10-filter-btn { flex: 0 0 auto; padding: 7px 14px; font-size: 13px; }
                    .t10-desktop-slider { display: none; }
                    .t10-mobile-scroll {
                        display: flex;
                        gap: 10px;
                        margin-left: -16px;
                        margin-right: -16px;
                        padding: 0 16px 4px 64px;
                        overflow-x: auto;
                        scroll-snap-type: x mandatory;
                        scrollbar-width: none;
                        touch-action: pan-x;
                    }
                    .t10-mobile-scroll::-webkit-scrollbar { display: none; }
                    .t10-mobile-card {
                        position: relative;
                        flex: 0 0 198px;
                        width: 198px;
                        height: 286px;
                        scroll-snap-align: start;
                        cursor: pointer;
                    }
                    .t10-mobile-rank {
                        position: absolute;
                        left: -52px;
                        bottom: 46px;
                        width: 98px;
                        font-size: 118px;
                        font-weight: 900;
                        line-height: 1;
                       color: #fff;
                        text-align: right;
                        z-index: 3;
                        user-select: none;
                        letter-spacing: -0.04em;
                        text-shadow: 0 8px 28px rgba(0,0,0,0.58), 0 2px 8px rgba(0,0,0,0.4);
                    }
                    .t10-mobile-thumb {
                        position: absolute;
                        right: 0;
                        top: 0;
                        width: 156px;
                        height: 234px;
                        border-radius: 10px;
                        overflow: hidden;
                        background: var(--bg-card);
                        box-shadow: 0 10px 28px rgba(0,0,0,0.62);
                        z-index: 2;
                    }
                    .t10-mobile-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                    .t10-mobile-thumb-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; color: var(--border-subtle); }
                    .t10-mobile-info { position: relative; z-index: 1; padding-top: 244px; padding-left: 44px; text-align: center; }
                    .t10-mobile-name { font-size: 15px; font-weight: 700; color: var(--text-primary); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 3px; line-height: 1.3; }
                    .t10-mobile-tags { font-size: 12px; color: var(--text-subtle); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                }
            `}</style>

            <div className="t10-wrap">
                <p className="t10-eyebrow">라프텔 서버 터지게 만든 화제의 작품</p>
                <div className="t10-head">
                    <h2 className="t10-title">라프텔 인기 TOP10</h2>
                    <div className="t10-nav">
                        <button ref={prevRef} className="t10-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button ref={nextRef} className="t10-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>

                <div className="t10-filters">
                    {FILTERS.map(f => (
                        <button key={f} className={`t10-filter-btn${activeFilter === f ? ' active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
                    ))}
                </div>

                <div className="t10-desktop-slider">
                    <Swiper
                        className="t10-swiper"
                        modules={[Navigation]}
                        navigation
                        onBeforeInit={bindNavigation}
                        slidesPerView="auto"
                        spaceBetween={-20}
                        allowTouchMove
                        simulateTouch={false}
                        touchRatio={1.15}
                        watchOverflow
                        style={{ overflow: 'visible' }}
                    >
                        {top10.map((ani, i) => {
                            const genres = (ani.genre_ids || []).slice(0, 3).map((id: number) => GENRE_MAP[id]).filter(Boolean).join(', ')
                            return (
                                <SwiperSlide key={ani.id} style={{ width: CARD_W }}>
                                    <div className="t10-card" style={{ height: POSTER_H + 60 }} onClick={() => setPreviewId(ani.id)}>
                                        <span className="t10-rank">{i + 1}</span>
                                        <div className="t10-thumb">
                                            {ani.poster_path
                                                ? <Image src={`https://image.tmdb.org/t/p/w500${ani.poster_path}`} alt={ani.name} fill sizes="340px" style={{ objectFit: 'cover' }} />
                                                : <div className="t10-thumb-np">{(ani.name || '?')[0]}</div>
                                            }
                                        </div>
                                        <div className="t10-info">
                                            <p className="t10-name">{ani.name}</p>
                                            {genres && <p className="t10-tags">{genres}</p>}
                                        </div>
                                    </div>
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>
                </div>

                <div className="t10-mobile-scroll">
                    {top10.map((ani, i) => {
                        const genres = (ani.genre_ids || []).slice(0, 3).map((id: number) => GENRE_MAP[id]).filter(Boolean).join(', ')
                        return (
                            <div key={ani.id} className="t10-mobile-card" onClick={() => setPreviewId(ani.id)}>
                                <span className="t10-mobile-rank">{i + 1}</span>
                                <div className="t10-mobile-thumb">
                                    {ani.poster_path
                                        ? <Image src={`https://image.tmdb.org/t/p/w500${ani.poster_path}`} alt={ani.name} fill sizes="156px" style={{ objectFit: 'cover' }} />
                                        : <div className="t10-mobile-thumb-np">{(ani.name || '?')[0]}</div>
                                    }
                                </div>
                                <div className="t10-mobile-info">
                                    <p className="t10-mobile-name">{ani.name}</p>
                                    {genres && <p className="t10-mobile-tags">{genres}</p>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
