import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "@/firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface User {
    email: string | null
    name?: string | null
    photoURL?: string | null
    uid: string | null
    membership?: 'none' | 'anime' | 'ost' | 'allinone'
    points?: number
    ageLimit?: string  // 추가
}

export interface AvatarConfig {
    top: string;
    topColor: string;
    clothing: string;
    clothingColor: string;
    eyes: string;
    eyebrows: string;
    mouth: string;
    accessories: string;
    accessoriesProbability: number;
    facialHair: string;
    facialHairProbability: number;
    skinColor: string;
    backgroundColor: string;
    svgDataUrl?: string;
}

interface AuthStore {
    user: User | null;
    avatarConfig: AvatarConfig | null;
    onLogin: (user: User) => void;
    googleLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
    setMembership: (type: 'none' | 'anime' | 'ost' | 'allinone') => void;
    setAvatarConfig: (config: AvatarConfig) => void;
    addPoints: (amount: number) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            avatarConfig: null,

            onLogin: (user) => set({ user }),

            googleLogin: async () => {
                const result = await signInWithPopup(auth, googleProvider)
                const { email, displayName, photoURL, uid } = result.user

                const snap = await getDoc(doc(db, 'users', uid))
                const data = snap.data()

                if (!snap.exists()) {
                    await setDoc(doc(db, 'users', uid), {
                        email,
                        nickname: displayName,
                        avatarUrl: photoURL,
                        membership: 'none',
                        points: 0,
                        createdAt: new Date().toISOString(),
                    })

                    // ✅ 신규 가입 시 쿠폰 2장 자동발급
                    const expiresAt = new Date()
                    expiresAt.setMonth(expiresAt.getMonth() + 3) // 3개월 유효기간

                    await Promise.all([
                        issueCoupon({
                            uid,
                            label: "신규 가입 쿠폰",
                            discount: 0.1,
                            type: "rate",
                            minOrderAmount: 0,
                            expiresAt,
                        }),
                        issueCoupon({
                            uid,
                            label: "여름 한정 30% 할인 쿠폰",
                            discount: 0.3,
                            type: "rate",
                            minOrderAmount: 0,
                            maxDiscountAmount: 15000, // 최대 1.5만원 한도
                            expiresAt: new Date("2025-08-31"),
                        }),
                    ])
                }

                set({
                    user: {
                        email,
                        uid,
                        membership: data?.membership || 'none',
                        points: data?.points || 0,
                        name: data?.nickname || displayName,
                        photoURL: data?.avatarUrl || photoURL,
                        ageLimit: data?.ageLimit || '19',
                    }
                })
            },

            onLogout: async () => {
                await signOut(auth)
                set({ user: null, avatarConfig: null })
            },

            setMembership: (type) => set((state) => ({
                user: state.user ? { ...state.user, membership: type } : null
            })),

            setAvatarConfig: (config) => set({ avatarConfig: config }),

            addPoints: async (amount) => {
                const uid = get().user?.uid
                if (!uid) return
                const current = get().user?.points ?? 0
                const next = current + amount
                await setDoc(doc(db, 'users', uid), { points: next }, { merge: true })
                set(state => ({
                    user: state.user ? { ...state.user, points: next } : null
                }))
            },
        }),
        { name: "auth-storage" }
    )
)