'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAniStore } from '@/store/useAniStore'

const LASTFM_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const ITUNES_BASE = 'https://itunes.apple.com/search'
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

interface OstTrack {
    id: string
    title: string
    artist: string
    animeName: string
    cover: string
    previewUrl: string | null
    duration: number
}

const KO_TO_EN: Record<string, string> = {
    '진격의 거인': 'Attack on Titan', '귀멸의 칼날': 'Demon Slayer',
    '주술회전': 'Jujutsu Kaisen', '나의 히어로 아카데미아': 'My Hero Academia',
    '원피스': 'One Piece', '블리치': 'Bleach', '스파이 패밀리': 'Spy x Family',
    '체인소 맨': 'Chainsaw Man', '던전밥': 'Delicious in Dungeon',
    '무직전생': 'Mushoku Tensei', '소드 아트 온라인': 'Sword Art Online',
    '에반게리온': 'Neon Genesis Evangelion', '나루토': 'Naruto',
    '원펀맨': 'One Punch Man', '헌터x헌터': 'Hunter x Hunter',
    '코드 기어스': 'Code Geass', '하이큐': 'Haikyuu', '도쿄구울': 'Tokyo Ghoul',
    '약사의 혼잣말': 'The Apothecary Diaries', '장송의 프리렌': 'Frieren Beyond Journey End',
    '풀메탈': 'Fullmetal Alchemist Brotherhood', '카우보이 비밥': 'Cowboy Bebop',
    '바이올렛 에버가든': 'Violet Evergarden', '귀멸': 'Demon Slayer',
    '진격': 'Attack on Titan', '프리렌': 'Frieren', '주술': 'Jujutsu Kaisen',
}

const POPULAR_ANIME = [
    'Attack on Titan', 'Demon Slayer Kimetsu no Yaiba', 'Jujutsu Kaisen',
    'Spy x Family', 'Bleach', 'Frieren Beyond Journey End',
    'Mushoku Tensei', 'Re:Zero', 'Violet Evergarden',
    'Fullmetal Alchemist Brotherhood', 'One Punch Man', 'Chainsaw Man',
    'Hunter x Hunter', 'Code Geass', 'Cowboy Bebop',
]

async function fetchOstForAnime(animeName: string): Promise<OstTrack[]> {
    try {
        const lfRes = await fetch(
            `${LASTFM_BASE}/?method=album.search&album=${encodeURIComponent(animeName + ' ost')}&api_key=${LASTFM_KEY}&format=json&limit=5`
        )
        const lfData = await lfRes.json()
        const albums = lfData.results?.albummatches?.album || []
        if (albums.length === 0) return []

        // 첫번째 앨범 시도, 트랙 없으면 두번째 시도
        let tracks: any[] = []
        let usedAlbum = albums[0]
        for (const album of albums.slice(0, 3)) {
            const trackRes = await fetch(
                `${LASTFM_BASE}/?method=album.getinfo&artist=${encodeURIComponent(album.artist)}&album=${encodeURIComponent(album.name)}&api_key=${LASTFM_KEY}&format=json`
            )
            const trackData = await trackRes.json()
            tracks = trackData.album?.tracks?.track || []
            if (tracks.length > 0) { usedAlbum = album; break }
        }
        if (tracks.length === 0) return []

        const results: OstTrack[] = []
        for (const track of tracks.slice(0, 8)) {
            const trackName = typeof track === 'string' ? track : track.name
            try {
                const itRes = await fetch(
                    `${ITUNES_BASE}?term=${encodeURIComponent(trackName + ' ' + animeName)}&media=music&limit=1&country=JP`
                )
                const itData = await itRes.json()
                const item = itData.results?.[0]
                results.push({
                    id: `${animeName}-${trackName}`,
                    title: trackName,
                    artist: typeof track === 'string' ? usedAlbum.artist : (track.artist?.name || usedAlbum.artist),
                    animeName,
                    cover: item?.artworkUrl100?.replace('100x100', '400x400') || usedAlbum.image?.[3]?.['#text'] || '',
                    previewUrl: item?.previewUrl || null,
                    duration: item?.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
                })
            } catch { /* skip */ }
        }
        return results
    } catch { return [] }
}

function formatTime(sec: number) {
    if (!sec) return '0:30'
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
}

// ── 앨범 팝업 ────────────────────────────────────────────────
function AlbumPopup({ animeName, tracks, playingId, onPlay, onClose }: {
    animeName: string
    tracks: OstTrack[]
    playingId: string | null
    onPlay: (track: OstTrack) => void
    onClose: () => void
}) {
    const coverUrl = tracks.find(t => t.cover)?.cover || ''
    return (
        <>
            <style>{`
                .ap-overlay {
                    position: fixed; inset: 0; z-index: 8000;
                    background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center;
                    animation: ap-fade .2s ease;
                }
                @keyframes ap-fade { from { opacity:0 } to { opacity:1 } }
                .ap-box {
                    width: 560px; max-height: 80vh;
                    background: #141420; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 32px 80px rgba(0,0,0,0.8);
                    overflow: hidden;
                    animation: ap-up .25s ease;
                    display: flex; flex-direction: column;
                }
                @keyframes ap-up { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
                .ap-header {
                    display: flex; align-items: center; gap: 16px;
                    padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.07);
                    flex-shrink: 0;
                }
                .ap-cover {
                    width: 72px; height: 72px; border-radius: 12px;
                    overflow: hidden; background: #1a1a2e; flex-shrink: 0;
                }
                .ap-cover img { width:100%; height:100%; object-fit:cover; }
                .ap-cover-np { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:28px; background:linear-gradient(135deg,#1a1535,#0f0f1a); }
                .ap-hinfo { flex:1; min-width:0; }
                .ap-hname { font-size:18px; font-weight:800; color:#fff; margin:0 0 4px; }
                .ap-hsub { font-size:13px; color:rgba(255,255,255,0.4); margin:0; }
                .ap-close { width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.08); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.5); transition:all .2s; flex-shrink:0; }
                .ap-close:hover { background:rgba(255,255,255,0.15); color:#fff; }
                .ap-list { overflow-y: auto; flex:1; padding: 8px 0 16px; }
                .ap-track {
                    display:flex; align-items:center; gap:12px;
                    padding:10px 24px; cursor:pointer; transition:background .15s;
                    border:1px solid transparent; margin:0 8px; border-radius:8px;
                }
                .ap-track:hover { background:rgba(255,255,255,0.05); }
                .ap-track.playing { background:rgba(108,99,255,0.12); border-color:rgba(108,99,255,0.2); }
                .ap-track.no-preview { opacity:0.35; cursor:default; }
                .ap-tnum { font-size:13px; color:rgba(255,255,255,0.25); width:20px; text-align:center; flex-shrink:0; }
                .ap-track.playing .ap-tnum { color:#6c63ff; }
                .ap-tcover { width:40px; height:40px; border-radius:6px; overflow:hidden; background:#1a1a1a; flex-shrink:0; }
                .ap-tcover img { width:100%; height:100%; object-fit:cover; }
                .ap-tcover-np { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:16px; background:linear-gradient(135deg,#1a1535,#0f0f1a); }
                .ap-tinfo { flex:1; min-width:0; }
                .ap-tname { font-size:13px; font-weight:600; color:rgba(255,255,255,0.85); margin:0 0 2px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
                .ap-track.playing .ap-tname { color:#9d97ff; }
                .ap-tartist { font-size:11px; color:rgba(255,255,255,0.3); margin:0; }
                .ap-tdur { font-size:12px; color:rgba(255,255,255,0.25); flex-shrink:0; }
                .ap-bar { display:flex; align-items:flex-end; gap:2px; height:14px; }
                .ap-bar span { display:block; width:2px; background:#6c63ff; border-radius:1px; animation:bb .5s ease-in-out infinite alternate; }
                .ap-bar span:nth-child(1){height:5px;animation-delay:0s}
                .ap-bar span:nth-child(2){height:12px;animation-delay:.15s}
                .ap-bar span:nth-child(3){height:8px;animation-delay:.3s}
                @keyframes bb{from{transform:scaleY(.4)}to{transform:scaleY(1)}}
            `}</style>
            <div className="ap-overlay" onClick={onClose}>
                <div className="ap-box" onClick={e => e.stopPropagation()}>
                    <div className="ap-header">
                        <div className="ap-cover">
                            {coverUrl ? <img src={coverUrl} alt={animeName} /> : <div className="ap-cover-np">🎵</div>}
                        </div>
                        <div className="ap-hinfo">
                            <p className="ap-hname">{animeName}</p>
                            <p className="ap-hsub">{tracks.length}곡 · OST</p>
                        </div>
                        <button className="ap-close" onClick={onClose}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    <div className="ap-list">
                        {tracks.map((track, i) => (
                            <div
                                key={track.id}
                                className={`ap-track${playingId === track.id ? ' playing' : ''}${!track.previewUrl ? ' no-preview' : ''}`}
                                onClick={() => track.previewUrl && onPlay(track)}
                            >
                                <span className="ap-tnum">
                                    {playingId === track.id
                                        ? <div className="ap-bar"><span/><span/><span/></div>
                                        : i + 1}
                                </span>
                                <div className="ap-tcover">
                                    {track.cover ? <img src={track.cover} alt={track.title}/> : <div className="ap-tcover-np">🎵</div>}
                                </div>
                                <div className="ap-tinfo">
                                    <p className="ap-tname">{track.title}</p>
                                    <p className="ap-tartist">{track.artist}</p>
                                </div>
                                <span className="ap-tdur">{formatTime(track.duration)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

// ── 하단 플레이어 ────────────────────────────────────────────
function BottomPlayer({ track, allTracks, isPlaying, progress, onPlayPause, onSeek, onPrev, onNext, onClose }: {
    track: OstTrack
    allTracks: OstTrack[]
    isPlaying: boolean
    progress: number
    onPlayPause: () => void
    onSeek: (pct: number) => void
    onPrev: () => void
    onNext: () => void
    onClose: () => void
}) {
    const barRef = useRef<HTMLDivElement>(null)

    const handleBarClick = (e: React.MouseEvent) => {
        if (!barRef.current) return
        const rect = barRef.current.getBoundingClientRect()
        const pct = ((e.clientX - rect.left) / rect.width) * 100
        onSeek(Math.max(0, Math.min(100, pct)))
    }

    const elapsed = Math.floor((progress / 100) * (track.duration || 30))

    return (
        <>
            <style>{`
                .bp-wrap {
                    position: fixed; bottom:0; left:0; right:0; z-index:9999;
                    background: rgba(14,12,26,0.97);
                    backdrop-filter: blur(24px);
                    border-top: 1px solid rgba(255,255,255,0.08);
                    padding: 0 32px;
                    height: 80px;
                    display: flex; align-items: center; gap: 20px;
                    animation: bp-up .25s ease;
                }
                @keyframes bp-up { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
                .bp-progress-bar-wrap {
                    position: absolute; top:0; left:0; right:0; height:4px;
                    background: rgba(255,255,255,0.08);
                    cursor: pointer;
                }
                .bp-progress-bar-wrap:hover { height: 6px; }
                .bp-progress-fill {
                    height: 100%;
                    background: linear-gradient(to right, #6c63ff, #ec4899);
                    border-radius: 0 2px 2px 0;
                    transition: width .2s linear;
                    pointer-events: none;
                }
                .bp-cover { width:48px; height:48px; border-radius:8px; overflow:hidden; background:#1a1a1a; flex-shrink:0; }
                .bp-cover img { width:100%; height:100%; object-fit:cover; }
                .bp-cover-np { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:20px; background:linear-gradient(135deg,#1a1535,#0f0f1a); }
                .bp-info { flex:1; min-width:0; }
                .bp-title { font-size:14px; font-weight:700; color:#fff; margin:0 0 3px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
                .bp-sub { font-size:12px; color:rgba(255,255,255,0.4); margin:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
                .bp-controls { display:flex; align-items:center; gap:12px; flex-shrink:0; }
                .bp-icon-btn {
                    width:36px; height:36px; border-radius:50%;
                    background:rgba(255,255,255,0.08); border:none; cursor:pointer;
                    display:flex; align-items:center; justify-content:center;
                    color:rgba(255,255,255,0.6); transition:all .2s;
                }
                .bp-icon-btn:hover { background:rgba(255,255,255,0.16); color:#fff; }
                .bp-play-btn {
                    width:44px; height:44px; border-radius:50%;
                    background:#6c63ff; border:none; cursor:pointer;
                    display:flex; align-items:center; justify-content:center;
                    color:#fff; transition:background .2s, transform .15s;
                }
                .bp-play-btn:hover { background:#5a52e0; transform:scale(1.05); }
                .bp-time { font-size:12px; color:rgba(255,255,255,0.3); flex-shrink:0; min-width:80px; text-align:center; }
                .bp-close-btn {
                    width:30px; height:30px; border-radius:50%;
                    background:rgba(255,255,255,0.06); border:none; cursor:pointer;
                    display:flex; align-items:center; justify-content:center;
                    color:rgba(255,255,255,0.3); transition:all .2s;
                }
                .bp-close-btn:hover { background:rgba(255,255,255,0.12); color:#fff; }
                .bp-eq { display:flex; align-items:flex-end; gap:2px; height:16px; }
                .bp-eq span { display:block; width:3px; background:#fff; border-radius:1px; animation:bar-b .5s ease-in-out infinite alternate; }
                .bp-eq span:nth-child(1){height:5px;animation-delay:0s}
                .bp-eq span:nth-child(2){height:13px;animation-delay:.15s}
                .bp-eq span:nth-child(3){height:9px;animation-delay:.3s}
                .bp-eq span:nth-child(4){height:15px;animation-delay:.1s}
                @keyframes bar-b{from{transform:scaleY(.4)}to{transform:scaleY(1)}}
            `}</style>
            <div className="bp-wrap">
                <div ref={barRef} className="bp-progress-bar-wrap" onClick={handleBarClick}>
                    <div className="bp-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="bp-cover">
                    {track.cover ? <img src={track.cover} alt={track.title}/> : <div className="bp-cover-np">🎵</div>}
                </div>
                <div className="bp-info">
                    <p className="bp-title">{track.title}</p>
                    <p className="bp-sub">{track.animeName} · {track.artist}</p>
                </div>
                <div className="bp-controls">
                    {isPlaying && <div className="bp-eq"><span/><span/><span/><span/></div>}
                    <span className="bp-time">{formatTime(elapsed)} / {formatTime(track.duration || 30)}</span>
                    <button className="bp-icon-btn" onClick={onPrev} title="이전곡">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                    <button className="bp-play-btn" onClick={onPlayPause}>
                        {isPlaying
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                        }
                    </button>
                    <button className="bp-icon-btn" onClick={onNext} title="다음곡">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                    <button className="bp-close-btn" onClick={onClose}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        </>
    )
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function OstPage() {
    const { aniList, onFetchAni } = useAniStore()
    const [tracks, setTracks] = useState<OstTrack[]>([])
    const [loading, setLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [currentTrack, setCurrentTrack] = useState<OstTrack | null>(null)
    const [progress, setProgress] = useState(0)
    const [search, setSearch] = useState('')
    const [popup, setPopup] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const tracksRef = useRef<OstTrack[]>([])

    useEffect(() => { tracksRef.current = tracks }, [tracks])

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const animeNames = aniList.length > 0
                ? [...aniList].sort((a: any, b: any) => b.popularity - a.popularity)
                    .slice(0, 15).map((a: any) => a.original_name || a.name)
                : POPULAR_ANIME.slice(0, 12)

            for (const name of animeNames) {
                const result = await fetchOstForAnime(name)
                if (result.length > 0) {
                    setTracks(prev => {
                        const exists = new Set(prev.map(t => t.animeName))
                        if (exists.has(result[0].animeName)) return prev
                        return [...prev, ...result]
                    })
                }
                await new Promise(r => setTimeout(r, 300)) // 레이트리밋 방지
            }
            setLoading(false)
        }
        load()
    }, [aniList])

    // 검색
    useEffect(() => {
        if (!search.trim()) return
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(async () => {
            setSearching(true)
            const query = KO_TO_EN[search.trim()] ||
                Object.entries(KO_TO_EN).find(([k]) => search.includes(k))?.[1] ||
                search.trim()
            const result = await fetchOstForAnime(query)
            if (result.length > 0) {
                setTracks(prev => {
                    const exists = new Set(prev.map(t => t.animeName))
                    if (exists.has(result[0].animeName)) return prev
                    return [...result, ...prev]
                })
            }
            setSearching(false)
        }, 600)
    }, [search])

    const stopAudio = useCallback(() => {
        audioRef.current?.pause()
        if (progressRef.current) clearInterval(progressRef.current)
        setPlayingId(null)
        setProgress(0)
    }, [])

    const startPlay = useCallback((track: OstTrack) => {
        if (!track.previewUrl) return
        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.pause()
        audioRef.current.src = track.previewUrl
        audioRef.current.play()
        setPlayingId(track.id)
        setCurrentTrack(track)
        setProgress(0)
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = setInterval(() => {
            if (!audioRef.current) return
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 30)) * 100)
        }, 200)
        audioRef.current.onended = () => {
            // 자동 다음곡
            const all = tracksRef.current.filter(t => t.previewUrl)
            const idx = all.findIndex(t => t.id === track.id)
            if (idx < all.length - 1) startPlay(all[idx + 1])
            else stopAudio()
        }
    }, [stopAudio])

    const handlePlay = useCallback((track: OstTrack) => {
        if (playingId === track.id) { stopAudio(); return }
        startPlay(track)
    }, [playingId, startPlay, stopAudio])

    const handleSeek = useCallback((pct: number) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = (pct / 100) * (audioRef.current.duration || 30)
        setProgress(pct)
    }, [])

    const handlePrev = useCallback(() => {
        if (!currentTrack) return
        const all = tracksRef.current.filter(t => t.previewUrl)
        const idx = all.findIndex(t => t.id === currentTrack.id)
        if (idx > 0) startPlay(all[idx - 1])
    }, [currentTrack, startPlay])

    const handleNext = useCallback(() => {
        if (!currentTrack) return
        const all = tracksRef.current.filter(t => t.previewUrl)
        const idx = all.findIndex(t => t.id === currentTrack.id)
        if (idx < all.length - 1) startPlay(all[idx + 1])
    }, [currentTrack, startPlay])

    const animeGroups = Array.from(new Set(tracks.map(t => t.animeName)))
    const popupTracks = popup ? tracks.filter(t => t.animeName === popup) : []

    return (
        <>
            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: currentTrack ? 100 : 0 }}>
                <style>{`
                    .ostp-hero {
                        width: 100%;
                        padding: 60px 48px 40px;
                        background: linear-gradient(to bottom, rgba(108,99,255,0.1) 0%, transparent 100%);
                        box-sizing: border-box;
                    }
                    .ostp-hero-inner { max-width: 1400px; margin: 0 auto; }
                    .ostp-hero-title { font-size: 40px; font-weight: 900; color: #fff; margin: 0 0 8px; }
                    .ostp-hero-sub { font-size: 15px; color: rgba(255,255,255,0.4); margin: 0 0 28px; }
                    .ostp-search-wrap { position: relative; max-width: 480px; }
                    .ostp-search {
                        width: 100%; height: 48px;
                        background: rgba(255,255,255,0.07);
                        border: 1px solid rgba(255,255,255,0.12);
                        border-radius: 12px; color: #fff;
                        font-size: 15px; padding: 0 48px 0 44px;
                        outline: none; transition: border-color .2s;
                        box-sizing: border-box;
                    }
                    .ostp-search:focus { border-color: #6c63ff; background: rgba(108,99,255,0.08); }
                    .ostp-search::placeholder { color: rgba(255,255,255,0.25); }
                    .ostp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); pointer-events: none; }
                    .ostp-search-spin { position: absolute; right: 14px; top: 50%; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #6c63ff; border-radius: 50%; animation: spin .7s linear infinite; transform: translateY(-50%); }
                    @keyframes spin { to { transform: translateY(-50%) rotate(360deg) } }
                    .ostp-hint { font-size: 12px; color: rgba(255,255,255,0.2); margin: 8px 0 0; }
                    .ostp-body { max-width: 1400px; margin: 0 auto; padding: 0 48px 60px; }
                    .ostp-section { margin-bottom: 36px; }
                    .ostp-section-title {
                        font-size: 17px; font-weight: 800; color: rgba(255,255,255,0.9);
                        margin: 0 0 12px; display: flex; align-items: center; gap: 10px;
                        cursor: pointer; width: fit-content;
                    }
                    .ostp-section-title:hover { color: #fff; }
                    .ostp-section-title:hover .ostp-title-arrow { opacity: 1; }
                    .ostp-title-arrow { opacity: 0; transition: opacity .2s; color: #6c63ff; }
                    .ostp-divider { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
                    .ostp-list { display: flex; flex-direction: column; gap: 2px; }
                    .ostp-track {
                        display: flex; align-items: center; gap: 14px;
                        padding: 10px 14px; border-radius: 10px; cursor: pointer;
                        transition: background .15s; border: 1px solid transparent;
                    }
                    .ostp-track:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.07); }
                    .ostp-track.playing { background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.2); }
                    .ostp-track.no-preview { opacity: 0.35; cursor: default; }
                    .ostp-num { font-size: 13px; color: rgba(255,255,255,0.25); width: 22px; text-align: center; flex-shrink: 0; }
                    .ostp-track.playing .ostp-num { color: #6c63ff; }
                    .ostp-thumb { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; background: #1a1a1a; flex-shrink: 0; }
                    .ostp-thumb img { width: 100%; height: 100%; object-fit: cover; }
                    .ostp-thumb-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; background: linear-gradient(135deg,#1a1535,#0f0f1a); }
                    .ostp-info { flex: 1; min-width: 0; }
                    .ostp-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                    .ostp-track.playing .ostp-name { color: #9d97ff; }
                    .ostp-artist { font-size: 12px; color: rgba(255,255,255,0.3); margin: 0; }
                    .ostp-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                    .ostp-dur { font-size: 12px; color: rgba(255,255,255,0.25); width: 36px; text-align: right; }
                    .ostp-sbar { display: flex; align-items: flex-end; gap: 2px; height: 14px; }
                    .ostp-sbar span { display: block; width: 2px; background: #6c63ff; border-radius: 1px; animation: bb .5s ease-in-out infinite alternate; }
                    .ostp-sbar span:nth-child(1){height:5px;animation-delay:0s}
                    .ostp-sbar span:nth-child(2){height:12px;animation-delay:.15s}
                    .ostp-sbar span:nth-child(3){height:8px;animation-delay:.3s}
                    @keyframes bb{from{transform:scaleY(.4)}to{transform:scaleY(1)}}
                    .ostp-loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; gap: 14px; color: rgba(255,255,255,0.25); font-size: 14px; }
                    .ostp-spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.08); border-top-color: #6c63ff; border-radius: 50%; animation: spin2 .7s linear infinite; }
                    @keyframes spin2 { to { transform: rotate(360deg) } }
                    .ostp-more-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.2); border-radius: 8px; color: #9d97ff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .2s; margin-top: 6px; }
                    .ostp-more-btn:hover { background: rgba(108,99,255,0.2); }
                `}</style>

                {/* 히어로 — 100% width 그라디언트 */}
                <div className="ostp-hero">
                    <div className="ostp-hero-inner">
                        <h1 className="ostp-hero-title">🎵 애니 OST</h1>
                        <p className="ostp-hero-sub">인기 애니메이션 OST를 30초 미리 들어보세요</p>
                        <div className="ostp-search-wrap">
                            <svg className="ostp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                            <input
                                className="ostp-search"
                                placeholder="애니 제목 검색 (한국어/영어 모두 가능)"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {searching && <div className="ostp-search-spin" />}
                        </div>
                        <p className="ostp-hint">예: 진격의 거인, 귀멸의 칼날, Attack on Titan, Frieren</p>
                    </div>
                </div>

                <div className="ostp-body">
                    {loading && tracks.length === 0 ? (
                        <div className="ostp-loading-wrap">
                            <div className="ostp-spinner" />
                            OST 불러오는 중...
                        </div>
                    ) : (
                        <>
                            {animeGroups.map(animeName => {
                                const animeTracks = tracks.filter(t => t.animeName === animeName)
                                const preview = animeTracks.slice(0, 4)
                                const hasMore = animeTracks.length > 4
                                return (
                                    <div key={animeName} className="ostp-section">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <h2
                                                className="ostp-section-title"
                                                onClick={() => setPopup(animeName)}
                                            >
                                                {animeName}
                                                <span className="ostp-title-arrow">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                                </span>
                                            </h2>
                                            <div className="ostp-divider" />
                                        </div>
                                        <div className="ostp-list">
                                            {preview.map((track, i) => (
                                                <div
                                                    key={track.id}
                                                    className={`ostp-track${playingId === track.id ? ' playing' : ''}${!track.previewUrl ? ' no-preview' : ''}`}
                                                    onClick={() => handlePlay(track)}
                                                >
                                                    <span className="ostp-num">
                                                        {playingId === track.id
                                                            ? <div className="ostp-sbar"><span/><span/><span/></div>
                                                            : i + 1}
                                                    </span>
                                                    <div className="ostp-thumb">
                                                        {track.cover ? <img src={track.cover} alt={track.title}/> : <div className="ostp-thumb-np">🎵</div>}
                                                    </div>
                                                    <div className="ostp-info">
                                                        <p className="ostp-name">{track.title}</p>
                                                        <p className="ostp-artist">{track.artist}</p>
                                                    </div>
                                                    <div className="ostp-right">
                                                        <span className="ostp-dur">{formatTime(track.duration)}</span>
                                                        {playingId === track.id
                                                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.25)"><polygon points="5,3 19,12 5,21"/></svg>
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {hasMore && (
                                            <button className="ostp-more-btn" onClick={() => setPopup(animeName)}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                {animeTracks.length - 4}곡 더보기
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                            {loading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin2 .7s linear infinite', flexShrink: 0 }} />
                                    더 불러오는 중...
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 앨범 팝업 */}
            {popup && (
                <AlbumPopup
                    animeName={popup}
                    tracks={popupTracks}
                    playingId={playingId}
                    onPlay={handlePlay}
                    onClose={() => setPopup(null)}
                />
            )}

            {/* 하단 플레이어 */}
            {currentTrack && (
                <BottomPlayer
                    track={currentTrack}
                    allTracks={tracks}
                    isPlaying={playingId === currentTrack.id}
                    progress={progress}
                    onPlayPause={() => handlePlay(currentTrack)}
                    onSeek={handleSeek}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onClose={() => { stopAudio(); setCurrentTrack(null) }}
                />
            )}
        </>
    )
}
