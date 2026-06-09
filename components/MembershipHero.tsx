"use client"

interface MembershipHeroProps {
    onOpenModal: () => void
    hasMembership: boolean // 추가
}

export default function MembershipHero({ onOpenModal, hasMembership }: MembershipHeroProps) {
    return (
        <div className="relative w-full h-screen flex flex-col items-center justify-center text-center overflow-hidden">
            <video
                className="absolute inset-0 w-full h-full object-cover"
                src="/videos/membership_video.mp4"
                autoPlay loop muted playsInline
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
            <div className="relative z-10 flex flex-col items-center gap-5 px-6">
                <p className="text-sm font-medium text-white/60 tracking-widest">애니 · OST</p>
                <h1 className="text-[25px] font-bold leading-tight max-w-2xl text-white">
                    눈호강 액션부터 웅장한 OST까지<br />
                </h1>
                <span className="text-[var(--main)] font-extrabold text-[40px] mt-[-20]">덕후들의 도파민을 한 곳에서</span>
                <p className="text-white/50 text-base">광고 없는 무제한 애니 시청과 OST 전곡 미리듣기, 지금 시작해 보세요</p>
                <button
                    onClick={onOpenModal}
                    className="mt-2 px-8 py-3 bg-[#6c63ff] hover:bg-[#5a52e0] rounded-full font-bold text-base transition-colors cursor-pointer text-white"
                >
                    {hasMembership ? '멤버십 변경' : '멤버십 시작하기'}
                </button>
            </div>
            <p className="absolute bottom-5 right-6 z-10 text-white/30 text-xs">
                © 2023 SPY x FAMILY The Movie Project © Tatsuya Endo / Shueisha
            </p>
        </div>
    )
}