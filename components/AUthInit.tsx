"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"

export default function AuthInit() {
    const handleRedirectResult = useAuthStore((s) => s.handleRedirectResult)

    useEffect(() => {
        handleRedirectResult()
    }, [])

    return null
}