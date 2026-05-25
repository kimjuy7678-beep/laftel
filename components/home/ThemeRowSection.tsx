'use client'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'

interface Props { genre: number; title: string }

export default function ThemeRowSection({ genre, title }: Props) {
    const { aniList, onFetchAni } = useAniStore()
    const router = useRouter()
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const items = aniList.filter((a: any) => a.genre_ids?.includes(genre)).slice(0, 20)
    if (items.length === 0) return null

    return (
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .tr-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .tr-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .tr-title { font-size: 20px; font-weight: 800; color: #fff; margin: 0; }
                .tr-nav { display: flex; gap: 8px; }
                .tr-nav-btn {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all .2s;
                }
                .tr-nav-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

                /* 가로형 카드 — 16:9 와이드 */
                .tr-card {
                    width: 260px;
                    cursor: pointer;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #111;
                    border: 1px solid rgba(255,255,255,0.06);
                    transition: transform .25s, box-shadow .25s;
                }
                .tr-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 36px rgba(0,0,0,0.65);
                    border-color: rgba(255,255,255,0.12);
                }
                .tr-thumb {
                    width: 100%; aspect-ratio: 16/9;
                    overflow: hidden; background: #1a1a1a;
                }
                .tr-thumb img {
                    width: 100%; height: 100%; object-fit: cover;
                    transition: transform .25s;
                }
                .tr-card:hover .tr-thumb img { transform: scale(1.05); }
                .tr-thumb-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px; font-weight: 800; color: rgba(255,255,255,0.07);
                }
                .tr-body { padding: 9px 11px 11px; }
                .tr-name {
                    font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85);
                    margin: 0 0 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
                }
                .tr-score { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }
            `}</style>

            <div className="tr-wrap">
                <div className="tr-head">
                    <h2 className="tr-title">{title}</h2>
                    <div className="tr-nav">
                        <button ref={prevRef} className="tr-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button ref={nextRef} className="tr-nav-btn">
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
                    spaceBetween={12}
                    style={{ overflow: 'visible' }}
                >
                    {items.map((ani: any) => (
                        <SwiperSlide key={ani.id} style={{ width: 'auto' }}>
                            <div className="tr-card" onClick={() => router.push(`/anime/${ani.id}`)}>
                                <div className="tr-thumb">
                                    {ani.backdrop_path
                                        ? <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} />
                                        : <div className="tr-thumb-np">{(ani.name||'?')[0]}</div>
                                    }
                                </div>
                                <div className="tr-body">
                                    <p className="tr-name">{ani.name}</p>
                                    <p className="tr-score">★ {Math.round(ani.vote_average * 10) / 10}</p>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    )
}
