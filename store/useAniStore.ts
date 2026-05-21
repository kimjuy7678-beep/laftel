import { create } from "zustand";
import { AniStore } from "@/types/store";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const YOUTUBE_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export const useAniStore = create<AniStore>((set, get: any) => ({
    aniList: [],
    aniVideos: {},

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

        console.log("애니 500개", allResults);
        set({ aniList: allResults });
    },

    onFetchVideo: async (id: number, name: string) => {
        const { aniVideos } = get();
        if (aniVideos[id]) return;

        // 1. TMDB에서 먼저 조회
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

        // 2. TMDB에 없으면 유튜브 검색
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
}));