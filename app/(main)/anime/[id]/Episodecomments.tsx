'use client'
import { useState } from "react"

interface Comment {
    id: string
    author: string
    avatar: string
    text: string
    createdAt: string
    likes: number
    liked: boolean
}

const DUMMY_COMMENTS: Comment[] = [
    {
        id: '1',
        author: '애니덕후',
        avatar: '애',
        text: '이번 화 진짜 최고였어요!! 마지막 장면에서 소름 돋았음',
        createdAt: '2시간 전',
        likes: 24,
        liked: false,
    },
    {
        id: '2',
        author: '밤새워봄',
        avatar: '밤',
        text: '작화가 너무 예뻐서 계속 돌려봤어요 ㅠㅠ',
        createdAt: '5시간 전',
        likes: 11,
        liked: false,
    },
    {
        id: '3',
        author: '히어로팬',
        avatar: '히',
        text: '다음 화 언제 나오냐... 기다리는 게 더 힘들다',
        createdAt: '어제',
        likes: 7,
        liked: false,
    },
]

interface Props {
    episodeId?: number | string
}

export default function EpisodeComments({ episodeId }: Props) {
    const [comments, setComments] = useState<Comment[]>(DUMMY_COMMENTS)
    const [input, setInput] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = () => {
        const trimmed = input.trim()
        if (!trimmed) return

        setSubmitting(true)
        setTimeout(() => {
            const newComment: Comment = {
                id: Date.now().toString(),
                author: '나',
                avatar: '나',
                text: trimmed,
                createdAt: '방금',
                likes: 0,
                liked: false,
            }
            setComments(prev => [newComment, ...prev])
            setInput('')
            setSubmitting(false)
        }, 300)
    }

    const toggleLike = (id: string) => {
        setComments(prev =>
            prev.map(c =>
                c.id === id
                    ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
                    : c
            )
        )
    }

    return (
        <div className="px-6 py-5 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-[13px] font-semibold text-[var(--text-subtle)]">댓글 {comments.length}</span>
            </div>

            <div className="flex gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-full bg-[#6c63ff]/30 flex items-center justify-center shrink-0 text-[11px] font-black text-[#9d97ff]">
                    나
                </div>
                <div className="flex-1 flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                        placeholder="이 에피소드에 대한 생각을 남겨보세요"
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3.5 py-2 text-[13px] text-white placeholder:text-[var(--text-faint)] outline-none focus:border-[#6c63ff]/40 focus:bg-white/[0.07] transition-all"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!input.trim() || submitting}
                        className="px-3.5 py-2 rounded-lg bg-[#6c63ff] text-white text-[12px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:bg-[#7c74ff] shrink-0"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : '등록'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {comments.length === 0 ? (
                    <p className="text-[13px] text-[var(--text-faint)] text-center py-6">첫 댓글을 남겨보세요!</p>
                ) : comments.map(c => (
                    <div key={c.id} className="flex gap-2.5 group">
                        <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 text-[11px] font-black text-[var(--text-subtle)]">
                            {c.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[12px] font-semibold text-[var(--text-muted)]">{c.author}</span>
                                <span className="text-[11px] text-[var(--text-faint)]">{c.createdAt}</span>
                            </div>
                            <p className="text-[13px] text-[var(--text-muted)] leading-[1.6] break-words">{c.text}</p>
                            <button
                                onClick={() => toggleLike(c.id)}
                                className={`flex items-center gap-1 mt-1.5 text-[11px] transition-colors ${c.liked ? 'text-[#6c63ff]' : 'text-[var(--text-faint)] hover:text-[var(--text-subtle)]'}`}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill={c.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                {c.likes > 0 && c.likes}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}