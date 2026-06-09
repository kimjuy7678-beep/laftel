"use client"

interface Anime {
    backdrop_path: string
    name: string
}

interface MembershipMarqueeProps {
    gridAnime: Anime[]
    onOpenModal: () => void
    hasMembership: boolean
}

export default function MembershipMarquee({ gridAnime, onOpenModal, hasMembership }: MembershipMarqueeProps) {
    return (
        <>
            {/* ── 2. 마퀴 ── */}
            <div className="py-16 overflow-hidden">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold mb-3 text-[var(--text-primary)]">당신의 모든 덕질 취향이 모이는 곳</h2>
                    <p className="text-[var(--text-muted)] text-[20px]">최신 화제작부터 숨겨진 명작까지, 장르 제한 없이 무제한으로 파고드세요</p>
                </div>
                {gridAnime.length > 0 && (
                    <div className="relative">
                        {/* from-black → from-[var(--bg-primary)] */}
                        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
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
                className="fixed bottom-0 left-0 right-0 flex items-center justify-center w-full py-8 bg-[#6c63ff] hover:bg-[#5a52e0] transition-colors cursor-pointer z-50 shadow-[0_-8px_24px_rgba(108,99,255,0.35)]"
            >
                {/* text-white → 버튼 배경이 보라색이라 white 유지 */}
                <span className="text-3xl font-bold text-white">
                    {hasMembership ? '멤버십 변경' : '멤버십 시작하기'}
                </span>
            </button>
        </>
    )
}