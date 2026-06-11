"use client"
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
    uid: string
    onComplete: () => void
    onClose?: () => void
    noResultMode?: boolean  // 취향에 맞는 애니 없을 때 모드
}

const GENRES = [
    { id: 'action', label: '액션', emoji: '⚔️' },
    { id: 'romance', label: '로맨스', emoji: '💕' },
    { id: 'fantasy', label: '판타지', emoji: '🧙' },
    { id: 'scifi', label: 'SF', emoji: '🚀' },
    { id: 'comedy', label: '개그', emoji: '😂' },
    { id: 'horror', label: '공포', emoji: '👻' },
    { id: 'sports', label: '스포츠', emoji: '⚽' },
    { id: 'slice', label: '일상', emoji: '☕' },
    { id: 'mystery', label: '미스터리', emoji: '🔍' },
    { id: 'mecha', label: '메카', emoji: '🤖' },
    { id: 'music', label: '음악', emoji: '🎵' },
    { id: 'isekai', label: '이세계', emoji: '🌀' },
]

const MOODS = [
    { id: 'dark', label: '어둡고 진지한', emoji: '🌑' },
    { id: 'bright', label: '밝고 가볍게', emoji: '☀️' },
    { id: 'emotional', label: '감동적인', emoji: '🥹' },
    { id: 'exciting', label: '두근두근 긴장감', emoji: '💥' },
    { id: 'healing', label: '힐링', emoji: '🌿' },
    { id: 'mindblow', label: '반전 있는 전개', emoji: '🌀' },
]

const WATCH_STYLES = [
    { id: 'weekly', label: '정주행파', emoji: '📅' },
    { id: 'casual', label: '가볍게 틈틈이', emoji: '🎲' },
    { id: 'ost', label: 'OST 먼저 찾아듣기', emoji: '🎧' },
]

export default function OnboardingModal({ uid, onComplete, onClose, noResultMode }: Props) {
    const { user, onLogin } = useAuthStore()
    const [step, setStep] = useState(1)
    const [genres, setGenres] = useState<string[]>([])
    const [moods, setMoods] = useState<string[]>([])
    const [watchStyle, setWatchStyle] = useState<string>('')
    const [saving, setSaving] = useState(false)

    const toggleGenre = (id: string) => {
        setGenres(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : prev.length < 5 ? [...prev, id] : prev
        )
    }

    const toggleMood = (id: string) => {
        setMoods(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : prev.length < 3 ? [...prev, id] : prev
        )
    }

    const handleComplete = async () => {
        setSaving(true)
        try {
            const preferences = { genres, moods, watchStyle }
            await updateDoc(doc(db, 'users', uid), {
                onboardingDone: true,
                preferences,
            })
            // ✅ 저장 후 즉시 store 업데이트 → 홈 화면 바로 반영
            if (user) {
                onLogin({ ...user, preferences })
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
            onComplete()
        }
    }

    const handleSkip = () => {
        if (step < 3) setStep(s => s + 1)
        else handleComplete()
    }

    const handleClose = () => {
        if (onClose) onClose()
        else onComplete()
    }

    const canNext1 = genres.length >= 1
    const canNext2 = moods.length >= 1
    const canFinish = watchStyle !== ''

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-[520px] mx-4 rounded-[24px] overflow-hidden"
                    style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#6c63ff,#a78bfa)' }} />

                    <div className="p-7">
                        {/* ✅ 취향 결과 없을 때 안내 배너 */}
                        {noResultMode && step === 1 && (
                            <div style={{
                                background: 'rgba(108,99,255,0.12)',
                                border: '1px solid rgba(108,99,255,0.3)',
                                borderRadius: 12,
                                padding: '12px 16px',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <span style={{ fontSize: 20 }}>🔍</span>
                                <div>
                                    <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>취향에 맞는 애니를 찾지 못했어요</p>
                                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>취향을 다시 선택하면 더 잘 맞는 작품을 추천해드릴게요</p>
                                </div>
                            </div>
                        )}

                        {/* 스텝 인디케이터 + X 버튼 */}
                        <div className="flex items-center gap-2 mb-6">
                            {[1, 2, 3].map(s => (
                                <div
                                    key={s}
                                    className="h-1 flex-1 rounded-full transition-all duration-500"
                                    style={{
                                        background: s <= step
                                            ? 'linear-gradient(90deg,#6c63ff,#a78bfa)'
                                            : 'rgba(255,255,255,0.08)'
                                    }}
                                />
                            ))}
                            <button
                                onClick={handleClose}
                                style={{
                                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', transition: 'background .18s, color .18s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                                        ; (e.currentTarget as HTMLButtonElement).style.color = '#fff'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
                                        ; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        {/* STEP 1 — 장르 */}
                        {step === 1 && (
                            <>
                                <p className="text-xs text-[#6c63ff] font-semibold mb-1 tracking-widest uppercase">Step 1 / 3</p>
                                <h2 className="text-xl font-bold text-white mb-1">어떤 장르를 좋아하세요?</h2>
                                <p className="text-sm text-[rgba(255,255,255,0.45)] mb-6">최대 5개까지 선택할 수 있어요</p>
                                <div className="grid grid-cols-4 gap-2 mb-8">
                                    {GENRES.map(g => {
                                        const active = genres.includes(g.id)
                                        return (
                                            <button key={g.id} onClick={() => toggleGenre(g.id)}
                                                className="flex flex-col items-center justify-center gap-1 py-3 rounded-[14px] text-sm font-semibold transition-all duration-200"
                                                style={{
                                                    background: active ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                                                    border: `1.5px solid ${active ? '#6c63ff' : 'rgba(255,255,255,0.07)'}`,
                                                    color: active ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                                                    transform: active ? 'scale(1.04)' : 'scale(1)',
                                                }}>
                                                <span className="text-xl">{g.emoji}</span>
                                                <span className="text-[12px]">{g.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <button onClick={() => setStep(2)} disabled={!canNext1}
                                    className="w-full py-3.5 rounded-[14px] font-bold text-sm transition-all duration-200"
                                    style={{
                                        background: canNext1 ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'rgba(255,255,255,0.06)',
                                        color: canNext1 ? '#fff' : 'rgba(255,255,255,0.25)',
                                        cursor: canNext1 ? 'pointer' : 'not-allowed',
                                    }}>
                                    다음
                                </button>
                            </>
                        )}

                        {/* STEP 2 — 분위기 */}
                        {step === 2 && (
                            <>
                                <p className="text-xs text-[#6c63ff] font-semibold mb-1 tracking-widest uppercase">Step 2 / 3</p>
                                <h2 className="text-xl font-bold text-white mb-1">어떤 분위기를 선호하세요?</h2>
                                <p className="text-sm text-[rgba(255,255,255,0.45)] mb-6">최대 3개까지 고를 수 있어요</p>
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    {MOODS.map(m => {
                                        const active = moods.includes(m.id)
                                        return (
                                            <button key={m.id} onClick={() => toggleMood(m.id)}
                                                className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] text-sm font-semibold transition-all duration-200 text-left"
                                                style={{
                                                    background: active ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                                                    border: `1.5px solid ${active ? '#6c63ff' : 'rgba(255,255,255,0.07)'}`,
                                                    color: active ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                                                }}>
                                                <span className="text-2xl">{m.emoji}</span>
                                                <span className="text-[13px]">{m.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setStep(1)}
                                        className="flex-1 py-3.5 rounded-[14px] font-bold text-sm"
                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                                        이전
                                    </button>
                                    <button onClick={() => setStep(3)} disabled={!canNext2}
                                        className="flex-[2] py-3.5 rounded-[14px] font-bold text-sm transition-all duration-200"
                                        style={{
                                            background: canNext2 ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'rgba(255,255,255,0.06)',
                                            color: canNext2 ? '#fff' : 'rgba(255,255,255,0.25)',
                                            cursor: canNext2 ? 'pointer' : 'not-allowed',
                                        }}>
                                        다음
                                    </button>
                                </div>
                            </>
                        )}

                        {/* STEP 3 — 시청 스타일 */}
                        {step === 3 && (
                            <>
                                <p className="text-xs text-[#6c63ff] font-semibold mb-1 tracking-widest uppercase">Step 3 / 3</p>
                                <h2 className="text-xl font-bold text-white mb-1">시청 스타일이 어떻게 돼요?</h2>
                                <p className="text-sm text-[rgba(255,255,255,0.45)] mb-6">딱 하나만 골라주세요</p>
                                <div className="flex flex-col gap-3 mb-8">
                                    {WATCH_STYLES.map(w => {
                                        const active = watchStyle === w.id
                                        return (
                                            <button key={w.id} onClick={() => setWatchStyle(w.id)}
                                                className="flex items-center gap-4 px-5 py-4 rounded-[14px] transition-all duration-200 text-left"
                                                style={{
                                                    background: active ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.04)',
                                                    border: `1.5px solid ${active ? '#6c63ff' : 'rgba(255,255,255,0.07)'}`,
                                                }}>
                                                <span className="text-2xl">{w.emoji}</span>
                                                <span className="text-sm font-semibold" style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>
                                                    {w.label}
                                                </span>
                                                {active && (
                                                    <span className="ml-auto">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                            <circle cx="12" cy="12" r="10" fill="#6c63ff" />
                                                            <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setStep(2)}
                                        className="flex-1 py-3.5 rounded-[14px] font-bold text-sm"
                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                                        이전
                                    </button>
                                    <button onClick={handleComplete} disabled={!canFinish || saving}
                                        className="flex-[2] py-3.5 rounded-[14px] font-bold text-sm transition-all duration-200"
                                        style={{
                                            background: canFinish ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : 'rgba(255,255,255,0.06)',
                                            color: canFinish ? '#fff' : 'rgba(255,255,255,0.25)',
                                            cursor: canFinish ? 'pointer' : 'not-allowed',
                                        }}>
                                        {saving ? '저장 중...' : '🎉 완료!'}
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end mt-5">
                            <button onClick={handleSkip} className="text-xs text-[rgba(255,255,255,0.45)] hover:text-white transition-colors">
                                {step < 3 ? '건너뛰기 →' : '선택 없이 완료'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}