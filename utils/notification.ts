import { db } from '@/firebase/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export const saveNotification = async (uid: string, data: {
    type: 'point' | 'coupon' | 'membership' | 'event' | 'live'
    title: string
    body: string
    link?: string
}) => {
    await addDoc(collection(db, 'users', uid, 'notifications'), {
        ...data,
        read: false,
        createdAt: serverTimestamp(),
    })
}