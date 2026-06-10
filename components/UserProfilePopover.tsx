// components/UserProfilePopover.tsx
// 커뮤니티 닉네임 클릭 시 나타나는 미니 프로필 팝오버
'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import GradeBadge, { getGrade } from '@/components/GradeBadge'

interface Props {
    authorId: string
    authorNickname: string
    authorProfileImg: string
    authorWatched: number
    children: React.ReactNode  // 닉네임 텍스트 등 트리거 요소
}

export default function UserProfilePopover({ authorId, authorNickname, authorProfileImg, authorWatched, children }: Props) {
    const { user } = useAuthStore()
    const [open, setOpen] = useState(false)
    const [showMessage, setShowMessage] = useState(false)
    const [msgText, setMsgText] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const grade = getGrade(authorWatched)
    const isSelf = user?.uid === authorId || authorId === 'mock'

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setShowMessage(false)
                setSent(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSend = async () => {
        if (!msgText.trim() || !user?.uid) return
        setSending(true)
        try {
            // 수신자 알림함에 저장
            await addDoc(collection(db, 'users', authorId, 'notifications'), {
                type: 'message',
                title: `${user.name || '익명'}님의 쪽지`,
                body: msgText.trim(),
                senderId: user.uid,
                senderNickname: user.name || '익명',
                senderProfileImg: user.photoURL || '',
                read: false,
                createdAt: serverTimestamp(),
            })
            setSent(true)
            setMsgText('')
            setTimeout(() => { setShowMessage(false); setSent(false) }, 1800)
        } catch (e) { console.error(e) }
        finally { setSending(false) }
    }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span
                onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
                style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}
            >
                {children}
            </span>

            {open && (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 6,
                        zIndex: 999,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        boxShadow: '0 8px 32px rgba(0,0,0,.25)',
                        width: 220,
                        overflow: 'hidden',
                        animation: 'popover-in .15s ease',
                    }}
                >
                    <style>{`
                        @keyframes popover-in {
                            from { opacity:0; transform:translateY(-6px) scale(.97) }
                            to   { opacity:1; transform:translateY(0) scale(1) }
                        }
                    `}</style>

                    {/* 프로필 헤더 */}
                    <div style={{
                        background: `linear-gradient(135deg, ${grade.color}22, transparent)`,
                        padding: '16px 16px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderBottom: '1px solid var(--border-faint)',
                    }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)', border: `2px solid ${grade.color}60` }}>
                            {authorProfileImg
                                ? <img src={authorProfileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: grade.color + '33', fontSize: 16, fontWeight: 800, color: grade.color }}>
                                    {authorNickname[0]}
                                </div>
                            }
                        </div>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>{authorNickname}</p>
                            <GradeBadge watched={authorWatched} size="sm" showName={true} />
                        </div>
                    </div>

                    {/* 통계 */}
                    <div style={{ display: 'flex', padding: '10px 16px', gap: 0, borderBottom: '1px solid var(--border-faint)' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{authorWatched}</p>
                            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0' }}>시청편수</p>
                        </div>
                        <div style={{ width: 1, background: 'var(--border-faint)' }} />
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <p style={{ fontSize: 15, fontWeight: 900, color: grade.color, margin: 0 }}>{grade.name}</p>
                            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0' }}>등급</p>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    {!isSelf && user && (
                        <div style={{ padding: '10px 12px' }}>
                            {!showMessage ? (
                                <button
                                    onClick={() => setShowMessage(true)}
                                    style={{
                                        width: '100%', padding: '8px', borderRadius: 9,
                                        background: '#6c63ff', border: 'none',
                                        color: '#fff', fontSize: 12, fontWeight: 700,
                                        cursor: 'pointer', fontFamily: 'inherit',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                        transition: 'opacity .15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    쪽지 보내기
                                </button>
                            ) : sent ? (
                                <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: '#34d399', fontWeight: 700 }}>
                                    ✓ 쪽지를 보냈어요!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    <textarea
                                        autoFocus
                                        placeholder={`${authorNickname}님께 쪽지 보내기`}
                                        value={msgText}
                                        onChange={e => setMsgText(e.target.value)}
                                        maxLength={200}
                                        rows={3}
                                        style={{
                                            width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)',
                                            outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(108,99,255,.5)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    />
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            onClick={() => { setShowMessage(false); setMsgText('') }}
                                            style={{ flex: 1, padding: '7px', border: '1px solid var(--border)', borderRadius: 7, background: 'none', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                                        >취소</button>
                                        <button
                                            onClick={handleSend}
                                            disabled={!msgText.trim() || sending}
                                            style={{ flex: 1, padding: '7px', border: 'none', borderRadius: 7, background: msgText.trim() ? '#6c63ff' : 'var(--bg-hover)', color: msgText.trim() ? '#fff' : 'var(--text-faint)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
                                        >{sending ? '전송 중...' : '전송'}</button>
                                    </div>
                                    <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: 0, textAlign: 'right' }}>{msgText.length}/200</p>
                                </div>
                            )}
                        </div>
                    )}

                    {isSelf && (
                        <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>내 프로필이에요</p>
                        </div>
                    )}

                    {!user && (
                        <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>로그인 후 쪽지를 보낼 수 있어요</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
