'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

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

function SurveyModal({ onClose }: { onClose: () => void }) {
    const { user } = useAuthStore()
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [step, setStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    const q = QUESTIONS[step]
    const isLast = step === QUESTIONS.length - 1

    const handleRating = (val: number) => setAnswers(prev => ({ ...prev, [q.id]: val }))
    const handleSingle = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }))
    const handleMulti = (val: string) => {
        const cur: string[] = answers[q.id] || []
        setAnswers(prev => ({
            ...prev,
            [q.id]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]
        }))
    }
    const handleText = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }))

    const canNext = q.type === 'text' || answers[q.id] !== undefined && answers[q.id] !== ''

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
                userId: user?.uid || null,
                userEmail: user?.email || null,
                createdAt: serverTimestamp(),
            }, { merge: true })
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
                .sv-overlay {
                    position: fixed; inset: 0; z-index: 9000;
                    background: rgba(0,0,0,.75);
                    backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center;
                    animation: sv-fade .2s ease;
                }
                @keyframes sv-fade { from{opacity:0} to{opacity:1} }
                .sv-box {
                    width: 480px;
                    background: #141420;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,.1);
                    box-shadow: 0 32px 80px rgba(0,0,0,.8);
                    overflow: hidden;
                    animation: sv-up .25s ease;
                }
                @keyframes sv-up { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
                .sv-header {
                    padding: 28px 28px 0;
                }
                .sv-progress-wrap {
                    display: flex; gap: 4px; margin-bottom: 24px;
                }
                .sv-progress-dot {
                    flex: 1; height: 3px; border-radius: 2px;
                    transition: background .3s;
                }
                .sv-body { padding: 0 28px 28px; }
                .sv-question {
                    font-size: 17px; font-weight: 800; color: #fff;
                    margin: 0 0 20px; line-height: 1.4;
                }
                /* rating */
                .sv-rating { display: flex; gap: 8px; }
                .sv-rating-btn {
                    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
                    padding: 14px 8px; border-radius: 12px;
                    border: 1px solid rgba(255,255,255,.1);
                    background: rgba(255,255,255,.04);
                    cursor: pointer; transition: all .18s;
                }
                .sv-rating-btn:hover { border-color: rgba(108,99,255,.4); background: rgba(108,99,255,.1); }
                .sv-rating-btn.selected { border-color: #6c63ff; background: rgba(108,99,255,.18); }
                .sv-rating-emoji { font-size: 22px; }
                .sv-rating-label { font-size: 10px; color: rgba(255,255,255,.4); }
                .sv-rating-btn.selected .sv-rating-label { color: #9d97ff; }
                /* single/multi */
                .sv-options { display: flex; flex-direction: column; gap: 8px; }
                .sv-option {
                    display: flex; align-items: center; gap: 10px;
                    padding: 12px 14px; border-radius: 10px;
                    border: 1px solid rgba(255,255,255,.08);
                    background: rgba(255,255,255,.03);
                    cursor: pointer; transition: all .15s;
                    font-size: 14px; color: rgba(255,255,255,.75);
                    text-align: left;
                }
                .sv-option:hover { border-color: rgba(108,99,255,.35); background: rgba(108,99,255,.08); }
                .sv-option.selected { border-color: #6c63ff; background: rgba(108,99,255,.15); color: #fff; }
                .sv-check {
                    width: 18px; height: 18px; border-radius: 50%;
                    border: 2px solid rgba(255,255,255,.2);
                    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
                    transition: all .15s;
                }
                .sv-option.selected .sv-check { background: #6c63ff; border-color: #6c63ff; }
                /* text */
                .sv-textarea {
                    width: 100%; min-height: 100px;
                    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
                    border-radius: 10px; color: #fff; font-size: 14px;
                    padding: 12px 14px; resize: none; outline: none;
                    box-sizing: border-box; transition: border-color .2s;
                    font-family: inherit;
                }
                .sv-textarea:focus { border-color: #6c63ff; }
                .sv-textarea::placeholder { color: rgba(255,255,255,.22); }
                /* footer */
                .sv-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-top: 24px;
                }
                .sv-step-info { font-size: 12px; color: rgba(255,255,255,.28); }
                .sv-btn-row { display: flex; gap: 8px; }
                .sv-btn-skip {
                    padding: 10px 18px; border-radius: 9px;
                    background: none; border: 1px solid rgba(255,255,255,.1);
                    color: rgba(255,255,255,.4); font-size: 13px; cursor: pointer; transition: all .2s;
                }
                .sv-btn-skip:hover { color: #fff; border-color: rgba(255,255,255,.25); }
                .sv-btn-next {
                    padding: 10px 22px; border-radius: 9px;
                    background: #6c63ff; border: none;
                    color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
                    transition: background .2s; opacity: 1;
                }
                .sv-btn-next:hover { background: #5a52e0; }
                .sv-btn-next:disabled { opacity: .4; cursor: default; }
                /* done */
                .sv-done {
                    display: flex; flex-direction: column; align-items: center;
                    padding: 48px 28px; text-align: center; gap: 12px;
                }
                .sv-done-emoji { font-size: 48px; }
                .sv-done-title { font-size: 20px; font-weight: 900; color: #fff; margin: 0; }
                .sv-done-sub { font-size: 14px; color: rgba(255,255,255,.4); margin: 0; }
                .sv-close-btn {
                    margin-top: 8px; padding: 11px 28px; border-radius: 10px;
                    background: #6c63ff; border: none; color: #fff;
                    font-size: 14px; font-weight: 700; cursor: pointer;
                }
            `}</style>

            <div className="sv-overlay" onClick={onClose}>
                <div className="sv-box" onClick={e => e.stopPropagation()}>
                    {done ? (
                        <div className="sv-done">
                            <span className="sv-done-emoji">🎉</span>
                            <p className="sv-done-title">소중한 의견 감사해요!</p>
                            <p className="sv-done-sub">더 나은 라프텔을 만드는 데 활용할게요</p>
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

                                {q.type === 'rating' && (
                                    <div className="sv-rating">
                                        {q.options!.map((emoji, i) => (
                                            <button key={i} className={`sv-rating-btn${answers[q.id] === i + 1 ? ' selected' : ''}`}
                                                onClick={() => handleRating(i + 1)}>
                                                <span className="sv-rating-emoji">{emoji}</span>
                                                <span className="sv-rating-label">{q.labels![i]}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'single' && (
                                    <div className="sv-options">
                                        {q.options!.map(opt => (
                                            <button key={opt} className={`sv-option${answers[q.id] === opt ? ' selected' : ''}`}
                                                onClick={() => handleSingle(opt)}>
                                                <div className="sv-check">
                                                    {answers[q.id] === opt && (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
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
                                            const selected = (answers[q.id] || []).includes(opt)
                                            return (
                                                <button key={opt} className={`sv-option${selected ? ' selected' : ''}`}
                                                    onClick={() => handleMulti(opt)}>
                                                    <div className="sv-check" style={{ borderRadius: 4 }}>
                                                        {selected && (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
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
                                        value={answers[q.id] || ''}
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
                                            disabled={!canNext && q.type !== 'text' || submitting}
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
    const [open, setOpen] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    if (dismissed) return null

    return (
        <>
            <section style={{ padding: '48px 0 0' }}>
                <style>{`
                    .sb-wrap {
                        max-width: 1820px; margin: 0 auto; padding: 0 48px;
                    }
                    .sb-inner {
                        position: relative; overflow: hidden;
                        border-radius: 16px;
                        background: linear-gradient(135deg, #1a1535 0%, #0f0f1a 50%, #1c1530 100%);
                        border: 1px solid rgba(255,255,255,.08);
                        padding: 28px 32px;
                        display: flex; align-items: center; justify-content: space-between; gap: 24px;
                    }
                    .sb-glow {
                        position: absolute; width: 300px; height: 300px;
                        border-radius: 50%; background: rgba(108,99,255,.12);
                        filter: blur(60px); top: -80px; right: 80px;
                        pointer-events: none;
                    }
                    .sb-left { position: relative; z-index: 1; display: flex; align-items: center; gap: 18px; }
                    .sb-icon {
                        width: 48px; height: 48px; border-radius: 12px;
                        background: rgba(108,99,255,.2); border: 1px solid rgba(108,99,255,.3);
                        display: flex; align-items: center; justify-content: center;
                        font-size: 22px; flex-shrink: 0;
                    }
                    .sb-text-wrap {}
                    .sb-eyebrow {
                        font-size: 11px; font-weight: 700; color: #9d97ff;
                        letter-spacing: .08em; text-transform: uppercase; margin: 0 0 4px;
                    }
                    .sb-title {
                        font-size: 17px; font-weight: 800; color: #fff; margin: 0 0 3px;
                    }
                    .sb-sub {
                        font-size: 12px; color: rgba(255,255,255,.4); margin: 0;
                    }
                    .sb-right { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                    .sb-btn {
                        display: flex; align-items: center; gap: 7px;
                        padding: 11px 22px; border-radius: 10px;
                        background: #6c63ff; border: none;
                        color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
                        transition: background .2s, transform .15s;
                    }
                    .sb-btn:hover { background: #5a52e0; transform: translateY(-1px); }
                    .sb-dismiss {
                        width: 30px; height: 30px; border-radius: 50%;
                        background: rgba(255,255,255,.06); border: none;
                        color: rgba(255,255,255,.35); cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        transition: all .2s;
                    }
                    .sb-dismiss:hover { background: rgba(255,255,255,.12); color: #fff; }
                `}</style>

                <div className="sb-wrap">
                    <div className="sb-inner">
                        <div className="sb-glow" />
                        <div className="sb-left">
                            <div className="sb-icon">📋</div>
                            <div className="sb-text-wrap">
                                <p className="sb-eyebrow">잠깐!</p>
                                <p className="sb-title">라프텔을 잘 사용하고 계신가요?</p>
                                <p className="sb-sub">1분 설문에 참여하고 더 나은 서비스를 만들어요 · 총 5문항</p>
                            </div>
                        </div>
                        <div className="sb-right">
                            <button className="sb-btn" onClick={() => setOpen(true)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                평가하기
                            </button>
                            <button className="sb-dismiss" onClick={() => setDismissed(true)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {open && <SurveyModal onClose={() => setOpen(false)} />}
        </>
    )
}
