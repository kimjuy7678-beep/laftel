// types/store.ts

import { AniItem, AniVideo } from './animation'

export interface AniStore {
    aniList: AniItem[];
    aniVideos: Record<number, AniVideo>;
    onFetchAni: () => Promise<void>;
    onFetchVideo: (id: number, name: string) => Promise<void>;
}