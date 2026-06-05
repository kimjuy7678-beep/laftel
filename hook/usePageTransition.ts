// hooks/usePageTransition.ts
'use client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function usePageTransition() {
    const router = useRouter()

    const navigate = useCallback((href: string, overlayColor = '#000') => {
        // 오버레이 생성
        const overlay = document.createElement('div')
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: ${overlayColor};
            z-index: 99999;
            opacity: 0;
            transition: opacity 0.25s ease;
            pointer-events: none;
        `
        document.body.appendChild(overlay)

        // 페이드 인
        requestAnimationFrame(() => {
            overlay.style.opacity = '1'
        })

        setTimeout(() => {
            router.push(href)
            // 페이드 아웃
            setTimeout(() => {
                overlay.style.opacity = '0'
                setTimeout(() => overlay.remove(), 250)
            }, 50)
        }, 250)
    }, [router])

    return { navigate }
}
