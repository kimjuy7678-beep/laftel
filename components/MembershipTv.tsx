"use client"

export default function MembershipTV() {
    return (
        <div className="w-full py-20 relative">
            <div className="px-16 2xl:px-32 mb-16 2xl:mb-24">
                <h2 className="text-3xl 2xl:text-5xl font-extrabold mb-6 2xl:mb-10 text-[var(--text-primary)]">초고화질로 선명하게 보는 애니메이션</h2>
                <p className="text-[var(--text-muted)] text-base 2xl:text-2xl leading-relaxed">
                    FHD로 해상도로 느끼는 생생함<br />
                    <span className="text-[#6c63ff] font-bold text-2xl xl:text-3xl">최애캐</span>
                    {' '}의 작은 디테일까지 놓치지 않고 감상할 수 있어요
                </p>
            </div>
            <div className="w-full overflow-hidden mb-16 2xl:mb-24 mt-[-150]">
                <img
                    src="images/membership/membership-tv.png"
                    alt="tv mockup"
                    style={{ display: 'block', width: '85%', aspectRatio: '1846 / 901', marginLeft: 'auto', marginRight: '-5%' }}
                />
            </div>
            <div className="px-16 2xl:px-32 text-right">
                <h2 className="text-3xl 2xl:text-5xl font-extrabold mb-4 2xl:mb-6 mt-[-250] text-[var(--text-primary)]">
                    <span className="text-[#6c63ff]">TV</span>에서 웅장하게 감상하세요
                </h2>
                <p className="text-[var(--text-muted)] text-base 2xl:text-2xl leading-relaxed">
                    스마트 TV, 크롬캐스트 등 <span className="text-[var(--text-primary)] font-bold text-3xl">큰화면</span>에서<br />
                    최애 애니를 몰입해서 즐겨보세요.
                </p>
            </div>
        </div>
    )
}