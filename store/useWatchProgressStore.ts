import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '@/firebase/firebase'
import {
    doc, setDoc, getDocs,
    collection, serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'

export interface WatchProgressItem {
    tmdbId: number
    title: string
    backdrop: string
    poster: string
    episode: number
    episodeTitle: string
    progress: number      // 0~100
    updatedAt: number
}

interface WatchProgressStore {
    items: WatchProgressItem[]
    loading: boolean
    fetchProgress: (uid: string) => Promise<void>
    saveProgress: (uid: string, item: Omit<WatchProgressItem, 'updatedAt'>) => Promise<void>
}

export const useWatchProgressStore = create<WatchProgressStore>()(
    persist(
        (set) => ({
            items: [],
            loading: false,

            fetchProgress: async (uid) => {
                set({ loading: true })
                try {
                    const q = query(
                        collection(db, 'users', uid, 'watchProgress'),
                        orderBy('updatedAt', 'desc'),
                        limit(10)
                    )
                    const snap = await getDocs(q)
                    const items: WatchProgressItem[] = snap.docs.map(d => d.data() as WatchProgressItem)
                    set({ items })
                } catch (e) {
                    console.error(e)
                } finally {
                    set({ loading: false })
                }
            },

            saveProgress: async (uid, item) => {
                const newItem: WatchProgressItem = { ...item, updatedAt: Date.now() }
                await setDoc(
                    doc(db, 'users', uid, 'watchProgress', String(item.tmdbId)),
                    { ...newItem, updatedAt: serverTimestamp() }
                )
                set(state => ({
                    items: [
                        newItem,
                        ...state.items.filter(i => i.tmdbId !== item.tmdbId)
                    ]
                }))
            },
        }),
        { name: 'watch-progress-storage' }
    )
)