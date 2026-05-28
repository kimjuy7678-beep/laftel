'use client'
import { useEffect, useRef, useState } from 'react'

export default function VideoBanner() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [muted, setMuted] = useState(true)
    const [playing, setPlaying] = useState(true)

    const toggleMute = () => {
        if (!videoRef.current) return
        videoRef.current.muted = !muted
        setMuted(!muted)
    }

    const togglePlay = () => {
        if (!videoRef.current) return
        if (playing) { videoRef.current.pause(); setPlaying(false) }
        else { videoRef.current.play(); setPlaying(true) }
    }

    return (
        <section style={{ position: 'relative', width: '100%', aspectRatio: '21/9', overflow: 'hidden', background: '#000' }}>
            <video
                ref={videoRef}
                src="/videos/banner_video.mp4"
                autoPlay
                muted
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />

            {/* 상하 그라디언트 */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, transparent 20%, transparent 70%, rgba(10,10,10,1) 100%)', pointerEvents: 'none' }} />

            {/* 컨트롤 버튼들 */}
            <div style={{ position: 'absolute', bottom: 20, right: 24, display: 'flex', gap: 8, zIndex: 10 }}>
                <button onClick={togglePlay}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
                    {playing
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5,3 19,12 5,21"/></svg>
                    }
                </button>
                <button onClick={toggleMute}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
                    {muted
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    }
                </button>
            </div>
        </section>
    )
}
