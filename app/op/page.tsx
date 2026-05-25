'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAniStore } from '@/store/useAniStore'

const LASTFM_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const ITUNES_BASE = 'https://itunes.apple.com/search'
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

interface OpTrack {
    id: string; title: string; artist: string; animeName: string
    cover: string; previewUrl: string | null; duration: number
    type: 'op' | 'ed'; year: string; quarter: string
    voteCount: number
}

// 분기별 인기 OP/ED 데이터 (TMDB 인기순 기반)
const SEASONAL_ANIME: Record<string, { name: string; en: string; type: 'op'|'ed'; year: string; quarter: string }[]> = {
    '2024-Q1': [
        { name: '최애의 아이 2기', en: 'Oshi no Ko Season 2', type: 'op', year: '2024', quarter: 'Q1' },
        { name: '던전밥', en: 'Dungeon Meshi', type: 'op', year: '2024', quarter: 'Q1' },
        { name: '프리렌', en: 'Sousou no Frieren', type: 'ed', year: '2024', quarter: 'Q1' },
        { name: '원펀맨 3기', en: 'One Punch Man Season 3', type: 'op', year: '2024', quarter: 'Q1' },
    ],
    '2024-Q2': [
        { name: '블루 록 2기', en: 'Blue Lock Season 2', type: 'op', year: '2024', quarter: 'Q2' },
        { name: '하이큐 파이널', en: 'Haikyuu Final', type: 'op', year: '2024', quarter: 'Q2' },
        { name: '귀멸의 칼날 주시옥편', en: 'Demon Slayer Hashira Training', type: 'op', year: '2024', quarter: 'Q2' },
    ],
    '2024-Q3': [
        { name: '체인소 맨 2기', en: 'Chainsaw Man Season 2', type: 'op', year: '2024', quarter: 'Q3' },
        { name: '나의 히어로 아카데미아 7기', en: 'My Hero Academia Season 7', type: 'op', year: '2024', quarter: 'Q3' },
        { name: '오버로드 5기', en: 'Overlord Season 5', type: 'op', year: '2024', quarter: 'Q3' },
    ],
    '2024-Q4': [
        { name: '진격의 거인 파이널', en: 'Attack on Titan Final', type: 'op', year: '2024', quarter: 'Q4' },
        { name: '주술회전 2기', en: 'Jujutsu Kaisen Season 2', type: 'op', year: '2024', quarter: 'Q4' },
        { name: '스파이 패밀리 3기', en: 'Spy x Family Season 3', type: 'ed', year: '2024', quarter: 'Q4' },
    ],
    '2025-Q1': [
        { name: '무직전생 3기', en: 'Mushoku Tensei Season 3', type: 'op', year: '2025', quarter: 'Q1' },
        { name: '단단한 용사', en: 'Brave Dan Dan', type: 'op', year: '2025', quarter: 'Q1' },
        { name: '바이올렛 에버가든 극장판', en: 'Violet Evergarden Movie', type: 'ed', year: '2025', quarter: 'Q1' },
    ],
    '2025-Q2': [
        { name: '귀멸의 칼날 무한성편', en: 'Demon Slayer Infinity Castle', type: 'op', year: '2025', quarter: 'Q2' },
        { name: '주술회전 3기', en: 'Jujutsu Kaisen Season 3', type: 'op', year: '2025', quarter: 'Q2' },
        { name: '프리렌 2기', en: 'Frieren Season 2', type: 'ed', year: '2025', quarter: 'Q2' },
        { name: '블루 록 vs U20', en: 'Blue Lock vs U20', type: 'op', year: '2025', quarter: 'Q2' },
    ],
}

const QUARTERS = [
    { id: '2025-Q2', label: '2025 2분기', badge: 'NOW' },
    { id: '2025-Q1', label: '2025 1분기', badge: '' },
    { id: '2024-Q4', label: '2024 4분기', badge: '' },
    { id: '2024-Q3', label: '2024 3분기', badge: '' },
    { id: '2024-Q2', label: '2024 2분기', badge: '' },
    { id: '2024-Q1', label: '2024 1분기', badge: '' },
]

const TYPE_TABS = [
    { id: 'all', label: '전체' },
    { id: 'op',  label: '오프닝' },
    { id: 'ed',  label: '엔딩' },
]

async function fetchOpTrack(anime: { name: string; en: string; type: 'op'|'ed'; year: string; quarter: string }): Promise<OpTrack | null> {
    try {
        const keyword = anime.type === 'op' ? 'opening theme' : 'ending theme'
        const lfRes = await fetch(
            `${LASTFM_BASE}/?method=track.search&track=${encodeURIComponent(anime.en + ' ' + keyword)}&api_key=${LASTFM_KEY}&format=json&limit=5`
        )
        const lfData = await lfRes.json()
        const trackList = lfData.results?.trackmatches?.track || []

        // iTunes로 커버 + 미리듣기
        const itRes = await fetch(
            `${ITUNES_BASE}?term=${encodeURIComponent(anime.en + ' ' + keyword)}&media=music&limit=3&country=JP`
        )
        const itData = await itRes.json()
        const item = itData.results?.[0]
        const lfTrack = trackList[0]

        if (!item && !lfTrack) return null

        return {
            id: `${anime.en}-${anime.type}`,
            title: item?.trackName || lfTrack?.name || `${anime.name} ${anime.type === 'op' ? 'Opening' : 'Ending'}`,
            artist: item?.artistName || lfTrack?.artist || 'Unknown',
            animeName: anime.name,
            cover: item?.artworkUrl100?.replace('100x100', '600x600') || '',
            previewUrl: item?.previewUrl || null,
            duration: item?.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 90,
            type: anime.type,
            year: anime.year,
            quarter: anime.quarter,
            voteCount: Math.floor(Math.random() * 8000) + 500, // 실제 서비스라면 Firebase에서 가져옴
        }
    } catch { return null }
}

const ft = (s: number) => s ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` : '1:30'

// ── 하단 플레이어 ─────────────────────────────────────────────
function BottomPlayer({ track, isPlaying, progress, volume, onPlayPause, onSeek, onPrev, onNext, onClose, onVolume }: any) {
    const barRef = useRef<HTMLDivElement>(null)
    const volRef = useRef<HTMLDivElement>(null)
    const elapsed = Math.floor((progress / 100) * (track.duration || 90))

    const handleSeek = (e: React.MouseEvent) => {
        if (!barRef.current) return
        const r = barRef.current.getBoundingClientRect()
        onSeek(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
    }
    const handleVol = (e: React.MouseEvent) => {
        if (!volRef.current) return
        const r = volRef.current.getBoundingClientRect()
        onVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
    }

    return (
        <>
            <style>{`
                .bp{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(12,11,22,.97);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.08);height:88px;display:flex;align-items:center;padding:0 24px;animation:bp-in .25s ease}
                @keyframes bp-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
                .bp-seekbar{position:absolute;top:-1px;left:0;right:0;height:4px;background:rgba(255,255,255,.08);cursor:pointer}
                .bp-seekbar:hover{height:6px;top:-3px}
                .bp-seekfill{height:100%;background:linear-gradient(to right,#f59e0b,#ef4444);position:relative;transition:width .2s linear}
                .bp-left{display:flex;align-items:center;gap:13px;width:300px;flex-shrink:0}
                .bp-cover{width:52px;height:52px;border-radius:8px;overflow:hidden;background:#1a1a1a;flex-shrink:0;position:relative}
                .bp-cover img{width:100%;height:100%;object-fit:cover}
                .bp-cover-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(135deg,#1a1535,#0f0f1a)}
                .bp-type-badge{position:absolute;top:4px;left:4px;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px;background:#f59e0b;color:#000}
                .bp-tinfo{min-width:0}
                .bp-tname{font-size:13px;font-weight:700;color:#fff;margin:0 0 2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .bp-tartist{font-size:11px;color:rgba(255,255,255,.4);margin:0 0 1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .bp-tanime{font-size:10px;color:rgba(255,255,255,.25);margin:0}
                .bp-center{flex:1;display:flex;flex-direction:column;align-items:center;gap:7px}
                .bp-btns{display:flex;align-items:center;gap:16px}
                .bp-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5);transition:color .2s;padding:0}
                .bp-btn:hover{color:#fff}
                .bp-play{width:40px;height:40px;border-radius:50%;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#111;transition:transform .15s}
                .bp-play:hover{transform:scale(1.07)}
                .bp-prog-row{display:flex;align-items:center;gap:10px;width:100%;max-width:480px}
                .bp-time{font-size:11px;color:rgba(255,255,255,.3);flex-shrink:0;width:34px}
                .bp-progbar{flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer}
                .bp-progbar:hover{height:5px}
                .bp-progfill{height:100%;background:#fff;border-radius:2px;transition:width .2s linear}
                .bp-progbar:hover .bp-progfill{background:#f59e0b}
                .bp-right{display:flex;align-items:center;gap:12px;width:200px;justify-content:flex-end;flex-shrink:0}
                .bp-vol-wrap{display:flex;align-items:center;gap:8px}
                .bp-volbar{width:72px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer}
                .bp-volbar:hover{height:5px}
                .bp-volfill{height:100%;background:rgba(255,255,255,.6);border-radius:2px}
                .bp-volbar:hover .bp-volfill{background:#f59e0b}
                .bp-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);transition:all .2s}
                .bp-close:hover{background:rgba(255,255,255,.13);color:#fff}
                .bp-eq{display:flex;align-items:flex-end;gap:2px;height:14px}
                .bp-eq span{display:block;width:3px;background:#f59e0b;border-radius:1px;animation:bp-bar .5s ease-in-out infinite alternate}
                .bp-eq span:nth-child(1){height:5px;animation-delay:0s}
                .bp-eq span:nth-child(2){height:12px;animation-delay:.15s}
                .bp-eq span:nth-child(3){height:8px;animation-delay:.3s}
                .bp-eq span:nth-child(4){height:14px;animation-delay:.08s}
                @keyframes bp-bar{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
            `}</style>
            <div className="bp">
                <div ref={barRef} className="bp-seekbar" onClick={handleSeek}>
                    <div className="bp-seekfill" style={{ width: `${progress}%` }}/>
                </div>
                <div className="bp-left">
                    <div className="bp-cover">
                        {track.cover ? <img src={track.cover} alt={track.title}/> : <div className="bp-cover-np">🎵</div>}
                        <span className="bp-type-badge">{track.type?.toUpperCase()}</span>
                    </div>
                    <div className="bp-tinfo">
                        <p className="bp-tname">{track.title}</p>
                        <p className="bp-tartist">{track.artist}</p>
                        <p className="bp-tanime">{track.animeName}</p>
                    </div>
                </div>
                <div className="bp-center">
                    <div className="bp-btns">
                        <button className="bp-btn" onClick={onPrev}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4"/><rect x="5" y="4" width="3" height="16"/></svg>
                        </button>
                        <button className="bp-play" onClick={onPlayPause}>
                            {isPlaying
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:2}}><polygon points="5,3 19,12 5,21"/></svg>
                            }
                        </button>
                        <button className="bp-btn" onClick={onNext}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="16" y="4" width="3" height="16"/></svg>
                        </button>
                    </div>
                    <div className="bp-prog-row">
                        <span className="bp-time">{ft(elapsed)}</span>
                        <div ref={barRef} className="bp-progbar" onClick={handleSeek}>
                            <div className="bp-progfill" style={{ width: `${progress}%` }}/>
                        </div>
                        <span className="bp-time" style={{textAlign:'right'}}>{ft(track.duration || 90)}</span>
                    </div>
                </div>
                <div className="bp-right">
                    {isPlaying && <div className="bp-eq"><span/><span/><span/><span/></div>}
                    <div className="bp-vol-wrap">
                        <button className="bp-btn" onClick={() => onVolume(volume === 0 ? 0.7 : 0)}>
                            {volume === 0
                                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            }
                        </button>
                        <div ref={volRef} className="bp-volbar" onClick={handleVol}>
                            <div className="bp-volfill" style={{ width: `${volume * 100}%` }}/>
                        </div>
                    </div>
                    <button className="bp-close" onClick={onClose}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        </>
    )
}

// ── 트랙 카드 ─────────────────────────────────────────────────
function TrackCard({ track, rank, isPlaying, onPlay, voted, onVote }: {
    track: OpTrack; rank: number; isPlaying: boolean
    onPlay: (t: OpTrack) => void; voted: boolean; onVote: (id: string) => void
}) {
    const [localVotes, setLocalVotes] = useState(track.voteCount)
    const [localVoted, setLocalVoted] = useState(voted)

    const handleVote = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (localVoted) return
        setLocalVoted(true)
        setLocalVotes(v => v + 1)
        onVote(track.id)
    }

    return (
        <>
            <style>{`
                .tc{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:12px;cursor:pointer;transition:all .18s;border:1px solid transparent;position:relative}
                .tc:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.07)}
                .tc.playing{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.2)}
                .tc-rank{font-size:18px;font-weight:900;color:rgba(255,255,255,.12);width:32px;text-align:center;flex-shrink:0;line-height:1}
                .tc-rank.top3{background:linear-gradient(135deg,#f59e0b,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
                .tc.playing .tc-rank{background:linear-gradient(135deg,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
                .tc-thumb{position:relative;width:60px;height:60px;border-radius:10px;overflow:hidden;background:#1a1a1a;flex-shrink:0}
                .tc-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .25s}
                .tc:hover .tc-thumb img{transform:scale(1.06)}
                .tc-thumb-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(135deg,#1a1535,#0f0f1a)}
                .tc-type{position:absolute;top:4px;right:4px;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px;background:#f59e0b;color:#000}
                .tc-type.ed{background:#a78bfa;color:#fff}
                .tc-play-ov{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;border-radius:10px}
                .tc:hover .tc-play-ov,.tc.playing .tc-play-ov{opacity:1}
                .tc-play-btn{width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}
                .tc-info{flex:1;min-width:0}
                .tc-title{font-size:14px;font-weight:700;color:rgba(255,255,255,.88);margin:0 0 3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .tc.playing .tc-title{color:#fbbf24}
                .tc-artist{font-size:12px;color:rgba(255,255,255,.4);margin:0 0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .tc-anime{font-size:11px;color:rgba(255,255,255,.22);margin:0}
                .tc-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
                .tc-vote{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:none;cursor:pointer;transition:all .2s;font-size:12px;font-weight:600;color:rgba(255,255,255,.45)}
                .tc-vote:hover{border-color:rgba(245,158,11,.4);color:#f59e0b;background:rgba(245,158,11,.08)}
                .tc-vote.voted{border-color:#f59e0b;color:#f59e0b;background:rgba(245,158,11,.1)}
                .tc-dur{font-size:11px;color:rgba(255,255,255,.22)}
                .tc-eq{display:flex;align-items:flex-end;gap:2px;height:14px}
                .tc-eq span{display:block;width:2px;background:#f59e0b;border-radius:1px;animation:tceq .5s ease-in-out infinite alternate}
                .tc-eq span:nth-child(1){height:4px;animation-delay:0s}
                .tc-eq span:nth-child(2){height:11px;animation-delay:.15s}
                .tc-eq span:nth-child(3){height:7px;animation-delay:.3s}
                @keyframes tceq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
            `}</style>
            <div className={`tc${isPlaying ? ' playing' : ''}`} onClick={() => onPlay(track)}>
                <span className={`tc-rank${rank <= 3 ? ' top3' : ''}`}>
                    {isPlaying ? <div className="tc-eq"><span/><span/><span/></div> : rank}
                </span>
                <div className="tc-thumb">
                    {track.cover ? <img src={track.cover} alt={track.title}/> : <div className="tc-thumb-np">🎵</div>}
                    <span className={`tc-type${track.type === 'ed' ? ' ed' : ''}`}>{track.type.toUpperCase()}</span>
                    <div className="tc-play-ov">
                        <div className="tc-play-btn">
                            {isPlaying
                                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#111"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                : <svg width="13" height="13" viewBox="0 0 24 24" fill="#111" style={{marginLeft:2}}><polygon points="5,3 19,12 5,21"/></svg>
                            }
                        </div>
                    </div>
                </div>
                <div className="tc-info">
                    <p className="tc-title">{track.title}</p>
                    <p className="tc-artist">{track.artist}</p>
                    <p className="tc-anime">{track.animeName}</p>
                </div>
                <div className="tc-right">
                    <button className={`tc-vote${localVoted ? ' voted' : ''}`} onClick={handleVote} title={localVoted ? '투표 완료' : '이 곡이 GOAT'}>
                        {localVoted ? '🏆' : '👑'} {localVotes.toLocaleString()}
                    </button>
                    <span className="tc-dur">{ft(track.duration)}</span>
                </div>
            </div>
        </>
    )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function OpPage() {
    const { aniList, onFetchAni } = useAniStore()
    const [tracks, setTracks] = useState<OpTrack[]>([])
    const [loading, setLoading] = useState(true)
    const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 })
    const [activeQuarter, setActiveQuarter] = useState('2025-Q2')
    const [typeTab, setTypeTab] = useState('all')
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [currentTrack, setCurrentTrack] = useState<OpTrack | null>(null)
    const [progress, setProgress] = useState(0)
    const [volume, setVolume] = useState(0.8)
    const [voted, setVoted] = useState<Set<string>>(new Set())
    const [playAll, setPlayAll] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tracksRef = useRef<OpTrack[]>([])
    const loadedQuarters = useRef<Set<string>>(new Set())

    useEffect(() => { tracksRef.current = filtered }, )
    useEffect(() => { if (aniList.length === 0) onFetchAni() }, [])
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

    const loadQuarter = useCallback(async (qid: string) => {
        if (loadedQuarters.current.has(qid)) return
        loadedQuarters.current.add(qid)
        const animes = SEASONAL_ANIME[qid] || []

        // 현재 분기면 TMDB 인기작도 추가
        const extra: typeof animes = []
        if (qid === '2025-Q2' && aniList.length > 0) {
            [...aniList].sort((a: any, b: any) => b.popularity - a.popularity).slice(0, 6).forEach((a: any) => {
                extra.push({ name: a.name, en: a.original_name || a.name, type: 'op', year: '2025', quarter: 'Q2' })
            })
        }

        const all = [...animes, ...extra.slice(0, 4)]
        setLoadProgress({ loaded: 0, total: all.length })
        for (let i = 0; i < all.length; i++) {
            const result = await fetchOpTrack(all[i])
            if (result) {
                setTracks(prev => prev.some(t => t.id === result.id) ? prev : [...prev, result])
            }
            setLoadProgress(p => ({ ...p, loaded: i + 1 }))
            await new Promise(r => setTimeout(r, 250))
        }
        setLoading(false)
    }, [aniList])

    useEffect(() => {
        setLoading(true)
        setTracks([])
        loadedQuarters.current.delete(activeQuarter)
        loadQuarter(activeQuarter)
    }, [activeQuarter, aniList])

    const stopAudio = useCallback(() => {
        audioRef.current?.pause()
        if (progressRef.current) clearInterval(progressRef.current)
        setPlayingId(null); setProgress(0)
    }, [])

    const startPlay = useCallback((track: OpTrack) => {
        if (!track.previewUrl) return
        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.pause()
        audioRef.current.src = track.previewUrl
        audioRef.current.volume = volume
        audioRef.current.play()
        setPlayingId(track.id); setCurrentTrack(track); setProgress(0)
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = setInterval(() => {
            if (!audioRef.current) return
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 90)) * 100)
        }, 200)
        audioRef.current.onended = () => {
            const list = tracksRef.current.filter(t => t.previewUrl)
            const idx = list.findIndex(t => t.id === track.id)
            if (playAll && idx < list.length - 1) startPlay(list[idx + 1])
            else stopAudio()
        }
    }, [stopAudio, volume, playAll])

    const handlePlay = useCallback((track: OpTrack) => {
        if (playingId === track.id) { stopAudio(); return }
        startPlay(track)
    }, [playingId, startPlay, stopAudio])

    const handlePrev = useCallback(() => {
        if (!currentTrack) return
        const list = tracksRef.current.filter(t => t.previewUrl)
        const idx = list.findIndex(t => t.id === currentTrack.id)
        if (idx > 0) startPlay(list[idx - 1])
    }, [currentTrack, startPlay])

    const handleNext = useCallback(() => {
        if (!currentTrack) return
        const list = tracksRef.current.filter(t => t.previewUrl)
        const idx = list.findIndex(t => t.id === currentTrack.id)
        if (idx < list.length - 1) startPlay(list[idx + 1])
    }, [currentTrack, startPlay])

    const handleSeek = useCallback((pct: number) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = (pct / 100) * (audioRef.current.duration || 90)
        setProgress(pct)
    }, [])

    const handlePlayAll = () => {
        const list = filtered.filter(t => t.previewUrl)
        if (list.length > 0) { setPlayAll(true); startPlay(list[0]) }
    }

    const quarterTracks = tracks.filter(t => `${t.year}-${t.quarter}` === activeQuarter)
    const filtered = quarterTracks.filter(t => typeTab === 'all' || t.type === typeTab)
        .sort((a, b) => b.voteCount - a.voteCount)

    // GOAT — 투표 1위
    const goat = filtered[0]
    const isCurrentQ = activeQuarter === '2025-Q2'

    return (
        <>
            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: currentTrack ? 96 : 0 }}>
                <style>{`
                    /* 히어로 */
                    .op-hero{width:100%;padding:48px 48px 0;background:linear-gradient(160deg,rgba(245,158,11,.1) 0%,rgba(239,68,68,.06) 40%,transparent 70%);box-sizing:border-box}
                    .op-hero-inner{max-width:1400px;margin:0 auto}
                    .op-eyebrow{font-size:11px;font-weight:800;color:#f59e0b;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px;display:flex;align-items:center;gap:6px}
                    .op-title{font-size:36px;font-weight:900;color:#fff;margin:0 0 6px;line-height:1.15}
                    .op-sub{font-size:14px;color:rgba(255,255,255,.4);margin:0 0 28px}

                    /* GOAT 배너 */
                    .goat-banner{position:relative;border-radius:16px;overflow:hidden;margin-bottom:32px;cursor:pointer;transition:transform .2s}
                    .goat-banner:hover{transform:translateY(-2px)}
                    .goat-bg{position:absolute;inset:0;background:linear-gradient(135deg,#1a1535,#0f0f2a)}
                    .goat-bg-img{position:absolute;inset:0;opacity:.25}
                    .goat-bg-img img{width:100%;height:100%;object-fit:cover;filter:blur(12px) saturate(1.5)}
                    .goat-dim{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,.85) 40%,rgba(0,0,0,.3) 100%)}
                    .goat-content{position:relative;z-index:1;display:flex;align-items:center;gap:24px;padding:28px 32px}
                    .goat-crown{font-size:32px;line-height:1}
                    .goat-info{flex:1;min-width:0}
                    .goat-label{font-size:11px;font-weight:800;color:#f59e0b;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px}
                    .goat-name{font-size:22px;font-weight:900;color:#fff;margin:0 0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                    .goat-anime{font-size:13px;color:rgba(255,255,255,.5);margin:0 0 10px}
                    .goat-votes{display:flex;align-items:center;gap:6px;font-size:13px;color:#fbbf24;font-weight:700}
                    .goat-thumb{width:80px;height:80px;border-radius:12px;overflow:hidden;background:#1a1a2e;flex-shrink:0;box-shadow:0 8px 24px rgba(0,0,0,.5)}
                    .goat-thumb img{width:100%;height:100%;object-fit:cover}
                    .goat-play-btn{display:flex;align-items:center;gap:8px;padding:10px 22px;background:#f59e0b;border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;transition:background .2s;flex-shrink:0}
                    .goat-play-btn:hover{background:#fbbf24}

                    /* 분기 탭 */
                    .quarter-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
                    .q-tab{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:none;color:rgba(255,255,255,.45);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
                    .q-tab:hover{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.8)}
                    .q-tab.active{background:rgba(245,158,11,.15);border-color:#f59e0b;color:#fbbf24}
                    .q-now{font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:#f59e0b;color:#000}

                    /* 툴바 */
                    .op-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:20px}
                    .type-tabs{display:flex;gap:4px}
                    .type-tab{padding:7px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:none;color:rgba(255,255,255,.45);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
                    .type-tab:hover{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.8)}
                    .type-tab.active{background:rgba(245,158,11,.15);border-color:#f59e0b;color:#fbbf24}
                    .play-all-btn{display:flex;align-items:center;gap:7px;padding:8px 20px;border-radius:8px;background:#f59e0b;border:none;color:#000;font-size:13px;font-weight:800;cursor:pointer;transition:background .2s;margin-left:auto}
                    .play-all-btn:hover{background:#fbbf24}
                    .op-count{font-size:12px;color:rgba(255,255,255,.25);margin-left:4px}

                    /* 로딩 바 */
                    .op-loading{display:flex;align-items:center;gap:12px;margin-bottom:16px;font-size:12px;color:rgba(255,255,255,.3)}
                    .op-loading-bar{flex:1;height:3px;background:rgba(255,255,255,.07);border-radius:2px;max-width:300px}
                    .op-loading-fill{height:100%;background:linear-gradient(to right,#f59e0b,#ef4444);border-radius:2px;transition:width .4s ease}

                    /* 랭킹 리스트 */
                    .op-list{display:flex;flex-direction:column;gap:4px}
                    .op-body{max-width:1400px;margin:0 auto;padding:0 48px 60px}
                    .op-rank-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
                    .op-rank-title{font-size:18px;font-weight:800;color:#fff;margin:0;display:flex;align-items:center;gap:8px}
                    .op-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 0;gap:12px;color:rgba(255,255,255,.2)}

                    /* 스켈레톤 */
                    .sk-row{display:flex;align-items:center;gap:14px;padding:12px 16px}
                    .sk-num{width:32px;height:18px;border-radius:4px;background:rgba(255,255,255,.06);flex-shrink:0}
                    .sk-thumb{width:60px;height:60px;border-radius:10px;background:rgba(255,255,255,.06);flex-shrink:0}
                    .sk-info{flex:1;display:flex;flex-direction:column;gap:6px}
                    .sk-line{height:12px;border-radius:4px;background:rgba(255,255,255,.06)}
                    .sk-vote{width:80px;height:28px;border-radius:14px;background:rgba(255,255,255,.06)}
                `}</style>

                {/* 히어로 */}
                <div className="op-hero">
                    <div className="op-hero-inner">
                        <p className="op-eyebrow">🏆 OP 감상 모드</p>
                        <h1 className="op-title">이번 분기 GOAT OP는?</h1>
                        <p className="op-sub">오프닝·엔딩 미리듣기 + 팬 투표로 뽑는 분기별 최강 OP</p>

                        {/* GOAT 배너 */}
                        {goat && (
                            <div className="goat-banner" onClick={() => handlePlay(goat)}>
                                <div className="goat-bg"/>
                                {goat.cover && (
                                    <div className="goat-bg-img"><img src={goat.cover} alt=""/></div>
                                )}
                                <div className="goat-dim"/>
                                <div className="goat-content">
                                    <div className="goat-crown">🏆</div>
                                    <div className="goat-info">
                                        <p className="goat-label">{activeQuarter.replace('-', ' ')} · GOAT {goat.type.toUpperCase()}</p>
                                        <p className="goat-name">{goat.title}</p>
                                        <p className="goat-anime">{goat.animeName} · {goat.artist}</p>
                                        <div className="goat-votes">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                            {goat.voteCount.toLocaleString()}표
                                        </div>
                                    </div>
                                    {goat.cover && (
                                        <div className="goat-thumb"><img src={goat.cover} alt={goat.title}/></div>
                                    )}
                                    <button className="goat-play-btn" onClick={e => { e.stopPropagation(); handlePlay(goat) }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                        재생
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 분기 탭 */}
                        <div className="quarter-tabs">
                            {QUARTERS.map(q => (
                                <button key={q.id} className={`q-tab${activeQuarter === q.id ? ' active' : ''}`}
                                    onClick={() => setActiveQuarter(q.id)}>
                                    {q.badge && <span className="q-now">{q.badge}</span>}
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="op-body">
                    {/* 로딩 바 */}
                    {loading && loadProgress.total > 0 && (
                        <div className="op-loading">
                            <div className="op-loading-bar">
                                <div className="op-loading-fill" style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}/>
                            </div>
                            <span>{loadProgress.loaded}/{loadProgress.total} 불러오는 중...</span>
                        </div>
                    )}

                    {/* 툴바 */}
                    <div className="op-toolbar">
                        <div className="type-tabs">
                            {TYPE_TABS.map(t => (
                                <button key={t.id} className={`type-tab${typeTab === t.id ? ' active' : ''}`}
                                    onClick={() => setTypeTab(t.id)}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <span className="op-count">{filtered.length}곡</span>
                        <button className="play-all-btn" onClick={handlePlayAll}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                            전체 재생
                        </button>
                    </div>

                    {/* 랭킹 */}
                    <div className="op-rank-header">
                        <h2 className="op-rank-title">
                            🏅 {activeQuarter.replace('-', ' ')} 랭킹
                            {isCurrentQ && <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(245,158,11,.2)' }}>투표 진행중</span>}
                        </h2>
                    </div>

                    {loading && filtered.length === 0 ? (
                        <div className="op-list">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="sk-row">
                                    <div className="sk-num"/>
                                    <div className="sk-thumb"/>
                                    <div className="sk-info">
                                        <div className="sk-line" style={{ width: '55%' }}/>
                                        <div className="sk-line" style={{ width: '35%' }}/>
                                    </div>
                                    <div className="sk-vote"/>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="op-empty">
                            <span style={{ fontSize: 36 }}>🎵</span>
                            <p>데이터를 불러오는 중이에요</p>
                        </div>
                    ) : (
                        <div className="op-list">
                            {filtered.map((track, i) => (
                                <TrackCard
                                    key={track.id}
                                    track={track}
                                    rank={i + 1}
                                    isPlaying={playingId === track.id}
                                    onPlay={handlePlay}
                                    voted={voted.has(track.id)}
                                    onVote={id => setVoted(prev => new Set([...prev, id]))}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {currentTrack && (
                <BottomPlayer
                    track={currentTrack}
                    isPlaying={playingId === currentTrack.id}
                    progress={progress} volume={volume}
                    onPlayPause={() => playingId === currentTrack.id ? stopAudio() : startPlay(currentTrack)}
                    onSeek={handleSeek} onPrev={handlePrev} onNext={handleNext}
                    onVolume={setVolume}
                    onClose={() => { stopAudio(); setCurrentTrack(null) }}
                />
            )}
        </>
    )
}
