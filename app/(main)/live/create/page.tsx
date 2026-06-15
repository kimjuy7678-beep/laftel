'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { CreatePartyInput } from '@/types/party'
import { toast } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'

export default function CreatePartyPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const { aniList, onFetchTopAni } = useAniStore()
    const { theme } = useTheme()

    const [title, setTitle] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAnime, setSelectedAnime] = useState<{
        id: number
        name: string
        poster_path?: string
    } | null>(null)
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
    const [maxAttendees, setMaxAttendees] = useState<10 | 20 | 30>(30)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => { if (aniList.length === 0) onFetchTopAni() }, [])

    const isDark = theme === 'dark'

    const bg = isDark ? '#1a1a1a' : '#ffffff'
    const bgHeader = isDark ? '#111111' : '#f5f5f7'
    const bgHover = isDark ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.1)'
    const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    const textMain = isDark ? '#ffffff' : '#0a0a0a'
    const textSub = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
    const textDay = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)'
    const textOff = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)'
    const textDis = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)'
    const navArrow = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
    const scrollBg = isDark ? '#111111' : '#f0f0f5'
    const scrollThumb = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'

    const filteredAnime = searchQuery.length > 0
        ? aniList.filter(ani => ani.name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
        : []

    const handleSubmit = async () => {
        if (!user) { toast.error('로그인이 필요해요 🔐', { description: '파티 개설은 로그인 후에 가능해요.' }); return }
        if (!selectedAnime) { toast.error('애니를 먼저 골라요 🎌', { description: '어떤 애니 같이 볼지 선택해주세요.' }); return }
        if (!title.trim()) { toast.error('방 제목이 없어요 📝', { description: '파티방 이름을 입력해줘야 해요.' }); return }
        if (!scheduledDate) { toast.error('시작 시간을 설정해주세요 ⏰', { description: '언제 시작할지 알아야 파티원들이 모이죠!' }); return }

        try {
            setIsSubmitting(true)
            const now = new Date()
            const status = scheduledDate <= now ? 'live' : 'upcoming'
            const partyData: CreatePartyInput = {
                title: title.trim(),
                animeId: selectedAnime.id,
                animeName: selectedAnime.name,
                animePoster: selectedAnime.poster_path || '',
                hostId: user.uid ?? '',
                hostName: user.name || '익명',
                scheduledAt: scheduledDate.toISOString(),
                maxAttendees,
                attendees: 1,
                status,
                createdAt: new Date().toISOString(),
            }
            const docRef = await addDoc(collection(db, 'parties'), partyData)
            router.push(`/live/party/${docRef.id}`)
        } catch (err) {
            console.error(err)
            toast.error('파티 개설 실패 😢', { description: '서버에 문제가 생겼어요. 잠깐 후 다시 시도해봐요.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen pt-20 sm:pt-24">
            <style>{`
                /* ── wrapper ── */
                .react-datepicker-wrapper { width: 100%; }
                .react-datepicker-popper { z-index: 9999; }

                /* ── 팝업 전체 ── */
                .react-datepicker {
                    font-family: 'Pretendard', sans-serif !important;
                    background: ${bg} !important;
                    border: 1px solid ${borderCol} !important;
                    border-radius: 16px !important;
                    overflow: hidden !important;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.5) !important;
                    display: flex !important;
                }
                .react-datepicker__triangle { display: none !important; }

                /* ── 헤더 ── */
                .react-datepicker__header,
                .react-datepicker__header--time {
                    background: ${bgHeader} !important;
                    border-bottom: 1px solid ${borderCol} !important;
                    padding: 14px 0 10px !important;
                }
                .react-datepicker__current-month,
                .react-datepicker-time__header {
                    color: ${textMain} !important;
                    font-size: 14px !important;
                    font-weight: 700 !important;
                }

                /* ── 네비게이션 ── */
                .react-datepicker__navigation-icon::before {
                    border-color: ${navArrow} !important;
                }
                .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
                    border-color: ${textMain} !important;
                }

                /* ── 요일 ── */
                .react-datepicker__day-name {
                    color: ${textSub} !important;
                    font-size: 12px !important;
                    font-weight: 600 !important;
                }

                /* ── 날짜 ── */
                .react-datepicker__day {
                    color: ${textDay} !important;
                    border-radius: 8px !important;
                    font-size: 13px !important;
                    transition: background .15s, color .15s !important;
                }
                .react-datepicker__day:hover {
                    background: ${bgHover} !important;
                    color: #9d97ff !important;
                }
                .react-datepicker__day--selected,
                .react-datepicker__day--keyboard-selected {
                    background: #6c63ff !important;
                    color: #fff !important;
                    font-weight: 700 !important;
                }
                .react-datepicker__day--today {
                    color: #9d97ff !important;
                    font-weight: 700 !important;
                }
                .react-datepicker__day--outside-month {
                    color: ${textOff} !important;
                }
                .react-datepicker__day--disabled {
                    color: ${textDis} !important;
                    cursor: not-allowed !important;
                }
                .react-datepicker__day--disabled:hover {
                    background: transparent !important;
                    color: ${textDis} !important;
                }

                /* ── 시간 패널 ── */
                .react-datepicker__time-container {
                    border-left: 1px solid ${borderCol} !important;
                    width: 100px !important;
                }
                .react-datepicker__time,
                .react-datepicker__time-box,
                .react-datepicker-time__header {
                    background: ${bg} !important;
                    color: ${textMain} !important;
                }
                .react-datepicker__time-list {
                    background: ${bg} !important;
                    scrollbar-width: thin;
                    scrollbar-color: ${scrollThumb} ${scrollBg};
                }
                .react-datepicker__time-list::-webkit-scrollbar {
                    width: 4px;
                }
                .react-datepicker__time-list::-webkit-scrollbar-track {
                    background: ${scrollBg};
                }
                .react-datepicker__time-list::-webkit-scrollbar-thumb {
                    background: ${scrollThumb};
                    border-radius: 4px;
                }
                .react-datepicker__time-list-item {
                    color: ${textDay} !important;
                    font-size: 13px !important;
                    border-radius: 6px !important;
                    background: transparent !important;
                    transition: background .15s, color .15s !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .react-datepicker__time-list-item:hover {
                    background: ${bgHover} !important;
                    color: #9d97ff !important;
                }
                .react-datepicker__time-list-item--selected {
                    background: #6c63ff !important;
                    color: #fff !important;
                    font-weight: 700 !important;
                }
                .react-datepicker__time-list-item--disabled {
                    color: ${textDis} !important;
                    cursor: not-allowed !important;
                }
                .react-datepicker__time-list-item--disabled:hover {
                    background: transparent !important;
                    color: ${textDis} !important;
                }

                /* ── 달력 월 배경 ── */
                .react-datepicker__month-container {
                    background: ${bg} !important;
                }
                .react-datepicker__month {
                    background: ${bg} !important;
                    margin: 6px !important;
                }

                /* ── input ── */
                .dp-input {
                    width: 100%;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 12px 16px;
                    font-size: 14px;
                    color: var(--text-primary);
                    outline: none;
                    transition: border-color .2s;
                    cursor: pointer;
                    font-family: 'Pretendard', sans-serif;
                }
                .dp-input:focus { border-color: #6c63ff; }
                .dp-input::placeholder { color: var(--text-faint); }
                @media (max-width: 640px) {
                    .react-datepicker {
                        max-width: calc(100vw - 32px) !important;
                        display: block !important;
                    }
                    .react-datepicker__time-container {
                        width: 100% !important;
                        border-left: 0 !important;
                        border-top: 1px solid ${borderCol} !important;
                    }
                    .react-datepicker__time-box {
                        width: 100% !important;
                    }
                    .react-datepicker__time-list {
                        display: grid !important;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        height: 132px !important;
                    }
                    .react-datepicker__time-list-item {
                        height: 32px !important;
                    }
                }
            `}</style>

            <div className="w-full max-w-xl mx-auto px-4 py-10 sm:px-6 sm:py-16">

                {/* 헤더 */}
                <div className="mb-8 sm:mb-10">
                    <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-1 text-center sm:text-2xl">파티 개설</h1>
                    <p className="text-sm text-[var(--text-faint)] text-center">함께 볼 애니와 시간을 정해보세요</p>
                </div>

                <div className="flex flex-col gap-6 sm:gap-8">

                    {/* 애니 검색 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">애니 선택</label>
                        <input
                            type="text"
                            placeholder="애니 이름 검색..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value)
                                if (selectedAnime && e.target.value !== selectedAnime.name) setSelectedAnime(null)
                            }}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[#6c63ff] transition-colors"
                        />

                        {filteredAnime.length > 0 && !selectedAnime && (
                            <ul className="flex flex-col gap-1 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                                {filteredAnime.map(ani => (
                                    <li key={ani.id}
                                        onClick={() => { setSelectedAnime(ani); setSearchQuery(ani.name) }}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                                    >
                                        <img src={`https://image.tmdb.org/t/p/w92${ani.poster_path}`} alt={ani.name} className="w-8 h-12 object-cover rounded" />
                                        <span className="text-sm text-[var(--text-primary)]">{ani.name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {selectedAnime && (
                            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] mt-1">
                                <img src={`https://image.tmdb.org/t/p/w92${selectedAnime.poster_path}`} alt={selectedAnime.name} className="w-8 h-12 object-cover rounded" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{selectedAnime.name}</p>
                                    <p className="text-xs text-[var(--text-faint)]">선택됨</p>
                                </div>
                                <button onClick={() => { setSelectedAnime(null); setSearchQuery('') }}
                                    className="ml-auto text-[var(--text-faint)] hover:text-[var(--text-primary)] transition-colors text-lg">✕</button>
                            </div>
                        )}
                    </div>

                    {/* 방 제목 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">방 제목</label>
                        <input
                            type="text"
                            placeholder="ex) 같이 정주행해요!"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={30}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[#6c63ff] transition-colors"
                        />
                        <span className="text-xs text-[var(--text-faint)] text-right">{title.length} / 30</span>
                    </div>

                    {/* 시작 시간 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">시작 시간</label>
                        <DatePicker
                            selected={scheduledDate}
                            onChange={(date: Date | null) => setScheduledDate(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
                            timeCaption="시간"
                            dateFormat="yyyy년 MM월 dd일 HH:mm"
                            minDate={new Date()}
                            locale={ko}
                            placeholderText="날짜와 시간을 선택하세요"
                            className="dp-input"
                            popperPlacement="bottom-start"
                        />
                    </div>

                    {/* 최대 인원 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">최대 인원</label>
                        <div className="grid grid-cols-3 gap-2">
                            {([10, 20, 30] as const).map(n => (
                                <button key={n} onClick={() => setMaxAttendees(n)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${maxAttendees === n
                                        ? 'bg-[#6c63ff] text-white border-[#6c63ff]'
                                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-muted)]'
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
                        className="w-full py-3.5 bg-[#6c63ff] text-white font-bold rounded-xl hover:bg-[#5a52e0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2 sm:py-4"
                    >
                        {isSubmitting ? '개설 중...' : '파티 개설하기'}
                    </button>

                </div>
            </div>
        </div>
    )
}
