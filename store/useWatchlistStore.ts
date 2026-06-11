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
    episodeNumber?: number
    purchaseType?: 'rent' | 'own'
    rentDays?: number | null
    rentExpiry?: number | null
}

interface WatchlistStore {
    items: WatchlistItem[]
    loading: boolean
    currentProfileId: string
    fetchWatchlist: (uid: string, profileId: string) => Promise<void>
    addItem: (uid: string, profileIdOrItem: string | Omit<WatchlistItem, 'addedAt'>, item?: Omit<WatchlistItem, 'addedAt'>) => Promise<void>
    removeItem: (uid: string, profileIdOrItemId: string | number, itemIdOrTab: number | WatchlistTab, tab?: WatchlistTab | string, episodeNumber?: number) => Promise<void>
    hasItem: (id: number, tab: WatchlistTab) => boolean
}

// docId 생성 헬퍼 — purchased 탭은 에피소드별로 분리
function makeDocId(tab: WatchlistTab, animeId: number, episodeNumber?: number | null): string {
    if (tab === 'purchased' && episodeNumber != null) {
        return `${tab}_${animeId}_ep${episodeNumber}`
    }
    return `${tab}_${animeId}`
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
        const docId = makeDocId(finalItem.tab, finalItem.id, finalItem.episodeNumber)

        await setDoc(doc(db, 'users', uid, 'profiles', profileId, 'watchlist', docId), {
            ...newItem,
            updatedAt: serverTimestamp(),
        })

        set(state => ({
            items: [
                newItem,
                ...state.items.filter(i => {
                    // purchased는 같은 animeId + episodeNumber 조합만 제거
                    if (finalItem.tab === 'purchased') {
                        return !(i.id === finalItem.id && i.tab === finalItem.tab && i.episodeNumber === finalItem.episodeNumber)
                    }
                    return !(i.id === finalItem.id && i.tab === finalItem.tab)
                }),
            ]
        }))
    },

    removeItem: async (uid, profileIdOrItemId, itemIdOrTab, tab?, episodeNumber?) => {
        let profileId: string
        let itemId: number
        let finalTab: WatchlistTab
        let finalEpisodeNumber: number | undefined

        if (typeof profileIdOrItemId === 'string') {
            // 방식 1: (uid, profileId, itemId, tab, episodeNumber?)
            profileId = profileIdOrItemId
            itemId = itemIdOrTab as number
            finalTab = tab as WatchlistTab
            finalEpisodeNumber = episodeNumber
        } else if (typeof tab === 'string' && isNaN(Number(tab))) {
            // 방식 3: (uid, itemId, tab, profileId) — library 방식
            profileId = tab
            itemId = profileIdOrItemId
            finalTab = itemIdOrTab as WatchlistTab
            finalEpisodeNumber = episodeNumber
        } else {
            // 방식 2: (uid, itemId, tab)
            profileId = get().currentProfileId || 'main'
            itemId = profileIdOrItemId
            finalTab = itemIdOrTab as WatchlistTab
            finalEpisodeNumber = episodeNumber
        }

        const docId = makeDocId(finalTab, itemId, finalEpisodeNumber)
        await deleteDoc(doc(db, 'users', uid, 'profiles', profileId, 'watchlist', docId))

        set(state => ({
            items: state.items.filter(i => {
                if (finalTab === 'purchased' && finalEpisodeNumber != null) {
                    return !(i.id === itemId && i.tab === finalTab && i.episodeNumber === finalEpisodeNumber)
                }
                return !(i.id === itemId && i.tab === finalTab)
            })
        }))
    },

    hasItem: (id, tab) => {
        return get().items.some(i => i.id === id && i.tab === tab)
    },
}))