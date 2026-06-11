'use client'
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
    fetchCounts: (uid: string, profileId: string, force?: boolean) => Promise<void>
    resetCounts: () => void
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
    counts: { rating: 0, review: 0, comment: 0 },
    fetched: false,

    fetchCounts: async (uid: string, profileId: string, force = false) => {
        if (get().fetched && !force) return
        try {
            const reviewSnap = await getDocs(
                collection(db, 'users', uid, 'profiles', profileId, 'reviews')
            )
            const reviewDocs = reviewSnap.docs.map(d => d.data())

            let animeCommentCount = 0
            try {
                const animeCommentSnap = await getDocs(
                    collection(db, 'users', uid, 'profiles', profileId, 'anime_comments')
                )
                animeCommentCount = animeCommentSnap.size
            } catch (e) {
                console.warn('anime_comments query error:', e)
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

export const syncActivityCounts = (counts: ActivityCount) => {
    useActivityStore.setState({ counts, fetched: true })
}
