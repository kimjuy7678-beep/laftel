export interface Product {
    productId: string;
    category: string;
    title: string;
    price: string;
    thumbnail: string;
    detailImages: string[];
    productdetail: string[];
    soldout: boolean;
}

export interface BannerItem {
    id: string;
    title: string;
    image: string;
    link: string;
}

export interface CategoryItem {
    id: string;
    name: string;
    image: string;
}

export interface StoreData {
    banners: BannerItem[];
    categories: CategoryItem[];
    bestTop10: Product[];
    recentProducts: Product[];
    seriesRecommend: {
        title: string;
        products: Product[];
    }[];
    newAnime: {
        title: string;
        products: Product[];
    };
}

export type SideMenuCategory =
    | "전체 굿즈"
    | "신규 입고"
    | "인기 상품"
    | "한정판"
    | "위시리스트";

export type ProductCategory =
    | "아크릴 스탠드"
    | "클리어 파일"
    | "배지·핀"
    | "포스터"
    | "스티커·엽서"
    | "키링";



import { AniItem, AniVideo, AniDetail, AniSeasonDetail } from "@/types/animation";

export interface AniStoreExtra {
    detailModalItem: any | null
    onOpenDetailModal: (item: any) => void
    onCloseDetailModal: () => void
}

export interface AniStore {
    aniList: AniItem[];
    aniVideos: Record<number, AniVideo | null>;
    aniDetails: Record<number, AniDetail>;
    aniSeasons: Record<string, AniSeasonDetail>;

    // 디테일 모달용 state 추가
    detailModalItem: any | null;
    onOpenDetailModal: (item: any) => void;
    onCloseDetailModal: () => void;

    onFetchAni: () => Promise<void>;
    onFetchTopAni: () => Promise<void>;
    onFetchVideo: (id: number, name: string) => Promise<void>;
    onFetchDetail: (id: number) => Promise<void>;
    onFetchSeason: (id: number, seasonNumber: number) => Promise<void>;
    onNextVideo: (id: number) => void;
}