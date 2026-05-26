'use client'
import { useEffect, useRef, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'

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

async function fetchOstForAnime(animeName: string): Promise<OstTrack[]> {
    try {
        const lfRes = await fetch(
            `${LASTFM_BASE}/?method=album.search&album=${encodeURIComponent(animeName + ' ost')}&api_key=${LASTFM_KEY}&format=json&limit=5`
        )
        const lfData = await lfRes.json()
        const albums = lfData.results?.albummatches?.album || []
        if (albums.length === 0) return []

        let usedAlbum = albums[0]
        let tracks: any[] = []
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
        for (const track of tracks.slice(0, 4)) {
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


function OstCard({ track, isPlaying, onPlay }: {
    track: OstTrack
    isPlaying: boolean
    onPlay: (url: string | null, id: string) => void
}) {
    return (
        <>
            <style>{`
                .ost-card {
                    width: 200px;
                    border-radius: 12px;
                    overflow: hidden;
                    background: #111;
                    border: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                    transition: transform .25s, border-color .25s;
                    flex-shrink: 0;
                }
                .ost-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.14); }
                .ost-card.playing { border-color: #6c63ff; }
                .ost-cover {
                    position: relative;
                    width: 100%; aspect-ratio: 1/1;
                    background: #1a1a1a; overflow: hidden;
                }
                .ost-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform .25s; }
                .ost-card:hover .ost-cover img { transform: scale(1.06); }
                .ost-cover-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 40px;
                    background: linear-gradient(135deg, #1a1535, #0f0f1a);
                }
                .ost-play-overlay {
                    position: absolute; inset: 0;
                    background: rgba(0,0,0,0.4);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: opacity .2s;
                }
                .ost-card:hover .ost-play-overlay { opacity: 1; }
                .ost-card.playing .ost-play-overlay { opacity: 1; background: rgba(108,99,255,0.3); }
                .ost-play-btn {
                    width: 44px; height: 44px; border-radius: 50%;
                    background: #fff; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: transform .15s;
                }
                .ost-play-btn:hover { transform: scale(1.1); }
                .ost-playing-bar {
                    position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
                    display: flex; align-items: flex-end; gap: 3px; height: 20px;
                }
                .ost-playing-bar span {
                    display: block; width: 3px; background: #6c63ff; border-radius: 2px;
                    animation: bar-bounce .6s ease-in-out infinite alternate;
                }
                .ost-playing-bar span:nth-child(1) { height: 8px; animation-delay: 0s; }
                .ost-playing-bar span:nth-child(2) { height: 16px; animation-delay: .15s; }
                .ost-playing-bar span:nth-child(3) { height: 12px; animation-delay: .3s; }
                .ost-playing-bar span:nth-child(4) { height: 20px; animation-delay: .1s; }
                @keyframes bar-bounce {
                    from { transform: scaleY(0.4); }
                    to   { transform: scaleY(1); }
                }
                .ost-info { padding: 10px 12px 12px; }
                .ost-anime { font-size: 10px; color: #6c63ff; font-weight: 600; margin: 0 0 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .ost-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.88); margin: 0 0 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .ost-artist { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .ost-no-preview { font-size: 10px; color: rgba(255,255,255,0.2); margin: 4px 0 0; }
            `}</style>
            <div
                className={`ost-card${isPlaying ? ' playing' : ''}`}
                onClick={() => onPlay(track.previewUrl, track.id)}
            >
                <div className="ost-cover">
                    {track.cover
                        ? <img src={track.cover} alt={track.title} />
                        : <div className="ost-cover-np">🎵</div>
                    }
                    <div className="ost-play-overlay">
                        {isPlaying ? (
                            <div className="ost-playing-bar">
                                <span/><span/><span/><span/>
                            </div>
                        ) : (
                            <button className="ost-play-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#111"><polygon points="5,3 19,12 5,21"/></svg>
                            </button>
                        )}
                    </div>
                </div>
                <div className="ost-info">
                    <p className="ost-anime">{track.animeName}</p>
                    <p className="ost-title">{track.title}</p>
                    <p className="ost-artist">{track.artist}</p>
                    {!track.previewUrl && <p className="ost-no-preview">미리듣기 없음</p>}
                </div>
            </div>
        </>
    )
}


// ── 홈 하단 플레이어 ──────────────────────────────────────────
function HomeBottomPlayer({ track, isPlaying, progress, onPlayPause, onPrev, onNext, onClose, onSeek }: {
    track: OstTrack; isPlaying: boolean; progress: number
    onPlayPause: () => void; onPrev: () => void; onNext: () => void
    onClose: () => void; onSeek: (pct: number) => void
}) {
    const barRef = useRef<HTMLDivElement>(null)
    const handleBarClick = (e: React.MouseEvent) => {
        if (!barRef.current) return
        const rect = barRef.current.getBoundingClientRect()
        onSeek(((e.clientX - rect.left) / rect.width) * 100)
    }
    const elapsed = Math.floor((progress / 100) * (track.duration || 30))
    const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
    return (
        <>
            <style>{`
                .hbp-wrap{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(14,12,26,0.97);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,0.08);padding:0 32px;height:80px;display:flex;align-items:center;gap:20px;animation:hbp-up .25s ease}
                @keyframes hbp-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
                .hbp-bar-wrap{position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.08);cursor:pointer}
                .hbp-bar-wrap:hover{height:6px}
                .hbp-bar-fill{height:100%;background:linear-gradient(to right,#6c63ff,#ec4899);pointer-events:none;transition:width .2s linear}
                .hbp-cover{width:48px;height:48px;border-radius:8px;overflow:hidden;background:#1a1a1a;flex-shrink:0}
                .hbp-cover img{width:100%;height:100%;object-fit:cover}
                .hbp-cover-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,#1a1535,#0f0f1a)}
                .hbp-info{flex:1;min-width:0}
                .hbp-title{font-size:14px;font-weight:700;color:#fff;margin:0 0 3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .hbp-sub{font-size:12px;color:rgba(255,255,255,0.4);margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .hbp-controls{display:flex;align-items:center;gap:12px;flex-shrink:0}
                .hbp-icon-btn{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);transition:all .2s}
                .hbp-icon-btn:hover{background:rgba(255,255,255,0.16);color:#fff}
                .hbp-play-btn{width:44px;height:44px;border-radius:50%;background:#6c63ff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:background .2s,transform .15s}
                .hbp-play-btn:hover{background:#5a52e0;transform:scale(1.05)}
                .hbp-time{font-size:12px;color:rgba(255,255,255,0.3);flex-shrink:0;min-width:80px;text-align:center}
                .hbp-close-btn{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.06);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);transition:all .2s}
                .hbp-close-btn:hover{background:rgba(255,255,255,0.12);color:#fff}
                .hbp-eq{display:flex;align-items:flex-end;gap:2px;height:16px}
                .hbp-eq span{display:block;width:3px;background:#fff;border-radius:1px;animation:hbp-bar .5s ease-in-out infinite alternate}
                .hbp-eq span:nth-child(1){height:5px;animation-delay:0s}
                .hbp-eq span:nth-child(2){height:13px;animation-delay:.15s}
                .hbp-eq span:nth-child(3){height:9px;animation-delay:.3s}
                .hbp-eq span:nth-child(4){height:15px;animation-delay:.1s}
                @keyframes hbp-bar{from{transform:scaleY(.4)}to{transform:scaleY(1)}}
            `}</style>
            <div className="hbp-wrap">
                <div ref={barRef} className="hbp-bar-wrap" onClick={handleBarClick}>
                    <div className="hbp-bar-fill" style={{width:`${progress}%`}}/>
                </div>
                <div className="hbp-cover">
                    {track.cover?<img src={track.cover} alt={track.title}/>:<div className="hbp-cover-np">🎵</div>}
                </div>
                <div className="hbp-info">
                    <p className="hbp-title">{track.title}</p>
                    <p className="hbp-sub">{track.animeName} · {track.artist}</p>
                </div>
                <div className="hbp-controls">
                    {isPlaying&&<div className="hbp-eq"><span/><span/><span/><span/></div>}
                    <span className="hbp-time">{formatTime(elapsed)} / {formatTime(track.duration||30)}</span>
                    <button className="hbp-icon-btn" onClick={onPrev}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/></svg></button>
                    <button className="hbp-play-btn" onClick={onPlayPause}>
                        {isPlaying?<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>}
                    </button>
                    <button className="hbp-icon-btn" onClick={onNext}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/></svg></button>
                    <button className="hbp-close-btn" onClick={onClose}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
            </div>
        </>
    )
}

export default function OstSection() {
    const { aniList, onFetchAni } = useAniStore()
    const [tracks, setTracks] = useState<OstTrack[]>([])
    const [loading, setLoading] = useState(true)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [currentTrack, setCurrentTrack] = useState<OstTrack | null>(null)
    const [progress, setProgress] = useState(0)
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const tracksRef = useRef<OstTrack[]>([])
    const prevRef = useRef<HTMLButtonElement>(null)
    const nextRef = useRef<HTMLButtonElement>(null)

    useEffect(() => { tracksRef.current = tracks }, [tracks])

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    useEffect(() => {
        if (aniList.length === 0) return
        const load = async () => {
            setLoading(true)
            const top8 = [...aniList]
                .sort((a: any, b: any) => b.popularity - a.popularity)
                .slice(0, 8)
            const allTracks: OstTrack[] = []
            for (const ani of top8) {
                const result = await fetchOstForAnime(ani.original_name || ani.name)
                allTracks.push(...result)
                if (allTracks.length > 0) setTracks([...allTracks])
                await new Promise(r => setTimeout(r, 300))
            }
            setLoading(false)
        }
        load()
    }, [aniList])

    const stopAudio = () => {
        audioRef.current?.pause()
        if (progressRef.current) clearInterval(progressRef.current)
        setPlayingId(null)
        setProgress(0)
    }

    const startPlay = (track: OstTrack) => {
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
            const all = tracksRef.current.filter(t => t.previewUrl)
            const idx = all.findIndex(t => t.id === track.id)
            if (idx < all.length - 1) startPlay(all[idx + 1])
            else stopAudio()
        }
    }

    const handlePlay = (url: string | null, id: string) => {
        const track = tracksRef.current.find(t => t.id === id)
        if (!track || !url) return
        if (playingId === id) { stopAudio(); return }
        startPlay(track)
    }

    const handleSeek = (pct: number) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = (pct / 100) * (audioRef.current.duration || 30)
        setProgress(pct)
    }
    const handlePrev = () => {
        if (!currentTrack) return
        const all = tracksRef.current.filter(t => t.previewUrl)
        const idx = all.findIndex(t => t.id === currentTrack.id)
        if (idx > 0) startPlay(all[idx - 1])
    }
    const handleNext = () => {
        if (!currentTrack) return
        const all = tracksRef.current.filter(t => t.previewUrl)
        const idx = all.findIndex(t => t.id === currentTrack.id)
        if (idx < all.length - 1) startPlay(all[idx + 1])
    }

    return (
        <>
        <section style={{ padding: '48px 0 0' }}>
            <style>{`
                .ost-wrap { max-width: 1820px; margin: 0 auto; padding: 0 48px; }
                .ost-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                .ost-head-left { display: flex; align-items: center; gap: 12px; }
                .ost-title { font-size: 20px; font-weight: 800; color: #fff; margin: 0; }
                .ost-badge {
                    font-size: 11px; font-weight: 700; color: #9d97ff;
                    background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.3);
                    padding: 3px 10px; border-radius: 20px;
                }
                .ost-nav { display: flex; gap: 8px; }
                .ost-nav-btn {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6); cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all .2s;
                }
                .ost-nav-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }
                .ost-loading {
                    display: flex; align-items: center; gap: 10px;
                    color: rgba(255,255,255,0.25); font-size: 13px; height: 200px;
                }
                .ost-spinner {
                    width: 20px; height: 20px;
                    border: 2px solid rgba(255,255,255,0.1);
                    border-top-color: #6c63ff;
                    border-radius: 50%;
                    animation: spin .7s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg) } }
            `}</style>

            <div className="ost-wrap">
                <div className="ost-head">
                    <div className="ost-head-left">
                        <h2 className="ost-title">🎵 애니 OST</h2>
                        <span className="ost-badge">30초 미리듣기</span>
                    </div>
                    <div className="ost-nav">
                        <button ref={prevRef} className="ost-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button ref={nextRef} className="ost-nav-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="ost-loading">
                        <div className="ost-spinner" />
                        OST 불러오는 중...
                    </div>
                ) : (
                    <Swiper
                        modules={[Navigation]}
                        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
                        onBeforeInit={(swiper: any) => {
                            swiper.params.navigation.prevEl = prevRef.current
                            swiper.params.navigation.nextEl = nextRef.current
                        }}
                        slidesPerView="auto"
                        spaceBetween={12}
                        style={{ overflow: 'visible' }}
                    >
                        {tracks.map(track => (
                            <SwiperSlide key={track.id} style={{ width: 'auto' }}>
                                <OstCard
                                    track={track}
                                    isPlaying={playingId === track.id}
                                    onPlay={handlePlay}
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </div>
        </section>
        {currentTrack && (
            <HomeBottomPlayer
                track={currentTrack}
                isPlaying={playingId === currentTrack.id}
                progress={progress}
                onPlayPause={() => { if (playingId === currentTrack.id) stopAudio(); else startPlay(currentTrack) }}
                onSeek={handleSeek}
                onPrev={handlePrev}
                onNext={handleNext}
                onClose={() => { stopAudio(); setCurrentTrack(null) }}
            />
        )}
        </>
    )
}
