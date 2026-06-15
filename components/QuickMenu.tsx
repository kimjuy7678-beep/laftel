"use client"
import { useTheme } from "@/components/ThemeProvider"
import { useEffect, useState } from "react"
import AniChatBot from "./AniChatBot"

const PROFILE_IMAGE = '/images/laftel-icon/laftel-chat.png'

export default function QuickMenu() {
  const { resolvedTheme, setTheme } = useTheme()
  const [rightOffset, setRightOffset] = useState(32)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const pr = parseInt(document.body.style.paddingRight || '0')
      setRightOffset(32 + pr)
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [])

  const isDark = resolvedTheme === 'dark'

  const handleChatOpen = () => {
    setChatOpen(true)
  }

  return (
    <>
      {chatOpen && (
        <AniChatBot
          rightOffset={rightOffset}
          onClose={() => setChatOpen(false)}
        />
      )}

      <div
        id="quick-menu"
        className="fixed bottom-8 z-[9999] hidden flex-col items-center gap-3 md:flex"
        style={{ right: rightOffset, transition: 'right 0s' }}
      >
        {/* 2. 다크모드 버튼 */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-12 h-12 rounded-full border shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          aria-label="테마 변경"
        >
          {isDark ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* 3. 위로가기 버튼 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 rounded-full border shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          aria-label="맨 위로"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>

        {/* 1. 챗봇 버튼 — wrapper로 overflow-hidden 분리 */}
        <div className="relative">
          <button
            onClick={() => chatOpen ? setChatOpen(false) : handleChatOpen()}
            className="w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-all relative overflow-hidden block"
            style={{ border: '1px solid rgba(108,99,255,0.4)' }}
            aria-label="AI 챗봇"
          >
            <img
              src={PROFILE_IMAGE}
              alt="라피"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {chatOpen && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#5a52e0cc' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </div>
            )}
          </button>

          {/* 뱃지 — wrapper 기준으로 버튼 밖에 위치해서 잘리지 않음 */}
          {!chatOpen && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse z-10 pointer-events-none"
              style={{ zIndex: 9999 }}
            >
              AI
            </span>
          )}
        </div>
      </div>
    </>
  )
}
