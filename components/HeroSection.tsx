'use client'

import { useEffect, useState, useRef } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'

export default function HeroSection() {
    const { aniList, aniVideos, onFetchAni, onFetchVideo } = useAniStore()
    const [activeIndex, setActiveIndex] = useState(0)
    const [playingId, setPlayingId] = useState<number | null>(null)
    const [trailerKeys, setTrailerKeys] = useState<Record<number, string>>({})
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const heroes = aniList.slice(0, 5)

    const handleMouseEnter = async (id: number, name: string) => {
        hoverTimer.current = setTimeout(async () => {
            if (!trailerKeys[id]) {
                await onFetchVideo(id, name)
                const video = useAniStore.getState().aniVideos[id]
                if (video?.key) {
                    setTrailerKeys(prev => ({ ...prev, [id]: video.key }))
                }
            }
            setPlayingId(id)
        }, 800)
    }

    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        setPlayingId(null)
    }

    if (heroes.length === 0) return (
        <div className="w-full h-[85vh] bg-[#0a0a0a] animate-pulse" />
    )

    return (
        <div className="relative w-full h-[85vh]">
            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                loop
                onSlideChange={(swiper) => {
                    setActiveIndex(swiper.realIndex)
                    setPlayingId(null)
                }}
                className="w-full h-full"
            >
                {heroes.map((hero) => (
                    <SwiperSlide key={hero.id}>
                        <div
                            className="relative w-full h-full"
                            onMouseEnter={() => handleMouseEnter(hero.id, hero.name)}
                            onMouseLeave={handleMouseLeave}
                        >
                            {/* 배경 이미지 */}
                            <img
                                src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`}
                                alt={hero.name}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${playingId === hero.id && trailerKeys[hero.id] ? 'opacity-0' : 'opacity-100'}`}
                            />

                            {/* 트레일러 */}
                            {trailerKeys[hero.id] && (
                                <iframe
                                    src={`https://www.youtube.com/embed/${trailerKeys[hero.id]}?autoplay=${playingId === hero.id ? 1 : 0}&mute=1&controls=0&loop=1&playlist=${trailerKeys[hero.id]}`}
                                    className={`absolute inset-0 w-full h-full scale-[1.3] transition-opacity duration-500 ${playingId === hero.id ? 'opacity-100' : 'opacity-0'}`}
                                    allow="autoplay"
                                />
                            )}

                            {/* 그라디언트 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                            {/* 콘텐츠 */}
                            <div className="absolute bottom-24 left-0 inner px-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                                        {hero.first_air_date?.slice(0, 4)}
                                    </span>
                                    <span className="text-xs text-yellow-400">
                                        ★ {hero.vote_average?.toFixed(1)}
                                    </span>
                                </div>
                                <h1 className="text-white text-5xl font-black mb-3 drop-shadow-lg max-w-xl leading-tight">
                                    {hero.name}
                                </h1>
                                <p className="text-white/60 text-sm mb-6 max-w-md line-clamp-2">
                                    {hero.overview || '지금 바로 시청하세요.'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-lg hover:bg-white/90 transition-colors">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <polygon points="5,3 19,12 5,21" />
                                        </svg>
                                        재생
                                    </button>
                                    <button className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-bold text-sm rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                                        </svg>
                                        상세 정보
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* 인디케이터 */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {heroes.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                    />
                ))}
            </div>
        </div>
    )
}