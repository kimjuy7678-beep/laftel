import { create } from 'zustand'
import { db } from '@/firebase/firebase'
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

export interface Bookmark {
    id: string           // `${tmdbId}_${episode}_${Math.floor(time)}`
    tmdbId: number
    title: string        // 애니 제목
    episode: number
    episodeTitle: string
    timeSeconds: number  // 북마크된 시간 (초)
    timeLabel: string    // "12:35" 형식
    poster: string
    createdAt: number
}

interface BookmarkStore {
    bookmarks: Bookmark[]
    fetchBookmarks: (uid: string, profileId: string) => Promise<void>
    addBookmark: (uid: string, profileId: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => Promise<void>
    removeBookmark: (uid: string, profileId: string, bookmarkId: string) => Promise<void>
    hasBookmark: (tmdbId: number, episode: number, timeSeconds: number) => boolean
}

function toTimeLabel(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
    bookmarks: [],

    fetchBookmarks: async (uid, profileId) => {
        try {
            const snap = await getDoc(doc(db, 'users', uid))
            const data = snap.data()
            const bookmarks = data?.bookmarks?.[profileId] || []
            set({ bookmarks })
        } catch { }
    },

    addBookmark: async (uid, profileId, bookmark) => {
        const id = `${bookmark.tmdbId}_${bookmark.episode}_${Math.floor(bookmark.timeSeconds)}`
        const newBookmark: Bookmark = {
            ...bookmark,
            id,
            timeLabel: toTimeLabel(bookmark.timeSeconds),
            createdAt: Date.now(),
        }
        try {
            await setDoc(doc(db, 'users', uid), {
                bookmarks: { [profileId]: arrayUnion(newBookmark) }
            }, { merge: true })
            set(state => ({ bookmarks: [...state.bookmarks, newBookmark] }))
        } catch { }
    },

    removeBookmark: async (uid, profileId, bookmarkId) => {
        const target = get().bookmarks.find(b => b.id === bookmarkId)
        if (!target) return
        try {
            await setDoc(doc(db, 'users', uid), {
                bookmarks: { [profileId]: arrayRemove(target) }
            }, { merge: true })
            set(state => ({ bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId) }))
        } catch { }
    },

    hasBookmark: (tmdbId, episode, timeSeconds) => {
        const id = `${tmdbId}_${episode}_${Math.floor(timeSeconds)}`
        return get().bookmarks.some(b => b.id === id)
    },
}))