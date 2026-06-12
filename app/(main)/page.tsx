'use client'
import { useEffect, useState } from 'react'
import HeroSection from "@/components/HeroSection"
import WatchHistory from "@/components/home/WatchHistory"
import DayNewSection from "@/components/home/DayNewSection"
import MembershipBanner from "@/components/home/MembershipBanner"
import Top10Section from "@/components/home/Top10Section"
import ThemeRowSection from "@/components/home/ThemeRowSection"
import TagTop10Section from "@/components/home/TagTop10Section"
import OstSection from "@/components/home/OstSection_home"
import MoodSection from "@/components/home/MoodSection"
import SurveyBanner from "@/components/home/SurveyBanner"
import LiveSection from "@/components/home/LiveSection"
import EventSection from "@/components/home/EventSection"
import PersonalRecommendSection from "@/components/home/PersonalRecommendSection"
import { useAuthStore } from '@/store/useAuthStore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import OnboardingModal from '@/components/OnboardingModal'
import SurveyBanner2 from '@/components/home/SurveyBanner2'

export default function Home() {
  const [cursor, setCursor] = useState({ x: -100, y: -100 })
  const { user } = useAuthStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [noResultMode, setNoResultMode] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    const uid = user.uid
    const check = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid!))
      const data = snap.data()
      const hasGenres = Array.isArray(data?.preferences?.genres) && data.preferences.genres.length > 0
      if (!hasGenres) setShowOnboarding(true)
    }
    check()
  }, [user?.uid])

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ✅ PersonalRecommendSection에서 결과 없을 때 호출
  const handleNoResult = () => {
    setNoResultMode(true)
    setShowOnboarding(true)
  }

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: 40, height: 40,
        pointerEvents: 'none', zIndex: 99999,
        transform: `translate(${cursor.x + 10}px, ${cursor.y + 10}px)`,
        transition: 'transform .12s cubic-bezier(.25,.46,.45,.94)',
      }}>
        <img src="/images/stone.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      <div className="min-h-auto bg-[var(--bg-primary)]">
        <HeroSection />
        <DayNewSection />
        <WatchHistory />
        {/* ✅ onNoResult prop 추가 */}
        <PersonalRecommendSection onNoResult={handleNoResult} />
        <LiveSection />
        <MoodSection />
        <MembershipBanner />
        <Top10Section />
        <ThemeRowSection genre={10759} title="작화진의 영혼을 갈아 넣은 눈호강 치트키 !!" rows={2} />
        <OstSection />
        <SurveyBanner2 />
        <ThemeRowSection genre={10751} title="잔잔하게 스며들다 웅장하게 터지는 인생 치유물" rows={3} />
        <ThemeRowSection genre={16} title="등장하는 순간 영혼까지 홀리는 마성의 캐릭터들" rows={2} />
        <TagTop10Section />
        <SurveyBanner />
        <EventSection />

        {showOnboarding && user?.uid && (
          <OnboardingModal
            uid={user.uid}
            noResultMode={noResultMode}
            onComplete={() => {
              setShowOnboarding(false)
              setNoResultMode(false)
            }}
            onClose={() => {
              setShowOnboarding(false)
              setNoResultMode(false)
            }}
          />
        )}
      </div>
    </>
  )
}
