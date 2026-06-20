'use client'
import { useState, useEffect, useRef } from "react"
import { db } from "@/firebase/firebase"
import {
    collection, addDoc, deleteDoc, updateDoc,
    doc, query, serverTimestamp, onSnapshot, orderBy
} from "firebase/firestore"
import { useAuthStore } from "@/store/useAuthStore"
import { useRouter } from "next/navigation"
import { useActivityStore } from "@/store/useActiveStore"
import GradeBadge from "@/components/GradeBadge"

const AVATAR_COLORS = [
    { bg: 'rgba(108,99,255,0.2)', text: '#9d97ff' },
    { bg: 'rgba(236,72,153,0.2)', text: '#f472b6' },
    { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
    { bg: 'rgba(16,185,129,0.2)', text: '#34d399' },
    { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
    { bg: 'rgba(239,68,68,0.2)', text: '#f87171' },
]
function getAvatarColor(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function Avatar({ src, name, size = 32 }: { src?: string | null, name: string, size?: number }) {
    const color = getAvatarColor(name)
    if (src) return (
        <img src={src} alt={name}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
    )
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: color.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: size * 0.3, fontWeight: 800, color: color.text,
        }}>
            {name[0]?.toUpperCase() || '?'}
        </div>
    )
}

interface Comment {
    id: string
    uid: string
    author: string
    avatar: string
    text: string
    createdAt: any
    likes: number
    liked: boolean
    episodeNumber: number
    animeId: number
    watched?: number
    edited?: boolean
}

interface Props {
    episodeId?: number | string
    animeId?: number | string
    animeTitle?: string
    animePoster?: string | null
    onBookmarkSeek?: (timeSeconds: number) => void
}

function formatTime(ts: any) {
    if (!ts) return '방금'
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}일 전`
    return date.toLocaleDateString('ko-KR')
}

function parseTimestamps(text: string, onSeek: (seconds: number) => void) {
    const parts = text.split(/(\d{1,2}:\d{2})/)
    return parts.map((part, i) => {
        if (/^\d{1,2}:\d{2}$/.test(part)) {
            const [m, s] = part.split(':').map(Number)
            const seconds = m * 60 + s
            return (
                <button
                    key={i}
                    onClick={e => { e.stopPropagation(); onSeek(seconds) }}
                    style={{
                        background: 'rgba(108,99,255,0.15)',
                        border: '1px solid rgba(108,99,255,0.3)',
                        borderRadius: 5, padding: '1px 7px',
                        color: '#9d97ff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', marginRight: 3,
                        transition: 'background .15s',
                        fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,99,255,0.3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,99,255,0.15)'}
                    title={`${part}으로 이동`}
                >
                    {part}
                </button>
            )
        }
        return <span key={i}>{part}</span>
    })
}

export default function EpisodeComments({ episodeId, animeId, animeTitle, animePoster, onBookmarkSeek }: Props) {
    const { user, avatarConfig } = useAuthStore()
    const myAvatarSrc = avatarConfig?.svgDataUrl || user?.photoURL || null
    const myName = user?.name || user?.email?.split('@')[0] || '나'
    const router = useRouter()
    const [comments, setComments] = useState<Comment[]>([])
    const [input, setInput] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    const editInputRef = useRef<HTMLInputElement>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const myWatched = (() => {
        try {
            const s = typeof window !== 'undefined' ? localStorage.getItem('watch-progress-storage') : null
            return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0
        } catch { return 0 }
    })()

    const colPath = `anime_comments/${animeId}/episodes/${episodeId}/comments`

    useEffect(() => {
        if (!animeId || !episodeId || isNaN(Number(animeId))) return
        setLoading(true)

        const q = query(
            collection(db, colPath),
            orderBy('createdAt', 'desc')
        )

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment))
            setComments(data)
            setLoading(false)
        })

        return () => unsub()
    }, [animeId, episodeId])

    const startEdit = (c: Comment) => {
        setEditingId(c.id)
        setEditText(c.text)
        setTimeout(() => editInputRef.current?.focus(), 50)
    }

    const handleEdit = async (id: string) => {
        const trimmed = editText.trim()
        if (!trimmed || !user?.uid) return
        try {
            await updateDoc(doc(db, colPath, id), { text: trimmed, edited: true })
        } catch (e) { console.error(e) }
        setEditingId(null)
        setEditText('')
    }

    const handleSubmit = async () => {
        const trimmed = input.trim()
        if (!trimmed || !user || !animeId || isNaN(Number(animeId))) return

        setSubmitting(true)
        try {
            const payload = {
                uid: user.uid,
                author: myName,
                avatar: myAvatarSrc || '',
                text: trimmed,
                createdAt: serverTimestamp(),
                likes: 0,
                liked: false,
                episodeNumber: Number(episodeId),
                animeId: Number(animeId),
                animeTitle: animeTitle || '',
                animePoster: animePoster || null,
                watched: myWatched,
            }
            await addDoc(collection(db, colPath), payload)
            setInput('')
            useActivityStore.setState(s => ({
                counts: { ...s.counts, comment: s.counts.comment + 1 }
            }))
        } catch (e) { console.error(e) }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async (id: string) => {
        await deleteDoc(doc(db, colPath, id))
        setDeletingId(null)
        useActivityStore.setState(s => ({
            counts: { ...s.counts, comment: Math.max(0, s.counts.comment - 1) }
        }))
    }

    const toggleLike = (id: string) => {
        setComments(prev => prev.map(c =>
            c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
        ))
    }

    const handleSeek = (seconds: number) => {
        if (onBookmarkSeek) {
            onBookmarkSeek(seconds)
        } else {
            const iframe = document.querySelector('iframe') as HTMLIFrameElement
            iframe?.contentWindow?.postMessage(JSON.stringify({
                event: 'command', func: 'seekTo', args: [seconds, true]
            }), '*')
        }
    }

    return (
        <div className="px-6 py-5 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-[13px] font-semibold text-[var(--text-subtle)]">
                    {episodeId}화 댓글 {loading ? '' : comments.length}
                </span>
            </div>

            <div className="flex gap-2.5 mb-5">
                <Avatar src={myAvatarSrc} name={user ? myName : '?'} size={32} />
                <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                            placeholder={user ? `${episodeId}화에 대한 생각을 남겨보세요 (예: 12:35 명장면)` : '로그인 후 댓글을 남길 수 있어요'}
                            disabled={!user}
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[#6c63ff]/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={user ? handleSubmit : () => router.push('/login')}
                            disabled={user ? (!input.trim() || submitting) : false}
                            className="px-3.5 py-2 rounded-lg bg-[#6c63ff] text-white text-[12px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:bg-[#7c74ff] shrink-0"
                        >
                            {submitting
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : user ? '등록' : '로그인'
                            }
                        </button>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0, paddingLeft: 2 }}>
                        💡 <span style={{ color: '#9d97ff', fontWeight: 600 }}>1:23</span> 형식으로 시간을 입력하면 클릭해서 해당 장면으로 이동할 수 있어요
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[#6c63ff] rounded-full animate-spin" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-[13px] text-[var(--text-faint)] text-center py-6">첫 댓글을 남겨보세요!</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-2.5 group">
                            <Avatar src={c.avatar} name={c.author} size={32} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[12px] font-semibold text-[var(--text-muted)]">{c.author}</span>
                                    <GradeBadge watched={c.watched ?? 0} size="sm" showName={true} />
                                    <span className="text-[11px] text-[var(--text-faint)]">{formatTime(c.createdAt)}</span>
                                    {c.edited && <span className="text-[10px] text-[var(--text-faint)]">(수정됨)</span>}

                                    {c.uid === user?.uid && editingId !== c.id && (
                                        <div className="ml-auto flex items-center gap-1.5">
                                            {deletingId === c.id ? (
                                                <>
                                                    <span className="text-[11px] text-[var(--text-faint)]">삭제할까요?</span>
                                                    <button
                                                        onClick={() => handleDeleteConfirm(c.id)}
                                                        style={{
                                                            fontSize: 11, fontWeight: 600,
                                                            padding: '3px 10px', borderRadius: 6,
                                                            background: 'rgba(239,68,68,0.15)',
                                                            border: '1px solid #ef4444',
                                                            color: '#f87171',
                                                            cursor: 'pointer', transition: 'all .15s',
                                                        }}
                                                    >확인</button>
                                                    <button
                                                        onClick={() => setDeletingId(null)}
                                                        style={{
                                                            fontSize: 11, fontWeight: 600,
                                                            padding: '3px 10px', borderRadius: 6,
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border)',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer', transition: 'all .15s',
                                                        }}
                                                    >취소</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(c)}
                                                        style={{
                                                            fontSize: 11, fontWeight: 600,
                                                            padding: '3px 10px', borderRadius: 6,
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border)',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer', transition: 'all .15s',
                                                        }}
                                                        onMouseEnter={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#6c63ff'
                                                            ;(e.currentTarget as HTMLButtonElement).style.color = '#9d97ff'
                                                        }}
                                                        onMouseLeave={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                                                            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                                                        }}
                                                    >수정</button>
                                                    <button
                                                        onClick={() => setDeletingId(c.id)}
                                                        style={{
                                                            fontSize: 11, fontWeight: 600,
                                                            padding: '3px 10px', borderRadius: 6,
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border)',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer', transition: 'all .15s',
                                                        }}
                                                        onMouseEnter={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'
                                                            ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
                                                        }}
                                                        onMouseLeave={e => {
                                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                                                            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                                                        }}
                                                    >삭제</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {editingId === c.id ? (
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            ref={editInputRef}
                                            value={editText}
                                            onChange={e => setEditText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleEdit(c.id)
                                                if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                                            }}
                                            className="flex-1 bg-[var(--bg-secondary)] border border-[#6c63ff]/50 rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none"
                                        />
                                        <button
                                            onClick={() => handleEdit(c.id)}
                                            disabled={!editText.trim()}
                                            className="px-3 py-1.5 rounded-lg bg-[#6c63ff] text-white text-[11px] font-semibold disabled:opacity-30 transition-opacity hover:bg-[#7c74ff] shrink-0"
                                        >저장</button>
                                        <button
                                            onClick={() => { setEditingId(null); setEditText('') }}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] shrink-0"
                                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                                        >취소</button>
                                    </div>
                                ) : (
                                    <p className="text-[13px] text-[var(--text-muted)] leading-[1.6] break-words">
                                        {parseTimestamps(c.text, handleSeek)}
                                    </p>
                                )}

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
            )}
        </div>
    )
}