"use client"

export default function MembershipLive() {
    return (
        <div className="relative w-full bg-[var(--bg-primary)] overflow-hidden" style={{ height: 'calc(100vw * 0.7)' }}>
            <div className="absolute top-[0%] left-1/2 -translate-x-1/2 z-30">
                <span
                    className="block rounded-full animate-pulse"
                    style={{
                        width: '120px', height: '120px',
                        background: 'radial-gradient(circle, #cc0000 0%, #880000 40%, transparent 70%)',
                        filter: 'blur(12px)',
                    }}
                />
            </div>
            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 z-30 text-center whitespace-nowrap">
                <p className="text-2xl 2xl:text-4xl font-black text-[#6c63ff] mb-3">지금 라프텔은 상영 중</p>
                <p className="text-3xl 2xl:text-5xl font-black text-[var(--text-primary)]">멈추지 않는 도파민 라이브</p>
            </div>
            <img
                src="images/membership/membership-live1.png"
                alt="주술회전"
                style={{ position: 'absolute', left: '5%', top: '25%', width: '60%', height: 'auto', zIndex: 10 }}
            />
            <img
                src="images/membership/membership-live2.png"
                alt="live on air"
                style={{ position: 'absolute', right: 0, top: '0%', width: '50%', height: 'auto', zIndex: 5 }}
            />
            <div className="absolute z-20 flex items-center gap-8 2xl:gap-12 3xl:gap-16" style={{ bottom: '20%', left: '15%' }}>
                <img src="images/brand-logo/anione.svg" alt="anione" className="w-[80px] 2xl:w-[140px] 3xl:w-[200px] object-contain" />
                <img src="images/brand-logo/animax.svg" alt="animax" className="w-[60px] 2xl:w-[110px] 3xl:w-[150px] object-contain" />
                <img src="images/brand-logo/aniplus.svg" alt="aniplus" className="w-[130px] 2xl:w-[220px] 3xl:w-[340px] object-contain" />
            </div>
            <div className="absolute z-20 text-right bottom-[15%] 2xl:bottom-[17%] right-[5%] 2xl:right-[10%]">
                <p className="text-[var(--text-muted)] text-lg 2xl:text-3xl 3xl:text-5xl mb-3">
                    이번 분기 인기 신작, 언제 올라오는지 기다리셨나요?
                </p>
                <p className="text-[var(--text-primary)] text-xl 2xl:text-3xl 3xl:text-5xl mb-3">
                    <span className="font-black text-3xl 2xl:text-5xl 3xl:text-7xl">라이브</span>로 가장 빠르게 감상할 수 있어요.
                </p>
                <p className="text-[var(--text-subtle)] text-sm 2xl:text-base 3xl:text-xl">
                    *라이브 기능은 현재 모바일, 웹 환경에서 이용이 가능합니다.
                </p>
            </div>
        </div>
    )
}