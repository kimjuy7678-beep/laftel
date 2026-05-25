'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'

// 포스터 비율 2:3 기준
// 포스터 너비 200px → 높이 300px
// 카드 전체 너비 = 숫자(120px) + 포스터(200px) - 겹침(50px) = 270px
// 카드 전체 높이 = 포스터 높이 = 300px
// 숫자는 카드 왼쪽 하단에 absolute, 포스터가 z-index 위에서 숫자 오른쪽 덮음

const POSTER_W = 200
const POSTER_H = 300  // 2:3 비율
const NUM_W = 120
const OVERLAP = 50
const CARD_W = NUM_W + POSTER_W - OVERLAP  // 270
const CARD_H = POSTER_H                     // 300

export default function Top10Section() {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const top10 = [...aniList].sort((a: any, b: any) => b.popularity - a.popularity).slice(0, 10)
    if (top10.length === 0) return null

    return (
        <section style={{ padding: '56px 0 0' }}>
            <style>{`
                .t10-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .t10-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
                .t10-title { font-size: 22px; font-weight: 800; color: #fff; margin: 0; }
                .t10-nav { display: flex; gap: 8px; }
                .t10-nav-btn {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all .2s;
                }
                .t10-nav-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

                .t10-card {
                    position: relative;
                    width: ${CARD_W}px;
                    height: ${CARD_H}px;
                    cursor: pointer;
                    transition: transform .25s;
                    flex-shrink: 0;
                }
                .t10-card:hover { transform: translateY(-5px); }

                /* 숫자 — 왼쪽 하단, 포스터 뒤 */
                .t10-rank {
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    width: ${NUM_W}px;
                    font-size: 160px;
                    font-weight: 900;
                    line-height: 1;
                    color: #fff;
                    text-align: right;
                    z-index: 1;
                    user-select: none;
                    letter-spacing: -0.06em;
                }

                /* 포스터 — 오른쪽, 2:3 고정 비율, 숫자 위 */
                .t10-thumb {
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: ${POSTER_W}px;
                    height: ${POSTER_H}px;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #1e1e1e;
                    box-shadow: -8px 8px 28px rgba(0,0,0,0.7);
                    z-index: 2;
                    transition: transform .25s, box-shadow .25s;
                }
                .t10-card:hover .t10-thumb {
                    transform: translateY(-4px);
                    box-shadow: -10px 14px 40px rgba(0,0,0,0.9);
                }
                .t10-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform .25s;
                }
                .t10-card:hover .t10-thumb img { transform: scale(1.04); }
                .t10-thumb-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 32px; font-weight: 800; color: rgba(255,255,255,0.07);
                }
            `}</style>

            <div className="t10-wrap">
                <div className="t10-head">
                    <h2 className="t10-title">라프텔 TOP 10</h2>
                    <div className="t10-nav">
                        <button ref={prevRef} className="t10-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button ref={nextRef} className="t10-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
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
                    {top10.map((ani: any, i: number) => (
                        <SwiperSlide key={ani.id} style={{ width: CARD_W }}>
                            <div className="t10-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                                <span className="t10-rank">{i + 1}</span>
                                <div className="t10-thumb">
                                    {ani.poster_path
                                        ? <img src={`https://image.tmdb.org/t/p/w342${ani.poster_path}`} alt={ani.name} />
                                        : <div className="t10-thumb-np">{(ani.name||'?')[0]}</div>
                                    }
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    )
}
