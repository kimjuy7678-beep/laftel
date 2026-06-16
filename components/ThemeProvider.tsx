"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"

type Theme = "light" | "dark"
type ThemeSetter = Theme | ((theme: Theme) => Theme)

type ThemeContextValue = {
    theme: Theme
    resolvedTheme: Theme
    setTheme: (theme: ThemeSetter) => void
}

const STORAGE_KEY = "theme"
const DEFAULT_THEME: Theme = "dark"
const THEME_CHANGE_EVENT = "laftel:theme-change"

const ThemeContext = createContext<ThemeContextValue>({
    theme: DEFAULT_THEME,
    resolvedTheme: DEFAULT_THEME,
    setTheme: () => { },
})

function readStoredTheme(): Theme {
    if (typeof window === "undefined") return DEFAULT_THEME

    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME
}

function subscribeTheme(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange)
    window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)

    return () => {
        window.removeEventListener("storage", onStoreChange)
        window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
    }
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.style.colorScheme = theme
}

function persistTheme(theme: Theme) {
    window.localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function useTheme() {
    return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(
        subscribeTheme,
        readStoredTheme,
        () => DEFAULT_THEME,
    )

    useEffect(() => {
        applyTheme(theme)
    }, [theme])

    const setTheme = useCallback((nextTheme: ThemeSetter) => {
        const currentTheme = readStoredTheme()
        const themeToApply = typeof nextTheme === "function" ? nextTheme(currentTheme) : nextTheme
        persistTheme(themeToApply)
    }, [])

    const value = useMemo<ThemeContextValue>(() => ({
        theme,
        resolvedTheme: theme,
        setTheme,
    }), [setTheme, theme])

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
