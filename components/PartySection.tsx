'use client'
import { useEffect, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode } from 'swiper/modules'
import 'swiper/css'

const DUMMY_PARTIES = [
    { hostName: '메롱포켓몬', time: '21:22', attendees: 15, maxAttendees: 30, img: '/images/character/ch-1.png' },
    { hostName: '하늘고래', time: '19:00', attendees: 8, maxAttendees: 20, img: '/images/character/ch-2.png' },
    { hostName: 'Sora', time: '22:10', attendees: 22, maxAttendees: 30, img: '/images/character/ch-3.png' },
    { hostName: 'Leo', time: '20:30', attendees: 3, maxAttendees: 10, img: '/images/character/ch-4.png' },
    { hostName: '메하소레', time: '21:30', attendees: 5, maxAttendees: 10, img: '/images/character/ch-5.png' },
]

const ROTATE_INTERVAL_MS = 15 * 1000

export default function PartySection() {
    const router = useRouter()
    const { aniList, onFetchTopAni } = useAniStore()
    const [offset, setOffset] = useState(0)

    useEffect(() => {
        onFetchTopAni()
    }, [])

    useEffect(() => {
        const timer = setInterval(() => {
            setOffset(prev => prev + 1)
        }, ROTATE_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [])

    if (aniList.length === 0) return null

    const startIdx = (offset * 4) % Math.max(aniList.length - 8, 1)
    const displayed = [...aniList.slice(startIdx), ...aniList.slice(0, startIdx)].slice(0, 12)

    return (
        <section>
            <div className="relative flex flex-col gap-3 mb-5 pt-14 sm:pt-20 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Party Now</h2>
                    <p className="text-sm text-[var(--text-muted)]">지금 이 순간, 혼자 보기엔 아쉬우니까</p>
                </div>
                <button
                    onClick={() => router.push('/live/create')}
                    className="w-fit px-5 py-2 bg-[var(--border)] hover:bg-[var(--border-subtle)] transition-colors rounded-xl text-sm text-[var(--text-primary)] font-medium cursor-pointer md:px-8"
                >
                    파티 개설하기
                </button>
            </div>

            <Swiper
                modules={[FreeMode]}
                freeMode={{ sticky: false }}
                slidesPerView="auto"
                spaceBetween={12}
                className="!overflow-visible"
                style={{ marginRight: '-5vw', paddingRight: '5vw' }}
            >
                {displayed.map((ani, idx) => {
                    const party = DUMMY_PARTIES[(idx + offset) % DUMMY_PARTIES.length]
                    const imgPath = ani.backdrop_path || ani.poster_path

                    return (
                        <SwiperSlide
                            key={`${ani.id}-${offset}-${idx}`}
                            style={{ width: 'min(82vw, 360px)' }}
                        >
                            <div
                                onClick={() => router.push(`/live/party/party-${ani.id}`)}
                                className="relative overflow-hidden rounded-xl aspect-video bg-[var(--bg-card)] cursor-pointer group"
                            >
                                {imgPath && (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${imgPath}`}
                                        alt={ani.name}
                                        className="w-full h-full object-cover brightness-75 group-hover:brightness-60 transition-all duration-300"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                                <div className="absolute bottom-2.5 left-2.5 right-12 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] flex-shrink-0 overflow-hidden sm:w-12 sm:h-12 xl:w-15 xl:h-15">
                                            <img src={party.img} alt={party.hostName} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-[14px] font-bold text-white drop-shadow sm:text-[16px]">{ani.name}</span>
                                            <span className="text-[11px] font-semibold text-white/90 whitespace-nowrap">개설자 : {party.hostName}</span>
                                            <span className="text-[10px] text-white/50 whitespace-nowrap">개설 시간 : {party.time}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/50 indent-1 pt-1">
                                        참여 인원 : {party.attendees} / {party.maxAttendees}명
                                    </span>
                                </div>

                                <span className="absolute bottom-1 right-3 text-[42px] font-black italic text-white/10 leading-none pointer-events-none select-none sm:text-[52px]">
                                    {idx + 1}
                                </span>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>

            <RotationTimer offset={offset} />
        </section>
    )
}

function RotationTimer({ offset }: { offset: number }) {
    const [remaining, setRemaining] = useState('')

    useEffect(() => {
        const calc = () => {
            const now = Date.now()
            const nextRotate = Math.ceil(now / ROTATE_INTERVAL_MS) * ROTATE_INTERVAL_MS
            const diff = nextRotate - now
            const m = Math.floor(diff / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
        }
        calc()
        const t = setInterval(calc, 1000)
        return () => clearInterval(t)
    }, [offset])

    return (
        <p className="mt-3 text-xs text-[var(--text-faint)] text-right">
            다음 파티 추천까지 {remaining}
        </p>
    )
}
