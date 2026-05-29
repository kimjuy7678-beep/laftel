'use client'
import { useEffect, useRef, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'

interface Props {
    id: number
    mode: 'modal' | 'background'
    className?: string
}

export default function VideoPlayer({ id, mode, className }: Props) {
    const currentVideo = useAniStore(state => state.aniVideos[id])
    const onNextVideo  = useAniStore(state => state.onNextVideo)

    // 실제로 iframe에 넣을 key — null이면 렌더 안 함
    const [activeKey, setActiveKey] = useState<string | null>(null)
    const failTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const triedKeys = useRef<Set<string>>(new Set())

    // currentVideo.key가 바뀔 때마다 activeKey 동기화
    useEffect(() => {
        const key = currentVideo?.key
        if (!key) { setActiveKey(null); return }
        setActiveKey(key)
    }, [currentVideo?.key])

    // 6초 안전망: 재생이 아예 안 시작되는 경우 다음 후보로
    useEffect(() => {
        if (!activeKey) return

        // 이미 실패한 key면 바로 넘김
        if (triedKeys.current.has(activeKey)) {
            onNextVideo(id)
            return
        }
        triedKeys.current.add(activeKey)

        failTimer.current = setTimeout(() => {
            onNextVideo(id)
        }, 7000)

        return () => {
            if (failTimer.current) clearTimeout(failTimer.current)
        }
    }, [activeKey])

    // postMessage로 YouTube 에러 감지
    useEffect(() => {
        if (!activeKey) return

        const handler = (e: MessageEvent) => {
            if (e.origin !== 'https://www.youtube.com') return
            try {
                const data = JSON.parse(e.data)
                // YouTube가 실제로 보내는 에러 이벤트
                if (data.event === 'onError') {
                    const code = data.info
                    // 2, 5, 100, 101, 150 → 재생 불가
                    if ([2, 5, 100, 101, 150].includes(code)) {
                        if (failTimer.current) clearTimeout(failTimer.current)
                        onNextVideo(id)
                    }
                }
                // 재생 시작되면 안전망 타이머 취소
                if (data.event === 'onStateChange' && data.info === 1) {
                    if (failTimer.current) clearTimeout(failTimer.current)
                }
            } catch {}
        }

        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [activeKey, id])

    if (!activeKey) return null

    const isBackground = mode === 'background'

    const src = isBackground
        ? `https://www.youtube.com/embed/${activeKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeKey}&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window?.location?.origin ?? '')}`
        : `https://www.youtube.com/embed/${activeKey}?autoplay=1&controls=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window?.location?.origin ?? '')}`

    return (
        <iframe
            key={activeKey}
            src={src}
            allow="autoplay; fullscreen"
            allowFullScreen={!isBackground}
            // React가 직접 관리하는 iframe이므로 언마운트 시 React가 깔끔하게 제거
            // YT Player API처럼 외부에서 DOM을 교체하지 않으므로 removeChild 충돌 없음
            className={`w-full h-full border-0 ${className ?? ''}`}
        />
    )
}