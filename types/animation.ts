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
    candidates: string[];
}

export interface AniState {
    aniList: AniItem[];
    onFetchAni: () => Promise<void>;
}

// 시즌 요약 (onFetchDetail에서 받는 seasons 배열 아이템)
export interface AniSeason {
    season_number: number;
    episode_count: number;
    name: string;
    overview: string;
    poster_path: string | null;
    air_date: string;
}

// TV 상세 정보 (/tv/{id} 응답)
export interface AniDetail {
    id: number;
    name: string;
    title: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    first_air_date: string;
    vote_average: number;
    vote_count: number;
    number_of_seasons: number;
    number_of_episodes: number;
    genres: { id: number; name: string }[];
    seasons: AniSeason[];
}

// 에피소드 아이템 (/tv/{id}/season/{n} 응답의 episodes 배열 아이템)
export interface AniEpisode {
    episode_number: number;
    name: string;
    overview: string;
    air_date: string;
    still_path: string | null;
    runtime: number;
    vote_average: number;
}

// 시즌 상세 (/tv/{id}/season/{n} 응답)
export interface AniSeasonDetail {
    season_number: number;
    name: string;
    overview: string;
    poster_path: string | null;
    air_date: string;
    episodes: AniEpisode[];
}