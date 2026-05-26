'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import 'swiper/css'

const ITUNES_BASE = 'https://itunes.apple.com/search'
const LASTFM_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

interface Track {
    id: string
    title: string
    artist: string
    animeName: string
    cover: string
    previewUrl: string | null
    duration: number
    type: 'op' | 'ed' | 'bgm' | 'ost' | 'unknown'
    tags: string[]
    collectionName: string
    popularity: number
}

// iTunes 결과에서 타입/태그 자동 분류
function classifyTrack(item: any): { type: Track['type']; tags: string[] } {
    const name = (item.trackName || '').toLowerCase()
    const col = (item.collectionName || '').toLowerCase()
    const tags: string[] = []
    let type: Track['type'] = 'ost'

    if (name.includes('opening') || name.includes(' op ') || name.includes('op1') || col.includes('opening')) {
        type = 'op'; tags.push('오프닝')
    } else if (name.includes('ending') || name.includes(' ed ') || name.includes('ed1') || col.includes('ending')) {
        type = 'ed'; tags.push('엔딩')
    } else if (col.includes('soundtrack') || col.includes('score') || col.includes('bgm') || col.includes('ost')) {
        type = 'bgm'; tags.push('BGM')
    }

    // 태그 추가
    if (name.includes('battle') || name.includes('fight') || name.includes('combat') || name.includes('戦')) tags.push('전투')
    if (name.includes('sad') || name.includes('cry') || name.includes('tears') || name.includes('悲') || name.includes('泣')) tags.push('감성')
    if (name.includes('love') || name.includes('heart') || name.includes('romance') || name.includes('恋')) tags.push('로맨스')
    if (name.includes('dawn') || name.includes('night') || name.includes('moon') || name.includes('star') || name.includes('夜')) tags.push('새벽감성')
    if (name.includes('epic') || name.includes('hero') || name.includes('power')) tags.push('열혈')
    if (name.includes('peace') || name.includes('calm') || name.includes('gentle') || name.includes('piano')) tags.push('힐링')
    if (type === 'ost' || type === 'bgm') tags.push('BGM')

    return { type, tags: [...new Set(tags)] }
}

function extractAnimeName(item: any): string {
    const col: string = item.collectionName || ''
    return col
        .replace(/\s*\(.*?\)\s*/g, '')
        .replace(/\s*-\s*(ost|original soundtrack|soundtrack|opening|ending|bgm|score|music|anime|the animation|season \d+)\s*/gi, '')
        .replace(/\s*(ost|original soundtrack|soundtrack)\s*/gi, '')
        .trim() || item.artistName || 'Unknown'
}

const ft = (s: number) => s ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` : '0:30'

// ── iTunes 대량 fetch ────────────────────────────────────────
async function fetchItunesAnime(term: string, limit = 200): Promise<Track[]> {
    try {
        const res = await fetch(`${ITUNES_BASE}?term=${encodeURIComponent(term)}&media=music&genreId=27&limit=${limit}&country=JP`)
        const data = await res.json()
        return (data.results || [])
            .filter((item: any) => item.previewUrl && item.artworkUrl100)
            .map((item: any) => {
                const { type, tags } = classifyTrack(item)
                return {
                    id: String(item.trackId),
                    title: item.trackName,
                    artist: item.artistName,
                    animeName: extractAnimeName(item),
                    cover: item.artworkUrl100.replace('100x100', '400x400'),
                    previewUrl: item.previewUrl,
                    duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
                    type, tags,
                    collectionName: item.collectionName || '',
                    popularity: item.trackCount || 0,
                }
            })
    } catch { return [] }
}

// 여러 키워드로 병렬 fetch → dedup
async function fetchAll(): Promise<Track[]> {
    const queries = [
        'anime opening theme',
        'anime ending theme',
        'anime original soundtrack',
        'anime ost bgm',
        'anime song jpop',
        'jujutsu kaisen ost',
        'demon slayer ost',
        'attack on titan ost',
        'spy family ost',
        'frieren ost',
        'mushoku tensei ost',
        'chainsaw man ost',
        'one punch man ost',
        'bleach ost',
        'naruto ost',
        'my hero academia ost',
        'haikyuu ost',
        'violet evergarden ost',
        'fullmetal alchemist ost',
        're zero ost',
    ]
    const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 100)))
    const all = results.flat()
    const seen = new Set<string>()
    return all.filter(t => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
    })
}

// ── 하단 플레이어 ─────────────────────────────────────────────
function BottomPlayer({ track, isPlaying, progress, volume, onPlayPause, onSeek, onPrev, onNext, onClose, onVolume, accent = '#6c63ff' }: any) {
    const barRef = useRef<HTMLDivElement>(null)
    const volRef = useRef<HTMLDivElement>(null)
    const elapsed = Math.floor((progress / 100) * (track.duration || 30))
    const handleSeek = (e: React.MouseEvent) => { if (!barRef.current) return; const r = barRef.current.getBoundingClientRect(); onSeek(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }
    const handleVol = (e: React.MouseEvent) => { if (!volRef.current) return; const r = volRef.current.getBoundingClientRect(); onVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))) }

    return (
        <>
            <style>{`
                .bp{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(12,11,22,.97);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.08);height:88px;display:flex;align-items:center;padding:0 24px;animation:bp-in .25s ease}
                @keyframes bp-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
                .bp-seekbar{position:absolute;top:-1px;left:0;right:0;height:4px;background:rgba(255,255,255,.08);cursor:pointer}
                .bp-seekbar:hover{height:6px;top:-3px}
                .bp-left{display:flex;align-items:center;gap:13px;width:280px;flex-shrink:0}
                .bp-cover{width:52px;height:52px;border-radius:8px;overflow:hidden;background:#1a1a1a;flex-shrink:0;position:relative}
                .bp-cover img{width:100%;height:100%;object-fit:cover}
                .bp-cover-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,#1a1535,#0f0f1a)}
                .bp-tbadge{position:absolute;top:3px;left:3px;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px;color:#000}
                .bp-tinfo{min-width:0}
                .bp-tname{font-size:13px;font-weight:700;color:#fff;margin:0 0 2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .bp-tsub{font-size:11px;color:rgba(255,255,255,.38);margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
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
                .bp-right{display:flex;align-items:center;gap:12px;width:200px;justify-content:flex-end;flex-shrink:0}
                .bp-vol-wrap{display:flex;align-items:center;gap:8px}
                .bp-volbar{width:72px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer}
                .bp-volbar:hover{height:5px}
                .bp-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);transition:all .2s}
                .bp-close:hover{background:rgba(255,255,255,.13);color:#fff}
                .bp-eq{display:flex;align-items:flex-end;gap:2px;height:14px}
                .bp-eq span{display:block;width:3px;border-radius:1px;animation:bp-bar .5s ease-in-out infinite alternate}
                .bp-eq span:nth-child(1){height:5px}.bp-eq span:nth-child(2){height:12px;animation-delay:.15s}.bp-eq span:nth-child(3){height:8px;animation-delay:.3s}.bp-eq span:nth-child(4){height:14px;animation-delay:.08s}
                @keyframes bp-bar{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
            `}</style>
            <div className="bp">
                <div ref={barRef} className="bp-seekbar" onClick={handleSeek}>
                    <div style={{ height: '100%', background: `linear-gradient(to right,${accent},${accent}99)`, width: `${progress}%`, transition: 'width .2s linear' }} />
                </div>
                <div className="bp-left">
                    <div className="bp-cover">
                        {track.cover ? <img src={track.cover} alt={track.title} /> : <div className="bp-cover-np">🎵</div>}
                        {track.type !== 'ost' && track.type !== 'unknown' && (
                            <span className="bp-tbadge" style={{ background: track.type === 'op' ? '#f59e0b' : track.type === 'ed' ? '#a78bfa' : '#6c63ff', color: track.type === 'ed' ? '#fff' : '#000' }}>
                                {track.type.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="bp-tinfo">
                        <p className="bp-tname">{track.title}</p>
                        <p className="bp-tsub">{track.animeName} · {track.artist}</p>
                    </div>
                </div>
                <div className="bp-center">
                    <div className="bp-btns">
                        <button className="bp-btn" onClick={onPrev}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" /></svg></button>
                        <button className="bp-play" onClick={onPlayPause}>
                            {isPlaying ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5,3 19,12 5,21" /></svg>}
                        </button>
                        <button className="bp-btn" onClick={onNext}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" /></svg></button>
                    </div>
                    <div className="bp-prog-row">
                        <span className="bp-time">{ft(elapsed)}</span>
                        <div ref={barRef} className="bp-progbar" onClick={handleSeek}>
                            <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${progress}%`, transition: 'width .2s linear' }} />
                        </div>
                        <span className="bp-time" style={{ textAlign: 'right' }}>{ft(track.duration || 30)}</span>
                    </div>
                </div>
                <div className="bp-right">
                    {isPlaying && <div className="bp-eq">{[0, 1, 2, 3].map(i => <span key={i} style={{ background: accent }} />)}</div>}
                    <div className="bp-vol-wrap">
                        <button className="bp-btn" onClick={() => onVolume(volume === 0 ? 0.7 : 0)}>
                            {volume === 0
                                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                            }
                        </button>
                        <div ref={volRef} className="bp-volbar" onClick={handleVol}>
                            <div style={{ height: '100%', background: 'rgba(255,255,255,.6)', borderRadius: 2, width: `${volume * 100}%` }} />
                        </div>
                    </div>
                    <button className="bp-close" onClick={onClose}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                </div>
            </div>
        </>
    )
}

// ── 트랙 행 ───────────────────────────────────────────────────
function TrackRow({ track, index, isPlaying, onPlay }: { track: Track; index: number; isPlaying: boolean; onPlay: (t: Track) => void }) {
    const typeColor: Record<string, string> = { op: '#f59e0b', ed: '#a78bfa', bgm: '#6c63ff', ost: '#6c63ff' }
    const typeLabel: Record<string, string> = { op: 'OP', ed: 'ED', bgm: 'BGM', ost: 'OST' }
    return (
        <div
            onClick={() => onPlay(track)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: track.previewUrl ? 'pointer' : 'default', opacity: track.previewUrl ? 1 : 0.35, background: isPlaying ? 'rgba(108,99,255,.1)' : '', border: `1px solid ${isPlaying ? 'rgba(108,99,255,.2)' : 'transparent'}`, transition: 'background .15s' }}
            onMouseEnter={e => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.04)' }}
            onMouseLeave={e => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = '' }}
        >
            <span style={{ fontSize: 12, color: isPlaying ? '#6c63ff' : 'rgba(255,255,255,.22)', width: 22, textAlign: 'center', flexShrink: 0 }}>{index + 1}</span>
            <div style={{ width: 42, height: 42, borderRadius: 7, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0, position: 'relative' }}>
                {track.cover ? <img src={track.cover} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎵</div>}
                {track.type !== 'ost' && <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: typeColor[track.type] || '#6c63ff', color: track.type === 'ed' ? '#fff' : '#000' }}>{typeLabel[track.type] || 'OST'}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? '#a5a0ff' : 'rgba(255,255,255,.85)', margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.artist}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', width: 32, textAlign: 'right' }}>{ft(track.duration)}</span>
                {isPlaying
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.22)"><polygon points="5,3 19,12 5,21" /></svg>
                }
            </div>
        </div>
    )
}

// ── TOP10 카드 ────────────────────────────────────────────────
function Top10Card({ track, rank, isPlaying, onPlay }: { track: Track; rank: number; isPlaying: boolean; onPlay: (t: Track) => void }) {
    return (
        <div onClick={() => onPlay(track)} style={{ cursor: 'pointer', transition: 'transform .25s' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
            {/* 카드 = 숫자 왼쪽 + 커버 오른쪽 */}
            <div style={{ position: 'relative', width: 220, height: 220 }}>
                <span style={{ position: 'absolute', left: 0, bottom: 0, fontSize: 110, fontWeight: 900, lineHeight: 1, color: isPlaying ? '#6c63ff' : '#fff', zIndex: 1, letterSpacing: '-0.06em', width: 110, textAlign: 'right', textShadow: '0 4px 24px rgba(0,0,0,0.9)', userSelect: 'none' }}>{rank}</span>
                <div style={{ position: 'absolute', right: 0, top: 0, width: 160, height: 160, borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', boxShadow: '-8px 8px 28px rgba(0,0,0,0.7)', zIndex: 2 }}>
                    {track.cover ? <img src={track.cover} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎵</div>}
                    {isPlaying && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 20 }}>
                            {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 4, background: '#fff', borderRadius: 2, animation: `eq .5s ease-in-out infinite alternate`, animationDelay: `${i * 0.1}s`, height: [8, 18, 12, 16][i] }} />)}
                        </div>
                    </div>}
                </div>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: isPlaying ? '#a5a0ff' : 'rgba(255,255,255,.75)', margin: '8px 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 220 }}>{track.title}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 220 }}>{track.animeName}</p>
        </div>
    )
}

// ── 가로 스크롤 섹션 ─────────────────────────────────────────
function HScrollSection({ title, tracks, playingId, onPlay, prevRef, nextRef, showCard = false }: any) {
    return (
        <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button ref={prevRef} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button ref={nextRef} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>
            </div>
            <Swiper modules={[Navigation, FreeMode]} freeMode navigation={{ prevEl: prevRef?.current, nextEl: nextRef?.current }}
                onBeforeInit={(s: any) => { if (prevRef?.current) s.params.navigation.prevEl = prevRef.current; if (nextRef?.current) s.params.navigation.nextEl = nextRef.current }}
                slidesPerView="auto" spaceBetween={showCard ? 0 : 8} style={{ overflow: 'visible' }}>
                {tracks.map((t: Track, i: number) => (
                    <SwiperSlide key={t.id} style={{ width: showCard ? 220 : 280 }}>
                        {showCard
                            ? <Top10Card track={t} rank={i + 1} isPlaying={playingId === t.id} onPlay={onPlay} />
                            : <div style={{ width: 280, background: '#111', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer', transition: 'transform .2s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}
                                onClick={() => onPlay(t)}>
                                <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#1a1a1a', position: 'relative' }}>
                                    {t.cover ? <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎵</div>}
                                    {playingId === t.id && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                                            {[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: [10, 18, 13][i], background: '#fff', borderRadius: 2 }} />)}
                                        </div>
                                    </div>}
                                </div>
                                <div style={{ padding: '9px 11px 11px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: playingId === t.id ? '#a5a0ff' : 'rgba(255,255,255,.85)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                                </div>
                            </div>
                        }
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}

// ── 태그 섹션 (가로형 트랙리스트) ────────────────────────────
function TagSection({ tag, tracks, playingId, onPlay }: any) {
    const [expanded, setExpanded] = useState(false)
    const show = expanded ? tracks : tracks.slice(0, 5)
    return (
        <section style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,.88)', margin: 0, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setExpanded(v => !v)}>{tag}</h2>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>{tracks.length}곡</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {show.map((t: Track, i: number) => <TrackRow key={t.id} track={t} index={i} isPlaying={playingId === t.id} onPlay={onPlay} />)}
            </div>
            {tracks.length > 5 && (
                <button onClick={() => setExpanded(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: 'rgba(108,99,255,.1)', border: '1px solid rgba(108,99,255,.18)', borderRadius: 6, color: '#a5a0ff', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 6, transition: 'all .2s' }}>
                    {expanded ? '접기 ↑' : `+ ${tracks.length - 5}곡 더보기`}
                </button>
            )}
        </section>
    )
}

// ── OP/ED 탭 (투표 랭킹) ──────────────────────────────────────
function OpTab({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    const [typeFilter, setTypeFilter] = useState<'all' | 'op' | 'ed'>('all')
    const [voted, setVoted] = useState<Set<string>>(new Set())
    const [votes, setVotes] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {}
        tracks.forEach(t => { init[t.id] = Math.floor(Math.random() * 9000) + 100 })
        return init
    })
    const opEd = tracks.filter(t => t.type === 'op' || t.type === 'ed')
    const filtered = typeFilter === 'all' ? opEd : opEd.filter(t => t.type === typeFilter)
    const sorted = [...filtered].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))
    const goat = sorted[0]

    const handleVote = (id: string) => {
        if (voted.has(id)) return
        setVoted(prev => new Set([...prev, id]))
        setVotes(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    }

    return (
        <div>
            {/* GOAT 배너 */}
            {goat && (
                <div onClick={() => onPlay(goat)} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 24, cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a1535,#0f0f2a)' }} />
                    {goat.cover && <div style={{ position: 'absolute', inset: 0, opacity: .22 }}><img src={goat.cover} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) saturate(1.5)' }} /></div>}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,.88) 40%,rgba(0,0,0,.2) 100%)' }} />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20, padding: '24px 28px' }}>
                        <span style={{ fontSize: 28 }}>🏆</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 5px' }}>현재 1위 · GOAT {goat.type.toUpperCase()}</p>
                            <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{goat.title}</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', margin: '0 0 8px' }}>{goat.animeName} · {goat.artist}</p>
                            <p style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, margin: 0 }}>★ {(votes[goat.id] || 0).toLocaleString()}표</p>
                        </div>
                        {goat.cover && <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><img src={goat.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                        <button onClick={e => { e.stopPropagation(); onPlay(goat) }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#f59e0b', border: 'none', borderRadius: 9, color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>재생
                        </button>
                    </div>
                </div>
            )}

            {/* 필터 + 카운트 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {[{ id: 'all', label: '전체' }, { id: 'op', label: '오프닝' }, { id: 'ed', label: '엔딩' }].map(t => (
                    <button key={t.id} onClick={() => setTypeFilter(t.id as any)}
                        style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${typeFilter === t.id ? '#f59e0b' : 'rgba(255,255,255,.1)'}`, background: typeFilter === t.id ? 'rgba(245,158,11,.15)' : 'none', color: typeFilter === t.id ? '#fbbf24' : 'rgba(255,255,255,.42)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
                        {t.label}
                    </button>
                ))}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.22)', marginLeft: 4 }}>{sorted.length}곡</span>
            </div>

            {/* 랭킹 리스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sorted.map((t, i) => (
                    <div key={t.id} onClick={() => onPlay(t)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${playingId === t.id ? 'rgba(245,158,11,.2)' : 'transparent'}`, background: playingId === t.id ? 'rgba(245,158,11,.06)' : '', transition: 'all .18s' }}
                        onMouseEnter={e => { if (playingId !== t.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.04)' }}
                        onMouseLeave={e => { if (playingId !== t.id) (e.currentTarget as HTMLDivElement).style.background = '' }}>
                        <span style={{ fontSize: 18, fontWeight: 900, width: 32, textAlign: 'center', flexShrink: 0, color: i < 3 ? 'transparent' : 'rgba(255,255,255,.12)', background: i < 3 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '', WebkitBackgroundClip: i < 3 ? 'text' : undefined, WebkitTextFillColor: i < 3 ? 'transparent' : undefined }}>
                            {playingId === t.id ? '▶' : i + 1}
                        </span>
                        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0, position: 'relative' }}>
                            {t.cover ? <img src={t.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>}
                            <span style={{ position: 'absolute', top: 3, right: 3, fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 3, background: t.type === 'op' ? '#f59e0b' : '#a78bfa', color: t.type === 'ed' ? '#fff' : '#000' }}>{t.type.toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: playingId === t.id ? '#fbbf24' : 'rgba(255,255,255,.88)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.38)', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.artist}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', margin: 0 }}>{t.animeName}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                            <button onClick={e => { e.stopPropagation(); handleVote(t.id) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1px solid ${voted.has(t.id) ? '#f59e0b' : 'rgba(255,255,255,.12)'}`, background: voted.has(t.id) ? 'rgba(245,158,11,.1)' : 'none', cursor: voted.has(t.id) ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, color: voted.has(t.id) ? '#f59e0b' : 'rgba(255,255,255,.4)', transition: 'all .2s' }}>
                                {voted.has(t.id) ? '🏆' : '👑'} {(votes[t.id] || 0).toLocaleString()}
                            </button>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.22)' }}>{ft(t.duration)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── OST 탭 ───────────────────────────────────────────────────
function OstTab({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState('전체')
    const prevTop = useRef<HTMLButtonElement>(null)
    const nextTop = useRef<HTMLButtonElement>(null)
    const prevOp = useRef<HTMLButtonElement>(null)
    const nextOp = useRef<HTMLButtonElement>(null)
    const prevEd = useRef<HTMLButtonElement>(null)
    const nextEd = useRef<HTMLButtonElement>(null)
    const prevBgm = useRef<HTMLButtonElement>(null)
    const nextBgm = useRef<HTMLButtonElement>(null)

    const top10 = [...tracks].sort(() => Math.random() - 0.5).slice(0, 10) // 실제로는 재생수 기준
    const opTracks = tracks.filter(t => t.type === 'op')
    const edTracks = tracks.filter(t => t.type === 'ed')
    const bgmTracks = tracks.filter(t => t.type === 'bgm' || t.type === 'ost')

    // 전체 태그 수집
    const allTags = ['전체', ...Array.from(new Set(tracks.flatMap(t => t.tags))).sort()]

    const tagFiltered = activeTag === '전체' ? tracks : tracks.filter(t => t.tags.includes(activeTag))
    const searchFiltered = search ? tagFiltered.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.animeName.toLowerCase().includes(search.toLowerCase()) ||
        t.artist.toLowerCase().includes(search.toLowerCase())
    ) : tagFiltered

    // 섹션별 그룹 (검색/태그 필터시)
    const isFiltering = search || activeTag !== '전체'

    return (
        <div>
            <style>{`@keyframes eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}`}</style>

            {/* 검색 + 태그 */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ position: 'relative', maxWidth: 440, marginBottom: 16 }}>
                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="애니·곡·아티스트 검색"
                        style={{ width: '100%', height: 40, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', fontSize: 13, padding: '0 16px 0 36px', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => (e.target.style.borderColor = '#6c63ff')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')} />
                </div>
                {/* 태그 칩 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {allTags.map(tag => (
                        <button key={tag} onClick={() => setActiveTag(tag)}
                            style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${activeTag === tag ? '#6c63ff' : 'rgba(255,255,255,.1)'}`, background: activeTag === tag ? 'rgba(108,99,255,.15)' : 'none', color: activeTag === tag ? '#a5a0ff' : 'rgba(255,255,255,.42)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {isFiltering ? (
                /* 필터/검색 결과 */
                <div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.28)', marginBottom: 12 }}>{searchFiltered.length}곡</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {searchFiltered.map((t, i) => <TrackRow key={t.id} track={t} index={i} isPlaying={playingId === t.id} onPlay={onPlay} />)}
                    </div>
                </div>
            ) : (
                /* 기본: 섹션별 레이아웃 */
                <>
                    {/* TOP 10 */}
                    <HScrollSection title="🏆 인기 OST TOP 10" tracks={top10} playingId={playingId} onPlay={onPlay} prevRef={prevTop} nextRef={nextTop} showCard />

                    {/* 오프닝 */}
                    {opTracks.length > 0 && <HScrollSection title="🎬 오프닝 모음" tracks={opTracks} playingId={playingId} onPlay={onPlay} prevRef={prevOp} nextRef={nextOp} />}

                    {/* 엔딩 */}
                    {edTracks.length > 0 && <HScrollSection title="🌙 엔딩 모음" tracks={edTracks} playingId={playingId} onPlay={onPlay} prevRef={prevEd} nextRef={nextEd} />}

                    {/* BGM */}
                    {bgmTracks.length > 0 && <HScrollSection title="🎼 BGM / 스코어" tracks={bgmTracks} playingId={playingId} onPlay={onPlay} prevRef={prevBgm} nextRef={nextBgm} />}

                    {/* 태그별 섹션 */}
                    <div style={{ marginTop: 8 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 20px' }}>🏷️ 태그별 OST</h2>
                        {['전투', '감성', '로맨스', '새벽감성', '열혈', '힐링'].map(tag => {
                            const tagged = tracks.filter(t => t.tags.includes(tag))
                            if (!tagged.length) return null
                            return <TagSection key={tag} tag={`#${tag}`} tracks={tagged} playingId={playingId} onPlay={onPlay} />
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function OstPage() {
    const [tracks, setTracks] = useState<Track[]>([])
    const [loading, setLoading] = useState(true)
    const [loadCount, setLoadCount] = useState(0)
    const [activeTab, setActiveTab] = useState<'ost' | 'op'>('ost')
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
    const [progress, setProgress] = useState(0)
    const [volume, setVolume] = useState(0.8)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tracksRef = useRef<Track[]>([])

    useEffect(() => { tracksRef.current = tracks }, [tracks])
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            // 핵심 쿼리 8개만 → 전부 병렬 → limit 50으로 줄임
            const queries = [
                'anime opening theme',
                'anime ending theme',
                'anime original soundtrack',
                'jujutsu kaisen demon slayer attack titan',
                'naruto bleach one piece',
                'spy family frieren chainsaw man',
                'violet evergarden fullmetal alchemist',
                'haikyuu mob psycho blue lock',
            ]
            const seen = new Set<string>()
            const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 50)))
            const allTracks: Track[] = []
            results.flat().forEach(t => {
                if (!seen.has(t.id)) { seen.add(t.id); allTracks.push(t) }
            })
            setTracks(allTracks)
            setLoadCount(allTracks.length)
            setLoading(false)
        }
        load()
    }, [])

    const stopAudio = useCallback(() => {
        audioRef.current?.pause()
        if (progressRef.current) clearInterval(progressRef.current)
        setPlayingId(null); setProgress(0)
    }, [])

    const startPlay = useCallback((track: Track) => {
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
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 30)) * 100)
        }, 200)
        audioRef.current.onended = () => {
            const all = tracksRef.current.filter(t => t.previewUrl)
            const idx = all.findIndex(t => t.id === track.id)
            if (idx < all.length - 1) startPlay(all[idx + 1]); else stopAudio()
        }
    }, [stopAudio, volume])

    const handlePlay = useCallback((track: Track) => {
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

    const opEdTracks = tracks.filter(t => t.type === 'op' || t.type === 'ed')

    return (
        <>
            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: currentTrack ? 96 : 0 }}>
                <style>{`
                    .ost-header{padding:0 48px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:0;background:linear-gradient(160deg,rgba(108,99,255,.08) 0%,transparent 60%)}
                    .ost-ptab{display:flex;align-items:center;gap:8px;padding:18px 20px;font-size:15px;font-weight:700;color:rgba(255,255,255,.4);background:none;border:none;cursor:pointer;position:relative;transition:color .2s}
                    .ost-ptab:hover{color:rgba(255,255,255,.75)}
                    .ost-ptab.a{color:#fff}
                    .ost-ptab.a::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#6c63ff;border-radius:1px}
                    .ost-ptab.oa{color:#f59e0b}
                    .ost-ptab.oa::after{background:#f59e0b}
                    .ost-badge{font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.5)}
                    .ost-ptab.a .ost-badge{background:rgba(108,99,255,.2);color:#9d97ff}
                    .ost-ptab.oa .ost-badge{background:rgba(245,158,11,.2);color:#fbbf24}
                    .ost-loading-bar{height:3px;background:rgba(255,255,255,.06);position:relative;overflow:hidden}
                    .ost-loading-bar::after{content:'';position:absolute;left:-40%;width:40%;height:100%;background:linear-gradient(to right,transparent,#6c63ff,transparent);animation:ost-shimmer 1.2s infinite}
                    @keyframes ost-shimmer{to{left:100%}}
                `}</style>

                {/* 상단 탭 */}
                <div className="ost-header">
                    <button className={`ost-ptab${activeTab === 'ost' ? ' a' : ''}`} onClick={() => setActiveTab('ost')}>
                        🎵 OST <span className="ost-badge">{tracks.length}</span>
                    </button>
                    <button className={`ost-ptab${activeTab === 'op' ? ' oa' : ''}`} onClick={() => setActiveTab('op')}>
                        🏆 OP·ED 모드 <span className="ost-badge">{opEdTracks.length}</span>
                    </button>
                    {loading && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'ost-shimmer2 .7s linear infinite' }} />
                        {loadCount}곡 로드 중...
                    </span>}
                </div>

                {/* 로딩바 */}
                {loading && <div className="ost-loading-bar" />}

                <div style={{ padding: '28px 48px 60px' }}>
                    {activeTab === 'ost'
                        ? <OstTab tracks={tracks} playingId={playingId} onPlay={handlePlay} />
                        : <OpTab tracks={opEdTracks} playingId={playingId} onPlay={handlePlay} />
                    }
                </div>
            </div>

            {currentTrack && (
                <BottomPlayer
                    track={currentTrack} isPlaying={playingId === currentTrack.id}
                    progress={progress} volume={volume}
                    onPlayPause={() => playingId === currentTrack.id ? stopAudio() : startPlay(currentTrack)}
                    onSeek={handleSeek} onPrev={handlePrev} onNext={handleNext}
                    onVolume={setVolume}
                    onClose={() => { stopAudio(); setCurrentTrack(null) }}
                    accent={activeTab === 'op' ? '#f59e0b' : '#6c63ff'}
                />
            )}
        </>
    )
}
