import { create } from 'zustand'
import { db } from '@/firebase/firebase'
import {
    doc, setDoc, deleteDoc, getDocs,
    collection, serverTimestamp, query, orderBy
} from 'firebase/firestore'

export type WatchlistTab = 'recent' | 'wishlist' | 'purchased' | 'series'

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
    currentProfileId: string
    fetchWatchlist: (uid: string, profileId: string) => Promise<void>
    // profileId가 두 번째 인자로 올 수도 있고(AnimePreviewModal 방식),
    // item이 두 번째로 올 수도 있음(PurchaseModals 방식) → 내부에서 분기
    addItem: (uid: string, profileIdOrItem: string | Omit<WatchlistItem, 'addedAt'>, item?: Omit<WatchlistItem, 'addedAt'>) => Promise<void>
    removeItem: (uid: string, profileIdOrItemId: string | number, itemIdOrTab: number | WatchlistTab, tab?: WatchlistTab) => Promise<void>
    hasItem: (id: number, tab: WatchlistTab) => boolean
}

export const useWatchlistStore = create<WatchlistStore>()((set, get) => ({
    items: [],
    loading: false,
    currentProfileId: 'main',

    fetchWatchlist: async (uid, profileId) => {
        set({ loading: true, currentProfileId: profileId })
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

    addItem: async (uid, profileIdOrItem, item?) => {
        // 호출 방식 1: addItem(uid, profileId, item)
        // 호출 방식 2: addItem(uid, item)
        let profileId: string
        let finalItem: Omit<WatchlistItem, 'addedAt'>

        if (typeof profileIdOrItem === 'string') {
            profileId = profileIdOrItem
            finalItem = item!
        } else {
            profileId = get().currentProfileId || 'main'
            finalItem = profileIdOrItem
        }

        const newItem: WatchlistItem = { ...finalItem, addedAt: Date.now() }
        const docId = `${finalItem.tab}_${finalItem.id}`
        await setDoc(doc(db, 'users', uid, 'profiles', profileId, 'watchlist', docId), {
            ...newItem,
            updatedAt: serverTimestamp(),
        })
        set(state => ({
            items: [newItem, ...state.items.filter(i => !(i.id === finalItem.id && i.tab === finalItem.tab))]
        }))
    },

    removeItem: async (uid, profileIdOrItemId, itemIdOrTab, tab?) => {
        // 호출 방식 1: removeItem(uid, profileId, itemId, tab)
        // 호출 방식 2: removeItem(uid, itemId, tab)
        // 호출 방식 3: removeItem(uid, itemId, tab, profileId) ← library 방식
        let profileId: string
        let itemId: number
        let finalTab: WatchlistTab

        if (typeof profileIdOrItemId === 'string') {
            // 방식 1: (uid, profileId, itemId, tab)
            profileId = profileIdOrItemId
            itemId = itemIdOrTab as number
            finalTab = tab!
        } else if (typeof tab === 'string') {
            // 방식 3: (uid, itemId, tab, profileId) — library 방식
            profileId = tab
            itemId = profileIdOrItemId
            finalTab = itemIdOrTab as WatchlistTab
        } else {
            // 방식 2: (uid, itemId, tab)
            profileId = get().currentProfileId || 'main'
            itemId = profileIdOrItemId
            finalTab = itemIdOrTab as WatchlistTab
        }

        const docId = `${finalTab}_${itemId}`
        await deleteDoc(doc(db, 'users', uid, 'profiles', profileId, 'watchlist', docId))
        set(state => ({
            items: state.items.filter(i => !(i.id === itemId && i.tab === finalTab))
        }))
    },

    hasItem: (id, tab) => {
        return get().items.some(i => i.id === id && i.tab === tab)
    },
}))
