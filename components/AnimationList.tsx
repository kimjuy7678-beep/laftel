'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'
import { AniItem } from '@/types/animation'
import VideoPlayer from './Videoplayer'

const GENRE_MAP: Record<number, string> = {
    16: '애니', 10759: '액션', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 27: '공포',
    10751: '가족', 10749: '로맨스', 80: '범죄', 53: '스릴러',
}

function AniCard({ ani }: { ani: AniItem }) {
    const { onFetchVideo } = useAniStore()
    const aniVideos = useAniStore(state => state.aniVideos)
    const router = useRouter()

    const [hovered, setHovered] = useState(false)
    const [showVideo, setShowVideo] = useState(false)

    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const videoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const video = aniVideos[ani.id]
    const poster = ani.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${ani.backdrop_path}`
        : null
    const score = Math.round(ani.vote_average * 10) / 10
    const year = ani.first_air_date?.slice(0, 4) || ''
    const genres = ani.genre_ids.map(g => GENRE_MAP[g]).filter(Boolean).slice(0, 2)

    const handleMouseEnter = () => {
        hoverTimer.current = setTimeout(async () => {
            setHovered(true)
            await onFetchVideo(ani.id, ani.name)
            // 비디오 fetch 후 약간 딜레이 줘서 iframe 마운트 시점 분리
            videoTimer.current = setTimeout(() => setShowVideo(true), 300)
        }, 200)
    }

    const handleMouseLeave = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        if (videoTimer.current) clearTimeout(videoTimer.current)
        setHovered(false)
        setShowVideo(false)
    }

    const goDetail = () => router.push(`/anime/${ani.id}`)

    return (
        <li
            className="relative rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-white/[0.06] cursor-pointer
                       transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:border-white/[0.12]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={goDetail}
        >
            {/* 미디어 영역 */}
            <div className="relative w-full aspect-video bg-[var(--bg-card)] overflow-hidden">
                {/* 썸네일 */}
                {poster ? (
                    <img
                        src={poster}
                        alt={ani.name}
                        loading="lazy"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300
                                   ${showVideo && video?.key ? 'opacity-0' : 'opacity-100'}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[32px] font-black text-white/[0.07]">
                        {(ani.name || '?')[0]}
                    </div>
                )}

                {/* 비디오 플레이어 - hovered일 때만 마운트
                    VideoPlayer 내부에서 재생 전 opacity-0, 실패 시 썸네일로 대체 */}
                {hovered && (
                    <div className="absolute inset-0">
                        <VideoPlayer
                            id={ani.id}
                            mode="background"
                            className="absolute inset-0"
                        />
                    </div>
                )}

                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                {/* 평점 뱃지 */}
                {score > 0 && (
                    <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm border border-[var(--border)]
                                     rounded-md px-[7px] py-[3px] text-[11px] font-bold text-amber-400 pointer-events-none">
                        ★ {score}
                    </span>
                )}
            </div>

            {/* 카드 하단 */}
            <div className="relative h-[100px] overflow-hidden">
                {/* 기본 상태: 제목만 */}
                <div className={`absolute inset-0 px-[14px] flex items-center
                                transition-all duration-200
                                ${hovered ? 'opacity-0 -translate-y-[6px] pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                    <p className="text-[13px] font-bold text-white/85 truncate">{ani.name}</p>
                </div>

                {/* 호버 상태: 메타 + 버튼 */}
                <div className={`absolute inset-0 px-[14px] py-[10px] flex flex-col justify-between
                                transition-all duration-200
                                ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[6px] pointer-events-none'}`}>
                    <div>
                        <p className="text-[13px] font-bold text-white/90 truncate mb-1">{ani.name}</p>
                        <div className="flex items-center gap-[5px]">
                            {year && <span className="text-[11px] text-[var(--text-faint)]">{year}</span>}
                            {genres.map(g => (
                                <span key={g} className="text-[11px] text-[var(--text-faint)] bg-white/[0.06] px-[7px] py-[2px] rounded-[3px]">
                                    {g}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-[7px]">
                        {/* 재생 버튼 */}
                        <button
                            className="flex-1 flex items-center justify-center gap-[5px] h-7
                                       bg-[#6c63ff] hover:bg-[#5a52e0] border-none rounded-md
                                       text-white text-[11px] font-semibold cursor-pointer transition-colors duration-200"
                            onClick={e => { e.stopPropagation(); goDetail() }}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                            재생
                        </button>

                        {/* 찜 버튼 */}
                        <button
                            className="w-7 h-7 flex items-center justify-center
                                       bg-white/[0.07] hover:bg-white/[0.13]
                                       border border-[var(--border)] rounded-md
                                       text-[var(--text-muted)] hover:text-white
                                       cursor-pointer transition-all duration-200"
                            onClick={e => e.stopPropagation()}
                            title="찜하기"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </li>
    )
}

const AniList = () => {
    const { aniList, onFetchAni } = useAniStore()

    useEffect(() => {
        onFetchAni()
    }, [])

    return (
        <ul className="grid grid-cols-4 gap-5">
            {aniList.map((ani: AniItem) => (
                <AniCard key={ani.id} ani={ani} />
            ))}
        </ul>
    )
}

export default AniList
