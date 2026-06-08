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
        // iTunes 직접 검색 — サウンドトラック 키워드로 일본 애니 앨범자켓 확보
        const queries = [
            `${animeName} サウンドトラック`,
            `${animeName} ost`,
            animeName,
        ]
        for (const q of queries) {
            const res = await fetch(
                `${ITUNES_BASE}?term=${encodeURIComponent(q)}&media=music&entity=song&genreId=27&limit=10&country=JP&lang=ja_jp`
            )
            const data = await res.json()
            const items = (data.results || []).filter((item: any) => item.previewUrl && item.artworkUrl100)
            if (items.length === 0) continue
            // previewUrl 있는 첫 번째 트랙 반환
            const item = items[0]
            return [{
                id: `${animeName}-${item.trackId}`,
                title: item.trackName,
                artist: item.artistName,
                animeName,
                cover: item.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600'),
                previewUrl: item.previewUrl,
                duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
            }]
        }
        return []
    } catch { return [] }
}

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
    const ft = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <>
            <style>{`
                .hbp-wrap{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(14,12,26,0.97);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,0.08);padding:0 32px;height:80px;display:flex;align-items:center;gap:20px;animation:hbp-up .25s ease}
                @keyframes hbp-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
                .hbp-bar-wrap{position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,.08);cursor:pointer}
                .hbp-bar-fill{height:100%;background:linear-gradient(to right,#6c63ff,#ec4899);pointer-events:none;transition:width .2s linear}
                .hbp-cover{width:48px;height:48px;border-radius:8px;overflow:hidden;background:#1a1a1a;flex-shrink:0}
                .hbp-cover img{width:100%;height:100%;object-fit:cover}
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
            `}</style>
            <div className="hbp-wrap">
                <div ref={barRef} className="hbp-bar-wrap" onClick={handleBarClick}>
                    <div className="hbp-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="hbp-cover">
                    {track.cover ? <img src={track.cover} alt={track.title} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>}
                </div>
                <div className="hbp-info">
                    <p className="hbp-title">{track.title}</p>
                    <p className="hbp-sub">{track.animeName} · {track.artist}</p>
                </div>
                <div className="hbp-controls">
                    <span className="hbp-time">{ft(elapsed)} / {ft(track.duration || 30)}</span>
                    <button className="hbp-icon-btn" onClick={onPrev}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4" /><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" /></svg>
                    </button>
                    <button className="hbp-play-btn" onClick={onPlayPause}>
                        {isPlaying
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                        }
                    </button>
                    <button className="hbp-icon-btn" onClick={onNext}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20" /><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" /></svg>
                    </button>
                    <button className="hbp-close-btn" onClick={onClose}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
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
            const top20 = [...aniList]
                .sort((a: any, b: any) => b.popularity - a.popularity)
                .slice(0, 20)
            const allTracks: OstTrack[] = []
            const seenCovers = new Set<string>()
            const seenAnimes = new Set<string>()
            for (const ani of top20) {
                const result = await fetchOstForAnime(ani.original_name || ani.name)
                // 애니당 1곡만, 커버 중복 제거
                const pick = result.find(t => t.previewUrl && t.cover)
                    || result.find(t => t.previewUrl)
                if (pick) {
                    const coverKey = pick.cover.replace(/\/[0-9]+x[0-9]+/, '')
                    const animeKey = pick.animeName.toLowerCase().trim()
                    if (!seenCovers.has(coverKey) && !seenAnimes.has(animeKey)) {
                        seenCovers.add(coverKey)
                        seenAnimes.add(animeKey)
                        allTracks.push(pick)
                        setTracks([...allTracks])
                    }
                }
                await new Promise(r => setTimeout(r, 300))
            }
            setLoading(false)
        }
        load()
    }, [aniList])

    const stopAudio = () => {
        audioRef.current?.pause()
        if (progressRef.current) clearInterval(progressRef.current)
        setPlayingId(null); setProgress(0)
    }

    const startPlay = (track: OstTrack) => {
        if (!track.previewUrl) return
        if (!audioRef.current) audioRef.current = new Audio()
        audioRef.current.pause()
        audioRef.current.src = track.previewUrl
        audioRef.current.play()
        setPlayingId(track.id); setCurrentTrack(track); setProgress(0)
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = setInterval(() => {
            if (!audioRef.current) return
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 30)) * 100)
        }, 200)
        audioRef.current.onended = () => {
            const all = tracksRef.current.filter(t => t.previewUrl)
            const idx = all.findIndex(t => t.id === track.id)
            if (idx < all.length - 1) startPlay(all[idx + 1]); else stopAudio()
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
                    .ost-wrap { width: 90%; margin: 0 auto; }
                    .ost-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                    .ost-head-left { display: flex; align-items: center; gap: 12px; }
                    .ost-title { font-size: 25px; font-weight: 800; color: #fff; margin: 0; }
                    .ost-badge { font-size: 11px; font-weight: 700; color: #9d97ff; background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.3); padding: 3px 10px; border-radius: 20px; }
                    .ost-nav { display: flex; gap: 8px; }
                    .ost-nav-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; }
                    .ost-nav-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

                    /* 카드 — 배경 없음, 앨범자켓만 */
                    .ost-card {
                        width: 180px;
                        cursor: pointer;
                        transition: transform .22s cubic-bezier(.25,.46,.45,.94);
                    }
                    .ost-card:hover { transform: translateY(-4px); }
                    .ost-card:hover .ost-jacket img { transform: scale(1.05); }

                    /* 앨범 자켓 — border-radius만 */
                    .ost-jacket {
                        width: 180px; height: 180px;
                        border-radius: 10px;
                        overflow: hidden;
                        background: #1a1a1a;
                        position: relative;
                        margin-bottom: 10px;
                        border: 2px solid transparent;
                        transition: border-color .2s;
                    }
                    .ost-card.playing .ost-jacket {
                        border-color: #6c63ff;
                    }
                    .ost-jacket img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
                    .ost-jacket-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg,#1a1535,#0f0f1a); }

                    /* 호버/재생 오버레이 */
                    .ost-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
                    .ost-card:hover .ost-overlay { opacity: 1; }
                    .ost-card.playing .ost-overlay { opacity: 1; background: rgba(108,99,255,.3); }
                    .ost-play-btn { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.9); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }

                    /* 재생 중 이퀄라이저 */
                    .ost-eq { display: flex; align-items: flex-end; gap: 3px; height: 20px; }
                    .ost-eq span { display: block; width: 3px; background: #fff; border-radius: 2px; animation: ost-bar .6s ease-in-out infinite alternate; }
                    .ost-eq span:nth-child(1) { height: 8px; animation-delay: 0s; }
                    .ost-eq span:nth-child(2) { height: 16px; animation-delay: .15s; }
                    .ost-eq span:nth-child(3) { height: 12px; animation-delay: .3s; }
                    .ost-eq span:nth-child(4) { height: 20px; animation-delay: .1s; }
                    @keyframes ost-bar { from{transform:scaleY(.4)} to{transform:scaleY(1)} }

                    /* 재생 중 하단 진행바 */
                    .ost-prog { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,.15); }
                    .ost-prog-fill { height: 100%; background: #6c63ff; transition: width .2s linear; }

                    /* 텍스트 — 자켓 밖, 배경 없음 */
                    .ost-anime-name { font-size: 11px; color: #6c63ff; font-weight: 600; margin: 0 0 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                    .ost-track-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,.88); margin: 0 0 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-decoration: underline; text-underline-offset: 2px; }
                    .ost-artist { font-size: 12px; color: rgba(255,255,255,.4); margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

                    .ost-loading { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.25); font-size: 13px; height: 200px; }
                    .ost-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,.1); border-top-color: #6c63ff; border-radius: 50%; animation: ost-spin .7s linear infinite; }
                    @keyframes ost-spin { to { transform: rotate(360deg) } }
                `}</style>

                <div className="ost-wrap">
                    <div className="ost-head">
                        <div className="ost-head-left">
                            <h2 className="ost-title">도파민 충전 완료 ! 지금 당신의 최애곡을 재생해보세요 🎵</h2>
                            <span className="ost-badge">30초 미리듣기</span>
                        </div>
                        <div className="ost-nav">
                            <button ref={prevRef} className="ost-nav-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <button ref={nextRef} className="ost-nav-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                    </div>

                    {loading && tracks.length === 0 ? (
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
                            spaceBetween={16}
                            style={{ overflow: 'visible' }}
                        >
                            {tracks.map(track => (
                                <SwiperSlide key={track.id} style={{ width: 'auto' }}>
                                    <div
                                        className={`ost-card${playingId === track.id ? ' playing' : ''}`}
                                        onClick={() => handlePlay(track.previewUrl, track.id)}
                                    >
                                        {/* 앨범 자켓만 border-radius */}
                                        <div className="ost-jacket">
                                            {track.cover
                                                ? <img src={track.cover} alt={track.title} />
                                                : <div className="ost-jacket-np">🎵</div>
                                            }
                                            <div className="ost-overlay">
                                                {playingId === track.id ? (
                                                    <div className="ost-eq"><span /><span /><span /><span /></div>
                                                ) : (
                                                    <button className="ost-play-btn">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#111"><polygon points="5,3 19,12 5,21" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                            {playingId === track.id && (
                                                <div className="ost-prog">
                                                    <div className="ost-prog-fill" style={{ width: `${progress}%` }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* 텍스트 — 자켓 밖, 배경 없음 */}
                                        <p className="ost-anime-name">{track.animeName} ost</p>
                                        <p className="ost-track-name">{track.title}</p>
                                        <p className="ost-artist">{track.artist}</p>
                                    </div>
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
                    onPlayPause={() => playingId === currentTrack.id ? stopAudio() : startPlay(currentTrack)}
                    onSeek={handleSeek}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onClose={() => { stopAudio(); setCurrentTrack(null) }}
                />
            )}
        </>
    )
}