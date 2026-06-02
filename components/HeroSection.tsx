'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'
import { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/effect-fade'
import { useAniStore } from '@/store/useAniStore'
import VideoPlayer from './Videoplayer'

const heroData = [
    { id: 123249, image: '/images/hero/hero01.png', text: '최애를 향한 광기 어린 열정과  순정남의 금손 재능이 만났을 때, \n 보는 내내 광대 폭발하는 청춘 성장물' },
    { id: 105248, image: '/images/hero/hero02.png', text: '달까지 달리는 도파민 급행 열차, \n 엔딩곡 듣는 순간 가슴이 웅장해지다 못해 찢어지는 작품' },
    { id: 75214, image: '/images/hero/hero03.png', text: '빛과 연출을 갈아 넣은 영상미의 정점, \n 편지 한 장에 담긴 진심이 가슴을 울리는 인생 명작' },
    { id: 95479, image: '/images/hero/hero04.png', text: '작화진의 영혼을 갈아 만든 눈호강 액션, \n 고죠 사토루 얼굴이 서사 그 자체!' },
    { id: 271607, image: '/images/hero/hero05.png', text: '순정만화 찢고 나온 역대급 비주얼, \n 서툴러서 더 설레는 맑고 고결한 로맨스의 정석' },
]

export default function HeroSection() {
    const router = useRouter()
    const { aniList, onFetchTopAni, onFetchVideo } = useAniStore()

    const [playingId, setPlayingId] = useState<number | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [hasVideo, setHasVideo] = useState<Record<number, boolean>>({})

    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const swiperRef = useRef<SwiperType | null>(null)

    useEffect(() => {
        onFetchTopAni()
    }, [])

    useEffect(() => {
        if (!swiperRef.current) return
        if (playingId !== null) {
            swiperRef.current.autoplay.stop()
        } else {
            swiperRef.current.autoplay.start()
        }
    }, [playingId])

    const heroes = heroData.map(item => {
        const matched = aniList.find(ani => ani.id === item.id)
        return { ...matched, id: item.id, image: item.image, text: item.text }
    })

    const activeHeroId = heroes[activeIndex]?.id

    const handleMouseEnter = async (id: number, name: string) => {
        if (hasVideo[id] === false) return

        hoverTimer.current = setTimeout(async () => {
            try {
                await onFetchVideo(id, name)
                setPlayingId(id)
            } catch {
                setHasVideo(prev => ({ ...prev, [id]: false }))
            }
        }, 400)
    }

    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        setPlayingId(null)
    }

    const handleCloseVideo = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPlayingId(null)
    }

    return (
        <section className="relative w-full h-screen overflow-hidden">
            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                loop={false}
                autoplay={{ delay: 7000, disableOnInteraction: false }}
                onSwiper={swiper => { swiperRef.current = swiper }}
                onSlideChange={swiper => {
                    setActiveIndex(swiper.activeIndex)
                    setPlayingId(null)
                    if (hoverTimer.current) clearTimeout(hoverTimer.current)
                }}
                className="w-full h-full"
            >
                {heroes.map((hero, i) => {
                    if (!hero?.id) return null
                    const name = (hero as any).name || ''
                    const isActive = i === activeIndex
                    const isPlaying = playingId === hero.id && isActive

                    return (
                        <SwiperSlide key={hero.id}>
                            <div
                                className="relative w-full h-full"
                                onMouseEnter={() => isActive && handleMouseEnter(hero.id!, name)}
                                onMouseLeave={() => isActive && handleMouseLeave()}
                            >
                                <img
                                    src={hero.image}
                                    alt={name}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700
                                               ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
                                />

                                {isPlaying && (
                                    <VideoPlayer
                                        key={hero.id}
                                        id={hero.id}
                                        mode="background"
                                        className="absolute inset-0 w-full h-full scale-[1.2] pointer-events-none"
                                    />
                                )}

                                <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                                    {isPlaying && (
                                        <button
                                            onClick={handleCloseVideo}
                                            className="absolute top-15 right-6 z-50 flex items-center gap-2
                                                       text-white/70 hover:text-white text-sm transition-colors duration-200 cursor-pointer"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                            미리보기 닫기
                                        </button>
                                    )}

                                    <h1 className='text-[26px] absolute bottom-90 left-55 text-white whitespace-pre-line'>
                                        {hero.text}
                                    </h1>

                                    <div className="absolute left-55 bottom-60 z-30 flex items-center gap-4">
                                        <button
                                            onClick={() => router.push(`/anime/${hero.id}?play=1`)}
                                            className="inline-flex items-center justify-center h-[52px] px-8 rounded-full border border-white/50 text-white text-sm font-semibold
                                                       backdrop-blur-md bg-white/10 hover:bg-white hover:text-black
                                                       transition-all duration-300 cursor-pointer whitespace-nowrap"
                                        >
                                            1화 보러가기
                                        </button>
                                        <button
                                            onClick={() => router.push(`/anime/${hero.id}`)}
                                            className="inline-flex items-center justify-center h-[52px] px-8 rounded-full border border-white/50 text-white text-sm font-semibold
                                                        hover:bg-white hover:text-black
                                                       transition-all duration-300 cursor-pointer whitespace-nowrap"
                                        >
                                            상세보기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-40 pointer-events-none">
                {heroes.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500
                                   ${activeIndex === i ? 'w-14 bg-white' : 'w-4 bg-white/30'}`}
                    />
                ))}
            </div>
        </section>
    )
}