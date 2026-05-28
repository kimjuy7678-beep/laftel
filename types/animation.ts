// types/animation.ts

export interface AniItem {
    id: number;
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    genre_ids: number[];
    first_air_date: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    origin_country: string[];
    original_language: string;
    original_name: string;
}

export interface AniVideo {
    key: string;
    source: "tmdb" | "youtube";
}

export interface AniStore {
    aniList: AniItem[];
    aniVideos: Record<number, AniVideo>;
    onFetchAni: () => Promise<void>;
    onFetchVideo: (id: number, name: string) => Promise<void>;
}
