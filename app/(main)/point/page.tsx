"use client"
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useRouter } from 'next/navigation'

const pointOptions = [
    { label: "1,000 포인트", amount: 1000, price: "1,000원" },
    { label: "5,000 포인트", amount: 5000, price: "5,000원" },
    { label: "10,000 포인트", amount: 10000, price: "10,000원" },
    { label: "20,000 포인트", amount: 20000, price: "20,000원" },
    { label: "30,000 포인트", amount: 30000, price: "30,000원" },
]

const payMethods = [
    { id: "card", label: "카드", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    { id: "toss", label: "토스페이", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#0064FF"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" fill="none" /></svg> },
    { id: "naverpay", label: "네이버페이", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#03C75A"><rect width="24" height="24" rx="4" /><text x="5" y="17" fontSize="12" fontWeight="bold" fill="white">N</text></svg> },
    { id: "transfer", label: "계좌이체", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
    { id: "phone", label: "휴대폰", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg> },
    { id: "smart", label: "스마트 문상", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg> },
    { id: "culture", label: "컬처랜드 상품권", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg> },
]

const notices = [
    "라프텔 포인트로 애니메이션을 소장 하거나 대여할 수 있습니다.",
    "100 포인트는 라프텔에서 100원으로 사용할 수 있습니다.",
    "충전한 포인트는 충전 후 사용내역이 없는 경우 충전 결제 단위로 7일 이내에 라프텔 고객센터를 통해 결제취소 및 환불이 가능합니다.",
    "사용 후 남은 포인트는 환불되지 않습니다. 남은 포인트는 라프텔 홈페이지에서 대여, 소장 구매 시 부분 결제로 사용이 가능합니다.",
    "미성년 회원의 결제는 원칙적으로 법정대리인의 명의 또는 동의 하에 이루어져야 하고, 법정대리인은 본인 동의 없이 체결된 자녀(미성년자)의 계약을 취소할 수 있습니다.",
    "이용에 관한 기타 문의 사항은 1:1 문의로 연락주세요.",
]

export default function Point() {
    const { user } = useAuthStore()
    const { points, loading, fetchPoints, chargePoints } = usePointStore()
    const router = useRouter()
    const [selectedOption, setSelectedOption] = useState<typeof pointOptions[0] | null>(null)
    const [selectedPay, setSelectedPay] = useState('card')
    const [agreed, setAgreed] = useState(false)
    const [charging, setCharging] = useState(false)

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        fetchPoints(user.uid)
    }, [user])

    const handleCharge = async () => {
        if (!user || !selectedOption || !agreed) return
        setCharging(true)
        try {
            await chargePoints(user.uid, selectedOption.amount)
            setSelectedOption(null)
            setAgreed(false)
            alert(`${selectedOption.amount.toLocaleString()} 포인트가 충전되었습니다!`)
        } catch {
            alert('충전 중 오류가 발생했어요. 다시 시도해주세요.')
        } finally {
            setCharging(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingTop: 80, paddingBottom: 80 }}>
            <style>{`
                .pt-wrap { width: 90%; margin: 0 auto; }
                .pt-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.35); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 20px; }
                .pt-divider { border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 0 0 48px; }
                .pt-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #141420; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); margin-bottom: 8px; }
                .pt-charge-btn { font-size: 13px; padding: 8px 20px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: none; color: rgba(255,255,255,.7); cursor: pointer; transition: all .18s; white-space: nowrap; }
                .pt-charge-btn:hover { border-color: #6c63ff; color: #6c63ff; }
                .pt-notice-item { font-size: 13px; color: rgba(255,255,255,.4); line-height: 1.7; padding-left: 12px; position: relative; }
                .pt-notice-item::before { content: '-'; position: absolute; left: 0; color: rgba(255,255,255,.25); }
            `}</style>

            <div className="pt-wrap">
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>내 포인트</h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', margin: '0 0 40px' }}>포인트로 애니메이션을 소장하거나 대여할 수 있어요.</p>

                {/* 포인트 잔액 */}
                <section style={{ marginBottom: 48 }}>
                    <p className="pt-label">보유 포인트</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', background: '#141420', borderRadius: 14, border: '1px solid rgba(255,255,255,.07)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                        </svg>
                        <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>
                            {loading ? '...' : `${points.toLocaleString()}P`}
                        </span>
                    </div>
                </section>

                <hr className="pt-divider" />

                {/* 충전 옵션 */}
                <section style={{ marginBottom: 48 }}>
                    <p className="pt-label">포인트 충전</p>
                    {pointOptions.map(opt => (
                        <div key={opt.amount} className="pt-row">
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{opt.label}</span>
                            <button className="pt-charge-btn" onClick={() => { setSelectedOption(opt); setAgreed(false) }}>
                                {opt.price}
                            </button>
                        </div>
                    ))}
                </section>

                <hr className="pt-divider" />

                {/* 안내 */}
                <section>
                    <p className="pt-label">포인트 구매 안내</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {notices.map((n, i) => (
                            <p key={i} className="pt-notice-item">{n}</p>
                        ))}
                    </div>
                </section>
            </div>

            {/* 결제 모달 */}
            {selectedOption && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)' }} onClick={() => setSelectedOption(null)} />
                    <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: '#111', borderRadius: 20, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,.08)' }}>

                        {/* 모달 헤더 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#fff' }}>결제</h2>
                            <button onClick={() => setSelectedOption(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>✕</button>
                        </div>

                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* 포인트 정보 */}
                            <div style={{ background: '#1a1a22', borderRadius: 12, padding: '16px', border: '1px solid rgba(255,255,255,.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                    </svg>
                                    <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{selectedOption.amount.toLocaleString()}P</span>
                                </div>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0 }}>라프텔 포인트로 애니메이션을 소장하거나 대여할 수 있어요!</p>
                            </div>

                            {/* 금액 */}
                            <div style={{ borderBottom: '1px solid rgba(255,255,255,.08)', paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'rgba(255,255,255,.5)' }}>판매금액</span>
                                    <span style={{ color: '#fff' }}>{selectedOption.price}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                                    <span style={{ color: 'rgba(255,255,255,.5)' }}>최종 결제 금액</span>
                                    <span style={{ color: '#6c63ff' }}>{selectedOption.price}</span>
                                </div>
                            </div>

                            {/* 결제 수단 */}
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>결제 수단</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    {payMethods.map(method => (
                                        <button key={method.id} onClick={() => setSelectedPay(method.id)}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 12, border: `1px solid ${selectedPay === method.id ? '#6c63ff' : 'rgba(255,255,255,.1)'}`, background: selectedPay === method.id ? 'rgba(108,99,255,.1)' : '#1a1a22', color: selectedPay === method.id ? '#fff' : 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                                            {method.icon}
                                            {method.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 이용 안내 */}
                            <div style={{ background: '#1a1a22', borderRadius: 12, padding: 16 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)', margin: '0 0 8px' }}>이용 안내</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {notices.map((n, i) => (
                                        <p key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0, lineHeight: 1.6, paddingLeft: 10, position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 0 }}>•</span>{n}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* 동의 */}
                            <button onClick={() => setAgreed(!agreed)}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${agreed ? '#6c63ff' : 'rgba(255,255,255,.1)'}`, background: agreed ? 'rgba(108,99,255,.1)' : '#1a1a22', cursor: 'pointer', transition: 'all .18s' }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${agreed ? '#6c63ff' : 'rgba(255,255,255,.3)'}`, background: agreed ? '#6c63ff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .18s' }}>
                                    {agreed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: agreed ? '#fff' : 'rgba(255,255,255,.5)' }}>주문 내용 및 유의사항을 확인하였으며 결제에 동의합니다.</span>
                            </button>

                            {/* 결제 버튼 */}
                            <button onClick={handleCharge} disabled={!agreed || charging}
                                style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: agreed && !charging ? '#6c63ff' : 'rgba(255,255,255,.1)', color: agreed && !charging ? '#fff' : 'rgba(255,255,255,.3)', fontSize: 15, fontWeight: 700, cursor: agreed && !charging ? 'pointer' : 'default', transition: 'background .2s' }}>
                                {charging ? '처리 중...' : `${selectedOption.price} 결제하기`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}