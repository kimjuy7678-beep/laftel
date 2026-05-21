import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/firebase/firebase";

interface User {
    email: string | null;
    name?: string | null;
}

interface AuthStore {
    user: User | null;
    googleLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            googleLogin: async () => {
                const result = await signInWithPopup(auth, googleProvider);
                const { email, displayName } = result.user;
                set({ user: { email, name: displayName } });
            },
            onLogout: async () => {
                await signOut(auth);
                set({ user: null });
            }
        }),
        { name: "auth-storage" }
    )
)