'use client'
import { useEffect, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import Link from 'next/link'

const DUMMY_PARTIES = [
    { hostName: '메롱포켓몬', time: '21:22', attendees: 15, maxAttendees: 30, img: '/images/character/ch-1.png' },
    { hostName: '하늘고래', time: '19:00', attendees: 8, maxAttendees: 20, img: '/images/character/ch-2.png' },
    { hostName: 'Sora', time: '22:10', attendees: 22, maxAttendees: 30, img: '/images/character/ch-3.png' },
    { hostName: 'Leo', time: '20:30', attendees: 3, maxAttendees: 10, img: '/images/character/ch-4.png' },
    { hostName: '메하소레', time: '21:30', attendees: 5, maxAttendees: 10, img: '/images/character/ch-5.png' },
]

const ROTATE_INTERVAL_MS = 15 * 1000

export default function PartySection() {
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

    const startIdx = (offset * 4) % Math.max(aniList.length - 4, 1)
    const displayed = aniList.slice(startIdx, startIdx + 4)

    return (
        <section>
            <div className="relative flex flex-col gap-1 mb-5 pt-10">
                <h2 className="text-xl font-bold text-white">Party Now</h2>
                <p className="text-sm text-white/60">지금 이 순간, 혼자 보기엔 아쉬우니까</p>
                <Link href="/live/create" className="absolute right-0 px-8 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm text-white font-medium">
                    파티 개설하기
                </Link>
            </div>

            <ul className="grid grid-cols-4 gap-2 list-none p-0 m-0">
                {displayed.map((ani, idx) => {
                    const party = DUMMY_PARTIES[(idx + offset) % DUMMY_PARTIES.length]
                    const imgPath = ani.backdrop_path || ani.poster_path

                    return (
                        <li key={`${ani.id}-${offset}-${idx}`} className="relative">
                            <div className="relative overflow-hidden rounded-xl aspect-video bg-[#1a1a2e] cursor-pointer group">
                                {imgPath && (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${imgPath}`}
                                        alt={ani.name}
                                        className="w-full h-full object-cover brightness-75 group-hover:brightness-60 transition-all duration-300"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                                <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-15 h-15 rounded-full border-2 border-white/50 flex-shrink-0 overflow-hidden">
                                            <img src={party.img} alt={party.hostName} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[16px] font-bold text-white drop-shadow">{ani.name}</span>
                                            <span className="text-[11px] font-semibold text-white/90 whitespace-nowrap">개설자 : {party.hostName}</span>
                                            <span className="text-[10px] text-white/60 whitespace-nowrap">개설 시간 : {party.time}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/70 indent-1 pt-1">
                                        참여 인원 : {party.attendees} / {party.maxAttendees}명
                                    </span>
                                </div>

                                <span className="absolute bottom-1 right-3 text-[52px] font-black italic text-white/20 leading-none pointer-events-none select-none">
                                    {idx + 1}
                                </span>
                            </div>
                        </li>
                    )
                })}
            </ul>

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
        <p className="mt-3 text-xs text-white/30 text-right">
            다음 파티 추천까지 {remaining}
        </p>
    )
}