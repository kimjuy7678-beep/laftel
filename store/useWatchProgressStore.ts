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
    progress: number
    updatedAt: number
}

interface WatchProgressStore {
    items: WatchProgressItem[]
    loading: boolean
    currentProfileId: string | null
    fetchProgress: (uid: string, profileId: string) => Promise<void>
    saveProgress: (uid: string, item: Omit<WatchProgressItem, 'updatedAt'>, profileId?: string) => Promise<void>
}

export const useWatchProgressStore = create<WatchProgressStore>()(
    persist(
        (set, get) => ({
            items: [],
            loading: false,
            currentProfileId: null,

            fetchProgress: async (uid, profileId) => {
                set({ loading: true, currentProfileId: profileId })
                try {
                    const q = query(
                        collection(db, 'users', uid, 'profiles', profileId, 'watchProgress'),
                        orderBy('updatedAt', 'desc'),
                        limit(20)
                    )
                    const snap = await getDocs(q)
                    const items: WatchProgressItem[] = snap.docs
                        .map(d => d.data() as WatchProgressItem)
                        .filter(item => item?.tmdbId !== undefined)
                    set({ items })
                } catch (e) {
                    console.error(e)
                    set({ items: [] })
                } finally {
                    set({ loading: false })
                }
            },

            saveProgress: async (uid, item, profileId) => {
                const pid = profileId || get().currentProfileId || 'main'
                const newItem: WatchProgressItem = { ...item, updatedAt: Date.now() }
                await setDoc(
                    doc(db, 'users', uid, 'profiles', pid, 'watchProgress', String(item.tmdbId)),
                    { ...newItem, updatedAt: serverTimestamp() }
                )
                set(state => ({
                    items: [newItem, ...state.items.filter(i => i.tmdbId !== item.tmdbId)]
                }))
            },
        }),
        { name: 'watch-progress-storage' }
    )
)
