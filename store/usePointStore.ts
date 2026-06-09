import { create } from "zustand"
import { db } from "@/firebase/firebase"
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, getDocs, increment } from "firebase/firestore"
import { saveNotification } from "@/utils/notification"

interface PointHistory {
    id: string
    amount: number
    createdAt: any
    type: 'earn' | 'use'
    label: string
}

interface PointStore {
    points: number
    loading: boolean
    history: PointHistory[]
    fetchPoints: (uid: string) => Promise<void>
    chargePoints: (uid: string, amount: number, label?: string) => Promise<void>
    fetchHistory: (uid: string) => Promise<void>
}

export const usePointStore = create<PointStore>((set) => ({
    points: 0,
    loading: false,
    history: [],

    fetchPoints: async (uid) => {
        set({ loading: true })
        try {
            const ref = doc(db, "users", uid)
            const snap = await getDoc(ref)
            if (snap.exists()) {
                set({ points: snap.data().points || 0 })
            } else {
                await setDoc(ref, { points: 0 })
                set({ points: 0 })
            }
        } finally {
            set({ loading: false })
        }
    },

    chargePoints: async (uid, amount, label = '포인트 충전') => {
        const ref = doc(db, "users", uid)
        await setDoc(ref, { points: increment(amount) }, { merge: true })

        // point_history → pointHistory 로 통일 (스토어 내역 페이지와 맞춤)
        await addDoc(collection(db, "users", uid, "pointHistory"), {
            amount,
            type: 'earn',       // 스토어 내역 페이지에서 type === 'earn' 으로 색상 분기
            description: label, // 스토어 내역 페이지에서 r.description 으로 읽음
            label,
            createdAt: new Date(),
        })

        await saveNotification(uid, {
            type: 'point',
            title: '포인트 충전 완료',
            body: `${amount.toLocaleString()}P가 충전되었어요.`,
            link: '/point',
        })

        set((state) => ({ points: state.points + amount }))
    },

    fetchHistory: async (uid) => {
        const q = query(
            collection(db, "users", uid, "pointHistory"),
            orderBy("createdAt", "desc")
        )

        const snap = await getDocs(q)

        const history = snap.docs.map(d => ({
            id: d.id,
            ...d.data()
        })) as PointHistory[]

        set({ history })
    },
}))