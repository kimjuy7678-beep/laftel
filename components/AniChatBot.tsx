"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

const PROFILE_IMAGE = '/images/laftel-icon/laftel-chat.png'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Recommendation {
  id: number
  title: string
  reason: string
}

const QUICK_SUGGESTIONS = [
  '오늘 기분이 우울해',
  '액션 넘치는 거 추천해줘',
  '울고 싶을 때 볼 만한 거',
  '힐링되는 애니 알려줘',
  '진격의 거인 정보 알려줘',
  '짧게 볼 수 있는 애니',
]

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

interface Props {
  rightOffset: number
  onClose: () => void
}

const toRecommendation = (value: unknown): Recommendation | null => {
  if (!value || typeof value !== 'object') return null

  const item = value as Partial<Record<keyof Recommendation, unknown>>
  if (typeof item.id !== 'number' || typeof item.title !== 'string') return null

  return {
    id: item.id,
    title: item.title,
    reason: typeof item.reason === 'string' ? item.reason : '',
  }
}

const parseRecommend = (content: string): Recommendation[] | null => {
  const all: Recommendation[] = []
  const blockMatches = [...content.matchAll(/```recommend\n([\s\S]*?)\n```/g)]
  for (const m of blockMatches) {
    try {
      const parsed = JSON.parse(m[1])
      if (Array.isArray(parsed)) {
        all.push(...parsed.map(toRecommendation).filter((r): r is Recommendation => r !== null))
      }
    } catch { }
  }
  const jsonMatches = [...content.matchAll(/\[\s*\{[\s\S]*?\}\s*\]/g)]
  for (const m of jsonMatches) {
    try {
      const parsed = JSON.parse(m[0])
      if (Array.isArray(parsed)) {
        all.push(...parsed.map(toRecommendation).filter((r): r is Recommendation => r !== null))
      }
    } catch { }
  }
  const seen = new Set<number>()
  const unique = all.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
  return unique.length > 0 ? unique : null
}

const cleanContent = (content: string) =>
  content
    .replace(/```recommend[\s\S]*?```/g, '')
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '')
    .trim()

export default function AniChatBot({ rightOffset, onClose }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '안녕! 나는 라피야\n애니 추천이나 정보는 뭐든 물어봐!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [posterCache, setPosterCache] = useState<Record<number, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }, 100)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchPoster = async (tmdbId: number) => {
    if (posterCache[tmdbId] !== undefined) return
    setPosterCache(prev => ({ ...prev, [tmdbId]: 'loading' }))
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=ko-KR`
      )
      const data = await res.json()
      setPosterCache(prev => ({
        ...prev,
        [tmdbId]: data.poster_path
          ? `https://image.tmdb.org/t/p/w154${data.poster_path}`
          : 'none'
      }))
    } catch {
      setPosterCache(prev => ({ ...prev, [tmdbId]: 'none' }))
    }
  }

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      })
      const data = await res.json()
      const reply = data.reply || '잠깐 문제가 생겼어 다시 물어봐줘!'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      const recs = parseRecommend(reply)
      if (recs) recs.forEach(rec => fetchPoster(rec.id))
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '오류가 났어 다시 시도해줘!' }])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => {
    setMessages([{ role: 'assistant', content: '안녕! 나는 라피야\n애니 추천이나 정보는 뭐든 물어봐!' }])
    setInput('')
    setPosterCache({})
  }

  return (
    <div
      className="fixed z-[10002] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
      style={{
        bottom: 32,
        // 퀵메뉴 버튼(48px) + 간격(12px) 오른쪽에서 띄움
        right: rightOffset + 48 + 12,
        width: 'min(360px, calc(100vw - 24px))',
        height: 'min(560px, calc(100dvh - 64px))',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#6c63ff]/30 shrink-0">
            <img src={PROFILE_IMAGE} alt="라피" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>라피</p>
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>애니 추천 AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetChat}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            title="대화 초기화"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
      >
        {messages.length === 1 && (
          <div className="flex flex-col gap-2 mb-1">
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>빠른 질문</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#6c63ff'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#9d97ff'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const recs = msg.role === 'assistant' ? parseRecommend(msg.content) : null
          const text = msg.role === 'assistant' ? cleanContent(msg.content) : msg.content

          return (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#6c63ff]/30 shrink-0 mt-0.5">
                  <img src={PROFILE_IMAGE} alt="라피" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col gap-2" style={{ maxWidth: '82%' }}>
                {text && (
                  <div
                    className="px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: msg.role === 'user' ? '#6c63ff' : 'var(--bg-secondary)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                      borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
                    }}
                  >
                    {text}
                  </div>
                )}
                {recs && (
                  <div className="flex flex-col gap-2">
                    {recs.map((rec: Recommendation) => {
                      const poster = posterCache[rec.id]
                      const isLoading = poster === 'loading' || poster === undefined
                      const hasImage = poster && poster !== 'loading' && poster !== 'none'
                      return (
                        <div
                          key={rec.id}
                          onClick={() => router.push(`/anime/${rec.id}`)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#6c63ff'
                            ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                            ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)'
                          }}
                        >
                          <div
                            className="rounded-lg overflow-hidden shrink-0"
                            style={{ width: 40, height: 56, background: 'var(--bg-card)' }}
                          >
                            {hasImage ? (
                              <img src={poster} alt={rec.title} className="w-full h-full object-cover" />
                            ) : isLoading ? (
                              <div className="w-full h-full animate-pulse" style={{ background: 'var(--bg-hover)' }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ color: 'var(--text-faint)' }}>
                                {rec.title[0]}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{rec.title}</p>
                            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{rec.reason}</p>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" className="shrink-0">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-[#6c63ff]/30 shrink-0">
              <img src={PROFILE_IMAGE} alt="라피" className="w-full h-full object-cover" />
            </div>
            <div
              className="px-3 py-2.5 rounded-2xl"
              style={{ background: 'var(--bg-secondary)', borderBottomLeftRadius: 4 }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#6c63ff] animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="애니 추천해줘, 기분 말해줘..."
            disabled={loading}
            className="flex-1 text-[13px] px-3.5 py-2.5 rounded-xl outline-none transition-colors disabled:opacity-50"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => e.target.style.borderColor = '#6c63ff'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#6c63ff] text-white transition-opacity disabled:opacity-30 shrink-0 hover:bg-[#5a52e0]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
