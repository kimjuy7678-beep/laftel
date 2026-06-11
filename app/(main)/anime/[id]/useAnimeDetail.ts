'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAniStore } from '@/store/useAniStore'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
export const IMG = 'https://image.tmdb.org/t/p'

export const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 27: '공포',
    10751: '가족', 10762: '어린이', 10749: '로맨스', 80: '범죄',
    53: '스릴러', 99: '다큐멘터리',
}

export function useAnimeDetail() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const rawId = useParams()?.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    const numericId = Number(id)

    const onFetchVideo = useAniStore(state => state.onFetchVideo)
    const videoInfo = useAniStore(state => state.aniVideos[numericId])

    const [detail, setDetail] = useState<any>(null)
    const [credits, setCredits] = useState<any[]>([])
    const [similar, setSimilar] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [liked, setLiked] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'cast' | 'similar' | 'seasons'>('seasons')
    const [modalOpen, setModalOpen] = useState(false)
    const [videoLoading, setVideoLoading] = useState(false)

    const epParam = searchParams.get('ep') ? Number(searchParams.get('ep')) : null

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([
            fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/aggregate_credits?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/similar?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
        ]).then(([det, cred, sim]) => {
            setDetail(det)
            setCredits((cred.cast || []).slice(0, 20))
            setSimilar((sim.results || []).slice(0, 12))
        }).finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        if (!detail) return
        if (useAniStore.getState().aniVideos[numericId]) return
        setVideoLoading(true)
        onFetchVideo(numericId, detail.original_name || detail.name)
            .finally(() => setVideoLoading(false))
    }, [detail, numericId])

    const openPlayer = useCallback(async () => {
        if (!detail) return
        setModalOpen(true)
        document.body.style.overflow = 'hidden'
        if (useAniStore.getState().aniVideos[numericId]) return
        setVideoLoading(true)
        await onFetchVideo(numericId, detail.original_name || detail.name)
        setVideoLoading(false)
    }, [detail, numericId, onFetchVideo])

    useEffect(() => {
        if (modalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [modalOpen])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen()
                } else {
                    setModalOpen(false)
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        if (!detail) return
        if (searchParams.get('play') === '1') openPlayer()
    }, [detail])

    return {
        id, numericId, router,
        detail, credits, similar, loading,
        liked, setLiked,
        activeTab, setActiveTab,
        modalOpen, setModalOpen,
        videoLoading, videoInfo,
        openPlayer,
        epParam,
    }
}