import { db } from '@/firebase/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export const saveStoreNotification = async (uid: string, data: {
    type: 'point' | 'coupon' | 'membership' | 'event' | 'live' | 'order' | 'cancel' | 'restock' | 'inquiry'
    title: string
    body: string
    link?: string
    status?: string   // ✅ 주문 상태 (탭 이동용)
}) => {
    await addDoc(collection(db, 'users', uid, 'notifications'), {
        ...data,
        read: false,
        createdAt: serverTimestamp(),
    })
}