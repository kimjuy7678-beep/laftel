'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade } from 'swiper/modules'
import { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/effect-fade'
import { useAniStore } from '@/store/useAniStore'
import { useAuthStore } from '@/store/useAuthStore'

const heroDataDefault = [
    { id: 123249, image: '/images/hero/hero01.png', video: '/videos/hero01.mp4', text: '최애를 향한 광기 어린 열정과  순정남의 금손 재능이 만났을 때, \n 보는 내내 광대 폭발하는 청춘 성장물' },
    { id: 105248, image: '/images/hero/hero02.png', video: '/videos/hero02.mp4', text: '달까지 달리는 도파민 급행 열차, \n 엔딩곡 듣는 순간 가슴이 웅장해지다 못해 찢어지는 작품' },
    { id: 75214, image: '/images/hero/hero03.png', video: '/videos/hero03.mp4', text: '빛과 연출을 갈아 넣은 영상미의 정점, \n 편지 한 장에 담긴 진심이 가슴을 울리는 인생 명작' },
    { id: 95479, image: '/images/hero/hero04.png', video: '/videos/hero04.mp4', text: '작화진의 영혼을 갈아 만든 눈호강 액션, \n 고죠 사토루 얼굴이 서사 그 자체!' },
    { id: 271607, image: '/images/hero/hero05.png', video: '/videos/hero05.mp4', text: '순정만화 찢고 나온 역대급 비주얼, \n 서툴러서 더 설레는 맑고 고결한 로맨스의 정석' },
]

const heroDataKids = [
    { id: 60572, image: '/images/hero/hero06.png', video: '/videos/hero6.mp4', text: '피카츄와 함께 떠나는 끝없는 모험, \n세대를 초월한 추억과 설렘의 원조!' },
    { id: 3570, image: '/images/hero/hero07.png', video: '/videos/hero7.mp4', text: '화려한 변신과 감동적인 우정, \n마법소녀 장르의 역사를 만든 전설!' },
    { id: 57911, image: '/images/hero/hero08.png', video: '/videos/hero9.mp4', text: '신기한 미래도구보다 더 특별한, \n웃음과 따뜻함이 가득한 국민 애니!' },
    { id: 31654, image: '/images/hero/hero09.png', video: '/videos/hero8.mp4', text: '모험과 성장, \n그리고 진한 우정까지 담아낸 소년들의 레전드 서사!' },
    { id: 35790, image: '/images/hero/hero10.png', video: '/videos/hero10.mp4', text: '사랑스러운 작화와 몽환적인 감성, \n지금 봐도 설레는 마법 같은 이야기!' },
]

const AGE_PRIORITY: Record<string, number> = {
    'ALL': 0, '7': 7, '12': 12, '15': 15, '19': 19,
}

export default function HeroSection() {
    const router = useRouter()
    const { aniList, onFetchTopAni } = useAniStore()
    const { user } = useAuthStore()

    const ageLimit = AGE_PRIORITY[user?.ageLimit ?? '19'] ?? 19
    const heroData = ageLimit <= 7 ? heroDataKids : heroDataDefault

    const [playingId, setPlayingId] = useState<number | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [videoOpacity, setVideoOpacity] = useState(0)

    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const swiperRef = useRef<SwiperType | null>(null)
    const isHoveringRef = useRef(false)

    useEffect(() => {
        onFetchTopAni()
    }, [])

    useEffect(() => {
        setPlayingId(null)
        setActiveIndex(0)
        swiperRef.current?.slideToLoop(0, 0)
    }, [ageLimit])

    useEffect(() => {
        if (!swiperRef.current) return
        if (playingId !== null) {
            swiperRef.current.autoplay.stop()
        } else {
            swiperRef.current.autoplay.start()
        }
    }, [playingId])

    useEffect(() => {
        if (playingId !== null) {
            const t = setTimeout(() => setVideoOpacity(1), 50)
            return () => clearTimeout(t)
        } else {
            const t = setTimeout(() => setVideoOpacity(0), 0)
            return () => clearTimeout(t)
        }
    }, [playingId])

    const heroes = heroData.map(item => {
        const matched = aniList.find(ani => ani.id === item.id)
        return { ...matched, id: item.id, image: item.image, video: item.video, text: item.text }
    })

    const startVideoTimer = (id: number) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        hoverTimer.current = setTimeout(() => {
            const currentId = heroData[swiperRef.current?.realIndex ?? 0]?.id
            if (currentId === id) setPlayingId(id)
        }, 1000)
    }

    const handleMouseEnter = (id: number) => {
        isHoveringRef.current = true
        startVideoTimer(id)
    }

    const handleMouseLeave = () => {
        isHoveringRef.current = false
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        setPlayingId(null)
    }

    const handleCloseVideo = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPlayingId(null)
    }

    return (
        <section className="hero-section relative w-full overflow-hidden">
            <style>{`
                .hero-section {
                    height: calc(100vw * 9 / 16);
                    max-height: calc(100vh * 16 / 18);
                }

                .hero-bg {
                    object-position: center 20%;
                }

                .hero-main-image {
                    object-position: center 20%;
                }

                .hero-copy {
                    position: absolute;
                    left: 8%;
                    bottom: 23%;
                    max-width: min(620px, 50vw);
                    color: #fff;
                    white-space: pre-line;
                    line-height: 1.6;
                    font-size: 22px;
                    font-weight: 600;
                    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
                }

                .hero-title {
                    display: none;
                }

                .hero-actions {
                    position: absolute;
                    left: 8%;
                    bottom: 14%;
                    z-index: 30;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .hero-action-btn {
                    height: 52px;
                    padding: 0 32px;
                    font-size: 14px;
                }

                .hero-close {
                    top: 5%;
                    right: 24px;
                }

                .hero-dots {
                    bottom: 40px;
                }

                @media (max-width: 1024px) {
                    .hero-section {
                        height: calc(100vw * 9 / 16);
                        max-height: none;
                    }

                    .hero-copy {
                        max-width: min(560px, 64vw);
                        font-size: 16px;
                    }

                    .hero-action-btn {
                        height: 48px;
                        padding: 0 24px;
                        font-size: 13px;
                    }
                }

                @media (max-width: 640px) {
                    .hero-section {
                        height: calc(100vw * 9 / 16);
                        min-height: 0;
                        max-height: none;
                    }

                    .hero-bg {
                        object-position: 58% center;
                    }

                    .hero-main-image {
                        object-position: 58% center;
                    }

                    .hero-copy {
                        display: none;
                    }

                    .hero-title {
                        display: block;
                        position: absolute;
                        left: 20px;
                        right: 20px;
                        bottom: 92px;
                        z-index: 30;
                        color: #fff;
                        font-size: 16px;
                        font-weight: 600;
                        line-height: 1.3;
                    }

                    .hero-title span {
                        display: block;
                        font-size: 10px;
                        font-weight: 400;
                        color: rgba(255, 255, 255, 0.5);
                        margin-bottom: 4px;
                        letter-spacing: 0.05em;
                    }

                    .hero-actions {
                        left: 20px;
                        right: 20px;
                        bottom: 42px;
                        gap: 10px;
                    }

                    .hero-action-btn {
                        flex: 1;
                        min-width: 0;
                        height: 34px;
                        padding: 0 10px;
                        font-size: 11px;
                    }

                    .hero-close {
                        top: 72px;
                        right: 16px;
                        font-size: 12px;
                    }

                    .hero-close svg {
                        width: 18px;
                        height: 18px;
                    }

                    .hero-dots {
                        bottom: 12px;
                        gap: 8px;
                    }

                    .hero-dots > div {
                        height: 3px;
                    }

                    .hero-dots > div.active {
                        width: 36px;
                    }

                    .hero-dots > div.idle {
                        width: 12px;
                    }
                }

                @media (max-width: 380px) {
                    .hero-title {
                        bottom: 84px;
                        font-size: 14px;
                    }

                    .hero-action-btn {
                        height: 32px;
                        font-size: 10px;
                    }
                }
            `}</style>

            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                loop={true}
                autoplay={{ delay: 7000, disableOnInteraction: false }}
                onSwiper={swiper => { swiperRef.current = swiper }}
                onSlideChange={() => {
                    setPlayingId(null)
                    if (hoverTimer.current) clearTimeout(hoverTimer.current)
                }}
                onSlideChangeTransitionEnd={swiper => {
                    const realIndex = swiper.realIndex
                    setActiveIndex(realIndex)
                    if (isHoveringRef.current) {
                        const id = heroData[realIndex]?.id
                        if (id) startVideoTimer(id)
                    }
                }}
                className="w-full h-full"
            >
                {heroes.map((hero, i) => {
                    if (!hero?.id) return null
                    const name = typeof hero.name === 'string' ? hero.name : ''
                    const isActive = i === activeIndex
                    const isPlaying = playingId === hero.id

                    return (
                        <SwiperSlide key={hero.id}>
                            <div
                                className="relative w-full h-full overflow-hidden"
                                onMouseEnter={() => handleMouseEnter(hero.id!)}
                                onMouseLeave={() => handleMouseLeave()}
                            >
                                <img
                                    src={hero.image}
                                    alt={name}
                                    className="hero-bg hero-main-image absolute inset-0 w-full h-full object-cover"
                                />

                                {isPlaying && (
                                    <video
                                        key={hero.id}
                                        src={hero.video}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        style={{
                                            opacity: videoOpacity,
                                            transition: 'opacity 0.8s ease',
                                        }}
                                        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                                    />
                                )}

                                <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                    {isPlaying && (
                                        <button
                                            onClick={handleCloseVideo}
                                            className="hero-close absolute z-50 flex items-center gap-2
                                                       text-[var(--text-muted)] hover:text-white text-sm transition-colors duration-200 cursor-pointer"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                            미리보기 닫기
                                        </button>
                                    )}

                                    {!isPlaying && (
                                        <>
                                            <h1 className="hero-copy">
                                                {hero.text}
                                            </h1>

                                            <div className="hero-title">
                                                <span>애니메이션</span>
                                                {name}
                                            </div>

                                            <div className="hero-actions">
                                                <button
                                                    onClick={() => router.push(`/anime/${hero.id}?play=1`)}
                                                    onMouseEnter={(e) => {
                                                        e.stopPropagation()
                                                        if (hoverTimer.current) clearTimeout(hoverTimer.current)
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.stopPropagation()
                                                        startVideoTimer(hero.id!)
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-faint)]0 text-white font-semibold
                                                    backdrop-blur-md bg-white/10 hover:bg-white hover:text-black
                                                    transition-all duration-300 cursor-pointer whitespace-nowrap hero-action-btn"
                                                >
                                                    1화 보러가기
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/anime/${hero.id}`)}
                                                    onMouseEnter={(e) => {
                                                        e.stopPropagation()
                                                        if (hoverTimer.current) clearTimeout(hoverTimer.current)
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.stopPropagation()
                                                        startVideoTimer(hero.id!)
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-faint)]0 text-white font-semibold
                                                    hover:bg-white hover:text-black
                                                    transition-all duration-300 cursor-pointer whitespace-nowrap hero-action-btn"
                                                >
                                                    상세보기
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>

            <div className="hero-dots absolute left-1/2 -translate-x-1/2 flex gap-3 z-40 pointer-events-none">
                {heroes.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500
                                   ${activeIndex === i ? 'active w-14 bg-white' : 'idle w-4 bg-white/30'}`}
                    />
                ))}
            </div>
        </section>
    )
}