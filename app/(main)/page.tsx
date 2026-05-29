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

export default function Home() {
  const [cursor, setCursor] = useState({ x: -100, y: -100 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 70,
        height: 70,
        pointerEvents: 'none',
        zIndex: 99999,
        transform: `translate(${cursor.x + 10}px, ${cursor.y + 10}px)`,
        transition: 'transform .12s cubic-bezier(.25,.46,.45,.94)',
      }}>
        <img src="/images/laftel-icon/laftel.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      <div className="min-h-screen bg-[#0a0a0a]">
        <HeroSection />
        <DayNewSection />
        <WatchHistory />
        <LiveSection />
        <MoodSection />
        <MembershipBanner />
        <Top10Section />
        <ThemeRowSection genre={10759} title="작화진의 영혼을 갈아 넣은 눈호강 치트키 !!" rows={2} />
        <OstSection />
        <ThemeRowSection genre={10751} title="잔잔하게 스며들다 웅장하게 터지는 인생 치유물" rows={3} />
        <ThemeRowSection genre={16} title="등장하는 순간 영혼까지 홀리는 마성의 캐릭터들" rows={2} />
        <TagTop10Section />
        <SurveyBanner />
        <EventSection />
      </div>
    </>
  )
}