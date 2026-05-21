import { create } from "zustand";

interface User {
    email: string | null;
    name?: string | null;
    phone?: string | null;
}

interface AuthStore {
    user: User | null;
    onLogin: (user: User) => void;
    onLogout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    onLogin: (user) => {
        set({ user: user })
    },
    onLogout: () => {
        set({ user: null })
    }
}))