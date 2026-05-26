import { create } from 'zustand'
import { db } from '@/firebase/firebase'
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore'

interface Notification {
    id: string
    type: 'point' | 'coupon' | 'membership' | 'event' | 'live'
    title: string
    body: string
    link?: string
    read: boolean
    createdAt: any
}

interface NotificationStore {
    notifications: Notification[]
    unreadCount: number
    unsubscribe: (() => void) | null
    subscribeNotifications: (uid: string) => void
    markAllRead: (uid: string) => Promise<void>
    markOneRead: (uid: string, nid: string) => Promise<void>
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    unsubscribe: null,

    subscribeNotifications: (uid) => {
        const prev = get().unsubscribe
        if (prev) prev()
        const q = query(
            collection(db, 'users', uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(30)
        )
        const unsub = onSnapshot(q, (snap) => {
            const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[]
            set({ notifications, unreadCount: notifications.filter(n => !n.read).length })
        })
        set({ unsubscribe: unsub })
    },

    markAllRead: async (uid) => {
        const { notifications } = get()
        const batch = writeBatch(db)
        notifications.filter(n => !n.read).forEach(n => {
            batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true })
        })
        await batch.commit()
    },

    markOneRead: async (uid, nid) => {
        await updateDoc(doc(db, 'users', uid, 'notifications', nid), { read: true })
    },
}))