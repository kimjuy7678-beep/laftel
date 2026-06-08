'use client'
import { useState } from 'react'

export default function ReviewTab() {
    const [myScore, setMyScore] = useState(0)
    const [myReview, setMyReview] = useState('')
    const [myReviewSaved, setMyReviewSaved] = useState('')
    const [isEditingReview, setIsEditingReview] = useState(false)
    const [hoverScore, setHoverScore] = useState(0)

    return (
        <div className="flex flex-col gap-6 py-2">
            <div className="flex gap-4">
                <div className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                    <p className="text-[var(--text-subtle)] text-sm font-semibold">내 별점</p>
                    <p className="text-4xl font-bold text-white">{myScore > 0 ? myScore.toFixed(1) : '0'}</p>
                    <p className="text-[var(--text-faint)] text-xs">{myScore > 0 ? '별점을 남겼어요' : '별점을 남겨주세요'}</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <svg key={s} width="28" height="28" viewBox="0 0 24 24"
                                fill={(hoverScore || myScore) >= s ? '#6c63ff' : 'rgba(255,255,255,0.12)'}
                                stroke="none" className="cursor-pointer transition-colors"
                                onMouseEnter={() => setHoverScore(s)}
                                onMouseLeave={() => setHoverScore(0)}
                                onClick={() => setMyScore(s)}
                            >
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                        ))}
                    </div>
                    {(isEditingReview || !myReviewSaved) ? (
                        <div className="w-full flex flex-col gap-2">
                            <textarea
                                value={myReview}
                                onChange={e => setMyReview(e.target.value)}
                                placeholder="이 작품에 대한 내 생각을 남겨보세요."
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[var(--text-muted)] placeholder-white/20 resize-none outline-none focus:border-white/20"
                                rows={3}
                            />
                            <button
                                onClick={() => { if (myReview.trim()) { setMyReviewSaved(myReview.trim()); setIsEditingReview(false) } }}
                                className="w-full py-2 bg-[#6c63ff] rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
                            >등록</button>
                            {isEditingReview && (
                                <button
                                    onClick={() => { setMyReview(myReviewSaved); setIsEditingReview(false) }}
                                    className="w-full py-2 rounded-xl border border-[var(--border)] text-[var(--text-subtle)] text-sm hover:text-[var(--text-muted)] transition-colors"
                                >취소</button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
                            <p className="text-sm text-[var(--text-muted)] whitespace-pre-line leading-relaxed">{myReviewSaved}</p>
                            <button onClick={() => { setMyReview(myReviewSaved); setIsEditingReview(true) }}
                                className="mt-2 text-xs text-[#9d97ff] hover:text-white transition-colors">수정하기</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                    <p className="text-[var(--text-subtle)] text-sm font-semibold">평균 별점</p>
                    <p className="text-4xl font-bold text-white">4.5</p>
                    <p className="text-[var(--text-faint)] text-xs">274개의 별점</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <svg key={s} width="28" height="28" viewBox="0 0 24 24"
                                fill={s <= 4 ? '#6c63ff' : 'rgba(255,255,255,0.15)'} stroke="none">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                        ))}
                    </div>
                    <div className="w-full flex flex-col gap-1.5 mt-1">
                        {[{ label: '5.0', pct: 78 }, { label: '4.0', pct: 12 }, { label: '3.0', pct: 5 }, { label: '2.0', pct: 3 }, { label: '1.0', pct: 2 }].map(row => (
                            <div key={row.label} className="flex items-center gap-2">
                                <span className="text-[10px] text-[var(--text-faint)] w-6 text-right">{row.label}</span>
                                <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#6c63ff] rounded-full" style={{ width: `${row.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-bold text-sm">리뷰 <span className="text-[var(--text-subtle)]">(114)</span></p>
                    <span className="text-[var(--text-faint)] text-xs">좋아요순 ↕</span>
                </div>
                <div className="flex flex-col gap-3">
                    {[
                        { user: 'pot**********', nickname: '파동', profileImg: '', score: 5.0, date: '2개월 전', text: '이런 흔한 러브코미디에 볼게 뭐가 있다고...', likes: 169 },
                        { user: 'itt****', nickname: '뭉', profileImg: '', score: 5.0, date: '2개월 전', text: '둘이 사귀면 될 일.', likes: 101 },
                        { user: 'lar******', nickname: '엘라라', profileImg: '', score: 5.0, date: '2개월 전', text: '그냥 둘이 결혼해π', likes: 80 },
                        { user: 'hto***', nickname: '치키차', profileImg: '', score: 5.0, date: '2개월 전', text: '럽코보단 사실 액션, 배틀이 더 중심인 작품', likes: 57 },
                        { user: 'star***', nickname: '새벽별', profileImg: '', score: 4.0, date: '3개월 전', text: '작화 미쳤다 진짜 본즈 제대로 힘줬네요 ㅠㅠ', likes: 45 },
                    ].map((r, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {r.profileImg ? (
                                        <img src={r.profileImg} className="w-7 h-7 rounded-full object-cover border border-[var(--border)]" alt={r.nickname} />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-[#6c63ff]/30 flex items-center justify-center text-[10px] text-[var(--text-muted)] font-bold">
                                            {r.nickname[0]}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white/80 text-xs font-bold">{r.nickname}</span>
                                        <span className="text-[var(--text-faint)] text-[11px]">({r.user})</span>
                                    </div>
                                </div>
                                <span className="text-[var(--text-faint)] text-[11px]">{r.date}</span>
                            </div>
                            <div className="flex gap-0.5 mb-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <svg key={s} width="13" height="13" viewBox="0 0 24 24"
                                        fill={s <= Math.floor(r.score) ? '#6c63ff' : 'rgba(255,255,255,0.12)'} stroke="none">
                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed whitespace-pre-line">{r.text}</p>
                            <div className="flex items-center gap-1 mt-3">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                </svg>
                                <span className="text-[var(--text-faint)] text-xs">{r.likes}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}