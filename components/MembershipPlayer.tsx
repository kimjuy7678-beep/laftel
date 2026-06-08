"use client"

export default function MembershipPlayer() {
    return (
        <div className="w-full py-24 flex flex-col items-center text-center">
            <h2 className="text-5xl xl:text-7xl font-extrabold tracking-tight mb-5">LAFTEL MEMBERSHIP</h2>
            <p className="text-[#6c63ff] text-base xl:text-[24px] font-medium mb-16 xl:mb-24">라프텔 멤버십이 당신에게 주는 풍부한 혜택</p>
            <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vw * 0.38)' }}>
                <img
                    src="images/membership/membership-visk2.png"
                    alt="player"
                    style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: 'auto' }}
                />
                <img
                    src="images/membership/membership-visk1.png"
                    alt="poster"
                    style={{ position: 'absolute', bottom: 0, left: 0, width: '50%', height: 'auto', zIndex: 10 }}
                />
            </div>
        </div>
    )
}