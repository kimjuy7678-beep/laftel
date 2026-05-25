import HeroSection from "@/components/HeroSection"
import WatchHistory from "@/components/home/WatchHistory"
import DayNewSection from "@/components/home/DayNewSection"
import MembershipBanner from "@/components/home/MembershipBanner"
import Top10Section from "@/components/home/Top10Section"
import ThemeRowSection from "@/components/home/ThemeRowSection"
import TagTop10Section from "@/components/home/TagTop10Section"

export default function Home() {
    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* 메인 히어로 */}
            <HeroSection />

            {/* 시청 목록 */}
            <WatchHistory />

            {/* 요일별 신작 */}
            <DayNewSection />

            {/* 멤버십 배너 */}
            <MembershipBanner />

            {/* 라프텔 TOP 10 */}
            <Top10Section />

            {/* 주제별 영상리스트 x3 */}
            <ThemeRowSection genre={16} title="지금 인기있는 애니" />
            <ThemeRowSection genre={10749} title="로맨스 추천" />
            <ThemeRowSection genre={14} title="판타지 세계로" />

            {/* 주간 태그별 TOP 10 */}
            <TagTop10Section />
        </div>
    )
}
