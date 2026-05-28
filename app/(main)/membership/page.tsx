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
    { name: "비*", title: "한국에 애니만 모아놓은 플랫폼 흔치 않은데 별 100개도 주고싶어요", body: "검색엔진도 좋고 카테고리별로 분류도 잘되어있어서 보기 정말 편해요!!" },
    { name: "환불**", title: "진짜 너무너무 완벽한 앱인거같아요...", body: "한달에 9,900원이라는 가격에 많은 애니를 볼 수 있다는게 너무나도 큰 장점이에요." },
    { name: "이**", title: "아무튼 라프텔은 진짜 애니 플렛폼중 최고임", body: "초창기 멤버십도 없던 시절 라프텔이 맞나? 진짜 라프텔은 전설이다..." },
    { name: "제페토**", title: "UI가 깔끔하여 사용하기 편함", body: "전체적으로 상당히 만족함" },
    { name: "chow**", title: "저 원래 별 다섯개 잘 안주는데 이거 대박임ㅜㅜ", body: "진짜 다른 어플들보다 애니 더 많음!! 진짜 라프텔 만든분들 제발 떡상하셨으면" },
    { name: "이만**", title: "이만한 애니 스트리밍 사이트 없어요.", body: "멤버십 가격 이만하면 혜자라고 생각하고, 서비스도 굉장히 좋습니다." },
]

const plans = [
    {
        id: 'anime' as const,
        name: "애니 멤버십",
        price: "9,900",
        period: "월",
        days: 30,
        color: "#6c63ff",
        emoji: "🎬",
        desc: "애니메이션 무제한 시청",
        highlight: false,
        features: [
            "광고 없는 무제한 스트리밍",
            "FHD 고화질",
            "프로필 최대 4개",
            "동시 4기기 재생",
            "모바일/PC/TV 지원",
            "라이브 신작 시청",
        ],
        notIncluded: ["OST 전곡 감상"],
    },
    {
        id: 'allinone' as const,
        name: "올인원",
        price: "13,900",
        period: "월",
        days: 30,
        color: "#f59e0b",
        emoji: "⚡",
        desc: "애니 + OST 전부 다",
        highlight: true,
        features: [
            "광고 없는 무제한 스트리밍",
            "FHD 고화질",
            "프로필 최대 4개",
            "동시 4기기 재생",
            "모바일/PC/TV 지원",
            "라이브 신작 시청",
            "OST 전곡 무제한 감상",
            "OST 오프라인 저장",
        ],
        notIncluded: [],
    },
    {
        id: 'ost' as const,
        name: "OST 멤버십",
        price: "4,900",
        period: "월",
        days: 30,
        color: "#ec4899",
        emoji: "🎵",
        desc: "애니 OST 전곡 감상",
        highlight: false,
        features: [
            "OST 전곡 무제한 감상",
            "OST 오프라인 저장",
            "고음질 스트리밍",
            "아티스트/앨범 탐색",
        ],
        notIncluded: ["애니메이션 시청"],
    },
]

export default function MembershipPage() {
    const { aniList, onFetchAni } = useAniStore()
    const { user, setMembership } = useAuthStore()
    const router = useRouter()
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<'anime' | 'ost' | 'allinone'>('allinone')

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const gridAnime = aniList.filter((a: any) => a.backdrop_path).slice(0, 12)

    const handleSubscribe = async (plan: typeof plans[0]) => {
        if (!user) { router.push('/login'); return }
        setLoadingPlan(plan.id)
        try {
            await setDoc(doc(db, 'users', user.uid), {
                membership: plan.id,
                membershipDays: plan.days,
                membershipStartAt: new Date()
            }, { merge: true })
            await addDoc(collection(db, 'users', user.uid, 'membership_history'), {
                type: plan.id,
                label: `${plan.name} ${plan.days}일 이용권`,
                days: plan.days,
                createdAt: new Date(),
            })
            setMembership(plan.id)
            alert(`🎉 ${plan.name}이 시작되었어요!`)
        } catch {
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
                <div className="relative z-10 flex flex-col items-center gap-6 px-6">
                    <div className="flex items-center gap-3 text-sm font-bold text-[#9d97ff] tracking-widest uppercase mb-2">
                        <span>🎬 애니</span>
                        <span className="text-white/20">+</span>
                        <span>🎵 OST</span>
                    </div>
                    <h1 className="text-5xl font-black leading-tight max-w-2xl">
                        보고 싶은 것도,<br />듣고 싶은 것도<br />
                        <span className="text-[#6c63ff]">한 곳에서</span>
                    </h1>
                    <p className="text-white/50 text-lg">애니 무제한 시청 + OST 전곡 감상, 당신의 취향대로</p>
                    <Link href="#plans" className="px-8 py-4 bg-[#6c63ff] hover:bg-[#5a52e0] rounded-xl font-bold text-lg transition-colors">
                        멤버십 시작하기
                    </Link>
                </div>
            </div>

            {/* 마퀴 */}
            {gridAnime.length > 0 && (
                <div className="py-16 overflow-hidden">
                    <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
                        <div className="flex gap-3 mb-3 animate-marquee-left">
                            {[...gridAnime, ...gridAnime, ...gridAnime].map((ani: any, i: number) => (
                                <div key={i} className="shrink-0 w-64 h-36 rounded-xl overflow-hidden">
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 animate-marquee-right">
                            {[...gridAnime.slice(6), ...gridAnime, ...gridAnime.slice(0, 6)].map((ani: any, i: number) => (
                                <div key={i} className="shrink-0 w-64 h-36 rounded-xl overflow-hidden">
                                    <img src={`https://image.tmdb.org/t/p/w500${ani.backdrop_path}`} alt={ani.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 요금제 */}
            <div id="plans" style={{ padding: '80px 48px' }}>
                <h2 style={{ fontSize: 32, fontWeight: 900, textAlign: 'center', margin: '0 0 12px' }}>나에게 맞는 멤버십을 선택하세요</h2>
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', margin: '0 0 56px' }}>언제든 해지 가능 · 다음 결제일 전까지 이용 가능</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 960, margin: '0 auto' }}>
                    {plans.map(plan => {
                        const isSelected = selectedPlan === plan.id
                        return (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                style={{
                                    borderRadius: 20,
                                    border: `2px solid ${isSelected ? plan.color : 'rgba(255,255,255,0.08)'}`,
                                    background: isSelected ? `${plan.color}12` : '#111',
                                    padding: '32px 28px',
                                    cursor: 'pointer',
                                    transition: 'all .2s',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transform: plan.highlight && isSelected ? 'translateY(-8px)' : 'none',
                                    boxShadow: isSelected ? `0 20px 60px ${plan.color}30` : 'none',
                                }}
                            >
                                {plan.highlight && (
                                    <div style={{
                                        position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                                        background: plan.color, color: '#fff',
                                        fontSize: 12, fontWeight: 800, padding: '4px 16px', borderRadius: 20,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        ✨ 가장 인기
                                    </div>
                                )}
                                <div style={{ fontSize: 36, marginBottom: 12 }}>{plan.emoji}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: plan.color, marginBottom: 6 }}>{plan.name}</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>{plan.desc}</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 28 }}>
                                    <span style={{ fontSize: 36, fontWeight: 900, color: '#fff' }}>₩{plan.price}</span>
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>/{plan.period}</span>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                                    {plan.features.map(f => (
                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                                            {f}
                                        </div>
                                    ))}
                                    {plan.notIncluded.map(f => (
                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); handleSubscribe(plan) }}
                                    disabled={loadingPlan === plan.id}
                                    style={{
                                        width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                                        background: isSelected ? plan.color : 'rgba(255,255,255,0.08)',
                                        color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                        transition: 'all .2s', opacity: loadingPlan === plan.id ? 0.5 : 1,
                                    }}
                                >
                                    {loadingPlan === plan.id ? '처리 중...' : '시작하기'}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* 비교표 */}
                <div style={{ maxWidth: 960, margin: '60px auto 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>기능</th>
                                {plans.map(p => (
                                    <th key={p.id} style={{ padding: '12px 16px', fontSize: 13, color: p.color, fontWeight: 700, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {p.emoji} {p.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { label: '애니 무제한 시청', anime: true, allinone: true, ost: false },
                                { label: 'FHD 고화질', anime: true, allinone: true, ost: false },
                                { label: '라이브 신작', anime: true, allinone: true, ost: false },
                                { label: 'OST 전곡 감상', anime: false, allinone: true, ost: true },
                                { label: 'OST 오프라인 저장', anime: false, allinone: true, ost: true },
                                { label: '광고 없음', anime: true, allinone: true, ost: true },
                            ].map(row => (
                                <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{row.label}</td>
                                    {plans.map(p => (
                                        <td key={p.id} style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            {(row as any)[p.id]
                                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
                                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 리뷰 */}
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
        </div>
    )
}
