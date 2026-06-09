"use client"

export default function MembershipOST() {
    return (
        <div className="relative w-full overflow-hidden bg-[var(--bg-primary)]" style={{ height: 'calc(100vw * 0.55)' }}>
            <img
                src="images/membership/membership-ost-bg.png"
                alt="ost background"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6, zIndex: 0, filter: 'grayscale(100%)' }}
            />
            <img
                src="images/membership/membership-ost.png"
                alt="OST album"
                style={{ position: 'absolute', top: '18%', left: '10%', width: '45%', height: 'auto', zIndex: 10 }}
            />
            <div className="absolute z-20" style={{ bottom: '10%', left: '10%' }}>
                <h2 className="font-black mb-4 2xl:mb-6 3xl:mb-10">
                    <span className="text-[#6c63ff] text-4xl 2xl:text-6xl 3xl:text-8xl">좋아하는 OST</span>
                    <span className="text-[var(--text-primary)] text-3xl 2xl:text-5xl 3xl:text-7xl">까지 멤버십 하나로!</span>
                </h2>
                <p className="text-[var(--text-muted)] text-base 2xl:text-xl 3xl:text-3xl leading-relaxed">
                    작품의 여운을 이어주는 <span className="text-[var(--text-primary)] font-bold">OST 플레이리스트,</span><br />
                    멤버십에서 바로 만나보세요.
                </p>
            </div>
        </div>
    )
}