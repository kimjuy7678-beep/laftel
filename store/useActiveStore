import { create } from 'zustand'
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

interface ActivityCount {
    rating: number
    review: number
    comment: number
}

interface ActivityStore {
    counts: ActivityCount
    fetched: boolean
    fetchCounts: (uid: string, force?: boolean) => Promise<void>
    resetCounts: () => void
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
    counts: { rating: 0, review: 0, comment: 0 },
    fetched: false,

    fetchCounts: async (uid: string, force = false) => {
        if (get().fetched && !force) return
        try {
            // reviews: uid 필드로 쿼리
            const reviewSnap = await getDocs(
                query(collection(db, 'reviews'), where('uid', '==', uid))
            )
            const reviewDocs = reviewSnap.docs.map(d => d.data())

            // 이벤트 댓글: authorId 필드 (event_comments_* collectionGroup은 안 되므로 LibraryPage 카운트 활용)
            // 애니 댓글: uid 필드
            let animeCommentCount = 0
            try {
                const animeCommentSnap = await getDocs(
                    query(collectionGroup(db, 'anime_comments'), where('uid', '==', uid))
                )
                animeCommentCount = animeCommentSnap.size
            } catch (e) {
                // 인덱스 미생성 시 무시
                console.warn('anime_comments index not ready:', e)
            }

            set({
                counts: {
                    rating: reviewDocs.filter(r => r.score > 0).length,
                    review: reviewDocs.length,
                    comment: animeCommentCount,
                },
                fetched: true,
            })
        } catch (e) {
            console.error('fetchCounts error:', e)
        }
    },

    resetCounts: () => set({ counts: { rating: 0, review: 0, comment: 0 }, fetched: false }),
}))

// LibraryPage에서 정확한 값이 계산되면 여기로 동기화 (이벤트 댓글 포함)
export const syncActivityCounts = (counts: ActivityCount) => {
    useActivityStore.setState({ counts, fetched: true })
}