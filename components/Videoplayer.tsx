'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useWatchProgressStore } from '@/store/useWatchProgressStore'

interface Props {
    id: number
    mode: 'modal' | 'background'
    className?: string
    title?: string
    episodeTitle?: string
    episodeNumber?: number
    backdrop?: string
    poster?: string
    onNext?: () => void
    onClose?: () => void
    fallbackImage?: string | null
    onImmersiveChange?: (v: boolean) => void
    immersive?: boolean
}

export default function VideoPlayer({ id, mode, className, title, episodeTitle, episodeNumber, backdrop, poster, onNext, onClose, immersive: immersiveProp, onImmersiveChange }: Props) {
    const currentVideo = useAniStore(state => state.aniVideos[id])
    const onNextVideo = useAniStore(state => state.onNextVideo)
    const aniList = useAniStore(state => state.aniList)
    const { user } = useAuthStore()
    const { saveProgress } = useWatchProgressStore()

    const [activeKey, setActiveKey] = useState<string | null>(null)
    const [showControls, setShowControls] = useState(true)
    const immersive = immersiveProp ?? false
    const [locked, setLocked] = useState(false)
    const [lockHint, setLockHint] = useState(false)
    const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const triedKeys = useRef<Set<string>>(new Set())
    const savedRef = useRef(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const profileId = (user as any)?.currentProfileId || 'main'

    // 마우스 움직이면 컨트롤 표시, 3초 후 자동 숨김
    const showControlsTemporarily = useCallback(() => {
        if (locked) return
        setShowControls(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => {
            setShowControls(false)
        }, 3000)
    }, [locked])

    useEffect(() => {
        return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
    }, [])

    useEffect(() => {
        const key = currentVideo?.key
        if (!key) { setActiveKey(null); return }
        setActiveKey(key)
        savedRef.current = false
        if (mode === 'modal' && user?.uid && title) {
            const ani = aniList.find((a: any) => a.id === id)
            saveProgress(user.uid, {
                tmdbId: id, title,
                backdrop: backdrop || ani?.backdrop_path || '',
                poster: poster || ani?.poster_path || '',
                episode: episodeNumber || 1,
                episodeTitle: episodeTitle || '',
                progress: 5,
            }, profileId)
        }
    }, [currentVideo?.key, id])

    useEffect(() => {
        if (!activeKey) return
        if (triedKeys.current.has(activeKey)) { onNextVideo(id); return }
        triedKeys.current.add(activeKey)
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
                    if (mode === 'modal' && user?.uid && title && !savedRef.current) {
                        savedRef.current = true
                        const ani = aniList.find((a: any) => a.id === id)
                        saveProgress(user.uid, {
                            tmdbId: id, title,
                            backdrop: backdrop || ani?.backdrop_path || '',
                            poster: poster || ani?.poster_path || '',
                            episode: episodeNumber || 1,
                            episodeTitle: episodeTitle || '',
                            progress: 5,
                        }, profileId)
                    }
                }
            } catch { }
        }
        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [activeKey, id, mode, user?.uid, title, episodeNumber, episodeTitle, backdrop, poster, profileId])

    // ESC로 몰입 모드 해제
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && immersive && !locked) toggleImmersive(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [immersive, locked])

    const toggleImmersive = (val: boolean) => {
        setLocked(false)
        setShowControls(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        onImmersiveChange?.(val)
    }

    if (!activeKey) return null
    const isBackground = mode === 'background'

    const src = isBackground
        ? `https://www.youtube.com/embed/${activeKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeKey}&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window?.location?.origin ?? '')}`
        : `https://www.youtube.com/embed/${activeKey}?autoplay=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(window?.location?.origin ?? '')}`

    if (isBackground) {
        return <iframe ref={iframeRef} key={activeKey} src={src} allow="autoplay; fullscreen" className={`w-full h-full border-0 ${className ?? ''}`} />
    }

    return (
        // ✅ onClick 제거 — 마우스 움직임으로만 컨트롤 표시
        <div
            className="relative w-full h-full"
            onMouseMove={showControlsTemporarily}
            onMouseEnter={showControlsTemporarily}
        >
            <iframe
                ref={iframeRef}
                key={activeKey}
                src={src}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full h-full border-0"
            />

            {/* 상단 그라디언트 + 제목 */}
            <div
                className={`absolute top-0 left-0 right-0 px-6 pt-5 pb-12 transition-opacity duration-300 pointer-events-none ${showControls && !locked ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
            >
                {title && <p className="text-white font-black text-lg">{title}</p>}
                {(episodeNumber || episodeTitle) && (
                    <p className="text-white/60 text-sm mt-0.5">
                        {episodeNumber && `${episodeNumber}화`}{episodeTitle && ` · ${episodeTitle}`}
                    </p>
                )}
            </div>

            {/* 우상단 버튼들 */}
            <div
                className={`absolute top-4 right-4 flex items-center gap-2 transition-opacity duration-300 ${showControls && !locked ? 'opacity-100' : 'opacity-0'}`}
                style={{ pointerEvents: showControls && !locked ? 'auto' : 'none', zIndex: 10 }}
            >
                {/* 몰입 모드 버튼 */}
                {mode === 'modal' && (
                    <button
                        onClick={e => { e.stopPropagation(); toggleImmersive(!immersive) }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                        style={{
                            background: immersive ? 'rgba(108,99,255,0.7)' : 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)', color: '#fff',
                            border: immersive ? '1px solid rgba(157,151,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                        {immersive ? '몰입 해제' : '몰입 모드'}
                    </button>
                )}

                {/* 닫기 버튼 */}
                {onClose && (
                    <button
                        onClick={e => { e.stopPropagation(); onClose() }}
                        className="flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 hover:text-white text-sm transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                        닫기 (ESC)
                    </button>
                )}
            </div>

            {/* 자물쇠 버튼 — 몰입 모드일 때 항상 표시 */}
            {immersive && (
                <div
                    className="absolute bottom-6 right-6"
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={e => { e.stopPropagation(); setLocked(v => !v) }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                        style={{
                            background: locked ? 'rgba(108,99,255,0.8)' : 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)', color: '#fff',
                            border: locked ? '1px solid rgba(157,151,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {locked
                                ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                                : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>
                            }
                        </svg>
                        {locked ? '잠금 해제' : '화면 잠금'}
                    </button>
                </div>
            )}

            {/* 잠금 힌트 */}
            {lockHint && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
                    <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 20px', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)' }}>
                        🔒 잠금 해제 버튼을 눌러 잠금을 해제하세요
                    </div>
                </div>
            )}

            {/* 다음화 버튼 */}
            {onNext && (
                <div
                    className={`absolute bottom-16 right-6 transition-opacity duration-300 ${showControls && !locked ? 'opacity-100' : 'opacity-0'}`}
                    style={{ pointerEvents: showControls && !locked ? 'auto' : 'none', zIndex: 10 }}
                >
                    <button
                        onClick={e => { e.stopPropagation(); onNext() }}
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