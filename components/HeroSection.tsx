'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'

import 'swiper/css'
import 'swiper/css/effect-fade'

import { useAniStore } from '@/store/useAniStore'

const heroData = [
    {
        id: 123249,
        image: '/images/hero/hero01.png',
    },
    {
        id: 105248,
        image: '/images/hero/hero02.png',
    },
    {
        id: 75214,
        image: '/images/hero/hero03.png',
    },
    {
        id: 95479,
        image: '/images/hero/hero04.png',
    },
    {
        id: 271607,
        image: '/images/hero/hero05.png',
    },
]

export default function HeroSection() {

    const router = useRouter()

    const {
        aniList,
        onFetchAni,
        onFetchVideo,
        onOpenDetailModal,
    } = useAniStore()

    const [playingId, setPlayingId] = useState<number | null>(null)
    const [trailerKeys, setTrailerKeys] = useState<Record<number, string>>({})
    const [activeIndex, setActiveIndex] = useState(0)

    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (aniList.length === 0) {
            onFetchAni()
        }
    }, [])

    const heroes = heroData.map((item) => {
        const matched = aniList.find((ani) => ani.id === item.id)

        return {
            ...matched,
            image: item.image,
        }
    })

    const handleMouseEnter = async (id: number, name: string) => {

        hoverTimer.current = setTimeout(async () => {

            if (!trailerKeys[id]) {

                await onFetchVideo(id, name)

                const video = useAniStore.getState().aniVideos[id]

                if (video?.key) {
                    setTrailerKeys((prev) => ({
                        ...prev,
                        [id]: video.key,
                    }))
                }
            }

            setPlayingId(id)

        }, 500)
    }

    const handleMouseLeave = () => {

        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current)
        }

        setPlayingId(null)
    }

    if (!heroes.length) {
        return (
            <div className="w-full h-screen bg-black animate-pulse" />
        )
    }

    return (
        <section className="relative w-full h-screen overflow-hidden">

            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                loop
                autoplay={{
                    delay: 7000,
                    disableOnInteraction: false,
                }}
                onSlideChange={(swiper) => {
                    setActiveIndex(swiper.realIndex)
                    setPlayingId(null)
                }}
                className="w-full h-full"
            >

                {heroes.map((hero) => {

                    if (!hero) return null

                    return (
                        <SwiperSlide key={hero.id}>

                            <div
                                className="relative w-full h-full"
                                onMouseEnter={() => handleMouseEnter(hero.id, hero.name)}
                                onMouseLeave={handleMouseLeave}
                            >

                                {/* 이미지 */}
                                <img
                                    src={hero.image}
                                    alt={hero.name}
                                    className={`
                                        absolute inset-0
                                        w-full h-full
                                        object-cover
                                        transition-opacity duration-700
                                        ${playingId === hero.id
                                            ? 'opacity-0'
                                            : 'opacity-100'}
                                    `}
                                />

                                {/* 영상 */}
                                {trailerKeys[hero.id] && (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${trailerKeys[hero.id]}?autoplay=${playingId === hero.id ? 1 : 0}&mute=1&controls=0&loop=1&playlist=${trailerKeys[hero.id]}`}
                                        allow="autoplay"
                                        className={`
                                            absolute inset-0
                                            w-full h-full
                                            scale-[1.2]
                                            pointer-events-none
                                            transition-opacity duration-700
                                            ${playingId === hero.id
                                                ? 'opacity-100'
                                                : 'opacity-0'}
                                        `}
                                    />
                                )}

                                {/* 버튼 */}
                                <div className="absolute left-[8%] bottom-24 z-30 flex items-center gap-4">

                                    {/* 1화 보러가기 */}
                                    <button
                                        onClick={() => router.push(`/anime/${hero.id}`)}
                                        className="
                                            px-8 py-4
                                            rounded-full
                                            border border-white/50
                                            text-white
                                            text-sm
                                            font-semibold
                                            backdrop-blur-md
                                            bg-white/10
                                            hover:bg-white
                                            hover:text-black
                                            transition-all duration-300
                                        "
                                    >
                                        1화 보러가기
                                    </button>

                                    {/* 상세보기 */}
                                    <button
                                        onClick={() => onOpenDetailModal(hero)}
                                        className="
                                            px-8 py-4
                                            rounded-full
                                            border border-white/20
                                            text-white
                                            text-sm
                                            font-semibold
                                            backdrop-blur-md
                                            bg-black/20
                                            hover:bg-white/20
                                            transition-all duration-300
                                        "
                                    >
                                        상세보기
                                    </button>

                                </div>

                            </div>

                        </SwiperSlide>
                    )
                })}

            </Swiper>

            {/* 인디케이터 */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-40">

                {heroes.map((_, i) => (
                    <div
                        key={i}
                        className={`
                            h-[4px]
                            rounded-full
                            transition-all duration-500
                            ${activeIndex === i
                                ? 'w-14 bg-white'
                                : 'w-4 bg-white/30'}
                        `}
                    />
                ))}

            </div>

        </section>
    )
}