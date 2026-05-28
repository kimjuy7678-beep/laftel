import { create } from "zustand";
import { AniStore } from "@/types/store";
import { AniDetail, AniSeasonDetail } from "@/types/animation";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const YOUTUBE_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export const useAniStore = create<AniStore>((set, get: any) => ({
    aniList: [],
    aniVideos: {},
    aniDetails: {},
    aniSeasons: {},

    // 기존 전체 fetch (다른 페이지에서 그대로 사용)
    onFetchAni: async () => {
        let allResults: any[] = [];
        for (let page = 1; page <= 25; page++) {
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=${page}`
            );
            const data = await res.json();
            if (!data.results?.length) break;
            allResults = [...allResults, ...data.results];
        }
        set({ aniList: allResults });
    },

    // ← 추가: 파티 섹션용 빠른 fetch (1페이지 = 20개만)
    // 1페이지 → 3페이지로 늘려서 60개 확보
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
        set({ aniList: results })
    },

    onFetchVideo: async (id: number, name: string) => {
        const { aniVideos } = get();
        if (aniVideos[id]) return;

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}`
        );
        const data = await res.json();
        const trailer = data.results?.find(
            (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
        );

        if (trailer) {
            set((state: any) => ({
                aniVideos: { ...state.aniVideos, [id]: { source: "tmdb", key: trailer.key } }
            }));
            return;
        }

        const query = encodeURIComponent(`${name} anime trailer`);
        const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&key=${YOUTUBE_KEY}&type=video&maxResults=5&relevanceLanguage=ja`
        );
        const ytData = await ytRes.json();
        const items = ytData.items || [];

        for (const item of items) {
            const videoId = item.id.videoId;
            const detailRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${YOUTUBE_KEY}`
            );
            const detailData = await detailRes.json();
            const status = detailData.items?.[0]?.status;

            if (status?.embeddable) {
                set((state: any) => ({
                    aniVideos: { ...state.aniVideos, [id]: { source: "youtube", key: videoId } }
                }));
                return;
            }
        }
    },

    onFetchDetail: async (id: number) => {
        const { aniDetails } = get();
        if (aniDetails[id]) return;

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`
        );
        const data: AniDetail = await res.json();
        set((state: any) => ({
            aniDetails: { ...state.aniDetails, [id]: data }
        }));
    },

    onFetchSeason: async (id: number, seasonNumber: number) => {
        const { aniSeasons } = get();
        const key = `${id}_${seasonNumber}`;
        if (aniSeasons[key]) return;

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=ko-KR`
        );
        const data: AniSeasonDetail = await res.json();
        set((state: any) => ({
            aniSeasons: { ...state.aniSeasons, [key]: data }
        }));
    },
}));