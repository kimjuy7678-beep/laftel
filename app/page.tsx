import HeroSection from "@/components/HeroSection"
import WatchHistory from "@/components/home/WatchHistory"
import DayNewSection from "@/components/home/DayNewSection"
import MembershipBanner from "@/components/home/MembershipBanner"
import Top10Section from "@/components/home/Top10Section"
import ThemeRowSection from "@/components/home/ThemeRowSection"
import TagTop10Section from "@/components/home/TagTop10Section"
import OstSection from "@/components/home/OstSection_home"
import AnimationList from "@/components/AnimationList"
import MoodSection from "@/components/home/MoodSection"
import SurveyBanner from "@/components/home/SurveyBanner"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <HeroSection />
      <WatchHistory />
      <DayNewSection />
      <MoodSection />
      <MembershipBanner />
      <Top10Section />
      <ThemeRowSection genre={16} title="지금 인기있는 애니" />
      <ThemeRowSection genre={10749} title="로맨스 추천" />
      <ThemeRowSection genre={14} title="판타지 세계로" />
      <TagTop10Section />
      <OstSection />
      <SurveyBanner />
      <AnimationList />
    </div>
  )
}
