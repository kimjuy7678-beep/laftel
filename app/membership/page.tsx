"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { db } from '@/firebase/firebase'
import { doc, setDoc, addDoc, collection } from 'firebase/firestore'

const reviews = [
    { name: "에*", title: "라프텔 진짜로 너무 사랑해요❤️", body: "제가 태어나서 처음으로 월정액 넣어본 앱이라구용❤️❤️" },
    { name: "시럽Sir**", title: "덕분에 제 인생이 더 즐거워졌던 것 같아요.", body: "라프텔을 예전부터 써왔습니다. 예전보다 오히려 발전했다는 것입니다." },
    { name: "Papago**", title: "라프텔 늦게 다운로드한 게 인생 최대 후회입니다.", body: "정말 너무너무 좋습니다. 애니 볼 때마다 너무 힐링되고 월정액도 부담되는 가격이 아니라 너무 좋아요." },
    { name: "gab25**", title: "합법적으로 당당하게 애니를 보니 재미도 배가 됩니다.", body: "한 플랫폼을 결제하는 것만으로도 왠만한 건 다 볼 수 있다는 메리트가 있어서 합법사이트 중에서는 단연코 1위입니다." },
    { name: "비*", title: "한국에 애니만 모아놓은 플랫폼 흔치 않은데 별 100개도 주고싶어요", body: "검색엔진도 좋고 카테고리별로 분류도 잘되어있어서 보기 정말 편해요!! 고화질에 무제한에 한 달에 9,900원이면 정말 싼거죠." },
    { name: "환불**", title: "진짜 너무너무 완벽한 앱인거같아요...", body: "한달에 9,900원이라는 가격에 많은 애니를 볼 수 있다는게 너무나도 큰 장점이에요. 돈 많이버십ㅂ쇼!" },
    { name: "이**", title: "아무튼 라프텔은 진짜 애니 플렛폼중 최고임", body: "초창기 멤버십도 없던 시절 라프텔이 맞나? 진짜 라프텔은 전설이다..." },
    { name: "제페토**", title: "UI가 깔끔하여 사용하기 편함", body: "전체적으로 상당히 만족함" },
    { name: "chow**", title: "저 원래 별 다섯개 잘 안주는데 이거 대박임ㅜㅜ", body: "진짜 다른 어플들보다 애니 더 많음!! 진짜 라프텔 만든분들 제발 떡상하셨으면" },
    { name: "이만**", title: "이만한 애니 스트리밍 사이트 없어요.", body: "멤버십 가격 이만하면 혜자라고 생각하고, 서비스도 굉장히 좋습니다." },
]

const features = [
    {
        title: "초고화질로 선명하게 감상하세요",
        desc: "FHD 해상도로 생생한 감동을 느껴보세요. 최애캐의 작은 디테일까지 놓치지 않고 감상할 수 있어요.",
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    },
    {
        title: "TV에서 웅장하게 감상하세요",
        desc: "스마트 TV, 크롬캐스트 등 큰 화면에서 최애 애니를 몰입해서 즐겨보세요.",
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
    },
    {
        title: "프로필 최대 4인으로 함께 즐기세요",
        desc: "동시 4개 기기에서 재생가능한 프리미엄 멤버십으로 여럿이 즐기세요.",
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
    {
        title: "라이브로 지금 바로 감상하세요",
        desc: "이번 분기 인기 신작, 라이브로 가장 빠르게 감상할 수 있어요.",
        icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
    },
]

const plans = [
    {
        id: 'basic' as const,
        name: "베이직",
        price: "9,900",
        days: 30,
        period: "월",
        features: ["광고 없는 무제한 스트리밍", "FHD 화질", "프로필 1개", "모바일/PC 지원"],
        highlight: false,
    },
    {
        id: 'premium' as const,
        name: "프리미엄",
        price: "13,900",
        days: 30,
        period: "월",
        features: ["광고 없는 무제한 스트리밍", "FHD 화질", "프로필 최대 4개", "동시 4기기 재생", "모바일/PC/TV 지원", "라이브 시청"],
        highlight: true,
    },
]

export default function MembershipPage() {
    const { aniList, onFetchAni } = useAniStore()
    const { user, setMembership } = useAuthStore()
    const router = useRouter()
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('premium')

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const gridAnime = aniList.filter(a => a.backdrop_path).slice(0, 12)

    const handleSubscribe = async (plan: typeof plans[0]) => {
        if (!user) { router.push('/login'); return }
        setLoadingPlan(plan.id)
        try {
            const memberRef = doc(db, 'users', user.uid)
            await setDoc(memberRef, {
                membership: plan.id,
                membershipDays: plan.days,
                membershipStartAt: new Date()
            }, { merge: true })

            await addDoc(collection(db, 'users', user.uid, 'membership_history'), {
                type: plan.id,
                label: `${plan.name} 멤버십 ${plan.days}일 이용권`,
                days: plan.days,
                createdAt: new Date(),
            })

            setMembership(plan.id)
            alert(`🎉 ${plan.name} 멤버십이 시작되었어요!`)
        } catch (err) {
            alert('오류가 발생했어요. 다시 시도해주세요.')
        } finally {
            setLoadingPlan(null)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white">

            {/* 히어로 */}
            <div className="relative w-full h-screen flex flex-col items-center justify-center text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#6c63ff]/20 via-black to-black" />
                <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-[#6c63ff]/10"
                            style={{
                                width: Math.random() * 300 + 50,
                                height: Math.random() * 300 + 50,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                filter: 'blur(60px)',
                            }}
                        />
                    ))}
                </div>
                <div className="relative z-10 flex flex-col items-center gap-6 px-6">
                    <h1 className="text-5xl font-black leading-tight max-w-2xl">
                        동시방영 신작부터<br />역대 인기작까지<br />
                        <span className="text-[#6c63ff]">한 곳에서</span>
                    </h1>
                    <p className="text-white/60 text-lg">월 9,900원으로 무제한 스트리밍</p>
                    <Link href="#plans" className="px-8 py-4 bg-[#6c63ff] hover:bg-[#5a52e0] rounded-xl font-bold text-lg transition-colors">
                        멤버십 시작하기
                    </Link>
                </div>
            </div>

            {/* 끝없는 애니메이션 세계로 */}
            <div className="py-24 overflow-hidden">
                <h2 className="text-center text-4xl font-black mb-3">끝없는 애니메이션 세계로</h2>
                <p className="text-center text-white/50 mb-12">멤버십으로 다양한 장르의 애니들을 마음껏 즐기세요.</p>
                {gridAnime.length > 0 && (
                    <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
                        <div className="flex gap-3 mb-3 animate-marquee-left">
                            {[...gridAnime, ...gridAnime, ...gridAnime].map((ani, i) => (
                                <div key={i} className="shrink-0 w-64 h-36 rounded-xl overflow-hidden">
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 animate-marquee-right">
                            {[...gridAnime.slice(6), ...gridAnime, ...gridAnime.slice(0, 6)].map((ani, i) => (
                                <div key={i} className="shrink-0 w-64 h-36 rounded-xl overflow-hidden">
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 기능 소개 */}
            <div className="inner px-6 py-24">
                <div className="flex flex-col gap-32">
                    {features.map((feat, i) => (
                        <div key={feat.title} className={`flex items-center gap-16 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
                            <div className="flex-1">
                                <h2 className="text-4xl font-black mb-4 leading-tight">{feat.title}</h2>
                                <p className="text-white/60 text-lg leading-relaxed">{feat.desc}</p>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-64 h-64 rounded-3xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center text-[#6c63ff]">
                                    <div className="scale-[3]">{feat.icon}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 리뷰 마퀴 */}
            <div className="py-16 overflow-hidden bg-[#0a0a0a]">
                <h2 className="text-center text-3xl font-black mb-2">150만 유저의 생생한 후기</h2>
                <p className="text-center text-white/40 mb-10">스토어 평균 별점 4.5 ⭐</p>
                <div className="flex gap-4 mb-4 animate-marquee-left">
                    {[...reviews, ...reviews].map((r, i) => (
                        <div key={i} className="shrink-0 w-72 bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-xs">★</span>)}</div>
                            <h4 className="text-white text-sm font-bold mb-1 line-clamp-1">{r.title}</h4>
                            <p className="text-white/50 text-xs line-clamp-2">{r.body}</p>
                            <p className="text-white/30 text-xs mt-2">{r.name}</p>
                        </div>
                    ))}
                </div>
                <div className="flex gap-4 animate-marquee-right">
                    {[...reviews.slice(5), ...reviews, ...reviews.slice(0, 5)].map((r, i) => (
                        <div key={i} className="shrink-0 w-72 bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-xs">★</span>)}</div>
                            <h4 className="text-white text-sm font-bold mb-1 line-clamp-1">{r.title}</h4>
                            <p className="text-white/50 text-xs line-clamp-2">{r.body}</p>
                            <p className="text-white/30 text-xs mt-2">{r.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 요금제 */}
            <div id="plans" className="inner px-6 py-24">
                <h2 className="text-3xl font-black text-center mb-3">나에게 맞는 멤버십을 확인하세요</h2>
                <p className="text-white/40 text-center mb-12">멤버십은 언제든 해지가 가능해요.</p>
                <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto items-stretch">
                    {plans.map((plan) => {
                        const isSelected = selectedPlan === plan.id
                        return (
                            <div
                                key={plan.name}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`rounded-2xl p-6 border flex flex-col cursor-pointer transition-all duration-200 ${
                                    isSelected
                                        ? 'border-[#6c63ff] bg-[#6c63ff]/10'
                                        : 'border-white/10 bg-[#1a1a1a] hover:border-white/20'
                                }`}
                            >
                                {plan.highlight && (
                                    <span className="text-xs bg-[#6c63ff] text-white px-2 py-0.5 rounded-full font-bold mb-3 inline-block w-fit">추천</span>
                                )}
                                <h3 className="text-xl font-black mb-1">{plan.name}</h3>
                                <div className="flex items-end gap-1 mb-6">
                                   <span className="text-3xl font-black text-[#6c63ff]">₩{plan.price}</span>
                                    <span className="text-white/40 mb-1">/{plan.period}</span>
                                </div>
                                <ul className="flex flex-col gap-2 mb-6 flex-1">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-white/80">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="3">
                                                <polyline points="20,6 9,17 4,12"/>
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSubscribe(plan) }}
                                    disabled={loadingPlan === plan.id}
                                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
                                        isSelected
                                            ? 'bg-[#6c63ff] hover:bg-[#5a52e0] text-white'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                                >
                                    {loadingPlan === plan.id ? '처리 중...' : '시작하기'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}