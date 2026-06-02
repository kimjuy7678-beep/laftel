import { useEffect, useState } from 'react'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

export function useEpisodes(id: string | string[], activeTab: string) {
    const [seasonList, setSeasonList] = useState<any[]>([])
    const [selectedSeason, setSelectedSeason] = useState<number>(1)
    const [episodes, setEpisodes] = useState<any[]>([])
    const [episodeLoading, setEpisodeLoading] = useState(false)
    const [episodeCache, setEpisodeCache] = useState<Record<number, any[]>>({})

    const initSeasons = (detailData: any) => {
        const validSeasons = (detailData.seasons || []).filter((s: any) => s.season_number > 0)
        setSeasonList(validSeasons)
        if (validSeasons.length > 0) setSelectedSeason(validSeasons[0].season_number)
    }

    useEffect(() => {
        if (activeTab !== 'seasons' || !id || !selectedSeason) return
        if (episodeCache[selectedSeason]) {
            setEpisodes(episodeCache[selectedSeason])
            return
        }
        setEpisodeLoading(true)
        fetch(`https://api.themoviedb.org/3/tv/${id}/season/${selectedSeason}?api_key=${TMDB_KEY}&language=ko-KR`)
            .then(r => r.json())
            .then(data => {
                const eps = data.episodes || []
                setEpisodes(eps)
                setEpisodeCache(prev => ({ ...prev, [selectedSeason]: eps }))
            })
            .finally(() => setEpisodeLoading(false))
    }, [activeTab, selectedSeason, id])

    return {
        seasonList, selectedSeason, setSelectedSeason,
        episodes, episodeLoading,
        initSeasons,
    }
}