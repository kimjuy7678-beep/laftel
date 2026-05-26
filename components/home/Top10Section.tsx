'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'

const POSTER_W = 340
const POSTER_H = 510
const NUM_W = 160
const OVERLAP = 60
const CARD_W = NUM_W + POSTER_W - OVERLAP  // 400
const NUM_FONT = 220

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
                    height: ${POSTER_H}px;
                    cursor: pointer;
                    transition: transform .25s;
                }
                .t10-card:hover { transform: translateY(-6px); }

                /* 숫자 — 포스터 앞(z-index 높음), 왼쪽 하단 */
                .t10-rank {
                    position: absolute;
                    left: 0;
                    bottom: 0px;
                    width: ${NUM_W + 20}px;
                    font-size: ${NUM_FONT}px;
                    font-weight: 900;
                    line-height: 1;
                    color: #fff;
                    text-align: right;
                    z-index: 3;
                    user-select: none;
                    letter-spacing: -0.06em;
                    text-shadow: 0 4px 24px rgba(0,0,0,0.5);
                }

                /* 포스터 — 숫자 뒤(z-index 낮음) */
                .t10-thumb {
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: ${POSTER_W}px;
                    height: ${POSTER_H}px;
                    border-radius: 12px;
                    overflow: hidden;
                    background: #1e1e1e;
                    box-shadow: 0 10px 32px rgba(0,0,0,0.7);
                    z-index: 2;
                    transition: transform .25s, box-shadow .25s;
                }
                .t10-card:hover .t10-thumb {
                    transform: translateY(-4px);
                    box-shadow: 0 18px 48px rgba(0,0,0,0.9);
                }
                .t10-thumb img {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    transition: transform .25s;
                }
                .t10-card:hover .t10-thumb img { transform: scale(1.04); }
                .t10-thumb-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 40px; font-weight: 800; color: rgba(255,255,255,0.07);
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

                {/* 
                    slidesOffsetBefore: 첫 슬라이드 앞에 공간 추가
                    → 첫 번째 카드의 포스터가 섹션 왼쪽(48px)에 맞춰짐
                    → 숫자는 자연스럽게 왼쪽으로 빠져나옴
                    공식: offsetBefore = -(NUM_W - OVERLAP) = -(160 - 60) = -100 → 반대로 포스터 기준 정렬
                    포스터 시작점 = NUM_W - OVERLAP = 100px 오른쪽
                    so offsetBefore = 0, 포스터가 48px에 맞으려면 slidesOffsetBefore 없애고
                    swiper wrapper margin-left로 포스터 기준 정렬
                */}
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
                        {top10.map((ani: any, i: number) => (
                            <SwiperSlide key={ani.id} style={{ width: CARD_W }}>
                                <div className="t10-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                                    <span className="t10-rank">{i + 1}</span>
                                    <div className="t10-thumb">
                                        {ani.poster_path
                                            ? <img src={`https://image.tmdb.org/t/p/w500${ani.poster_path}`} alt={ani.name} />
                                            : <div className="t10-thumb-np">{(ani.name||'?')[0]}</div>
                                        }
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </section>
    )
}
