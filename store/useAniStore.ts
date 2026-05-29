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

    // 디테일 모달용 state
    detailModalItem: null,
    onOpenDetailModal: (item: any) => set({ detailModalItem: item }),
    onCloseDetailModal: () => set({ detailModalItem: null }),

    // 전체 fetch (기존 유지)
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
        const unique = Array.from(new Map(allResults.map(a => [a.id, a])).values());
        set({ aniList: unique });
    },

    // 빠른 fetch (HeroSection / 파티 섹션용)
    onFetchTopAni: async () => {
        const { aniList } = get();
        if (aniList.length >= 60) return;

        let results: any[] = [];
        for (let page = 1; page <= 3; page++) {
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=${page}`
            );
            const data = await res.json();
            results = [...results, ...data.results];
        }
        const unique = Array.from(new Map(results.map(a => [a.id, a])).values());
        set({ aniList: unique });
    },

    onFetchVideo: async (id: number, name: string) => {
        const { aniVideos } = get();
        if (aniVideos[id]) return;

        // 1) TMDB에서 트레일러/티저 수집
        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}`
        );
        const data = await res.json();

        const tmdbCandidates: string[] = (data.results || [])
            .filter((v: any) =>
                v.site === "YouTube" &&
                (v.type === "Trailer" || v.type === "Teaser" || v.type === "Opening Credits")
            )
            .map((v: any) => v.key as string);

        // 2) YouTube 폴백: 영어 + 일본어 두 쿼리로 더 많은 후보 확보
        let ytCandidates: string[] = [];
        if (YOUTUBE_KEY) {
            try {
                const queries = [
                    `${name} anime official trailer`,
                    `${name} アニメ 予告`,
                ];
                const ytResults = await Promise.all(
                    queries.map(q =>
                        fetch(
                            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&key=${YOUTUBE_KEY}&type=video&maxResults=5&videoEmbeddable=true`
                        ).then(r => r.json())
                    )
                );
                ytCandidates = ytResults
                    .flatMap(d => (d.items || []).map((item: any) => item.id?.videoId))
                    .filter(Boolean);
            } catch (e) {
                console.warn('[useAniStore] YouTube search failed:', e);
            }
        }

        // TMDB 우선, 없으면 YouTube
        const candidates = [
            ...new Set([...tmdbCandidates, ...ytCandidates])
        ];

        if (candidates.length === 0) {
            console.warn(`[useAniStore] No video candidates for id=${id} name=${name}`);
            return;
        }

        set((state: any) => ({
            aniVideos: {
                ...state.aniVideos,
                [id]: {
                    source: tmdbCandidates.length > 0 ? "tmdb" : "youtube",
                    key: candidates[0],
                    candidates,
                },
            },
        }));
    },

    // 현재 key 에러 → 다음 candidate로 교체
    onNextVideo: (id: number) => {
        const { aniVideos } = get();
        const current = aniVideos[id];
        if (!current) return;

        const currentIndex = current.candidates.indexOf(current.key);
        const nextKey = current.candidates[currentIndex + 1];
        if (!nextKey) {
            console.warn(`[useAniStore] No more candidates for id=${id}`);
            return;
        }

        console.log(`[useAniStore] Switching to next video: ${nextKey} (index ${currentIndex + 1})`);
        set((state: any) => ({
            aniVideos: {
                ...state.aniVideos,
                [id]: {
                    ...current,
                    key: nextKey,
                    source: "youtube",
                },
            },
        }));
    },

    onFetchDetail: async (id: number) => {
        const { aniDetails } = get();
        if (aniDetails[id]) return;

        const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`
        );
        const data: AniDetail = await res.json();
        set((state: any) => ({
            aniDetails: { ...state.aniDetails, [id]: data },
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
            aniSeasons: { ...state.aniSeasons, [key]: data },
        }));
    },
}));