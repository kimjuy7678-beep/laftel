'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, doc, deleteDoc, where } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function MyPartySection() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [myParties, setMyParties] = useState<FireParty[]>([])

    useEffect(() => {
        if (!user?.uid) return
        const q = query(collection(db, 'parties'), where('hostId', '==', user.uid))
        const unsub = onSnapshot(q, (snap) => {
            const now = new Date()
            const data: FireParty[] = []
            snap.docs.forEach(d => {
                const p = { id: d.id, ...d.data() } as FireParty
                const created = new Date(p.createdAt)
                if (now.getTime() - created.getTime() > ONE_DAY_MS) {
                    deleteDoc(doc(db, 'parties', p.id))
                    return
                }
                if (p.status === 'upcoming' && new Date(p.scheduledAt) <= now) {
                    data.push({ ...p, status: 'live' })
                } else {
                    data.push(p)
                }
            })
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setMyParties(data)
        })
        return () => unsub()
    }, [user?.uid])

    const handleClick = (party: FireParty) => {
        if (party.status === 'upcoming') {
            toast(`⏳ 아직 시작 전이에요`, {
                description: `${formatDate(party.scheduledAt)} 시작`,
            })
            return
        }
        router.push(`/live/party/${party.id}`)
    }

    const handleDeleteClick = (e: React.MouseEvent, partyId: string) => {
        e.stopPropagation()
        toast('파티를 삭제할까요?', {
            action: {
                label: '삭제',
                onClick: async () => {
                    await deleteDoc(doc(db, 'parties', partyId))
                    toast.success('파티가 삭제됐어요')
                },
            },
            cancel: {
                label: '취소',
                onClick: () => {},
            },
        })
    }

    if (!user || myParties.length === 0) return null

    return (
        <section className="mb-2">
            <div className="flex items-center gap-2 mb-4 pt-14 sm:pt-20">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">내 파티</h2>
                <span className="px-2 py-0.5 bg-[var(--border)] rounded-full text-xs text-[var(--text-muted)]">{myParties.length}</span>
            </div>

            <ul className="grid grid-cols-1 gap-3 list-none p-0 m-0 sm:grid-cols-2 xl:grid-cols-4 xl:gap-2">
                {myParties.slice(0, 4).map((party, idx) => {
                    const isUpcoming = party.status === 'upcoming'
                    return (
                        <li key={party.id} className="relative">
                            <div
                                onClick={() => handleClick(party)}
                                className={`relative overflow-hidden rounded-xl aspect-video bg-[var(--bg-card)] group ring-1 ring-[var(--border)] ${isUpcoming ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {party.animePoster && (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${party.animePoster}`}
                                        alt={party.animeName}
                                        className={`w-full h-full object-cover transition-all duration-300 ${isUpcoming ? 'brightness-40' : 'brightness-75 group-hover:brightness-60'}`}
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                                {isUpcoming && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                                        <span className="text-2xl">⏳</span>
                                        <span className="text-white text-xs font-bold">시작 전</span>
                                        <span className="text-white/60 text-[10px] text-center px-2">아직 파티 시작시간이 아니에요!</span>
                                    </div>
                                )}

                                <div className="absolute top-2.5 left-2.5">
                                    {!isUpcoming ? (
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

                                <button
                                    onClick={(e) => handleDeleteClick(e, party.id)}
                                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white/80 hover:text-white text-xs pointer-events-auto"
                                >
                                    ✕
                                </button>

                                <div className="absolute bottom-2.5 left-2.5 right-12 flex flex-col gap-1">
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-[14px] font-bold text-white drop-shadow sm:text-[16px]">{party.animeName}</span>
                                        <span className="text-[11px] font-semibold text-white/90 whitespace-nowrap">개설자 : {party.hostName}</span>
                                        <span className="text-[10px] text-white/60 whitespace-nowrap">
                                            파티 시작 : {formatDate(party.scheduledAt)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-white/70 indent-1 pt-1">
                                        참여 인원 : {party.attendees} / {party.maxAttendees}명
                                    </span>
                                </div>

                                <span className="absolute bottom-1 right-3 text-[42px] font-black italic text-white/20 leading-none pointer-events-none select-none sm:text-[52px]">
                                    {idx + 1}
                                </span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
