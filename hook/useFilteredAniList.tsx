// @/hooks/useFilteredAniList.ts

import { useAniStore } from '@/store/useAniStore'
import { useAuthStore } from '@/store/useAuthStore'

const AGE_PRIORITY: Record<string, number> = {
    'ALL': 0,
    '7': 7,
    '12': 12,
    '15': 15,
    '19': 19,
}

export function useFilteredAniList() {
    const { aniList, contentRatings } = useAniStore()
    const { user } = useAuthStore()

    const ageLimit = user?.ageLimit ?? '19'
    const limitNum = AGE_PRIORITY[ageLimit] ?? 19

    return aniList.filter((ani: any) => {
        // adult 완전 차단
        if (ani.adult === true && ageLimit !== '19') return false

        // contentRatings에 데이터 없으면 허용
        const rating = contentRatings[ani.id]
        if (!rating) return true

        const ratingNum = AGE_PRIORITY[rating] ?? 0
        return ratingNum <= limitNum
    })
}