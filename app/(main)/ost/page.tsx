'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import 'swiper/css'
import { useAuthStore } from '@/store/useAuthStore'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const ITUNES_BASE = 'https://itunes.apple.com/search'

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

interface NewRelease {
    id: string
    title: string
    cover: string
    animeName: string
    artist: string
    previewUrl: string | null
    isNew?: boolean
}

interface HotAnime {
    id: number
    name: string
    poster: string
    track: Track | null
}

function classifyTrack(item: any): { type: Track['type']; tags: string[] } {
    const name = (item.trackName || '').toLowerCase()
    const col = (item.collectionName || '').toLowerCase()
    const tags: string[] = []
    let type: Track['type'] = 'ost'
    if (name.includes('opening') || name.includes(' op ') || col.includes('opening')) { type = 'op'; tags.push('오프닝') }
    else if (name.includes('ending') || name.includes(' ed ') || col.includes('ending')) { type = 'ed'; tags.push('엔딩') }
    else if (col.includes('soundtrack') || col.includes('bgm') || col.includes('ost')) { type = 'bgm'; tags.push('BGM') }
    if (name.includes('battle') || name.includes('fight')) tags.push('전투')
    if (name.includes('sad') || name.includes('cry')) tags.push('감성')
    if (name.includes('love') || name.includes('romance')) tags.push('로맨스')
    if (name.includes('night') || name.includes('moon') || name.includes('star')) tags.push('새벽감성')
    if (name.includes('epic') || name.includes('hero')) tags.push('열혈')
    if (name.includes('peace') || name.includes('calm') || name.includes('piano')) tags.push('힐링')
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

// 애니 여부 판별 - 영어 팝/서양 뮤직 필터
function isAnimeTrack(item: any): boolean {
    const col = (item.collectionName || '').toLowerCase()
    const artist = (item.artistName || '').toLowerCase()
    const name = (item.trackName || '').toLowerCase()
    // 명백한 비애니 필터
    const nonAnime = ['disney', 'pixar', 'marvel', 'frozen', 'moana', 'aladdin', 'john williams',
        'taylor swift', 'billie eilish', 'drake', 'beyonce', 'ed sheeran', 'ariana',
        'christmas', 'jazz', 'classical', 'country', 'hip hop', 'rap', 'k-pop', 'kpop']
    if (nonAnime.some(k => col.includes(k) || artist.includes(k) || name.includes(k))) return false
    // 애니/일본 키워드 있으면 통과
    const animeKeywords = ['anime', 'ost', 'opening', 'ending', 'op', 'ed', 'bgm', 'soundtrack',
        'アニメ', '主題歌', 'テーマ', 'ゲーム', 'tv', 'animation']
    if (animeKeywords.some(k => col.includes(k) || name.includes(k))) return true
    // 일본어 문자 포함이면 통과
    if (/[぀-ゟ゠-ヿ一-鿿]/.test(col + name + artist)) return true
    return false
}

async function fetchItunesAnime(term: string, limit = 50): Promise<Track[]> {
    try {
        const res = await fetch(`${ITUNES_BASE}?term=${encodeURIComponent(term)}&media=music&genreId=27&limit=${limit}&country=JP`)
        const data = await res.json()
        return (data.results || [])
            .filter((item: any) => item.previewUrl && item.artworkUrl100 && isAnimeTrack(item))
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

// 신곡 섹션
async function fetchNewReleases(): Promise<Track[]> {
    const queries = ['anime 2025 opening', 'anime 2024 ending theme', 'new anime ost 2025']
    const seen = new Set<string>()
    const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 20)))
    const all: Track[] = []
    results.flat().forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); all.push(t) } })
    return all.slice(0, 12)
}

// 화제의 애니 OST
async function fetchHotAnimeOst(): Promise<HotAnime[]> {
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=1`
        )
        const data = await res.json()
        const animes = (data.results || []).slice(0, 8)
        return await Promise.all(animes.map(async (anime: any) => {
            const tracks = await fetchItunesAnime(anime.name || anime.original_name, 5)
            return {
                id: anime.id,
                name: anime.name || anime.original_name,
                poster: anime.poster_path ? `https://image.tmdb.org/t/p/w200${anime.poster_path}` : '',
                track: tracks[0] || null,
            }
        }))
    } catch { return [] }
}

// ── 하단 플레이어 ─────────────────────────────────────────────
function BottomPlayer({ track, isPlaying, progress, volume, onPlayPause, onSeek, onPrev, onNext, onClose, onVolume, audioRef: externalAudioRef, accent = '#6c63ff' }: any) {
    const barRef = useRef<HTMLDivElement>(null)
    const volRef = useRef<HTMLDivElement>(null)
    const elapsed = Math.floor((progress / 100) * (track.duration || 30))
    const handleSeek = (e: React.MouseEvent) => { if (!barRef.current) return; const r = barRef.current.getBoundingClientRect(); onSeek(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }
    const handleVol = (e: React.MouseEvent) => { if (!volRef.current) return; const r = volRef.current.getBoundingClientRect(); onVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))) }
    // Web Audio API 파형
    const audioCtxRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
    const rafRef = useRef<number>(0)
    const [bars, setBars] = useState<number[]>(Array(24).fill(2))

    useEffect(() => {
        if (!isPlaying) {
            setBars(Array(24).fill(2))
            cancelAnimationFrame(rafRef.current)
            return
        }
        const audioEl = externalAudioRef?.current as HTMLAudioElement | null
        if (!audioEl) return
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            const ctx = audioCtxRef.current
            if (ctx.state === 'suspended') ctx.resume()
            if (!analyserRef.current) {
                analyserRef.current = ctx.createAnalyser()
                analyserRef.current.fftSize = 128
            }
            if (!sourceRef.current) {
                try {
                    sourceRef.current = ctx.createMediaElementSource(audioEl)
                    sourceRef.current.connect(analyserRef.current)
                    analyserRef.current.connect(ctx.destination)
                } catch {}
            }
            const analyser = analyserRef.current
            const dataArr = new Uint8Array(analyser.frequencyBinCount)
            const draw = () => {
                rafRef.current = requestAnimationFrame(draw)
                analyser.getByteFrequencyData(dataArr)
                const newBars = Array.from({ length: 24 }, (_, i) => {
                    const idx = Math.floor(i * dataArr.length / 24)
                    return Math.max(2, (dataArr[idx] / 255) * 24)
                })
                setBars(newBars)
            }
            draw()
        } catch(e) { console.warn('AudioContext error:', e) }
        return () => cancelAnimationFrame(rafRef.current)
    }, [isPlaying, externalAudioRef])

    return (
        <>
            <style>{`
                .bp{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(12,11,22,.97);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.08);height:88px;display:flex;align-items:center;padding:0 24px;animation:bp-in .25s ease}
                @keyframes bp-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
                .bp-seekbar{position:absolute;top:-1px;left:0;right:0;height:4px;background:rgba(255,255,255,.08);cursor:pointer}
                .bp-left{display:flex;align-items:center;gap:13px;width:280px;flex-shrink:0}
                .bp-cover{width:52px;height:52px;border-radius:8px;overflow:hidden;background:#1a1a1a;flex-shrink:0;position:relative}
                .bp-cover img{width:100%;height:100%;object-fit:cover}
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
                .bp-right{display:flex;align-items:center;gap:12px;width:200px;justify-content:flex-end;flex-shrink:0}
                .bp-volbar{width:72px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer}
                .bp-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);transition:all .2s}
                .bp-close:hover{background:rgba(255,255,255,.13);color:#fff}
                .bp-eq{display:flex;align-items:flex-end;gap:2px;height:24px}
                .bp-eq span{display:block;width:3px;border-radius:2px;transition:height .06s ease}
            `}</style>
            <div className="bp">
                <div ref={barRef} className="bp-seekbar" onClick={handleSeek}>
                    <div style={{ height: '100%', background: `linear-gradient(to right,${accent},${accent}99)`, width: `${progress}%`, transition: 'width .2s linear' }} />
                </div>
                <div className="bp-left">
                    <div className="bp-cover">
                        {track.cover ? <img src={track.cover} alt={track.title} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🎵</div>}
                    </div>
                    <div className="bp-tinfo">
                        <p className="bp-tname">{track.title}</p>
                        <p className="bp-tsub">{track.animeName} · {track.artist}</p>
                    </div>
                </div>
                <div className="bp-center">
                    <div className="bp-btns">
                        <button className="bp-btn" onClick={onPrev}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4"/><rect x="5" y="4" width="3" height="16"/></svg></button>
                        <button className="bp-play" onClick={onPlayPause}>
                            {isPlaying ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:2}}><polygon points="5,3 19,12 5,21"/></svg>}
                        </button>
                        <button className="bp-btn" onClick={onNext}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="16" y="4" width="3" height="16"/></svg></button>
                    </div>
                    <div className="bp-prog-row">
                        <span className="bp-time">{ft(elapsed)}</span>
                        <div ref={barRef} className="bp-progbar" onClick={handleSeek}>
                            <div style={{height:'100%',background:accent,borderRadius:2,width:`${progress}%`,transition:'width .2s linear'}}/>
                        </div>
                        <span className="bp-time" style={{textAlign:'right'}}>{ft(track.duration||30)}</span>
                    </div>
                </div>
                <div className="bp-right">
                    {isPlaying && (
                        <div className="bp-eq">
                            {bars.map((h, i) => (
                                <span key={i} style={{ background: accent, height: h, minHeight: 2 }} />
                            ))}
                        </div>
                    )}
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <button className="bp-btn" onClick={() => onVolume(volume === 0 ? 0.7 : 0)}>
                            {volume === 0
                                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            }
                        </button>
                        <div ref={volRef} className="bp-volbar" onClick={handleVol}>
                            <div style={{height:'100%',background:'rgba(255,255,255,.6)',borderRadius:2,width:`${volume*100}%`}}/>
                        </div>
                    </div>
                    <button className="bp-close" onClick={onClose}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
            </div>
        </>
    )
}

function TrackRow({ track, index, isPlaying, onPlay }: { track: Track; index: number; isPlaying: boolean; onPlay: (t: Track) => void }) {
    return (
        <div onClick={() => onPlay(track)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:8, cursor: track.previewUrl ? 'pointer' : 'default', opacity: track.previewUrl ? 1 : 0.35, background: isPlaying ? 'rgba(108,99,255,.1)' : '', border:`1px solid ${isPlaying ? 'rgba(108,99,255,.2)' : 'transparent'}`, transition:'background .15s' }}
            onMouseEnter={e => { if(!isPlaying)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.04)' }}
            onMouseLeave={e => { if(!isPlaying)(e.currentTarget as HTMLDivElement).style.background='' }}>
            <span style={{fontSize:12,color:isPlaying?'#6c63ff':'rgba(255,255,255,.22)',width:22,textAlign:'center',flexShrink:0}}>{index+1}</span>
            <div style={{width:42,height:42,borderRadius:7,overflow:'hidden',background:'#1a1a1a',flexShrink:0}}>
                {track.cover ? <img src={track.cover} alt={track.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🎵</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:isPlaying?'#a5a0ff':'rgba(255,255,255,.85)',margin:'0 0 2px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{track.title}</p>
                <p style={{fontSize:11,color:'rgba(255,255,255,.3)',margin:0,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{track.artist}</p>
            </div>
            <span style={{fontSize:11,color:'rgba(255,255,255,.2)',width:32,textAlign:'right',flexShrink:0}}>{ft(track.duration)}</span>
            {isPlaying
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.22)"><polygon points="5,3 19,12 5,21"/></svg>
            }
        </div>
    )
}

// ── 신곡 섹션 UI ──────────────────────────────────────────────
function NewSection({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    const main = tracks[0]
    const subs = tracks.slice(1, 5)
    if (!main) return null
    const GAP = 12
    return (
        <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 800, padding: '3px 10px', background: '#6c63ff', borderRadius: 6, color: '#fff' }}>신곡</span>
            </div>
            {/* 왼쪽:오른쪽 = 1:1 비율, 오른쪽은 2x2 그리드 */}
            <div style={{ display: 'flex', gap: GAP, height: 'calc((100vw - 96px - 244px) / 2)' }}>
                {/* 왼쪽 메인 카드 - 전체의 절반 */}
                <div onClick={() => main.previewUrl && onPlay(main)}
                    style={{ flex: 1, borderRadius: 20, overflow: 'hidden', cursor: main.previewUrl ? 'pointer' : 'default', position: 'relative', background: '#111', transition: 'transform .25s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                    {main.cover && <img src={main.cover} alt={main.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, transparent 50%)' }} />
                    {playingId === main.id && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                            {[12,26,18,22].map((h,i) => <div key={i} style={{ width: 7, height: h, background: '#fff', borderRadius: 3, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${i*0.1}s` }} />)}
                        </div>
                    </div>}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px' }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{main.title}</p>
                        <p style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', margin: 0 }}>{main.animeName} · {main.artist}</p>
                    </div>
                </div>
                {/* 오른쪽 2x2 */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP }}>
                    {subs.map(t => (
                        <div key={t.id} onClick={() => t.previewUrl && onPlay(t)}
                            style={{ borderRadius: 16, overflow: 'hidden', cursor: t.previewUrl ? 'pointer' : 'default', position: 'relative', background: '#111', transition: 'transform .25s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                            {t.cover && <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, transparent 55%)' }} />
                            {playingId === t.id && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.35)' }} />}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px' }}>
                                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}


// ── 주간 TOP 10 ───────────────────────────────────────────────
function WeeklyTop10({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    if (!tracks.length) return null
    return (
        <section style={{ marginBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 18 }}>🎵</span>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>라프텔Music 주간 TOP 10</h2>
            </div>
            {/* Swiper - 헤더 왼쪽 기준점과 앨범 왼쪽 기준점 일치 */}
            <Swiper modules={[FreeMode]} freeMode={{ sticky: false }}
                slidesPerView={5} spaceBetween={16}
                style={{ overflow: 'visible' }}>
                {tracks.map((t, i) => (
                    <SwiperSlide key={t.id}>
                        <div onClick={() => onPlay(t)} style={{ cursor: 'pointer', transition: 'transform .25s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                            {/* 앨범 자켓 - 1:1 정사각형, 왼쪽 기준 */}
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 16, overflow: 'visible' }}>
                                {/* 앨범 이미지 */}
                                <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', background: '#1a1a1a', boxShadow: '0 8px 28px rgba(0,0,0,.8)' }}>
                                    {t.cover ? <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎵</div>}
                                    {isPlaying(t.id, playingId) && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                                            {[6,14,10,12].map((h,j) => <div key={j} style={{ width: 4, height: h, background: '#fff', borderRadius: 2, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${j*0.1}s` }} />)}
                                        </div>
                                    </div>}
                                </div>
                                {/* 숫자 - 앨범 왼쪽 하단에 중앙 정렬로 걸침
                                    translateX(-50%) translateY(50%) = 앨범 좌측하단 모서리 기준 중앙 */}
                                <span style={{
                                    position: 'absolute',
                                    left: 0,
                                    bottom: 0,
                                    transform: 'translate(-30%, 30%)',
                                    fontSize: 'clamp(48px, 6vw, 96px)',
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    color: isPlaying(t.id, playingId) ? '#6c63ff' : '#fff',
                                    zIndex: 5,
                                    textShadow: '0 2px 16px rgba(0,0,0,1), 0 0 40px rgba(0,0,0,.8)',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                }}>{i + 1}</span>
                            </div>
                            {/* 텍스트 - 앨범 왼쪽 기준 */}
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.85)', margin: '52px 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}

function isPlaying(id: string, playingId: string | null) { return playingId === id }

// ── 취향저격 ──────────────────────────────────────────────────
function RecommendSection({ tracks, playingId, onPlay, userName }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void; userName: string }) {
    const picks = useMemo(() => [...tracks].sort(() => Math.random() - 0.5).slice(0, 21), [tracks.length])
    if (!picks.length) return null
    return (
        <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
                    <span style={{ color: '#9d97ff' }}>"{userName}"</span>님 취향저격 🎵
                </h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode slidesPerView={9} spaceBetween={16} style={{ overflow: 'visible' }}>
                {picks.map(t => (
                    <SwiperSlide key={t.id}>
                        <div onClick={() => onPlay(t)} style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform .25s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                            <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', border: playingId === t.id ? '4px solid #6c63ff' : '4px solid transparent', boxShadow: playingId === t.id ? '0 0 24px rgba(108,99,255,.6)' : 'none', transition: 'border-color .2s, box-shadow .2s' }}>
                                {t.cover ? <img src={t.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎵</div>}
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.85)', margin: '10px 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.artist}</p>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}

// ── 화제의 애니 OST ───────────────────────────────────────────
function HotAnimeSection({ hotAnimes, playingId, onPlay }: { hotAnimes: HotAnime[]; playingId: string | null; onPlay: (t: Track) => void }) {
    if (!hotAnimes.length) return null
    return (
        <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>화제의 애니메이션 OST</h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode slidesPerView={6} spaceBetween={16} style={{ overflow: 'visible' }}>
                {hotAnimes.map(anime => (
                    <SwiperSlide key={anime.id}>
                        <div onClick={() => anime.track && onPlay(anime.track)}
                            style={{ cursor: anime.track ? 'pointer' : 'default', transition: 'transform .25s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                            <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a', marginBottom: 10, position: 'relative', border: anime.track && playingId === anime.track.id ? '3px solid #6c63ff' : '3px solid transparent', boxShadow: '0 8px 24px rgba(0,0,0,.6)', transition: 'border-color .2s' }}>
                                {anime.poster ? <img src={anime.poster} alt={anime.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎌</div>}
                                {anime.track && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,.95), transparent)' }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: '#6c63ff', color: '#fff' }}>▶ {anime.track.type.toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.88)', margin: '0 0 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{anime.name}</p>
                            {anime.track && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{anime.track.title}</p>}
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}

// ── OP/ED 탭 ──────────────────────────────────────────────────
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
            {goat && (
                <div onClick={() => onPlay(goat)} style={{ position:'relative', borderRadius:14, overflow:'hidden', marginBottom:24, cursor:'pointer' }}>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1a1535,#0f0f2a)' }} />
                    {goat.cover && <div style={{ position:'absolute', inset:0, opacity:.22 }}><img src={goat.cover} style={{ width:'100%', height:'100%', objectFit:'cover', filter:'blur(14px) saturate(1.5)' }}/></div>}
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(0,0,0,.88) 40%,rgba(0,0,0,.2) 100%)' }} />
                    <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:20, padding:'24px 28px' }}>
                        <span style={{ fontSize:28 }}>🏆</span>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:10, fontWeight:800, color:'#f59e0b', letterSpacing:'.1em', textTransform:'uppercase', margin:'0 0 5px' }}>현재 1위 · GOAT {goat.type.toUpperCase()}</p>
                            <p style={{ fontSize:20, fontWeight:900, color:'#fff', margin:'0 0 3px', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{goat.title}</p>
                            <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', margin:'0 0 8px' }}>{goat.animeName} · {goat.artist}</p>
                            <p style={{ fontSize:12, color:'#fbbf24', fontWeight:700, margin:0 }}>★ {(votes[goat.id]||0).toLocaleString()}표</p>
                        </div>
                        {goat.cover && <div style={{ width:64, height:64, borderRadius:10, overflow:'hidden', flexShrink:0 }}><img src={goat.cover} style={{ width:'100%', height:'100%', objectFit:'cover' }}/></div>}
                        <button onClick={e => { e.stopPropagation(); onPlay(goat) }} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'#f59e0b', border:'none', borderRadius:9, color:'#000', fontSize:12, fontWeight:800, cursor:'pointer', flexShrink:0 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>재생
                        </button>
                    </div>
                </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                {[{id:'all',label:'전체'},{id:'op',label:'오프닝'},{id:'ed',label:'엔딩'}].map(t => (
                    <button key={t.id} onClick={() => setTypeFilter(t.id as any)}
                        style={{ padding:'6px 14px', borderRadius:7, border:`1px solid ${typeFilter===t.id?'#f59e0b':'rgba(255,255,255,.1)'}`, background:typeFilter===t.id?'rgba(245,158,11,.15)':'none', color:typeFilter===t.id?'#fbbf24':'rgba(255,255,255,.42)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                        {t.label}
                    </button>
                ))}
                <span style={{ fontSize:11, color:'rgba(255,255,255,.22)', marginLeft:4 }}>{sorted.length}곡</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {sorted.map((t, i) => (
                    <div key={t.id} onClick={() => onPlay(t)} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12, cursor:'pointer', border:`1px solid ${playingId===t.id?'rgba(245,158,11,.2)':'transparent'}`, background:playingId===t.id?'rgba(245,158,11,.06)':'', transition:'all .18s' }}
                        onMouseEnter={e => { if(playingId!==t.id)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.04)' }}
                        onMouseLeave={e => { if(playingId!==t.id)(e.currentTarget as HTMLDivElement).style.background='' }}>
                        <span style={{ fontSize:18, fontWeight:900, width:32, textAlign:'center', flexShrink:0, color:i<3?'transparent':'rgba(255,255,255,.12)', background:i<3?'linear-gradient(135deg,#f59e0b,#ef4444)':'', WebkitBackgroundClip:i<3?'text':undefined, WebkitTextFillColor:i<3?'transparent':undefined }}>
                            {playingId===t.id?'▶':i+1}
                        </span>
                        <div style={{ width:56, height:56, borderRadius:10, overflow:'hidden', background:'#1a1a1a', flexShrink:0, position:'relative' }}>
                            {t.cover?<img src={t.cover} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎵</div>}
                            <span style={{ position:'absolute', top:3, right:3, fontSize:9, fontWeight:800, padding:'2px 5px', borderRadius:3, background:t.type==='op'?'#f59e0b':'#a78bfa', color:t.type==='ed'?'#fff':'#000' }}>{t.type.toUpperCase()}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:14, fontWeight:700, color:playingId===t.id?'#fbbf24':'rgba(255,255,255,.88)', margin:'0 0 3px', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{t.title}</p>
                            <p style={{ fontSize:12, color:'rgba(255,255,255,.38)', margin:'0 0 4px', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{t.artist}</p>
                            <p style={{ fontSize:11, color:'rgba(255,255,255,.2)', margin:0 }}>{t.animeName}</p>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:7, flexShrink:0 }}>
                            <button onClick={e => { e.stopPropagation(); handleVote(t.id) }}
                                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, border:`1px solid ${voted.has(t.id)?'#f59e0b':'rgba(255,255,255,.12)'}`, background:voted.has(t.id)?'rgba(245,158,11,.1)':'none', cursor:voted.has(t.id)?'default':'pointer', fontSize:12, fontWeight:600, color:voted.has(t.id)?'#f59e0b':'rgba(255,255,255,.4)', transition:'all .2s' }}>
                                {voted.has(t.id)?'🏆':'👑'} {(votes[t.id]||0).toLocaleString()}
                            </button>
                            <span style={{ fontSize:11, color:'rgba(255,255,255,.22)' }}>{ft(t.duration)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── OST 탭 (사이드바 필터 포함) ────────────────────────────────
function OstTab({ tracks, playingId, onPlay, newTracks, hotAnimes, userName }: {
    tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void
    newTracks: Track[]; hotAnimes: HotAnime[]; userName: string
}) {
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState('전체')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeType, setActiveType] = useState('전체')

    const top10 = useMemo(() => {
        if (!tracks.length) return []
        return [...tracks].sort((a, b) => (b.popularity || b.duration || 0) - (a.popularity || a.duration || 0)).slice(0, 10)
    }, [tracks.length > 0 ? tracks[0].id : ''])

    const allTags = ['전체', '오프닝', '엔딩', 'BGM', '전투', '감성', '로맨스', '새벽감성', '열혈', '힐링']
    const typeFilters = ['전체', 'OP', 'ED', 'BGM', 'OST']

    const filtered = useMemo(() => {
        let result = tracks
        if (activeTag !== '전체') result = result.filter(t => t.tags.includes(activeTag) || (activeTag === '오프닝' && t.type === 'op') || (activeTag === '엔딩' && t.type === 'ed') || (activeTag === 'BGM' && (t.type === 'bgm' || t.type === 'ost')))
        if (activeType !== '전체') result = result.filter(t => t.type === activeType.toLowerCase())
        if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.animeName.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase()))
        return result
    }, [tracks, activeTag, activeType, search])

    const isFiltering = search || activeTag !== '전체' || activeType !== '전체'

    return (
        <div style={{ display: 'flex', gap: 0 }}>
            {/* 사이드바 필터 */}
            <div style={{ width: sidebarOpen ? 220 : 0, minWidth: sidebarOpen ? 220 : 0, overflow: 'hidden', transition: 'all .3s', flexShrink: 0 }}>
                <div style={{ width: 220, paddingRight: 24 }}>
                    <div style={{ marginBottom: 24 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', margin: '0 0 10px' }}>타입</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {typeFilters.map(f => (
                                <button key={f} onClick={() => setActiveType(f)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: activeType === f ? 'rgba(108,99,255,.15)' : 'none', color: activeType === f ? '#9d97ff' : 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: activeType === f ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 20 }} />
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', margin: '0 0 10px' }}>분위기</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {allTags.map(tag => (
                                <button key={tag} onClick={() => setActiveTag(tag)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: activeTag === tag ? 'rgba(108,99,255,.15)' : 'none', color: activeTag === tag ? '#9d97ff' : 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: activeTag === tag ? 700 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
                {/* 검색 + 필터 토글 */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                    <button onClick={() => setSidebarOpen(v => !v)}
                        style={{ width: 36, height: 36, borderRadius: 8, background: sidebarOpen ? 'rgba(108,99,255,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${sidebarOpen ? 'rgba(108,99,255,.3)' : 'rgba(255,255,255,.1)'}`, color: sidebarOpen ? '#9d97ff' : 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="애니·곡·아티스트 검색"
                            style={{ width: '100%', height: 36, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', fontSize: 13, padding: '0 16px 0 36px', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => (e.target.style.borderColor = '#6c63ff')}
                            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')} />
                    </div>
                </div>

                {isFiltering ? (
                    <div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.28)', marginBottom: 12 }}>{filtered.length}곡</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {filtered.map((t, i) => <TrackRow key={t.id} track={t} index={i} isPlaying={playingId === t.id} onPlay={onPlay} />)}
                        </div>
                    </div>
                ) : (
                    <>
                        <NewSection tracks={newTracks} playingId={playingId} onPlay={onPlay} />
                        <WeeklyTop10 tracks={top10} playingId={playingId} onPlay={onPlay} />
                        <RecommendSection tracks={tracks} playingId={playingId} onPlay={onPlay} userName={userName} />
                        <HotAnimeSection hotAnimes={hotAnimes} playingId={playingId} onPlay={onPlay} />
                        {/* 나머지 태그별 */}
                        {['전투', '감성', '로맨스', '새벽감성', '열혈', '힐링', '오프닝', '엔딩'].map(tag => {
                            const tagged = tracks.filter(t => t.tags.includes(tag))
                            if (!tagged.length) return null
                            return (
                                <section key={tag} style={{ marginBottom: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>#{tag}</h2>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>{tagged.length}곡</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {tagged.slice(0, 20).map((t, i) => <TrackRow key={t.id} track={t} index={i} isPlaying={playingId === t.id} onPlay={onPlay} />)}
                                    </div>
                                </section>
                            )
                        })}
                    </>
                )}
            </div>
        </div>
    )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function OstPage() {
    const { user } = useAuthStore()
    const [tracks, setTracks] = useState<Track[]>([])
    const [newTracks, setNewTracks] = useState<Track[]>([])
    const [hotAnimes, setHotAnimes] = useState<HotAnime[]>([])
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
    const userName = user?.name || user?.email?.split('@')[0] || '라프텔'

    useEffect(() => { tracksRef.current = tracks }, [tracks])
    const getPlayableTracks = useCallback(() => tracksRef.current.filter(t => t.previewUrl), [])
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const queries = [
                'anime opening theme', 'anime ending theme', 'anime original soundtrack',
                'jujutsu kaisen ost', 'demon slayer ost', 'attack on titan ost',
                'naruto shippuden ost', 'bleach ost', 'one piece ost',
                'spy family ost', 'frieren ost', 'chainsaw man ost',
                'violet evergarden ost', 'fullmetal alchemist ost',
                'haikyuu ost', 'mob psycho ost', 'blue lock ost',
                're zero ost', 'overlord ost', 'death note ost',
            ]
            const seen = new Set<string>()
            const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 30)))
            const allTracks: Track[] = []
            results.flat().forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); allTracks.push(t) } })
            setTracks(allTracks)
            setLoadCount(allTracks.length)

            // 병렬로 신곡 + 화제의 애니 로드
            const [newT, hotA] = await Promise.all([fetchNewReleases(), fetchHotAnimeOst()])
            setNewTracks(newT)
            setHotAnimes(hotA)
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
            const all = getPlayableTracks()
            const idx = all.findIndex(t => t.id === track.id)
            if (idx >= 0 && idx < all.length - 1) startPlay(all[idx + 1]); else stopAudio()
        }
    }, [stopAudio, volume, getPlayableTracks])

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
        const all = getPlayableTracks()
        const idx = all.findIndex(t => t.id === currentTrack.id)
        if (idx > 0) startPlay(all[idx - 1])
    }, [currentTrack, startPlay, getPlayableTracks])

    const handleNext = useCallback(() => {
        if (!currentTrack) return
        const all = getPlayableTracks()
        const idx = all.findIndex(t => t.id === currentTrack.id)
        if (idx < all.length - 1) startPlay(all[idx + 1])
    }, [currentTrack, startPlay, getPlayableTracks])

    const opEdTracks = tracks.filter(t => t.type === 'op' || t.type === 'ed')

    return (
        <>
            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: currentTrack ? 96 : 0 }}>
                <style>{`
                    .ost-header{padding:0 48px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;background:linear-gradient(160deg,rgba(108,99,255,.08) 0%,transparent 60%)}
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
                    @keyframes eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
                `}</style>

                <div className="ost-header">
                    <button className={`ost-ptab${activeTab === 'ost' ? ' a' : ''}`} onClick={() => setActiveTab('ost')}>
                        🎵 OST <span className="ost-badge">{tracks.length}</span>
                    </button>
                    <button className={`ost-ptab${activeTab === 'op' ? ' oa' : ''}`} onClick={() => setActiveTab('op')}>
                        🏆 OP·ED 모드 <span className="ost-badge">{opEdTracks.length}</span>
                    </button>
                    {loading && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'ost-shimmer 1s linear infinite' }} />
                        {loadCount}곡 로드 중...
                    </span>}
                </div>
                {loading && <div className="ost-loading-bar" />}

                <div style={{ padding: '28px 48px 60px' }}>
                    {activeTab === 'ost'
                        ? <OstTab tracks={tracks} playingId={playingId} onPlay={handlePlay} newTracks={newTracks} hotAnimes={hotAnimes} userName={userName} />
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
                    audioRef={audioRef}
                    accent={activeTab === 'op' ? '#f59e0b' : '#6c63ff'}
                />
            )}
        </>
    )
}
