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
    id: number | string
    name: string
    poster: string
    track: Track | null
    tracks: Track[]  // 해당 애니의 전체 검색 트랙 목록
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

async function fetchItunesAnime(term: string, limit = 50): Promise<Track[]> {
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

// 신곡 섹션 — 각기 다른 애니 OST 9곡
async function fetchNewReleases(): Promise<Track[]> {
    const queries = [
        '紅蓮華 LiSA 鬼滅の刃',
        'Ado うた ワンピース',
        'YOASOBI アニメ 推しの子',
        '廻廻奇譚 Eve 呪術廻戦',
        'FLOW GO アニメ',
        'スパイファミリー OP アニメ',
        '進撃の巨人 Linked Horizon',
    ]
    const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 5)))
    const seen = new Set<string>()
    const tracks: Track[] = []
    for (const list of results) {
        const pick = list.find(t => !seen.has(t.id) && t.previewUrl)
        if (pick) { seen.add(pick.id); tracks.push(pick) }
        if (tracks.length >= 7) break
    }
    return tracks
}

// 화제의 애니 OST - 고정 리스트 + TMDB 병행
// 포스터는 TMDB, 트랙은 iTunes 검색
const HOT_ANIME_LIST = [
    { name: '呪術廻戦', query: '呪術廻戦 ost' },
    { name: '鬼滅の刃', query: '鬼滅の刃 ost' },
    { name: '進撃の巨人', query: '進撃の巨人 ost' },
    { name: 'Spy x Family', query: 'spy x family ost' },
    { name: 'Frieren', query: 'frieren beyond journey end ost' },
    { name: 'Chainsaw Man', query: 'chainsaw man ost' },
    { name: 'Blue Lock', query: 'blue lock ost' },
    { name: 'Mob Psycho 100', query: 'mob psycho 100 ost' },
    { name: 'Violet Evergarden', query: 'violet evergarden ost' },
    { name: 'Re:Zero', query: 're zero starting life ost' },
    { name: 'Overlord', query: 'overlord anime ost' },
    { name: 'Haikyuu', query: 'haikyuu ost' },
    { name: 'Fullmetal Alchemist Brotherhood', query: 'fullmetal alchemist brotherhood ost' },
    { name: 'Death Note', query: 'death note anime ost' },
    { name: 'Bleach TYBW', query: 'bleach thousand year blood war ost' },
    { name: 'One Piece', query: 'one piece ost' },
    { name: 'Naruto Shippuden', query: 'naruto shippuden ost' },
    { name: 'My Hero Academia', query: 'my hero academia ost' },
    { name: 'Demon Slayer', query: 'demon slayer kimetsu no yaiba ost' },
    { name: 'Vinland Saga', query: 'vinland saga ost' },
    { name: 'Steins;Gate', query: 'steins gate ost' },
    { name: 'Code Geass', query: 'code geass ost' },
    { name: 'Hunter x Hunter', query: 'hunter x hunter 2011 ost' },
    { name: 'Attack on Titan', query: 'attack on titan ost' },
    { name: 'Tokyo Ghoul', query: 'tokyo ghoul ost' },
    { name: 'Sword Art Online', query: 'sword art online ost' },
    { name: 'Evangelion', query: 'neon genesis evangelion ost' },
    { name: 'Dragon Ball Z', query: 'dragon ball z ost' },
    { name: 'Black Clover', query: 'black clover ost' },
    { name: 'Fairy Tail', query: 'fairy tail ost' },
]

async function fetchHotAnimeOst(): Promise<HotAnime[]> {
    // TMDB 포스터 가져오기
    const tmdbPosters: Record<string, string> = {}
    try {
        if (TMDB_KEY) {
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=1`
            )
            const data = await res.json()
                ; (data.results || []).forEach((anime: any) => {
                    const n = (anime.name || anime.original_name || '').toLowerCase()
                    if (anime.poster_path) tmdbPosters[n] = `https://image.tmdb.org/t/p/w200${anime.poster_path}`
                })
        }
    } catch { }

    // 각 애니마다 iTunes 트랙 검색 (병렬, 최대 5곡)
    const results = await Promise.all(
        HOT_ANIME_LIST.map(async (anime, idx) => {
            const tracks = await fetchItunesAnime(anime.query, 10)
            // 포스터: TMDB 매칭 시도 → 없으면 첫 트랙 커버
            const lname = anime.name.toLowerCase()
            const poster =
                tmdbPosters[lname] ||
                Object.keys(tmdbPosters).find(k => k.includes(lname.split(' ')[0]))?.split(':')[0] ||
                (tracks[0]?.cover || '')
            // TMDB에서 해당 애니 포스터 찾기
            const tmdbPoster = Object.entries(tmdbPosters).find(([k]) =>
                k.includes(anime.name.toLowerCase().split(' ')[0]) ||
                anime.name.toLowerCase().includes(k.split(' ')[0])
            )?.[1] || ''

            return {
                id: idx,
                name: anime.name,
                poster: tmdbPoster || (tracks[0]?.cover || ''),
                track: tracks[0] || null,
                tracks,
            }
        })
    )
    return results.filter(a => a.tracks.length > 0)
}

// ── 하단 플레이어 ─────────────────────────────────────────────
function BottomPlayer({ track, isPlaying, progress, volume, onPlayPause, onSeek, onPrev, onNext, onClose, onVolume, audioRef: externalAudioRef, accent = '#6c63ff' }: any) {
    const barRef = useRef<HTMLDivElement>(null)
    const volRef = useRef<HTMLDivElement>(null)
    const elapsed = Math.floor((progress / 100) * (track.duration || 30))
    const handleSeek = (e: React.MouseEvent) => { if (!barRef.current) return; const r = barRef.current.getBoundingClientRect(); onSeek(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))) }
    const handleVol = (e: React.MouseEvent) => { if (!volRef.current) return; const r = volRef.current.getBoundingClientRect(); onVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))) }
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
        const dummyEq = () => {
            const loop = () => {
                rafRef.current = requestAnimationFrame(loop)
                const t = Date.now() / 200
                setBars(Array.from({ length: 24 }, (_, i) =>
                    Math.max(3, Math.abs(Math.sin(t + i * 0.5)) * 18 + Math.random() * 5)
                ))
            }
            loop()
        }
        if (!audioEl) { dummyEq(); return () => cancelAnimationFrame(rafRef.current) }
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
                } catch { dummyEq(); return () => cancelAnimationFrame(rafRef.current) }
            }
            const analyser = analyserRef.current
            const dataArr = new Uint8Array(analyser.frequencyBinCount)
            const draw = () => {
                rafRef.current = requestAnimationFrame(draw)
                analyser.getByteFrequencyData(dataArr)
                setBars(Array.from({ length: 24 }, (_, i) => {
                    const idx = Math.floor(i * dataArr.length / 24)
                    return Math.max(2, (dataArr[idx] / 255) * 24)
                }))
            }
            draw()
        } catch { dummyEq() }
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
                        {track.cover ? <img src={track.cover} alt={track.title} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>}
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
                    {isPlaying && (
                        <div className="bp-eq">
                            {bars.map((h, i) => (
                                <span key={i} style={{ background: accent, height: h, minHeight: 2 }} />
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

function TrackRow({ track, index, isPlaying, onPlay }: { track: Track; index: number; isPlaying: boolean; onPlay: (t: Track) => void }) {
    return (
        <div onClick={() => onPlay(track)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: track.previewUrl ? 'pointer' : 'default', opacity: track.previewUrl ? 1 : 0.35, background: isPlaying ? 'rgba(108,99,255,.1)' : '', border: `1px solid ${isPlaying ? 'rgba(108,99,255,.2)' : 'transparent'}`, transition: 'background .15s' }}
            onMouseEnter={e => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.04)' }}
            onMouseLeave={e => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = '' }}>
            <span style={{ fontSize: 12, color: isPlaying ? '#6c63ff' : 'rgba(255,255,255,.22)', width: 22, textAlign: 'center', flexShrink: 0 }}>{index + 1}</span>
            <div style={{ width: 42, height: 42, borderRadius: 7, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                {track.cover ? <img src={track.cover} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎵</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? '#a5a0ff' : 'rgba(255,255,255,.85)', margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.artist}</p>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', width: 32, textAlign: 'right', flexShrink: 0 }}>{ft(track.duration)}</span>
            {isPlaying
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.22)"><polygon points="5,3 19,12 5,21" /></svg>
            }
        </div>
    )
}

// ── 신곡 섹션 UI: 왼쪽 큰 카드 1개 + 오른쪽 2행×4열 ──────────
function NewSection({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    const main = tracks[0]
    const subs = tracks.slice(1, 7) // 6개 → 3열×2행
    if (!main) return null
    const GAP = 25
    /*
     * 그리드: 5열 × 2행
     * 큰 카드: col 1~2, row 1~2 (2×2 정사각형 블록)
     * 작은 카드 6개: col 3~5, row 1~2 (각각 정사각형)
     *
     * 각 열 너비를 W라 하면:
     *   큰 카드 = 2W+GAP 너비, 2W+GAP 높이 → 정사각형
     *   작은 카드 = W 너비, W 높이 → 정사각형
     * gridAutoRows를 vw 기반으로 계산:
     *   전체 컨테이너 ≈ 100% - 96px(패딩) - 220px(사이드바)
     *   5열이므로 한 칸 ≈ (container - 4*GAP) / 5
     */
    return (
        <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 26, fontWeight: 800, padding: '3px 10px', color: '#fff' }}>방금 공개된 OST</span>
            </div>
            {/* aspectRatio 5/2 → 5열 기준 각 셀이 정사각형이 되는 비율 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gridTemplateRows: 'repeat(2, 1fr)',
                gap: GAP,
                aspectRatio: '5/2',
            }}>
                {/* 큰 카드: 2열×2행 span */}
                <div
                    onClick={() => main.previewUrl && onPlay(main)}
                    style={{
                        gridColumn: '1 / 3',
                        gridRow: '1 / 3',
                        borderRadius: 20,
                        overflow: 'hidden',
                        cursor: main.previewUrl ? 'pointer' : 'default',
                        position: 'relative',
                        background: '#111',
                        transition: 'transform .25s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                    {main.cover && <img src={main.cover} alt={main.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, transparent 55%)' }} />
                    {playingId === main.id && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                                {[12, 26, 18, 22].map((h, i) => (
                                    <div key={i} style={{ width: 7, height: h, background: '#fff', borderRadius: 3, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px' }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{main.title}</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', margin: 0 }}>{main.animeName} · {main.artist}</p>
                    </div>
                </div>

                {/* 작은 카드 6개: 3~5열, 1~2행 */}
                {subs.map(t => (
                    <div
                        key={t.id}
                        onClick={() => t.previewUrl && onPlay(t)}
                        style={{
                            borderRadius: 14,
                            overflow: 'hidden',
                            cursor: t.previewUrl ? 'pointer' : 'default',
                            position: 'relative',
                            background: '#111',
                            transition: 'transform .2s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                        {t.cover && <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.82) 0%, transparent 55%)' }} />
                        {playingId === t.id && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.35)' }} />}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

// ── 주간 TOP 10: 사진2 디자인 (앨범 우상단 + 숫자 좌하단 걸침 + 파란 테두리) ──
function WeeklyTop10({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    if (!tracks.length) return null
    return (
        <section style={{ marginBottom: 60, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 18 }}>🎵</span>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>라프텔Music 주간 TOP 10</h2>
            </div>
            <Swiper
                modules={[FreeMode]}
                freeMode={{ sticky: false }}
                slidesPerView={'auto'}
                spaceBetween={24}
                style={{ overflow: 'visible' }}>
                {tracks.map((t, i) => {
                    const playing = playingId === t.id
                    return (
                        <SwiperSlide key={t.id} style={{ width: 340 }}>
                            <div
                                onClick={() => onPlay(t)}
                                style={{ cursor: 'pointer', transition: 'transform .25s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                                {/*
                                  레이아웃:
                                  - 전체 컨테이너 340px
                                  - 숫자: 왼쪽 0~40px 영역, 앨범 좌하단 기준으로 밖으로 삐져나옴
                                  - 앨범: 오른쪽 40~340 = 300x300
                                */}
                                <div style={{ position: 'relative', width: 340, height: 340 }}>
                                    {/* 앨범 커버 — 오른쪽 300x300 */}
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        width: 300,
                                        height: 300,
                                        borderRadius: 14,
                                        overflow: 'hidden',
                                        background: '#1a1a1a',
                                        border: `3px solid ${playing ? '#6c63ff' : 'transparent'}`,
                                        boxShadow: playing
                                            ? '0 0 20px rgba(108,99,255,.55), 0 8px 24px rgba(0,0,0,.8)'
                                            : '0 8px 24px rgba(0,0,0,.8)',
                                        transition: 'border-color .2s, box-shadow .2s',
                                        zIndex: 1,
                                    }}>
                                        {t.cover
                                            ? <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎵</div>
                                        }
                                        {playing && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.38)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                                                    {[5, 12, 8, 10].map((h, j) => (
                                                        <div key={j} style={{ width: 3, height: h, background: '#fff', borderRadius: 2, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${j * 0.1}s` }} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* 순위 숫자 — 앨범 좌하단 기준으로 왼쪽 밖에 배치 */}
                                    <span style={{
                                        position: 'absolute',
                                        left: 0,
                                        bottom: 0,
                                        fontSize: 100,
                                        fontWeight: 900,
                                        lineHeight: 1,
                                        color: playing ? '#6c63ff' : '#fff',
                                        zIndex: 2,
                                        textShadow: '0 2px 20px rgba(0,0,0,.9)',
                                        userSelect: 'none',
                                        pointerEvents: 'none',
                                        transition: 'color .2s',
                                        letterSpacing: '-4px',
                                    }}>
                                        {i + 1}
                                    </span>
                                </div>
                                {/* 텍스트: 앨범 오른쪽 300px 기준, right:0 정렬 */}
                                <div style={{ paddingLeft: 40 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: playing ? '#a5a0ff' : 'rgba(255,255,255,.85)', margin: '8px 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                                </div>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </section>
    )
}

function isPlayingFn(id: string, playingId: string | null) { return playingId === id }

// ── 취향저격 ──────────────────────────────────────────────────
function RecommendSection({ tracks, playingId, onPlay, userName }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void; userName: string }) {
    const picks = useMemo(() => [...tracks].sort(() => Math.random() - 0.5).slice(0, 21), [tracks.length])
    if (!picks.length) return null
    return (
        <section style={{ marginBottom: 48, overflow: 'hidden' }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
                    <span style={{ color: '#9d97ff' }}>"{userName}"</span> 님 취향저격 🎵
                </h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode slidesPerView={'auto'} spaceBetween={14} style={{ overflow: 'visible' }}>
                {picks.map(t => (
                    <SwiperSlide key={t.id} style={{ width: 160 }}>
                        <div onClick={() => onPlay(t)} style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform .25s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                            <div style={{ width: 160, height: 160, borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', border: playingId === t.id ? '4px solid #6c63ff' : '4px solid transparent', boxShadow: playingId === t.id ? '0 0 24px rgba(108,99,255,.6)' : 'none', transition: 'border-color .2s' }}>
                                {t.cover ? <img src={t.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎵</div>}
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.85)', margin: '10px 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 160 }}>{t.animeName}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 160 }}>{t.artist}</p>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}

// ── 화제의 애니메이션 OST: 클릭 시 해당 애니 트랙 재생 ────────
function HotAnimeSection({
    hotAnimes,
    playingId,
    onPlayAnime,
}: {
    hotAnimes: HotAnime[]
    playingId: string | null
    onPlayAnime: (anime: HotAnime) => void
}) {
    if (!hotAnimes.length) return null
    return (
        <section style={{ marginBottom: 48, overflow: 'hidden' }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>화제의 애니메이션 OST</h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode slidesPerView={'auto'} spaceBetween={14} style={{ overflow: 'visible' }}>
                {hotAnimes.map(anime => {
                    const isActive = anime.tracks.some(t => t.id === playingId)
                    const playingTrack = anime.tracks.find(t => t.id === playingId)
                    return (
                        <SwiperSlide key={anime.id} style={{ width: 180 }}>
                            <div
                                onClick={() => anime.tracks.length > 0 && onPlayAnime(anime)}
                                style={{ cursor: anime.tracks.length > 0 ? 'pointer' : 'default', transition: 'transform .25s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                                <div style={{
                                    width: 180,
                                    height: 255,
                                    borderRadius: 14,
                                    overflow: 'hidden',
                                    background: '#1a1a1a',
                                    marginBottom: 10,
                                    position: 'relative',
                                    border: `3px solid ${isActive ? '#6c63ff' : 'transparent'}`,
                                    boxShadow: isActive ? '0 0 20px rgba(108,99,255,.45), 0 8px 24px rgba(0,0,0,.6)' : '0 8px 24px rgba(0,0,0,.6)',
                                    transition: 'border-color .2s, box-shadow .2s',
                                }}>
                                    {anime.poster
                                        ? <img src={anime.poster} alt={anime.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎌</div>
                                    }
                                    {/* 재생 중 오버레이 */}
                                    {isActive && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                                                {[8, 18, 12, 16, 10].map((h, j) => (
                                                    <div key={j} style={{ width: 4, height: h, background: '#fff', borderRadius: 2, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${j * 0.1}s` }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* 하단 배지: 해당 애니 첫 트랙 타입 표시 */}
                                    {anime.tracks.length > 0 && (
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,.95), transparent)' }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#6c63ff', color: '#fff' }}>
                                                ▶ {(anime.tracks[0].type || 'OST').toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginLeft: 6 }}>{anime.tracks.length}곡</span>
                                        </div>
                                    )}
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#a5a0ff' : 'rgba(255,255,255,.88)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 180 }}>{anime.name}</p>
                                {anime.tracks[0] && (
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 180 }}>
                                        {playingTrack?.title || anime.tracks[0].title}
                                    </p>
                                )}
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </section>
    )
}

// ── OST 탭 (사이드바 필터 포함) ────────────────────────────────
function OstTab({ tracks, playingId, onPlay, onPlayAnime, newTracks, hotAnimes, userName }: {
    tracks: Track[]
    playingId: string | null
    onPlay: (t: Track) => void
    onPlayAnime: (anime: HotAnime) => void
    newTracks: Track[]
    hotAnimes: HotAnime[]
    userName: string
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

    // 각 타입/태그별 정확한 카운트
    const typeCounts = useMemo(() => ({
        '전체': tracks.length,
        'OP': tracks.filter(t => t.type === 'op').length,
        'ED': tracks.filter(t => t.type === 'ed').length,
        'BGM': tracks.filter(t => t.type === 'bgm').length,
        'OST': tracks.filter(t => t.type === 'ost').length,
    }), [tracks])

    const tagCounts = useMemo(() => ({
        '전체': tracks.length,
        '오프닝': tracks.filter(t => t.type === 'op').length,
        '엔딩': tracks.filter(t => t.type === 'ed').length,
        'BGM': tracks.filter(t => t.type === 'bgm' || t.type === 'ost').length,
        '전투': tracks.filter(t => t.tags.includes('전투')).length,
        '감성': tracks.filter(t => t.tags.includes('감성')).length,
        '로맨스': tracks.filter(t => t.tags.includes('로맨스')).length,
        '새벽감성': tracks.filter(t => t.tags.includes('새벽감성')).length,
        '열혈': tracks.filter(t => t.tags.includes('열혈')).length,
        '힐링': tracks.filter(t => t.tags.includes('힐링')).length,
    }), [tracks])

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
                            {typeFilters.map(f => {
                                const cnt = typeCounts[f as keyof typeof typeCounts] ?? 0
                                const active = activeType === f
                                return (
                                    <button key={f} onClick={() => setActiveType(f)} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 8, border: 'none',
                                        background: active ? 'rgba(108,99,255,.15)' : 'none',
                                        color: active ? '#9d97ff' : 'rgba(255,255,255,.5)',
                                        fontSize: 13, fontWeight: active ? 700 : 400,
                                        cursor: 'pointer', textAlign: 'left', transition: 'all .15s', width: '100%',
                                    }}>
                                        <span>{f}</span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600,
                                            color: active ? '#9d97ff' : 'rgba(255,255,255,.25)',
                                            background: active ? 'rgba(108,99,255,.2)' : 'rgba(255,255,255,.07)',
                                            padding: '1px 7px', borderRadius: 10, minWidth: 28, textAlign: 'center',
                                        }}>{cnt}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: 20 }} />
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', margin: '0 0 10px' }}>분위기</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {allTags.map(tag => {
                                const cnt = tagCounts[tag as keyof typeof tagCounts] ?? 0
                                const active = activeTag === tag
                                return (
                                    <button key={tag} onClick={() => setActiveTag(tag)} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 8, border: 'none',
                                        background: active ? 'rgba(108,99,255,.15)' : 'none',
                                        color: active ? '#9d97ff' : 'rgba(255,255,255,.5)',
                                        fontSize: 13, fontWeight: active ? 700 : 400,
                                        cursor: 'pointer', textAlign: 'left', transition: 'all .15s', width: '100%',
                                    }}>
                                        <span>{tag}</span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600,
                                            color: active ? '#9d97ff' : 'rgba(255,255,255,.25)',
                                            background: active ? 'rgba(108,99,255,.2)' : 'rgba(255,255,255,.07)',
                                            padding: '1px 7px', borderRadius: 10, minWidth: 28, textAlign: 'center',
                                        }}>{cnt}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* 검색 + 필터 토글 */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
                    <button onClick={() => setSidebarOpen(v => !v)}
                        style={{ width: 36, height: 36, borderRadius: 8, background: sidebarOpen ? 'rgba(108,99,255,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${sidebarOpen ? 'rgba(108,99,255,.3)' : 'rgba(255,255,255,.1)'}`, color: sidebarOpen ? '#9d97ff' : 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
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
                        <HotAnimeSection hotAnimes={hotAnimes} playingId={playingId} onPlayAnime={onPlayAnime} />
                        {['전투', '감성', '로맨스', '새벽감성', '열혈', '힐링', '오프닝', '엔딩'].map(tag => {
                            const tagged = tracks.filter(t => t.tags.includes(tag))
                            if (!tagged.length) return null
                            return (
                                <section key={tag} style={{ marginBottom: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,.88)', margin: 0 }}>#{tag}</h2>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>{tagged.length}곡</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {tagged.slice(0, 25).map((t, i) => <TrackRow key={t.id} track={t} index={i} isPlaying={playingId === t.id} onPlay={onPlay} />)}
                                    </div>
                                </section>
                            )
                        })}
                    </>
                )}
            </div>

            {/* 오른쪽 여백 — 왼쪽 사이드바와 동일한 너비 */}
            <div style={{ width: sidebarOpen ? 220 : 0, minWidth: sidebarOpen ? 220 : 0, flexShrink: 0, transition: 'all .3s' }} />
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
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
    const [progress, setProgress] = useState(0)
    const [volume, setVolume] = useState(0.8)
    const [cursor, setCursor] = useState({ x: -100, y: -100 })
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tracksRef = useRef<Track[]>([])
    const userName = user?.name || user?.email?.split('@')[0] || '라프텔'

    useEffect(() => { tracksRef.current = tracks }, [tracks])
    const getPlayableTracks = useCallback(() => tracksRef.current.filter(t => t.previewUrl), [])
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

    // 커스텀 커서: sing.png 마우스 추적
    useEffect(() => {
        const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const queries = [
                'アニメ オープニング', 'アニメ エンディング', 'アニメ サウンドトラック',
                '呪術廻戦 ost', '鬼滅の刃 ost', '進撃の巨人 ost',
                'naruto shippuden ost', 'bleach tybw ost', 'one piece ost',
                'spy x family ost', 'frieren ost', 'chainsaw man ost',
                'violet evergarden ost', 'fullmetal alchemist brotherhood ost',
                'haikyuu ost', 'mob psycho 100 ost', 'blue lock ost',
                're zero ost', 'overlord ost', 'death note ost',
                'sword art online ost', 'dragon ball z ost', 'evangelion ost',
                'my hero academia ost', 'demon slayer ost', 'vinland saga ost',
                'steins gate ost', 'code geass ost', 'hunter x hunter ost',
                'tokyo ghoul ost', 'black clover ost', 'fairy tail ost',
            ]
            const seen = new Set<string>()
            const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 50)))
            const allTracks: Track[] = []
            results.flat().forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); allTracks.push(t) } })
            setTracks(allTracks)
            setLoadCount(allTracks.length)

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
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.onended = null
            audioRef.current.src = ''
        }
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        audio.src = track.previewUrl
        audio.volume = volume
        audioRef.current = audio
        audio.play().catch(err => console.warn('play error:', err))
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

    // 화제의 애니메이션 클릭 핸들러: 해당 애니 tracks[0] 재생
    const handlePlayAnime = useCallback((anime: HotAnime) => {
        if (!anime.tracks.length) return
        // 이미 이 애니 트랙 재생 중이면 정지
        const isThisAnimePlaying = anime.tracks.some(t => t.id === (tracksRef.current.find(x => x.id === playingId)?.id || null))
        const firstPlayable = anime.tracks.find(t => t.previewUrl)
        if (firstPlayable) startPlay(firstPlayable)
    }, [startPlay, playingId])

    const playingIdRef = useRef<string | null>(null)
    useEffect(() => { playingIdRef.current = playingId }, [playingId])

    const handlePlay = useCallback((track: Track) => {
        if (playingIdRef.current === track.id) { stopAudio(); return }
        startPlay(track)
    }, [startPlay, stopAudio])

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

    return (
        <>
            {/* 커스텀 커서 — 기본 커서에서 10px 떨어져 따라옴 */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 70,
                height: 70,
                pointerEvents: 'none',
                zIndex: 99999,
                transform: `translate(${cursor.x + 10}px, ${cursor.y + 10}px)`,
                transition: 'transform .12s cubic-bezier(.25,.46,.45,.94)',
            }}>
                <img src="/images/laftel-icon/sing.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 56, paddingBottom: currentTrack ? 96 : 0 }}>
                <style>{`
                    .ost-header{padding:0 48px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;background:linear-gradient(160deg,rgba(108,99,255,.08) 0%,transparent 60%)}
                                                                                .ost-loading-bar{height:3px;background:rgba(255,255,255,.06);position:relative;overflow:hidden}
                    .ost-loading-bar::after{content:'';position:absolute;left:-40%;width:40%;height:100%;background:linear-gradient(to right,transparent,#6c63ff,transparent);animation:ost-shimmer 1.2s infinite}
                    @keyframes ost-shimmer{to{left:100%}}
                    @keyframes eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
                `}</style>

                <div className="ost-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 0' }}>
                        <span style={{ fontSize: 18 }}>🎵</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>OST</span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(108,99,255,.2)', color: '#9d97ff' }}>{tracks.length}</span>
                    </div>
                    {loading && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'ost-shimmer 1s linear infinite' }} />
                        {loadCount}곡 로드 중...
                    </span>}
                </div>
                {loading && <div className="ost-loading-bar" />}

                <div style={{ padding: '28px 48px 60px' }}>
                    <OstTab
                        tracks={tracks}
                        playingId={playingId}
                        onPlay={handlePlay}
                        onPlayAnime={handlePlayAnime}
                        newTracks={newTracks}
                        hotAnimes={hotAnimes}
                        userName={userName}
                    />
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
                    accent='#6c63ff'
                />
            )}
        </>
    )
}
