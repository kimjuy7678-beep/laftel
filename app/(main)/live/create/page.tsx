'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { CreatePartyInput } from '@/types/party'

export default function CreatePartyPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const { aniList, onFetchTopAni } = useAniStore()

    const [title, setTitle] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAnime, setSelectedAnime] = useState<any>(null)
    const [scheduledAt, setScheduledAt] = useState('')
    const [maxAttendees, setMaxAttendees] = useState<10 | 20 | 30>(30)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 애니 목록 fetch (라이브 페이지 거치지 않고 직접 접근해도 동작)
    useEffect(() => {
        if (aniList.length === 0) {
            onFetchTopAni()
        }
    }, [])

    // 애니 검색 필터
    const filteredAnime = searchQuery.length > 0
        ? aniList.filter(ani =>
            ani.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 6)
        : []

    const handleSubmit = async () => {
        if (!user) {
            alert('로그인이 필요해요')
            return
        }
        if (!selectedAnime) {
            alert('애니를 선택해주세요')
            return
        }
        if (!title.trim()) {
            alert('방 제목을 입력해주세요')
            return
        }
        if (!scheduledAt) {
            alert('시작 시간을 설정해주세요')
            return
        }

        try {
            setIsSubmitting(true)

            const now = new Date()
            const scheduled = new Date(scheduledAt)
            const status = scheduled <= now ? 'live' : 'upcoming'

            const partyData: CreatePartyInput = {
                title: title.trim(),
                animeId: selectedAnime.id,
                animeName: selectedAnime.name,
                animePoster: selectedAnime.poster_path || '',
                hostId: user.uid ?? '',
                hostName: user.name || '익명',
                scheduledAt: scheduled.toISOString(),
                maxAttendees,
                attendees: 1,
                status,
                createdAt: new Date().toISOString(),
            }

            const docRef = await addDoc(collection(db, 'parties'), partyData)

            // PartySection에 새 파티 알림 → 맨 앞에 표시

            // 파티 룸으로 이동
            router.push(`/live/party/${docRef.id}`)

        } catch (err) {
            console.error(err)
            alert('파티 개설에 실패했어요')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen mt-70">
            <div className="max-w-xl mx-auto px-6 py-16">

                {/* 헤더 */}
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-white mb-1 text-center">파티 개설</h1>
                    <p className="text-sm text-white/40 text-center">함께 볼 애니와 시간을 정해보세요</p>
                </div>

                <div className="flex flex-col gap-8">

                    {/* 애니 검색 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white/70">애니 선택</label>
                        <input
                            type="text"
                            placeholder="애니 이름 검색..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value)
                                if (selectedAnime && e.target.value !== selectedAnime.name) {
                                    setSelectedAnime(null)
                                }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                        />

                        {/* 검색 결과 - selectedAnime 없을 때만 표시 */}
                        {filteredAnime.length > 0 && !selectedAnime && (
                            <ul className="flex flex-col gap-1 mt-1">
                                {filteredAnime.map(ani => (
                                    <li
                                        key={ani.id}
                                        onClick={() => {
                                            setSelectedAnime(ani)
                                            setSearchQuery(ani.name)
                                        }}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <img
                                            src={`https://image.tmdb.org/t/p/w92${ani.poster_path}`}
                                            alt={ani.name}
                                            className="w-8 h-12 object-cover rounded"
                                        />
                                        <span className="text-sm text-white">{ani.name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* 선택된 애니 */}
                        {selectedAnime && (
                            <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/10 mt-1">
                                <img
                                    src={`https://image.tmdb.org/t/p/w92${selectedAnime.poster_path}`}
                                    alt={selectedAnime.name}
                                    className="w-8 h-12 object-cover rounded"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">{selectedAnime.name}</p>
                                    <p className="text-xs text-white/40">선택됨</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedAnime(null)
                                        setSearchQuery('')
                                    }}
                                    className="ml-auto text-white/30 hover:text-white/70 transition-colors text-lg"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 방 제목 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white/70">방 제목</label>
                        <input
                            type="text"
                            placeholder="ex) 같이 정주행해요!"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={30}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                        />
                        <span className="text-xs text-white/30 text-right">{title.length} / 30</span>
                    </div>

                    {/* 시작 시간 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white/70">시작 시간</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={e => setScheduledAt(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors [color-scheme:dark]"
                        />
                    </div>

                    {/* 최대 인원 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-white/70">최대 인원</label>
                        <div className="flex gap-2">
                            {([10, 20, 30] as const).map(n => (
                                <button
                                    key={n}
                                    onClick={() => setMaxAttendees(n)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                                        maxAttendees === n
                                            ? 'bg-white text-black border-white'
                                            : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    {n}명
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 개설 버튼 */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                    >
                        {isSubmitting ? '개설 중...' : '파티 개설하기'}
                    </button>

                </div>
            </div>
        </div>
    )
}