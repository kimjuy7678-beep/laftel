"use client"

const profiles = [
    { src: 'images/membership/membership-profile1.png', name: '피넛좋아' },
    { src: 'images/membership/membership-profile2.png', name: '카제하야' },
    { src: 'images/membership/membership-profile3.png', name: '케로로' },
    { src: 'images/membership/membership-profile4.png', name: '보라인간' },
]

export default function MembershipProfiles() {
    return (
        <div className="relative w-full py-24 2xl:py-36 flex flex-col items-center text-center overflow-hidden">
            <img
                src="images/membership/membership-profile-bg.png"
                alt="devices"
                className="absolute inset-0 w-full h-full object-contain opacity-20 mb-40px"
            />
            <div className="relative z-10 flex flex-col items-center">
                <svg className="mb-6 2xl:mb-8 opacity-70" width="48" height="48" viewBox="0 0 24 24" fill="#6c63ff">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <h2 className="text-4xl 2xl:text-6xl font-extrabold mb-8 2xl:mb-12 text-[var(--text-primary)]">
                    <span className="text-[#6c63ff]">프로필 최대 4인</span>으로 함께 즐기세요
                </h2>
                <p className="text-[var(--text-high)] text-lg 2xl:text-2xl font-bold mb-3">
                    동시 4개 기기에서 재생가능한 프리미엄 멤버십으로 여럿이 즐기세요!
                </p>
                <p className="text-[var(--text-muted)] text-base 2xl:text-xl mb-20 2xl:mb-28">
                    PC, 모바일, 태블릿 등 다양한 기기에서도 사용이 가능합니다.
                </p>
                <div className="flex items-end gap-16 2xl:gap-24">
                    {profiles.map((p, i) => (
                        <div key={i} className="flex flex-col items-center gap-4 2xl:gap-6">
                            <div className="w-36 h-36 2xl:w-52 2xl:h-52 rounded-full overflow-hidden border-2 border-[var(--border)]">
                                <img src={p.src} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[var(--text-muted)] text-base 2xl:text-xl">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}