import AniList from "@/components/AnimationList";
import CharacterCards from "@/components/CharacterCards";
import HeroSection from "@/components/HeroSection";

export default function Home() {
    return (
        <div>
            <HeroSection />
            <CharacterCards/>
            <div className="inner px-6 py-10">
                <h2 className="text-xl font-bold mb-6">인기 애니메이션</h2>
                <AniList />
            </div>
        </div>
    )
}