'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

const QUESTIONS = [
    {
        id: 'favorite_feature',
        label: '가장 마음에 드는 기능은?',
        type: 'multi',
        options: ['애니 검색', '태그 필터', '요일별 신작', 'OST 감상', '감정 추천', '라이브'],
    },
    {
        id: 'improvement',
        label: '가장 개선이 필요한 부분은?',
        type: 'single',
        options: ['콘텐츠 수', '앱 속도', 'UI/디자인', '추천 알고리즘', '자막 품질'],
    },
    {
        id: 'etc',
        label: '기타 의견 (선택)',
        type: 'text',
    },
]

type SurveyAnswer = number | string | string[]

function SurveyModal({ onClose }: { onClose: () => void }) {
    const { user, addPoints } = useAuthStore()
    const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({})
    const [step, setStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    const q = QUESTIONS[step]
    const isLast = step === QUESTIONS.length - 1

    const handleSingle = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }))
    const handleMulti = (val: string) => {
        const cur = Array.isArray(answers[q.id]) ? answers[q.id] as string[] : []
        setAnswers(prev => ({
            ...prev,
            [q.id]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]
        }))
    }
    const handleText = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }))
    const canNext = q.type === 'text' || (answers[q.id] !== undefined && answers[q.id] !== '')

    const handleNext = () => {
        if (!isLast) { setStep(s => s + 1); return }
        handleSubmit()
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const docId = user?.uid || `anonymous_${Date.now()}`
            await setDoc(doc(db, 'surveys', docId), {
                ...answers,
                surveyType: 'survey1',
                userId: user?.uid || null,
                userEmail: user?.email || null,
                createdAt: serverTimestamp(),
            }, { merge: true })
            if (user?.uid) await addPoints(800)
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
                .sv-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(0,0,0,.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; animation: sv-fade .2s ease; }
                @keyframes sv-fade { from{opacity:0} to{opacity:1} }
                .sv-box { width: 480px; background: #141420; border-radius: 20px; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 32px 80px rgba(0,0,0,.8); overflow: hidden; animation: sv-up .25s ease; }
                @keyframes sv-up { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
                .sv-header { padding: 28px 28px 0; }
                .sv-progress-wrap { display: flex; gap: 4px; margin-bottom: 24px; }
                .sv-progress-dot { flex: 1; height: 3px; border-radius: 2px; transition: background .3s; }
                .sv-body { padding: 0 28px 28px; }
                .sv-question { font-size: 17px; font-weight: 800; color: #fff; margin: 0 0 20px; line-height: 1.4; }
                .sv-options { display: flex; flex-direction: column; gap: 8px; }
                .sv-option { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); cursor: pointer; transition: all .15s; font-size: 14px; color: rgba(255,255,255,.75); text-align: left; }
                .sv-option:hover { border-color: rgba(108,99,255,.35); background: rgba(108,99,255,.08); }
                .sv-option.selected { border-color: #6c63ff; background: rgba(108,99,255,.15); color: #fff; }
                .sv-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
                .sv-option.selected .sv-check { background: #6c63ff; border-color: #6c63ff; }
                .sv-textarea { width: 100%; min-height: 100px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: #fff; font-size: 14px; padding: 12px 14px; resize: none; outline: none; box-sizing: border-box; transition: border-color .2s; font-family: inherit; }
                .sv-textarea:focus { border-color: #6c63ff; }
                .sv-textarea::placeholder { color: rgba(255,255,255,.22); }
                .sv-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
                .sv-step-info { font-size: 12px; color: rgba(255,255,255,.28); }
                .sv-btn-row { display: flex; gap: 8px; }
                .sv-btn-skip { padding: 10px 18px; border-radius: 9px; background: none; border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.4); font-size: 13px; cursor: pointer; transition: all .2s; }
                .sv-btn-skip:hover { color: #fff; border-color: rgba(255,255,255,.25); }
                .sv-btn-next { padding: 10px 22px; border-radius: 9px; background: #6c63ff; border: none; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s; }
                .sv-btn-next:hover { background: #5a52e0; }
                .sv-btn-next:disabled { opacity: .4; cursor: default; }
                .sv-done { display: flex; flex-direction: column; align-items: center; padding: 48px 28px; text-align: center; gap: 12px; }
                .sv-done-emoji { font-size: 48px; }
                .sv-done-title { font-size: 20px; font-weight: 900; color: #fff; margin: 0; }
                .sv-done-sub { font-size: 14px; color: rgba(255,255,255,.4); margin: 0; }
                .sv-done-point { font-size: 14px; font-weight: 700; color: #6c63ff; background: rgba(108,99,255,.12); border: 1px solid rgba(108,99,255,.3); border-radius: 8px; padding: 8px 16px; margin: 0; }
                .sv-close-btn { margin-top: 8px; padding: 11px 28px; border-radius: 10px; background: #6c63ff; border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
            `}</style>

            <div className="sv-overlay" onClick={onClose}>
                <div className="sv-box" onClick={e => e.stopPropagation()}>
                    {done ? (
                        <div className="sv-done">
                            <span className="sv-done-emoji">🎉</span>
                            <p className="sv-done-title">소중한 의견 감사해요!</p>
                            <p className="sv-done-sub">더 나은 라프텔을 만드는 데 활용할게요</p>
                            {user?.uid && <p className="sv-done-point">🎁 800p 포인트가 지급되었어요!</p>}
                            <button className="sv-close-btn" onClick={onClose}>확인</button>
                        </div>
                    ) : (
                        <>
                            <div className="sv-header">
                                <div className="sv-progress-wrap">
                                    {QUESTIONS.map((_, i) => (
                                        <div key={i} className="sv-progress-dot"
                                            style={{ background: i <= step ? '#6c63ff' : 'rgba(255,255,255,.1)' }} />
                                    ))}
                                </div>
                            </div>
                            <div className="sv-body">
                                <p className="sv-question">{q.label}</p>

                                {q.type === 'single' && (
                                    <div className="sv-options">
                                        {q.options!.map(opt => (
                                            <button key={opt}
                                                className={`sv-option${answers[q.id] === opt ? ' selected' : ''}`}
                                                onClick={() => handleSingle(opt)}>
                                                <div className="sv-check">
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

                                {q.type === 'multi' && (
                                    <div className="sv-options">
                                        {q.options!.map(opt => {
                                            const selected = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)
                                            return (
                                                <button key={opt}
                                                    className={`sv-option${selected ? ' selected' : ''}`}
                                                    onClick={() => handleMulti(opt)}>
                                                    <div className="sv-check" style={{ borderRadius: 4 }}>
                                                        {selected && (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                                                <polyline points="20,6 9,17 4,12" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {q.type === 'text' && (
                                    <textarea
                                        className="sv-textarea"
                                        placeholder="자유롭게 작성해주세요"
                                        value={typeof answers[q.id] === 'string' ? answers[q.id] as string : ''}
                                        onChange={e => handleText(e.target.value)}
                                    />
                                )}

                                <div className="sv-footer">
                                    <span className="sv-step-info">{step + 1} / {QUESTIONS.length}</span>
                                    <div className="sv-btn-row">
                                        {q.type === 'text' && (
                                            <button className="sv-btn-skip" onClick={handleNext}>건너뛰기</button>
                                        )}
                                        <button
                                            className="sv-btn-next"
                                            disabled={(!canNext && q.type !== 'text') || submitting}
                                            onClick={handleNext}
                                        >
                                            {submitting ? '제출 중...' : isLast ? '제출하기 🎉' : '다음'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default function SurveyBanner() {
    const { user } = useAuthStore()
    const [open, setOpen] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    const [alreadyDone, setAlreadyDone] = useState(false)

    useEffect(() => {
        if (!user?.uid) return
        getDoc(doc(db, 'surveys', user.uid)).then(snap => {
            if (snap.exists() && snap.data()?.surveyType === 'survey1') setAlreadyDone(true)
        }).catch(() => {})
    }, [user?.uid])

    if (dismissed || alreadyDone) return null

    return (
        <>
            <section className="sb-section">
                <style>{`
                    .sb-section { padding: 40px 0 0; }
                    .sb-wrap { width: 100%; margin: 0 auto; margin-top: -24px; padding-top: 38px; }
                    .sb-inner { position: relative; overflow: hidden; padding-top: 26.1%; height: 0; }
                    .sb-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
                    .sb-btn {
                        position: absolute; right: 15.5%; bottom: 6%;
                        display: inline-flex; align-items: center; justify-content: center;
                        min-height: clamp(18px, 2.35vw, 38px);
                        padding: 0 clamp(8px, 1.5vw, 24px); border-radius: 50px;
                        background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.4);
                        color: #fff; font-size: clamp(15px, 0.86vw, 24px); font-weight: 600;
                        cursor: pointer; white-space: nowrap;
                        backdrop-filter: blur(4px); transition: background .2s;
                    }
                    .sb-btn:hover { background: rgba(255,255,255,0.5); }
                    @media (max-width: 1920px) { .sb-btn { right: 14.5%; } }
                    .sb-dismiss {
                        position: absolute; top: 8%; right: 1.5%; z-index: 2;
                        width: 32px; height: 32px; border-radius: 50%;
                        background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
                        color: rgba(255,255,255,0.6); cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: all .2s; backdrop-filter: blur(4px);
                    }
                    .sb-dismiss:hover { background: rgba(0,0,0,0.5); color: #fff; }
                    @media (max-width: 900px) {
                        .sb-section { padding-top: 32px; }
                        .sb-wrap { margin-top: -14px; padding-top: 26px; }
                        .sb-btn { right: 13.5%; bottom: 5%; min-height: clamp(13px, 3vw, 22px); padding: 0 clamp(5px, 1.8vw, 10px); font-size: clamp(6px, 1.35vw, 9px); }
                        .sb-dismiss { width: 26px; height: 26px; }
                    }
                    @media (max-width: 560px) {
                        .sb-btn { right: 2.5%; bottom: 5.5%; min-height: clamp(11px, 4vw, 16px); padding: 0 clamp(4px, 1.8vw, 6px); font-size: clamp(5px, 1.8vw, 7px); }
                        .sb-dismiss { top: 6%; right: 1.5%; width: 22px; height: 22px; }
                        .sb-dismiss svg { width: 10px; height: 10px; }
                    }
                `}</style>

                <div className="sb-wrap">
                    <div className="sb-inner">
                        <img className="sb-bg" src="/images/banner/survey-banner.png" alt="설문 배너" />
                        <button className="sb-btn" onClick={() => setOpen(true)}>
                            설문 참여하기 · 🎁 800P
                        </button>
                        <button className="sb-dismiss" onClick={() => setDismissed(true)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </section>

            {open && <SurveyModal onClose={() => setOpen(false)} />}
        </>
    )
}