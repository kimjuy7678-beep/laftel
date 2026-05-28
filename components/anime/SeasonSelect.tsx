'use client'

import { useState, useRef, useEffect } from 'react'

interface Season {
    season_number: number
    name: string
    episode_count?: number
    poster_path?: string | null
    air_date?: string
}

interface SeasonSelectProps {
    seasons: Season[]
    value: number
    onChange: (seasonNumber: number) => void
    episodeCount?: number
}

export default function SeasonSelect({ seasons, value, onChange, episodeCount }: SeasonSelectProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const selected = seasons.find(s => s.season_number === value)

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">

            {/* 트리거 버튼 */}
            <button
                onClick={() => setOpen(v => !v)}
                className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl border
                    text-sm font-semibold cursor-pointer transition-all duration-200
                    ${open
                        ? 'bg-[#6c63ff]/15 border-[#6c63ff]/60 text-white'
                        : 'bg-white/[0.05] border-white/10 text-white/80 hover:bg-white/[0.08] hover:border-white/20'
                    }
                `}
            >
                <svg
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-[#9d97ff] shrink-0"
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                </svg>

                <span>{selected?.name || `시즌 ${value}`}</span>

                {selected?.air_date && (
                    <span className="text-[11px] text-white/30 font-normal">
                        {selected.air_date.slice(0, 4)}
                    </span>
                )}

                {!open && episodeCount !== undefined && (
                    <span className="text-[11px] text-white/30 font-normal">
                        {episodeCount}화
                    </span>
                )}

                <svg
                    width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`ml-1 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {/* 드롭다운 패널 */}
            {open && (
                <div className="
                    absolute top-[calc(100%+8px)] left-0 z-50
                    min-w-[220px] rounded-xl overflow-hidden
                    bg-[#141414] border border-white/[0.08]
                    shadow-[0_16px_48px_rgba(0,0,0,0.6)]
                    backdrop-blur-xl
                ">
                    {/* 스크롤 영역 */}
                    <div className="
                        max-h-[280px] overflow-y-auto
                        [&::-webkit-scrollbar]:w-1
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:bg-white/10
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb:hover]:bg-white/20
                    ">
                        {seasons.map((s, i) => {
                            const isSelected = s.season_number === value
                            return (
                                <button
                                    key={s.season_number}
                                    onClick={() => { onChange(s.season_number); setOpen(false) }}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3
                                        text-left cursor-pointer transition-colors duration-150
                                        ${isSelected
                                            ? 'bg-[#6c63ff]/15 text-white'
                                            : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                                        }
                                        ${i !== seasons.length - 1 ? 'border-b border-white/[0.04]' : ''}
                                    `}
                                >
                                    {/* 체크 or 번호 */}
                                    <div className={`
                                        w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
                                        ${isSelected
                                            ? 'bg-[#6c63ff] text-white'
                                            : 'bg-white/[0.06] text-white/30'
                                        }
                                    `}>
                                        {isSelected
                                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7" /></svg>
                                            : s.season_number
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : ''}`}>
                                            {s.name || `시즌 ${s.season_number}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {s.air_date && (
                                                <span className="text-[11px] text-white/25">{s.air_date.slice(0, 4)}</span>
                                            )}
                                            {s.episode_count !== undefined && s.episode_count > 0 && (
                                                <span className="text-[11px] text-white/25">{s.episode_count}화</span>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="w-1 h-4 rounded-full bg-[#6c63ff] shrink-0" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}