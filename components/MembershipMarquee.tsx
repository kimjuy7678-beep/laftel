"use client"

interface Anime {
    backdrop_path: string
    name: string
}

interface MembershipMarqueeProps {
    gridAnime: Anime[]
    onOpenModal: () => void
}

export default function MembershipMarquee({ gridAnime, onOpenModal }: MembershipMarqueeProps) {
    return (
        <>
            {/* ── 2. 마퀴 ── */}
            <div className="py-16 overflow-hidden">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black mb-3">당신의 모든 덕질 취향이 모이는 곳</h2>
                    <p className="text-white/50 text-sm">최신 화제작부터 숨겨진 명작까지, 장르 제한 없이 무제한으로 파고드세요</p>
                </div>
                {gridAnime.length > 0 && (
                    <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
                        <div className="flex gap-3 mb-3 animate-marquee-left">
                            {[...gridAnime, ...gridAnime, ...gridAnime].map((ani, i) => (
                                <div key={i} className="shrink-0 w-96 h-56 rounded-xl overflow-hidden">
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 animate-marquee-right">
                            {[...gridAnime.slice(6), ...gridAnime, ...gridAnime.slice(0, 6)].map((ani, i) => (
                                <div key={i} className="shrink-0 w-96 h-56 rounded-xl overflow-hidden">
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 3. CTA 배너 ── */}
            <button
                onClick={onOpenModal}
                className="flex items-center justify-center w-full py-8 bg-[#6c63ff] hover:bg-[#5a52e0] transition-colors cursor-pointer"
            >
                <span className="text-3xl font-black text-white">멤버십 시작하기</span>
            </button>
        </>
    )
}