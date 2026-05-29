import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "@/firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

interface User {
    email: string | null
    name?: string | null
    photoURL?: string | null
    uid: string | null
    membership?: 'none' | 'anime' | 'ost' | 'allinone'
    points?: number
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
                const result = await signInWithPopup(auth, googleProvider);
                const { email, displayName, photoURL, uid } = result.user;
                set({ user: { email, name: displayName, photoURL, uid, membership: 'none', points: 0 } });
            },
            onLogout: async () => {
                await signOut(auth);
                set({ user: null, avatarConfig: null });
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