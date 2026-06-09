"use client"

const reviews = [
    { name: "에*", title: "라프텔 진짜로 너무 사랑해요❤️", body: "제가 태어나서 처음으로 월정액 넣어본 앱이라구용❤️❤️" },
    { name: "시럽Sir**", title: "덕분에 제 인생이 더 즐거워졌던 것 같아요.", body: "라프텔을 예전부터 써왔습니다. 예전보다 오히려 발전했다는 것입니다." },
    { name: "Papago**", title: "라프텔 늦게 다운로드한 게 인생 최대 후회입니다.", body: "정말 너무너무 좋습니다. 애니 볼 때마다 너무 힐링되고 월정액도 부담되는 가격이 아니라 너무 좋아요." },
    { name: "gab25**", title: "합법적으로 당당하게 애니를 보니 재미도 배가 됩니다.", body: "한 플랫폼을 결제하는 것만으로도 왠만한 건 다 볼 수 있다는 메리트가 있어서 합법사이트 중에서는 단연코 1위입니다." },
    { name: "비*", title: "한국에 애니만 모아놓은 플랫폼 흔치 않은데 별 100개도 주고싶어요", body: "검색엔진도 좋고 카테고리별로 분류도 잘되어있어서 보기 정말 편해요!!" },
    { name: "환불**", title: "진짜 너무너무 완벽한 앱인거같아요...", body: "한달에 9,900원이라는 가격에 많은 애니를 볼 수 있다는게 너무나도 큰 장점이에요." },
    { name: "이**", title: "아무튼 라프텔은 진짜 애니 플렛폼중 최고임", body: "초창기 멤버십도 없던 시절 라프텔이 맞나? 진짜 라프텔은 전설이다..." },
    { name: "제페토**", title: "UI가 깔끔하여 사용하기 편함", body: "전체적으로 상당히 만족함" },
    { name: "chow**", title: "저 원래 별 다섯개 잘 안주는데 이거 대박임ㅜㅜ", body: "진짜 다른 어플들보다 애니 더 많음!! 진짜 라프텔 만든분들 제발 떡상하셨으면" },
    { name: "이만**", title: "이만한 애니 스트리밍 사이트 없어요.", body: "멤버십 가격 이만하면 혜자라고 생각하고, 서비스도 굉장히 좋습니다." },
]

export default function MembershipReviews() {
    return (
        <div className="py-16 2xl:py-24 overflow-hidden bg-[var(--bg-primary)]">
            <div className="flex flex-col items-center pt-4 pb-12 2xl:pb-16">
                <svg className="mb-6 2xl:mb-8 3xl:mb-12" width="60" height="60" viewBox="0 0 24 24" fill="#FFD700">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
                <h2 className="font-black mb-4 2xl:mb-6 text-center">
                    <span className="text-[#6c63ff] text-4xl 2xl:text-6xl 3xl:text-8xl">150만 유저</span>
                    <span className="text-[var(--text-primary)] text-4xl 2xl:text-6xl 3xl:text-8xl">의 생생한 후기</span>
                </h2>
                <p className="text-[var(--text-muted)] text-base 2xl:text-xl 3xl:text-3xl">★ 스토어 평균 별점 4.5 ★</p>
            </div>
            <div className="flex gap-6 mb-6 animate-marquee-left">
                {[...reviews, ...reviews].map((r, i) => (
                    <div key={i} className="shrink-0 w-96 2xl:w-[480px] 3xl:w-[640px] bg-[var(--bg-card)] border border-[var(--border-faint)] rounded-2xl p-6 2xl:p-8">
                        <div className="flex items-center gap-1 mb-3">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-sm 2xl:text-base">★</span>)}</div>
                        <h4 className="text-[var(--text-primary)] text-base 2xl:text-lg font-bold mb-2 line-clamp-1">{r.title}</h4>
                        <p className="text-[var(--text-muted)] text-sm 2xl:text-base line-clamp-2">{r.body}</p>
                        <p className="text-[var(--text-faint)] text-sm mt-3">{r.name}</p>
                    </div>
                ))}
            </div>
            <div className="flex gap-6 animate-marquee-right">
                {[...reviews.slice(5), ...reviews, ...reviews.slice(0, 5)].map((r, i) => (
                    <div key={i} className="shrink-0 w-96 2xl:w-[480px] 3xl:w-[640px] bg-[var(--bg-card)] border border-[var(--border-faint)] rounded-2xl p-6 2xl:p-8">
                        <div className="flex items-center gap-1 mb-3">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-sm 2xl:text-base">★</span>)}</div>
                        <h4 className="text-[var(--text-primary)] text-base 2xl:text-lg font-bold mb-2 line-clamp-1">{r.title}</h4>
                        <p className="text-[var(--text-muted)] text-sm 2xl:text-base line-clamp-2">{r.body}</p>
                        <p className="text-[var(--text-faint)] text-sm mt-3">{r.name}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}