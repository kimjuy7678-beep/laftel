"use client"

type PlanId = 'anime' | 'ost' | 'allinone'

interface MembershipPlansProps {
    onOpenModal: (plan: PlanId) => void
    hasMembership: boolean
}

const planList = [
    { id: 'anime' as PlanId, label: '애니에 진심인 몰입형 덕후라면?', title: '애니', best: false },
    { id: 'allinone' as PlanId, label: '애니도 OST도 놓칠 수 없는 과몰입 덕후라면?', title: '애니 + OST', best: true },
    { id: 'ost' as PlanId, label: '음악 매니아 취향 저격!', title: 'OST', best: false },
]

export default function MembershipPlans({ onOpenModal }: MembershipPlansProps) {
    return (
        <div
            id="plans"
            className="w-full py-24 2xl:py-36 flex flex-col items-center"
        // style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1530 50%, #0a0a0a 100%)' }}
        >
            <h2 className="font-black text-center mb-3 text-3xl 2xl:text-5xl 3xl:text-7xl">
                나에게 <span className="text-[#6c63ff]">딱!</span> 맞는 멤버십 확인하기
            </h2>
            <p className="text-[var(--text-subtle)] text-sm 2xl:text-base 3xl:text-xl mb-16 2xl:mb-24">*멤버십은 언제든 해지가 가능합니다</p>
            <div className="grid grid-cols-3 w-full max-w-5xl 2xl:max-w-7xl divide-x divide-white/10">
                {planList.map(plan => (
                    <div key={plan.id} className="flex flex-col items-center py-12 2xl:py-16 px-8 2xl:px-12 gap-6 2xl:gap-8">
                        <p className="text-[var(--text-muted)] text-sm 2xl:text-base 3xl:text-xl text-center">{plan.label}</p>
                        <div className="relative">
                            {plan.best && (
                                <span className="absolute -top-6 -right-10 text-[#f59e0b] text-sm 2xl:text-base font-black italic">BEST!</span>
                            )}
                            <h3 className="text-4xl 2xl:text-6xl 3xl:text-8xl font-black text-[var(--text-primary)]">{plan.title}</h3>
                        </div>
                        <button
                            onClick={() => onOpenModal(plan.id)}
                            className={`px-10 py-3 2xl:px-14 2xl:py-4 rounded-full border text-sm 2xl:text-base font-bold transition-colors cursor-pointer ${plan.best
                                ? 'bg-[#6c63ff] border-[#6c63ff] text-white hover:bg-[#5a52e0]'
                                : 'bg-transparent border-white/30 text-[var(--text-muted)] hover:border-white/60'
                                }`}
                        >
                            멤버십 시작하기
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}