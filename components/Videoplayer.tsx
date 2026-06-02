'use client'
import { useEffect, useRef, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'

interface Props {
    id: number
    mode: 'modal' | 'background'
    className?: string
    title?: string
    episodeTitle?: string
    episodeNumber?: number
    onNext?: () => void
    onClose?: () => void
}

export default function VideoPlayer({ id, mode, className, title, episodeTitle, episodeNumber, onNext, onClose }: Props) {
    const currentVideo = useAniStore(state => state.aniVideos[id])
    const onNextVideo = useAniStore(state => state.onNextVideo)

    const [activeKey, setActiveKey] = useState<string | null>(null)
    const [showControls, setShowControls] = useState(true)
    const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const triedKeys = useRef<Set<string>>(new Set())

    useEffect(() => {
        const key = currentVideo?.key
        if (!key) { setActiveKey(null); return }
        setActiveKey(key)
    }, [currentVideo?.key, id])

    useEffect(() => {
        if (!activeKey) return
        if (triedKeys.current.has(activeKey)) { onNextVideo(id); return }
        triedKeys.current.add(activeKey)
        failTimer.current = setTimeout(() => { onNextVideo(id) }, 7000)
        return () => { if (failTimer.current) clearTimeout(failTimer.current) }
    }, [activeKey])

    useEffect(() => {
        if (!activeKey) return
        const handler = (e: MessageEvent) => {
            if (e.origin !== 'https://www.youtube.com') return
            try {
                const data = JSON.parse(e.data)
                if (data.event === 'onError' && [2, 5, 100, 101, 150].includes(data.info)) {
                    if (failTimer.current) clearTimeout(failTimer.current)
                    onNextVideo(id)
                }
                if (data.event === 'onStateChange' && data.info === 1) {
                    if (failTimer.current) clearTimeout(failTimer.current)
                }
            } catch { }
        }
        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [activeKey, id])

    const handleClick = () => {
        setShowControls(v => !v)
    }

    if (!activeKey) return null

    const isBackground = mode === 'background'

    const src = isBackground
        ? `https://www.youtube.com/embed/${activeKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeKey}&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window?.location?.origin ?? '')}`
        : `https://www.youtube.com/embed/${activeKey}?autoplay=1&controls=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window?.location?.origin ?? '')}`

    if (isBackground) {
        return (
            <iframe
                key={activeKey}
                src={src}
                allow="autoplay; fullscreen"
                className={`w-full h-full border-0 ${className ?? ''}`}
            />
        )
    }

    return (
        <div className="relative w-full h-full" onClick={handleClick}>
            <iframe
                key={activeKey}
                src={src}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full h-full border-0"
            />

            {onClose && (
                <div className={`absolute top-4 right-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                    style={{ pointerEvents: showControls ? 'auto' : 'none', zIndex: 10 }}
                >
                    <button
                        onClick={e => { e.stopPropagation(); onClose() }}
                        className="flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white text-sm transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                        닫기 (ESC)
                    </button>
                </div>
            )}

            <div className={`absolute top-0 left-0 right-0 px-6 pt-5 pb-12 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
            >
                {title && <p className="text-white font-black text-lg">{title}</p>}
                {(episodeNumber || episodeTitle) && (
                    <p className="text-white/60 text-sm mt-0.5">
                        {episodeNumber && `${episodeNumber}화`}{episodeTitle && ` · ${episodeTitle}`}
                    </p>
                )}
            </div>

            {onNext && (
                <div className={`absolute bottom-16 right-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                    style={{ pointerEvents: 'auto', zIndex: 10 }}>
                    <button
                        onClick={onNext}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-sm font-semibold hover:bg-white/30 transition-colors"
                    >
                        다음화
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}