'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const QUESTIONS = [
    {
        id: 'satisfaction',
        label: '라프텔 전반적인 만족도는?',
        type: 'rating',
        options: ['😫', '😕', '😐', '🙂', '😍'],
        labels: ['최악', '별로', '보통', '좋음', '최고'],
    },
    {
        id: 'usage_frequency',
        label: '얼마나 자주 이용하세요?',
        type: 'single',
        options: ['매일', '주 2~3회', '주 1회', '월 1~2회', '가끔'],
    },
]

type SurveyAnswer = number | string | string[]

function SurveyModal2({ onClose }: { onClose: () => void }) {
    const { user, addPoints } = useAuthStore()
    const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({})
    const [step, setStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    const q = QUESTIONS[step]
    const isLast = step === QUESTIONS.length - 1

    const handleRating = (val: number) => setAnswers(prev => ({ ...prev, [q.id]: val }))
    const handleSingle = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }))
    const canNext = answers[q.id] !== undefined && answers[q.id] !== ''

    const handleNext = () => {
        if (!isLast) { setStep(s => s + 1); return }
        handleSubmit()
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const docId = user?.uid ? `${user.uid}_survey2` : `anonymous_${Date.now()}`
            await setDoc(doc(db, 'surveys', docId), {
                ...answers,
                surveyType: 'survey2',
                userId: user?.uid || null,
                userEmail: user?.email || null,
                createdAt: serverTimestamp(),
            }, { merge: true })
            if (user?.uid) await addPoints(700)
            setDone(true)
        } catch (e) {
            console.error(e)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <style>{`
                .sv2-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; animation: sv2-fade .2s ease; }
                @keyframes sv2-fade { from{opacity:0} to{opacity:1} }
                .sv2-box { width: 480px; background: #141420; border-radius: 20px; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 32px 80px rgba(0,0,0,.8); overflow: hidden; animation: sv2-up .25s ease; }
                @keyframes sv2-up { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
                .sv2-header { padding: 28px 28px 0; }
                .sv2-progress-wrap { display: flex; gap: 4px; margin-bottom: 24px; }
                .sv2-progress-dot { flex: 1; height: 3px; border-radius: 2px; transition: background .3s; }
                .sv2-body { padding: 0 28px 28px; }
                .sv2-question { font-size: 17px; font-weight: 800; color: #fff; margin: 0 0 20px; line-height: 1.4; }
                .sv2-rating { display: flex; gap: 8px; }
                .sv2-rating-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); cursor: pointer; transition: all .18s; }
                .sv2-rating-btn:hover { border-color: rgba(108,99,255,.4); background: rgba(108,99,255,.1); }
                .sv2-rating-btn.selected { border-color: #6c63ff; background: rgba(108,99,255,.18); }
                .sv2-rating-emoji { font-size: 22px; }
                .sv2-rating-label { font-size: 10px; color: rgba(255,255,255,.4); }
                .sv2-rating-btn.selected .sv2-rating-label { color: #9d97ff; }
                .sv2-options { display: flex; flex-direction: column; gap: 8px; }
                .sv2-option { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); cursor: pointer; transition: all .15s; font-size: 14px; color: rgba(255,255,255,.75); text-align: left; }
                .sv2-option:hover { border-color: rgba(108,99,255,.35); background: rgba(108,99,255,.08); }
                .sv2-option.selected { border-color: #6c63ff; background: rgba(108,99,255,.15); color: #fff; }
                .sv2-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
                .sv2-option.selected .sv2-check { background: #6c63ff; border-color: #6c63ff; }
                .sv2-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
                .sv2-step-info { font-size: 12px; color: rgba(255,255,255,.28); }
                .sv2-btn-next { padding: 10px 22px; border-radius: 9px; background: #6c63ff; border: none; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s; }
                .sv2-btn-next:hover { background: #5a52e0; }
                .sv2-btn-next:disabled { opacity: .4; cursor: default; }
                .sv2-done { display: flex; flex-direction: column; align-items: center; padding: 48px 28px; text-align: center; gap: 12px; }
                .sv2-done-emoji { font-size: 48px; }
                .sv2-done-title { font-size: 20px; font-weight: 900; color: #fff; margin: 0; }
                .sv2-done-sub { font-size: 14px; color: rgba(255,255,255,.4); margin: 0; }
                .sv2-done-point { font-size: 14px; font-weight: 700; color: #6c63ff; background: rgba(108,99,255,.12); border: 1px solid rgba(108,99,255,.3); border-radius: 8px; padding: 8px 16px; margin: 0; }
                .sv2-close-btn { margin-top: 8px; padding: 11px 28px; border-radius: 10px; background: #6c63ff; border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
            `}</style>

            <div className="sv2-overlay" onClick={onClose}>
                <div className="sv2-box" onClick={e => e.stopPropagation()}>
                    {done ? (
                        <div className="sv2-done">
                            <span className="sv2-done-emoji">🎉</span>
                            <p className="sv2-done-title">소중한 의견 감사해요!</p>
                            <p className="sv2-done-sub">더 나은 라프텔을 만드는 데 활용할게요</p>
                            {user?.uid && <p className="sv2-done-point">🎁 700p 포인트가 지급되었어요!</p>}
                            <button className="sv2-close-btn" onClick={onClose}>확인</button>
                        </div>
                    ) : (
                        <>
                            <div className="sv2-header">
                                <div className="sv2-progress-wrap">
                                    {QUESTIONS.map((_, i) => (
                                        <div key={i} className="sv2-progress-dot"
                                            style={{ background: i <= step ? '#6c63ff' : 'rgba(255,255,255,.1)' }} />
                                    ))}
                                </div>
                            </div>
                            <div className="sv2-body">
                                <p className="sv2-question">{q.label}</p>

                                {q.type === 'rating' && (
                                    <div className="sv2-rating">
                                        {q.options!.map((emoji, i) => (
                                            <button key={i}
                                                className={`sv2-rating-btn${answers[q.id] === i + 1 ? ' selected' : ''}`}
                                                onClick={() => handleRating(i + 1)}>
                                                <span className="sv2-rating-emoji">{emoji}</span>
                                                <span className="sv2-rating-label">{q.labels![i]}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'single' && (
                                    <div className="sv2-options">
                                        {q.options!.map(opt => (
                                            <button key={opt}
                                                className={`sv2-option${answers[q.id] === opt ? ' selected' : ''}`}
                                                onClick={() => handleSingle(opt)}>
                                                <div className="sv2-check">
                                                    {answers[q.id] === opt && (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                                            <polyline points="20,6 9,17 4,12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="sv2-footer">
                                    <span className="sv2-step-info">{step + 1} / {QUESTIONS.length}</span>
                                    <button
                                        className="sv2-btn-next"
                                        disabled={!canNext || submitting}
                                        onClick={handleNext}
                                    >
                                        {submitting ? '제출 중...' : isLast ? '제출하기 🎉' : '다음'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default function SurveyBanner2() {
    const { user } = useAuthStore()
    const [open, setOpen] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    const [alreadyDone, setAlreadyDone] = useState(false)

    useEffect(() => {
        if (!user?.uid) return
        getDoc(doc(db, 'surveys', `${user.uid}_survey2`)).then(snap => {
            if (snap.exists()) setAlreadyDone(true)
        }).catch(() => {})
    }, [user?.uid])

    if (dismissed || alreadyDone) return null

    return (
        <>
            <section className="sb2-section">
                <style>{`
                    .sb2-section { padding: 40px 0 0; }
                    .sb2-wrap { width: 100%; margin: 0 auto; margin-top: -24px; padding-top: 38px; }
                    .sb2-inner { position: relative; overflow: hidden; padding-top: 26.1%; height: 0; }
                    .sb2-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
                    .sb2-btn {
                        position: absolute; right: 15.5%; bottom: 6%;
                        display: inline-flex; align-items: center; justify-content: center;
                        min-height: clamp(18px, 2.35vw, 38px);
                        padding: 0 clamp(8px, 1.5vw, 24px); border-radius: 50px;
                        background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.4);
                        color: #fff; font-size: clamp(15px, 0.86vw, 24px); font-weight: 600;
                        cursor: pointer; white-space: nowrap;
                        backdrop-filter: blur(4px); transition: background .2s;
                    }
                    .sb2-btn:hover { background: rgba(255,255,255,0.5); }
                    .sb2-dismiss {
                        position: absolute; top: 8%; right: 1.5%; z-index: 2;
                        width: 32px; height: 32px; border-radius: 50%;
                        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
                        color: rgba(255,255,255,0.6); cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: all .2s; backdrop-filter: blur(4px);
                    }
                    .sb2-dismiss:hover { background: rgba(0,0,0,0.5); color: #fff; }
                    @media (max-width: 1920px) { .sb2-btn { right: 14.5%; } }
                    @media (max-width: 900px) {
                        .sb2-section { padding-top: 32px; }
                        .sb2-wrap { margin-top: -14px; padding-top: 26px; }
                        .sb2-btn { right: 13.5%; bottom: 5%; min-height: clamp(13px, 3vw, 22px); padding: 0 clamp(5px, 1.8vw, 10px); font-size: clamp(6px, 1.35vw, 9px); }
                        .sb2-dismiss { width: 26px; height: 26px; }
                    }
                    @media (max-width: 560px) {
                        .sb2-btn { right: 2.5%; bottom: 5.5%; min-height: clamp(11px, 4vw, 16px); padding: 0 clamp(4px, 1.8vw, 6px); font-size: clamp(5px, 1.8vw, 7px); }
                        .sb2-dismiss { top: 6%; right: 1.5%; width: 22px; height: 22px; }
                        .sb2-dismiss svg { width: 10px; height: 10px; }
                    }
                `}</style>

                <div className="sb2-wrap">
                    <div className="sb2-inner">
                        <img className="sb2-bg" src="/images/banner/survey-banner3.png" alt="설문 배너" />
                        <button className="sb2-btn" onClick={() => setOpen(true)}>
                            설문 참여하기 · 🎁 700P
                        </button>
                        <button className="sb2-dismiss" onClick={() => setDismissed(true)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </section>

            {open && <SurveyModal2 onClose={() => setOpen(false)} />}
        </>
    )
}