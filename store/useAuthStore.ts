import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "@/firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { issueCoupon } from "@/lib/coupon";

interface User {
    email: string | null
    name?: string | null
    photoURL?: string | null
    uid: string | null
    profileId?: string
    currentProfileId?: string   // ← 추가: 현재 선택된 프로필 ID
    membership?: 'none' | 'anime' | 'ost' | 'allinone'
    points?: number
    ageLimit?: string
    onboardingDone?: boolean
    preferences?: { genres: string[]; moods: string[]; watchStyle: string }
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
    isNewUser: boolean;
    onLogin: (user: User) => void;
    googleLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
    setMembership: (type: 'none' | 'anime' | 'ost' | 'allinone') => void;
    setAvatarConfig: (config: AvatarConfig) => void;
    addPoints: (amount: number) => Promise<void>;
    clearNewUser: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            avatarConfig: null,
            isNewUser: false,
            clearNewUser: () => set({ isNewUser: false }),

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
                        onboardingDone: data?.onboardingDone || false,
                        profileId: data?.lastProfileId || 'main',
                        currentProfileId: data?.lastProfileId || 'main',
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
        {
            name: "auth-storage",
            partialize: (state) => ({
                user: state.user,
                avatarConfig: state.avatarConfig,
            }),
        }
    )
)
