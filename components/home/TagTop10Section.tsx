'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'

const POSTER_W = 340
const POSTER_H = 510
const NUM_W = 160
const OVERLAP = 60
const CARD_W = NUM_W + POSTER_W - OVERLAP
const NUM_FONT = 220

const TAGS = [
    { label: '액션', genres: [10759] },
    { label: 'SF', genres: [10765] },
    { label: '드라마', genres: [18] },
    { label: '코미디', genres: [35] },
    { label: '미스터리', genres: [9648] },
    { label: '가족', genres: [10751] },
]

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 10749: '로맨스',
    10751: '가족', 27: '공포', 53: '스릴러', 80: '범죄',
}

export default function TagTop10Section() {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)

    const [activeTag, setActiveTag] = useState(0)

    useEffect(() => {
        setActiveTag(Math.floor(Math.random() * TAGS.length))
    }, [])

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const tag = TAGS[activeTag]

    const items = aniList
        .filter((a: any) => tag.genres.some((g: number) => a.genre_ids?.includes(g)))
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 10)

    return (
        <section style={{ padding: '56px 0 80px' }}>
            <style>{`
                .tt-wrap { width: 90%; margin: 0 auto; }

                .tt-eyebrow { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.32); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 6px; }
                .tt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .tt-title { font-size: 25px; font-weight: 700; color: #fff; margin: 0; white-space: nowrap; }
                .tt-title-tag { color: #9d97ff; }
                .tt-nav { display: flex; gap: 8px; }
                .tt-nav-btn {
                    width: 38px; height: 38px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all .2s;
                }
                .tt-nav-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

                .tt-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
                .tt-tag {
                    padding: 6px 16px; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: none; color: rgba(255,255,255,0.4);
                    font-size: 13px; font-weight: 600;
                    cursor: pointer; transition: all .2s;
                }
                .tt-tag:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
                .tt-tag.active { background: rgba(108,99,255,0.2); border-color: #6c63ff; color: #9d97ff; }

                .tt-card {
                    position: relative; width: ${CARD_W}px;
                    cursor: pointer; transition: transform .25s;
                }
                .tt-card:hover { transform: translateY(-6px); }

                .tt-rank {
                    position: absolute; left: -20px; bottom: 37px;
                    width: ${NUM_W + 20}px;
                    font-size: ${NUM_FONT}px; font-weight: 900; line-height: 1;
                    color: rgba(255,255,255,0.85); text-align: right;
                    z-index: 3; user-select: none; letter-spacing: -0.06em;
                    text-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
                }

                .tt-thumb {
                    position: absolute; right: 0; top: 0;
                    width: ${POSTER_W}px; height: ${POSTER_H}px;
                    border-radius: 12px; overflow: hidden; background: #1e1e1e;
                    box-shadow: 0 10px 32px rgba(0,0,0,0.7); z-index: 2;
                    transition: transform .25s, box-shadow .25s;
                }
                .tt-card:hover .tt-thumb { transform: translateY(-4px); box-shadow: 0 18px 48px rgba(0,0,0,0.9); }
                .tt-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .25s; }
                .tt-card:hover .tt-thumb img { transform: scale(1.04); }
                .tt-thumb-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; color: rgba(255,255,255,0.07); }

                .tt-info {
                    position: relative; z-index: 1;
                    padding-top: ${POSTER_H + 14}px;
                    padding-left: ${NUM_W - OVERLAP}px;
                    text-align: center;
                }
                .tt-name { font-size: 24px; font-weight: 700; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-bottom: 4px; line-height: 1.3; }
                .tt-genre { font-size: 18px; color: rgba(255,255,255,0.35); }
                .tt-empty { display: flex; align-items: center; justify-content: center; height: ${POSTER_H}px; color: rgba(255,255,255,0.2); font-size: 14px; }
            `}</style>

            <div className="tt-wrap">
                <p className="tt-eyebrow">라프텔 서버 터지게 만든 화제의 작품</p>
                <div className="tt-head">
                    <h2 className="tt-title">
                        주간 <span className="tt-title-tag">#{tag.label}</span> TOP 10
                    </h2>
                    <div className="tt-nav">
                        <button ref={prevRef} className="tt-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button ref={nextRef} className="tt-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>

                <div className="tt-tags">
                    {TAGS.map((t, i) => (
                        <button
                            key={t.label}
                            className={`tt-tag${activeTag === i ? ' active' : ''}`}
                            onClick={() => setActiveTag(i)}
                        >
                            #{t.label}
                        </button>
                    ))}
                </div>

                {!items || items.length === 0 ? (
                    <div className="tt-empty">해당 태그의 작품이 없어요</div>
                ) : (
                    <div style={{ marginLeft: -(NUM_W - OVERLAP) }}>
                        <Swiper
                            modules={[Navigation]}
                            navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
                            onBeforeInit={(swiper: any) => {
                                swiper.params.navigation.prevEl = prevRef.current
                                swiper.params.navigation.nextEl = nextRef.current
                            }}
                            slidesPerView="auto"
                            spaceBetween={-20}
                            style={{ overflow: 'visible' }}
                        >
                            {items.map((ani: any, i: number) => {
                                const genres = (ani.genre_ids || [])
                                    .slice(0, 3)
                                    .map((id: number) => GENRE_MAP[id])
                                    .filter(Boolean)
                                    .join(', ')

                                return (
                                    <SwiperSlide key={ani.id} style={{ width: CARD_W }}>
                                        <div
                                            className="tt-card"
                                            style={{ height: POSTER_H + 60 }}
                                            onClick={() => router.push(`/anime/${ani.id}`)}
                                        >
                                            <span className="tt-rank">{i + 1}</span>
                                            <div className="tt-thumb">
                                                {ani.poster_path
                                                    ? <img src={`https://image.tmdb.org/t/p/w500${ani.poster_path}`} alt={ani.name} />
                                                    : <div className="tt-thumb-np">{(ani.name || '?')[0]}</div>
                                                }
                                            </div>
                                            <div className="tt-info">
                                                <p className="tt-name">{ani.name}</p>
                                                {genres && <p className="tt-genre">{genres}</p>}
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                )
                            })}
                        </Swiper>
                    </div>
                )}
            </div>
        </section>
    )
}