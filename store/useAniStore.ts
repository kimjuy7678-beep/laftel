import { create } from "zustand";
import { AniStore } from "@/types/store";
import { AniDetail, AniSeasonDetail } from "@/types/animation";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const YOUTUBE_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

const RATING_MAP: Record<string, string> = {
    'ALL': 'ALL',
    '7': '7',
    '12': '12',
    '15': '15',
    '18': '19',
    '19': '19',
    'ADULT': '19',
}

export const useAniStore = create<AniStore>((set, get: any) => ({
    aniList: [],
    aniVideos: {},
    aniDetails: {},
    aniSeasons: {},
    contentRatings: {},

    detailModalItem: null,
    onOpenDetailModal: (item: any) => set({ detailModalItem: item }),
    onCloseDetailModal: () => set({ detailModalItem: null }),

    onFetchContentRatings: async (ids: number[]) => {
        const results: Record<number, string> = {}
        const chunks: number[][] = []
        for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))
        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (id) => {
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/content_ratings?api_key=${TMDB_KEY}`)
                    const data = await res.json()
                    const kr = data.results?.find((r: any) => r.iso_3166_1 === 'KR')
                    results[id] = RATING_MAP[kr?.rating] || 'ALL'
                } catch { results[id] = 'ALL' }
            }))
        }
        set((state: any) => ({ contentRatings: { ...state.contentRatings, ...results } }))
    },

    onFetchAni: async () => {
        let allResults: any[] = []
        for (let page = 1; page <= 25; page++) {
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=150&language=ko-KR&page=${page}`
            )
            const data = await res.json()
            if (!data.results?.length) break
            allResults = [...allResults, ...data.results]
        }
        const unique = Array.from(new Map(allResults.map(a => [a.id, a])).values())
        set({ aniList: unique })
        const top200ids = unique.slice(0, 200).map((a: any) => a.id)
        get().onFetchContentRatings(top200ids)
    },

    onFetchTopAni: async () => {
        const { aniList } = get()
        if (aniList.length >= 60) return
        let results: any[] = []
        for (let page = 1; page <= 3; page++) {
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=${page}`
            )
            const data = await res.json()
            results = [...results, ...data.results]
        }
        const unique = Array.from(new Map(results.map(a => [a.id, a])).values())
        set({ aniList: unique })
        const ids = unique.slice(0, 60).map((a: any) => a.id)
        get().onFetchContentRatings(ids)
    },

    // ✅ YouTube API 대신 TMDB videos API로 변경
    onFetchVideo: async (id: number, name: string) => {
        const { aniVideos } = get()
        if (aniVideos[id]) return

        try {
            // 한국어 먼저 시도
            const res = await fetch(
                `https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}&language=ko-KR`
            )
            const data = await res.json()
            let videos = data.results || []

            // 한국어 없으면 영어로 재시도
            if (videos.length === 0) {
                const resEn = await fetch(
                    `https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}&language=en-US`
                )
                const dataEn = await resEn.json()
                videos = dataEn.results || []
            }

            // YouTube 영상만 필터 (Trailer > Teaser > Opening > 기타 순)
            const ytVideos = videos.filter((v: any) => v.site === 'YouTube')
            const sorted = [
                ...ytVideos.filter((v: any) => v.type === 'Trailer'),
                ...ytVideos.filter((v: any) => v.type === 'Teaser'),
                ...ytVideos.filter((v: any) => v.type === 'Opening Credits'),
                ...ytVideos.filter((v: any) => !['Trailer', 'Teaser', 'Opening Credits'].includes(v.type)),
            ]

            if (sorted.length === 0) {
                console.warn(`[useAniStore] No TMDB video for id=${id} name=${name}`)
                return
            }

            const candidates = [...new Set(sorted.map((v: any) => v.key))]
            set((state: any) => ({
                aniVideos: {
                    ...state.aniVideos,
                    [id]: { source: 'youtube', key: candidates[0], candidates },
                },
            }))
        } catch (e) {
            console.warn('[useAniStore] TMDB video fetch failed:', e)
        }
    },

    onNextVideo: (id: number) => {
        const { aniVideos } = get()
        const current = aniVideos[id]
        if (!current) return
        const currentIndex = current.candidates.indexOf(current.key)
        const nextKey = current.candidates[currentIndex + 1]
        if (!nextKey) { console.warn(`[useAniStore] No more candidates for id=${id}`); return }
        set((state: any) => ({
            aniVideos: { ...state.aniVideos, [id]: { ...current, key: nextKey, source: 'youtube' } },
        }))
    },

    onFetchDetail: async (id: number) => {
        const { aniDetails } = get()
        if (aniDetails[id]) return
        const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`)
        const data: AniDetail = await res.json()
        set((state: any) => ({ aniDetails: { ...state.aniDetails, [id]: data } }))
    },

    onFetchSeason: async (id: number, seasonNumber: number) => {
        const { aniSeasons } = get()
        const key = `${id}_${seasonNumber}`
        if (aniSeasons[key]) return
        const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=ko-KR`)
        const data: AniSeasonDetail = await res.json()
        set((state: any) => ({ aniSeasons: { ...state.aniSeasons, [key]: data } }))
    },
}))