// store/useCouponStore.ts
import { create } from "zustand";
import {
    fetchUserCoupons,
    fetchActiveCoupons,
    issueCoupon,
    useCoupon,
    calcCouponDiscount,
    type Coupon,
    type IssueCouponParams,
} from "@/lib/coupon";

interface CouponStore {
    // 상태
    coupons: Coupon[];          // 전체 쿠폰 목록 (마이페이지용)
    activeCoupons: Coupon[];    // 사용 가능한 쿠폰 (결제 페이지용)
    selectedCoupon: Coupon | null;
    loading: boolean;
    error: string | null;

    // 조회
    fetchCoupons: (uid: string) => Promise<void>;
    fetchActiveCoupons: (uid: string) => Promise<void>;

    // 결제 페이지에서 쿠폰 선택/해제
    selectCoupon: (coupon: Coupon | null) => void;

    // 할인 금액 계산
    getDiscount: (orderAmount: number) => number;

    // 쿠폰 발급
    issueCoupon: (params: IssueCouponParams) => Promise<void>;

    // 쿠폰 사용 처리 (주문 완료 시)
    useCoupon: (uid: string, couponId: string, orderId: string) => Promise<void>;
}

export const useCouponStore = create<CouponStore>((set, get) => ({
    coupons: [],
    activeCoupons: [],
    selectedCoupon: null,
    loading: false,
    error: null,

    // ── 전체 목록 (마이페이지 쿠폰 탭) ────────────────────────────────────
    fetchCoupons: async (uid) => {
        set({ loading: true, error: null });
        try {
            const coupons = await fetchUserCoupons(uid);
            set({ coupons });
        } catch (e: any) {
            set({ error: e.message ?? "쿠폰 목록을 불러오지 못했습니다." });
        } finally {
            set({ loading: false });
        }
    },

    // ── 사용 가능한 쿠폰만 (결제 페이지 쿠폰 선택 모달) ──────────────────
    fetchActiveCoupons: async (uid) => {
        set({ loading: true, error: null });
        try {
            const activeCoupons = await fetchActiveCoupons(uid);
            set({ activeCoupons });
        } catch (e: any) {
            set({ error: e.message ?? "쿠폰 목록을 불러오지 못했습니다." });
        } finally {
            set({ loading: false });
        }
    },

    // ── 쿠폰 선택 / 해제 ──────────────────────────────────────────────────
    selectCoupon: (coupon) => {
        set({ selectedCoupon: coupon });
    },

    // ── 할인 금액 계산 ────────────────────────────────────────────────────
    getDiscount: (orderAmount) => {
        const { selectedCoupon } = get();
        if (!selectedCoupon) return 0;
        return calcCouponDiscount(selectedCoupon, orderAmount);
    },

    // ── 쿠폰 발급 ─────────────────────────────────────────────────────────
    issueCoupon: async (params) => {
        set({ loading: true, error: null });
        try {
            await issueCoupon(params);
            // 발급 후 목록 갱신
            await get().fetchCoupons(params.uid);
        } catch (e: any) {
            set({ error: e.message ?? "쿠폰 발급에 실패했습니다." });
            throw e;
        } finally {
            set({ loading: false });
        }
    },

    // ── 쿠폰 사용 처리 ────────────────────────────────────────────────────
    useCoupon: async (uid, couponId, orderId) => {
        await useCoupon(uid, couponId, orderId);
        set({ selectedCoupon: null });
        // 사용 처리 후 목록 갱신
        await get().fetchCoupons(uid);
    },
}));