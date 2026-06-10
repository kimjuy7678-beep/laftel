import { create } from 'zustand'
import { db } from '@/firebase/firebase'
import {
    doc, setDoc, deleteDoc, getDocs,
    collection, serverTimestamp, query, orderBy
} from 'firebase/firestore'

export type WatchlistTab = 'recent' | 'wishlist' | 'purchased' | 'reviews' | 'comments'

export interface WatchlistItem {
    id: number
    title: string
    poster: string
    addedAt: number
    tab: WatchlistTab
}

interface WatchlistStore {
    items: WatchlistItem[]
    loading: boolean
    fetchWatchlist: (uid: string, profileId: string) => Promise<void>
    addItem: (uid: string, profileId: string, item: Omit<WatchlistItem, 'addedAt'>) => Promise<void>
    removeItem: (uid: string, profileId: string, itemId: number, tab: WatchlistTab) => Promise<void>
    hasItem: (id: number, tab: WatchlistTab) => boolean
}

export const useWatchlistStore = create<WatchlistStore>()((set, get) => ({
    items: [],
    loading: false,

    fetchWatchlist: async (uid, profileId) => {
        set({ loading: true })
        try {
            const q = query(
                collection(db, 'users', uid, 'profiles', profileId, 'watchlist'),
                orderBy('addedAt', 'desc')
            )
            const snap = await getDocs(q)
            const items: WatchlistItem[] = snap.docs.map(d => d.data() as WatchlistItem)
            set({ items })
        } catch (e) {
            console.error(e)
        } finally {
            set({ loading: false })
        }
    },

    addItem: async (uid, profileId, item) => {
        const newItem: WatchlistItem = { ...item, addedAt: Date.now() }
        const docId = `${item.tab}_${item.id}`
        await setDoc(doc(db, 'users', uid, 'profiles', profileId, 'watchlist', docId), {
            ...newItem,
            updatedAt: serverTimestamp(),
        })
        set(state => ({
            items: [newItem, ...state.items.filter(i => !(i.id === item.id && i.tab === item.tab))]
        }))
    },

    removeItem: async (uid, profileId, itemId, tab) => {
        const docId = `${tab}_${itemId}`
        await deleteDoc(doc(db, 'users', uid, 'profiles', profileId, 'watchlist', docId))
        set(state => ({
            items: state.items.filter(i => !(i.id === itemId && i.tab === tab))
        }))
    },

    hasItem: (id, tab) => {
        return get().items.some(i => i.id === id && i.tab === tab)
    },
}))