'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'

const POSTER_W = 200
const POSTER_H = 300
const NUM_W = 120
const OVERLAP = 50
const CARD_W = NUM_W + POSTER_W - OVERLAP

const TAGS = [
    { label: '액션',     genres: [10759] },
    { label: 'SF',       genres: [10765] },
    { label: '드라마',   genres: [18] },
    { label: '코미디',   genres: [35] },
    { label: '미스터리', genres: [9648] },
    { label: '가족',     genres: [10751] },
]

export default function TagTop10Section() {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()
    const [activeTag, setActiveTag] = useState(0)
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)

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
                .tt-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .tt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
                .tt-left { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
                .tt-title { font-size: 22px; font-weight: 800; color: #fff; margin: 0; white-space: nowrap; }
                .tt-tags { display: flex; gap: 8px; flex-wrap: wrap; }
                .tt-tag { padding: 6px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.12); background: none; color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; }
                .tt-tag:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
                .tt-tag.active { background: rgba(108,99,255,0.2); border-color: #6c63ff; color: #9d97ff; }
                .tt-nav { display: flex; gap: 8px; }
                .tt-nav-btn {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all .2s;
                }
                .tt-nav-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

                .tt-card {
                    position: relative;
                    width: ${CARD_W}px;
                    height: ${POSTER_H}px;
                    cursor: pointer;
                    transition: transform .25s;
                    flex-shrink: 0;
                }
                .tt-card:hover { transform: translateY(-5px); }
                .tt-rank {
                    position: absolute;
                    left: 0; bottom: 0;
                    width: ${NUM_W}px;
                    font-size: 160px; font-weight: 900; line-height: 1;
                    color: #fff; text-align: right;
                    z-index: 1; user-select: none;
                    letter-spacing: -0.06em;
                }
                .tt-thumb {
                    position: absolute;
                    right: 0; top: 0;
                    width: ${POSTER_W}px;
                    height: ${POSTER_H}px;
                    border-radius: 10px; overflow: hidden; background: #1e1e1e;
                    box-shadow: -8px 8px 28px rgba(0,0,0,0.7);
                    z-index: 2;
                    transition: transform .25s, box-shadow .25s;
                }
                .tt-card:hover .tt-thumb {
                    transform: translateY(-4px);
                    box-shadow: -10px 14px 40px rgba(0,0,0,0.9);
                }
                .tt-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .25s; }
                .tt-card:hover .tt-thumb img { transform: scale(1.04); }
                .tt-thumb-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 32px; font-weight: 800; color: rgba(255,255,255,0.07);
                }
                .tt-empty {
                    display: flex; align-items: center; justify-content: center;
                    height: ${POSTER_H}px; color: rgba(255,255,255,0.2); font-size: 14px;
                }
            `}</style>

            <div className="tt-wrap">
                <div className="tt-head">
                    <div className="tt-left">
                        <h2 className="tt-title">주간 #태그별 TOP 10</h2>
                        <div className="tt-tags">
                            {TAGS.map((t, i) => (
                                <button key={t.label} className={`tt-tag${activeTag === i ? ' active' : ''}`} onClick={() => setActiveTag(i)}>
                                    #{t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="tt-nav">
                        <button ref={prevRef} className="tt-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button ref={nextRef} className="tt-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="tt-empty">해당 태그의 작품이 없어요</div>
                ) : (
                    <Swiper
                        modules={[Navigation]}
                        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
                        onBeforeInit={(swiper: any) => {
                            swiper.params.navigation.prevEl = prevRef.current
                            swiper.params.navigation.nextEl = nextRef.current
                        }}
                        slidesPerView="auto"
                        spaceBetween={0}
                        style={{ overflow: 'visible' }}
                    >
                        {items.map((ani: any, i: number) => (
                            <SwiperSlide key={ani.id} style={{ width: CARD_W }}>
                                <div className="tt-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                                    <span className="tt-rank">{i + 1}</span>
                                    <div className="tt-thumb">
                                        {ani.poster_path
                                            ? <img src={`https://image.tmdb.org/t/p/w342${ani.poster_path}`} alt={ani.name} />
                                            : <div className="tt-thumb-np">{(ani.name||'?')[0]}</div>
                                        }
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </div>
        </section>
    )
}
