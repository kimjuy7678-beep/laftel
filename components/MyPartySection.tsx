'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, doc, deleteDoc, where } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'

interface FireParty {
    id: string
    animeName: string
    animePoster: string
    hostName: string
    hostId: string
    scheduledAt: string
    attendees: number
    maxAttendees: number
    status: 'upcoming' | 'live' | 'ended'
    title: string
    createdAt: string
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default function MyPartySection() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [myParties, setMyParties] = useState<FireParty[]>([])

    useEffect(() => {
        if (!user?.uid) return

        const q = query(
            collection(db, 'parties'),
            where('hostId', '==', user.uid),
            orderBy('createdAt', 'desc')
        )
        const unsub = onSnapshot(q, (snap) => {
            const now = new Date()
            const data: FireParty[] = []

            snap.docs.forEach(d => {
                const p = { id: d.id, ...d.data() } as FireParty
                const created = new Date(p.createdAt)
                // 24시간 지난 파티 자동 삭제
                if (now.getTime() - created.getTime() > ONE_DAY_MS) {
                    deleteDoc(doc(db, 'parties', p.id))
                    return
                }
                // 예약 시간 지나면 live로
                if (p.status === 'upcoming' && new Date(p.scheduledAt) <= now) {
                    data.push({ ...p, status: 'live' })
                } else {
                    data.push(p)
                }
            })

            setMyParties(data)
        })
        return () => unsub()
    }, [user?.uid])

    const handleDelete = async (e: React.MouseEvent, partyId: string) => {
        e.stopPropagation()
        if (!confirm('파티를 삭제할까요?')) return
        await deleteDoc(doc(db, 'parties', partyId))
    }

    if (!user || myParties.length === 0) return null

    return (
        <section className="mb-2">
            <div className="flex items-center gap-2 mb-4 pt-20">
                <h2 className="text-xl font-bold text-white">내 파티</h2>
                <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/60">{myParties.length}</span>
            </div>

            <ul className="grid grid-cols-4 gap-2 list-none p-0 m-0">
                {myParties.slice(0, 4).map((party, idx) => (
                    <li key={party.id} className="relative">
                        <div
                            onClick={() => router.push(`/live/party/${party.id}`)}
                            className="relative overflow-hidden rounded-xl aspect-video bg-[#1a1a2e] cursor-pointer group ring-1 ring-white/30"
                        >
                            {party.animePoster && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${party.animePoster}`}
                                    alt={party.animeName}
                                    className="w-full h-full object-cover brightness-75 group-hover:brightness-60 transition-all duration-300"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                            {/* 상태 배지 */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                {party.status === 'live' ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                        LIVE
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 rounded-full text-xs font-bold text-white/80">
                                        ⏳ 예약됨
                                    </span>
                                )}
                            </div>

                            {/* 삭제 버튼 */}
                            <button
                                onClick={(e) => handleDelete(e, party.id)}
                                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white/80 hover:text-white text-xs"
                            >
                                ✕
                            </button>

                            <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1">
                                <div className="flex flex-col">
                                    <span className="text-[16px] font-bold text-white drop-shadow">{party.animeName}</span>
                                    <span className="text-[11px] font-semibold text-white/90 whitespace-nowrap">개설자 : {party.hostName}</span>
                                    <span className="text-[10px] text-white/60 whitespace-nowrap">
                                        개설 시간 : {new Date(party.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
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
                ))}
            </ul>
        </section>
    )
}