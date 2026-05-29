'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import { useAniStore } from '@/store/useAniStore'
import VideoPlayer from './VideoPlayer'

const heroData = [
    { id: 123249, image: '/images/hero/hero01.png', text: '최애를 향한 광기 어린 열정과  순정남의 금손 재능이 만났을 때, \n 보는 내내 광대 폭발하는 청춘 성장물' },
    { id: 105248, image: '/images/hero/hero02.png', text: '달까지 달리는 도파민 급행 열차, \n 엔딩곡 듣는 순간 가슴이 웅장해지다 못해 찢어지는 작품' },
    { id: 75214, image: '/images/hero/hero03.png', text: '빛과 연출을 갈아 넣은 영상미의 정점, \n 편지 한 장에 담긴 진심이 가슴을 울리는 인생 명작' },
    { id: 95479, image: '/images/hero/hero04.png', text: '작화진의 영혼을 갈아 만든 눈호강 액션, \n 고죠 사토루 얼굴이 서사 그 자체!' },
    { id: 271607, image: '/images/hero/hero05.png', text: '순정만화 찢고 나온 역대급 비주얼, \n 서툴러서 더 설레는 맑고 고결한 로맨스의 정석' },
]

export default function HeroSection() {
    const router = useRouter()

    const { aniList, onFetchTopAni, onFetchVideo, onOpenDetailModal } = useAniStore()

    const [playingId, setPlayingId] = useState<number | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)

    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        // onFetchTopAni로 60개만 빠르게 가져오기
        onFetchTopAni()
    }, [])

    const heroes = heroData.map(item => {
        const matched = aniList.find(ani => ani.id === item.id)
        return { ...matched, id: item.id, image: item.image, text: item.text }
    })

    const handleMouseEnter = async (id: number, name: string) => {
        hoverTimer.current = setTimeout(async () => {
            await onFetchVideo(id, name)
            // fetch 완료 후 바로 재생 시작
            setPlayingId(id)
        }, 400)
    }

    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        setPlayingId(null)
    }

    return (
        <section className="relative w-full h-screen overflow-hidden">
            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                loop
                autoplay={{ delay: 7000, disableOnInteraction: false }}
                onSlideChange={swiper => {
                    setActiveIndex(swiper.realIndex)
                    setPlayingId(null)
                }}
                className="w-full h-full"
            >
                {heroes.map(hero => {
                    if (!hero?.id) return null
                    const name = (hero as any).name || ''

                    return (
                        <SwiperSlide key={hero.id}>
                            <div
                                className="relative w-full h-full"
                                onMouseEnter={() => handleMouseEnter(hero.id!, name)}
                                onMouseLeave={handleMouseLeave}
                            >

                                {/* 배경 이미지 */}
                                <img
                                    src={hero.image}
                                    alt={name}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700
                                               ${playingId === hero.id ? 'opacity-0' : 'opacity-100'}`}
                                />

                                {/* 영상 - playingId 일치할 때만 마운트 */}
                                {playingId === hero.id && (
                                    <VideoPlayer
                                        id={hero.id}
                                        mode="background"
                                        className="absolute inset-0 w-full h-full scale-[1.2] pointer-events-none"
                                    />
                                )}


                                <h1 className='text-[26px] absolute bottom-90 left-55 text-white whitespace-pre-line'>{hero.text}</h1>

                                {/* 버튼 영역 */}
                                <div className="absolute left-55 bottom-60 z-30 flex items-center gap-4">
                                    <button
                                        onClick={() => router.push(`/anime/${hero.id}?play=1`)}
                                        className="flex items-center justify-center h-[52px] px-8 rounded-full border border-white/50 text-white text-sm font-semibold
                                                   backdrop-blur-md bg-white/10 hover:bg-white hover:text-black
                                                   transition-all duration-300 cursor-pointer"
                                    >
                                        1화 보러가기
                                    </button>
                                    <button
                                        onClick={() => router.push(`/anime/${hero.id}`)}
                                        className="flex items-center justify-center h-[52px] px-8 rounded-full border border-white/50 text-white text-sm font-semibold
                                                   backdrop-blur-md bg-white/10 hover:bg-white hover:text-black
                                                   transition-all duration-300 cursor-pointer"
                                    >
                                        상세보기
                                    </button>
                                </div>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>

            {/* 슬라이드 인디케이터 */}
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