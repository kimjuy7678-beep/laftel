'use client'
import { useEffect, useRef, useState } from 'react'

const LASTFM_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const ITUNES_BASE = 'https://itunes.apple.com/search'
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

interface OstTrack { id: string; title: string; artist: string; cover: string; previewUrl: string | null; duration: number; rank: number }

async function fetchOstTracks(animeName: string): Promise<OstTrack[]> {
    try {
        const lfRes = await fetch(`${LASTFM_BASE}/?method=album.search&album=${encodeURIComponent(animeName + ' ost')}&api_key=${LASTFM_KEY}&format=json&limit=3`)
        const lfData = await lfRes.json()
        const albums = lfData.results?.albummatches?.album || []
        if (albums.length === 0) return []
        const album = albums[0]
        const trackRes = await fetch(`${LASTFM_BASE}/?method=album.getinfo&artist=${encodeURIComponent(album.artist)}&album=${encodeURIComponent(album.name)}&api_key=${LASTFM_KEY}&format=json`)
        const trackData = await trackRes.json()
        const tracks = trackData.album?.tracks?.track?.slice(0, 8) || []
        if (tracks.length === 0) return []
        const results: OstTrack[] = []
        for (let i = 0; i < Math.min(tracks.length, 8); i++) {
            const track = tracks[i]
            const trackName = typeof track === 'string' ? track : track.name
            try {
                const itRes = await fetch(`${ITUNES_BASE}?term=${encodeURIComponent(trackName + ' ' + animeName)}&media=music&limit=1&country=JP`)
                const itData = await itRes.json()
                const item = itData.results?.[0]
                results.push({ id: `${i}-${trackName}`, title: trackName, artist: typeof track === 'string' ? album.artist : (track.artist?.name || album.artist), cover: item?.artworkUrl100?.replace('100x100', '400x400') || album.image?.[3]?.['#text'] || '', previewUrl: item?.previewUrl || null, duration: item?.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0, rank: i + 1 })
            } catch { }
        }
        return results
    } catch { return [] }
}

function formatTime(sec: number) {
    if (!sec) return '0:30'
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
}

interface Props { animeName: string }

export default function OstSectionDetail({ animeName }: Props) {
    const [tracks, setTracks] = useState<OstTrack[]>([])
    const [loading, setLoading] = useState(true)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (!animeName) return
        setLoading(true)
        fetchOstTracks(animeName).then(res => { setTracks(res); setLoading(false) })
    }, [animeName])

    const handlePlay = (track: OstTrack) => {
        if (!track.previewUrl) return
        if (playingId === track.id) {
            audioRef.current?.pause()
            if (progressRef.current) clearInterval(progressRef.current)
            setPlayingId(null); setProgress(0); return
        }
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = track.previewUrl }
        else { audioRef.current = new Audio(track.previewUrl) }
        audioRef.current!.src = track.previewUrl
        audioRef.current!.play()
        setPlayingId(track.id); setProgress(0)
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = setInterval(() => {
            if (!audioRef.current) return
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 30)) * 100)
        }, 200)
        audioRef.current!.onended = () => { setPlayingId(null); setProgress(0); if (progressRef.current) clearInterval(progressRef.current) }
    }

    if (!loading && tracks.length === 0) return null

    return (
        <div style={{ marginBottom: 36 }}>
            <style>{`
                .ostd-title { font-size: 16px; font-weight: 700; color: var(--text-high); margin: 0 0 16px; display: flex; align-items: center; gap: 8px; }
                .ostd-badge { font-size: 10px; font-weight: 700; color: #9d97ff; background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.3); padding: 2px 8px; border-radius: 10px; }
                .ostd-list { display: flex; flex-direction: column; gap: 4px; }
                .ostd-row { display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background .15s; border: 1px solid transparent; }
                .ostd-row:hover { background: var(--bg-hover); border-color: var(--border-subtle); }
                .ostd-row.playing { background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.25); }
                .ostd-row.no-preview { cursor: default; opacity: 0.4; }
                .ostd-rank { font-size: 13px; font-weight: 600; color: var(--text-faint); width: 20px; text-align: center; flex-shrink: 0; }
                .ostd-row.playing .ostd-rank { color: #6c63ff; }
                .ostd-cover { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; background: var(--bg-secondary); flex-shrink: 0; }
                .ostd-cover img { width: 100%; height: 100%; object-fit: cover; }
                .ostd-cover-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 18px; background: linear-gradient(135deg,#1a1535,#0f0f1a); }
                .ostd-info { flex: 1; min-width: 0; }
                .ostd-name { font-size: 13px; font-weight: 600; color: var(--text-high); margin: 0 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                .ostd-row.playing .ostd-name { color: #9d97ff; }
                .ostd-artist { font-size: 11px; color: var(--text-faint); margin: 0; }
                .ostd-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                .ostd-progress-wrap { width: 80px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
                .ostd-progress-bar { height: 100%; background: #6c63ff; border-radius: 2px; transition: width .2s; }
                .ostd-duration { font-size: 11px; color: var(--text-faint); width: 32px; text-align: right; }
                .ostd-play-icon { color: var(--text-subtle); }
                .ostd-row:hover .ostd-play-icon { color: var(--text-primary); }
                .ostd-bar { display: flex; align-items: flex-end; gap: 2px; height: 14px; }
                .ostd-bar span { display: block; width: 2px; background: #6c63ff; border-radius: 1px; animation: bar-b .5s ease-in-out infinite alternate; }
                .ostd-bar span:nth-child(1) { height: 4px; animation-delay: 0s; }
                .ostd-bar span:nth-child(2) { height: 10px; animation-delay: .15s; }
                .ostd-bar span:nth-child(3) { height: 7px; animation-delay: .3s; }
                @keyframes bar-b { from { transform: scaleY(.4); } to { transform: scaleY(1); } }
                .ostd-loading { display: flex; align-items: center; gap: 8px; color: var(--text-faint); font-size: 13px; padding: 20px 0; }
                .ostd-spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: #6c63ff; border-radius: 50%; animation: spin .7s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg) } }
            `}</style>

            <p className="ostd-title">🎵 OST <span className="ostd-badge">30초 미리듣기</span></p>

            {loading ? (
                <div className="ostd-loading"><div className="ostd-spinner" />OST 불러오는 중...</div>
            ) : (
                <div className="ostd-list">
                    {tracks.map(track => (
                        <div key={track.id} className={`ostd-row${playingId === track.id ? ' playing' : ''}${!track.previewUrl ? ' no-preview' : ''}`} onClick={() => handlePlay(track)}>
                            <span className="ostd-rank">
                                {playingId === track.id ? <div className="ostd-bar"><span/><span/><span/></div> : track.rank}
                            </span>
                            <div className="ostd-cover">
                                {track.cover ? <img src={track.cover} alt={track.title} /> : <div className="ostd-cover-np">🎵</div>}
                            </div>
                            <div className="ostd-info">
                                <p className="ostd-name">{track.title}</p>
                                <p className="ostd-artist">{track.artist}</p>
                            </div>
                            <div className="ostd-right">
                                {playingId === track.id && (
                                    <div className="ostd-progress-wrap">
                                        <div className="ostd-progress-bar" style={{ width: `${progress}%` }} />
                                    </div>
                                )}
                                <span className="ostd-duration">{formatTime(track.duration)}</span>
                                {!playingId || playingId !== track.id
                                    ? <svg className="ostd-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
