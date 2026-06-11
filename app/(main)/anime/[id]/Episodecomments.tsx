'use client'
import { useState, useEffect, useRef } from "react"
import { db } from "@/firebase/firebase"
import {
    collection, addDoc, getDocs, deleteDoc,
    doc, query, serverTimestamp, where
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
    createdAt: unknown
    likes: number
    liked: boolean
    episodeNumber: number
    animeId: number
    watched?: number  // 등급 뱃지용
}

interface Props {
    episodeId?: number | string
    animeId?: number | string
    animeTitle?: string
    animePoster?: string | null
}

function formatTime(ts: unknown) {
    if (!ts) return '방금'
    const date = toDateValue(ts)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}일 전`
    return date.toLocaleDateString('ko-KR')
}

function toDateValue(value: unknown) {
    const timestamp = value as { toDate?: () => Date } | string | number | Date | null | undefined
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate()
    }
    return new Date((timestamp ?? 0) as string | number | Date)
}

export default function EpisodeComments({ episodeId, animeId, animeTitle, animePoster }: Props) {
    const { user, avatarConfig } = useAuthStore()
    const profileId = user?.currentProfileId || 'main'
    const myAvatarSrc = avatarConfig?.svgDataUrl || user?.photoURL || null
    const myName = user?.name || user?.email?.split('@')[0] || '나'
    const router = useRouter()
    const [comments, setComments] = useState<Comment[]>([])
    const [input, setInput] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const myWatched = (() => {
        try {
            const s = typeof window !== 'undefined' ? localStorage.getItem('watch-progress-storage') : null
            return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0
        } catch { return 0 }
    })()

    const colName = 'anime_comments'

    useEffect(() => {
        if (!user?.uid || !animeId || !episodeId || isNaN(Number(animeId))) return
        queueMicrotask(() => setLoading(true))
        getDocs(
            query(
                collection(db, 'users', user.uid, 'profiles', profileId, colName),
                where('animeId', '==', Number(animeId))
            )
        ).then(snap => {
            const docs = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Comment))
                .filter(d => d.episodeNumber === Number(episodeId))
                .sort((a, b) => {
                    const aTime = toDateValue(a.createdAt)
                    const bTime = toDateValue(b.createdAt)
                    return bTime.getTime() - aTime.getTime()
                })
            setComments(docs)
        }).catch(e => {
            console.error('댓글 fetch error:', e)
        }).finally(() => setLoading(false))
    }, [animeId, episodeId, profileId, user?.uid])

    const handleSubmit = async () => {
        const trimmed = input.trim()
        if (!trimmed) return
        if (!user) { router.push('/login'); return }
        if (!animeId || isNaN(Number(animeId))) {
            console.error('animeId가 유효하지 않아요:', animeId)
            return
        }

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
                watched: myWatched,  // 등급 뱃지용
            }
            const ref = await addDoc(
                collection(db, 'users', user.uid!, 'profiles', profileId, colName),
                payload
            )
            setComments(prev => [{
                id: ref.id,
                ...payload,
                createdAt: new Date().toISOString(),
            } as Comment, ...prev])
            setInput('')
            if (inputRef.current) inputRef.current.style.height = 'auto'
            useActivityStore.setState(s => ({
                counts: { ...s.counts, comment: s.counts.comment + 1 }
            }))
        } catch (e) { console.error(e) }
        finally { setSubmitting(false) }
    }

    const handleDelete = async (id: string) => {
        if (!user?.uid) return
        if (!confirm('댓글을 삭제할까요?')) return
        await deleteDoc(doc(db, 'users', user.uid, 'profiles', profileId, colName, id))
        setComments(prev => prev.filter(c => c.id !== id))
        useActivityStore.setState(s => ({
            counts: { ...s.counts, comment: Math.max(0, s.counts.comment - 1) }
        }))
    }

    const toggleLike = (id: string) => {
        setComments(prev => prev.map(c =>
            c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
        ))
    }

    return (
        <div className="border-t border-[var(--border-subtle)] px-3 py-4 sm:px-5 sm:py-5 md:px-6">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-[13px] font-semibold text-[var(--text-subtle)]">
                    {episodeId}화 댓글 {loading ? '' : comments.length}
                </span>
            </div>

            {/* 입력창 */}
            <div className="mb-4 flex gap-2.5 sm:mb-5">
                <Avatar src={myAvatarSrc} name={user ? myName : '?'} size={32} />
                <div className="flex min-w-0 flex-1 gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                        placeholder={user ? `${episodeId}화에 대한 생각을 남겨보세요` : '로그인 후 댓글을 남길 수 있어요'}
                        disabled={!user}
                        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-faint)] focus:border-[#6c63ff]/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5 sm:text-[13px]"
                    />
                    <button
                        onClick={user ? handleSubmit : () => router.push('/login')}
                        disabled={user ? (!input.trim() || submitting) : false}
                        className="shrink-0 rounded-lg bg-[#6c63ff] px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:bg-[#7c74ff] disabled:cursor-not-allowed disabled:opacity-30 sm:px-3.5"
                    >
                        {submitting
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : user ? '등록' : '로그인'
                        }
                    </button>
                </div>
            </div>

            {/* 댓글 목록 */}
            {loading ? (
                <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[#6c63ff] rounded-full animate-spin" />
                </div>
            ) : comments.length === 0 ? (
                <p className="py-5 text-center text-[12px] text-[var(--text-faint)] sm:py-6 sm:text-[13px]">첫 댓글을 남겨보세요!</p>
            ) : (
                <div className="flex flex-col gap-3.5 sm:gap-4">
                    {comments.map(c => (
                        <div key={c.id} className="group flex gap-2.5">
                            <Avatar src={c.avatar} name={c.author} size={32} />
                            <div className="flex-1 min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-[12px] font-semibold text-[var(--text-muted)]">{c.author}</span>
                                    <GradeBadge watched={c.watched ?? 0} size="sm" showName={true} />
                                    <span className="text-[11px] text-[var(--text-faint)]">{formatTime(c.createdAt)}</span>
                                    {c.uid === user?.uid && (
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="ml-auto text-[10px] text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                        >삭제</button>
                                    )}
                                </div>
                                <p className="break-words text-[12px] leading-[1.6] text-[var(--text-muted)] sm:text-[13px]">{c.text}</p>
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
