'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import 'swiper/css'
import { useAuthStore } from '@/store/useAuthStore'
import LoginModal from '@/components/LoginModal'
import MembershipRequiredModal from '@/components/MembershipRequiredModal'

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
    tracks: Track[]
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
    const trackName: string = item.trackName || ''
    const knownAnime = [
        '鬼滅の刃', '呪術廻戦', '進撃の巨人', 'ONE PIECE', 'NARUTO', 'BLEACH',
        'ハイキュー', 'ヒロアカ', 'チェンソーマン', 'スパイファミリー', '葬送のフリーレン',
        'エヴァンゲリオン', 'コードギアス', 'HUNTER', 'ドラゴンボール', 'フェアリーテイル',
        'ソードアートオンライン', 'オーバーロード', 'リゼロ', 'モブサイコ',
    ]
    for (const anime of knownAnime) {
        if (col.includes(anime) || trackName.includes(anime)) return anime
    }
    const cleaned = col
        .replace(/\s*\(.*?\)\s*/g, '')
        .replace(/\s*-\s*(ost|original soundtrack|soundtrack|opening|ending|bgm|score|music|anime|the animation|season \d+|ep\.?\s*\d*|single)\s*/gi, '')
        .replace(/\s*(ost|original soundtrack|soundtrack)\s*/gi, '')
        .trim()
    if (!cleaned || cleaned === item.artistName) return item.artistName || 'Unknown'
    return cleaned
}

const ft = (s: number) => s ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` : '0:30'

async function fetchItunesAnime(term: string, limit = 50): Promise<Track[]> {
    try {
        const res = await fetch(`${ITUNES_BASE}?term=${encodeURIComponent(term)}&media=music&entity=song&genreId=27&limit=${limit}&country=JP&lang=ja_jp`)
        const data = await res.json()
        return (data.results || [])
            .filter((item: any) => item.previewUrl && item.artworkUrl100 && item.artworkUrl100.includes('mzstatic'))
            .map((item: any) => {
                const { type, tags } = classifyTrack(item)
                return {
                    id: String(item.trackId),
                    title: item.trackName,
                    artist: item.artistName,
                    animeName: extractAnimeName(item),
                    cover: item.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600'),
                    previewUrl: item.previewUrl,
                    duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
                    type, tags,
                    collectionName: item.collectionName || '',
                    popularity: item.trackCount || 0,
                }
            })
    } catch { return [] }
}

async function fetchNewReleases(): Promise<Track[]> {
    const queries = [
        '紅蓮華 LiSA 鬼滅の刃 EP',
        'Ado うた ワンピース',
        'YOASOBI アニメ 推しの子',
        '廻廻奇譚 Eve 呪術廻戦',
        'FLOW GO アニメ',
        'スパイファミリー OP アニメ',
        '進撃の巨人 Linked Horizon',
    ]
    const results = await Promise.all(queries.map(q => fetchItunesAnime(q, 10)))
    const seen = new Set<string>()
    const tracks: Track[] = []
    for (const list of results) {
        const pick = tracks.length === 0
            ? list.find(t => !seen.has(t.id) && t.previewUrl &&
                (t.artist.includes('LiSA') || t.collectionName.includes('鬼滅') || t.animeName.includes('鬼滅')))
            || list.find(t => !seen.has(t.id) && t.previewUrl)
            : list.find(t => !seen.has(t.id) && t.previewUrl)
        if (pick) { seen.add(pick.id); tracks.push(pick) }
        if (tracks.length >= 7) break
    }
    return tracks
}

const HOT_ANIME_LIST = [
    { name: '呪術廻戦', query: '呪術廻戦 サウンドトラック' },
    { name: '鬼滅の刃', query: '鬼滅の刃 サウンドトラック' },
    { name: '進撃の巨人', query: '進撃の巨人 サウンドトラック' },
    { name: 'スパイファミリー', query: 'SPY FAMILY アニメ サウンドトラック' },
    { name: '葬送のフリーレン', query: '葬送のフリーレン サウンドトラック' },
    { name: 'チェンソーマン', query: 'チェンソーマン サウンドトラック' },
    { name: 'ブルーロック', query: 'ブルーロック アニメ サウンドトラック' },
    { name: 'モブサイコ100', query: 'モブサイコ100 サウンドトラック' },
    { name: 'ヴァイオレット・エヴァーガーデン', query: 'ヴァイオレット エヴァーガーデン サウンドトラック' },
    { name: 'Re:ゼロ', query: 'リゼロ サウンドトラック アニメ' },
    { name: 'オーバーロード', query: 'オーバーロード アニメ サウンドトラック' },
    { name: 'ハイキュー!!', query: 'ハイキュー サウンドトラック' },
    { name: '鋼の錬金術師', query: '鋼の錬金術師 BROTHERHOOD サウンドトラック' },
    { name: 'デスノート', query: 'デスノート アニメ サウンドトラック' },
    { name: 'BLEACH', query: 'BLEACH サウンドトラック アニメ' },
    { name: 'ワンピース', query: 'ONE PIECE サウンドトラック' },
    { name: 'ナルト疾風伝', query: 'ナルト疾風伝 サウンドトラック' },
    { name: '僕のヒーローアカデミア', query: '僕のヒーローアカデミア サウンドトラック' },
    { name: '鬼滅の刃 遊郭編', query: '鬼滅の刃 遊郭編 サウンドトラック' },
    { name: 'ヴィンランド・サガ', query: 'ヴィンランド サガ サウンドトラック' },
    { name: 'STEINS;GATE', query: 'シュタインズゲート サウンドトラック' },
    { name: 'コードギアス', query: 'コードギアス サウンドトラック' },
    { name: 'HUNTER×HUNTER', query: 'HUNTER HUNTER 2011 サウンドトラック' },
    { name: '進撃の巨人 Final', query: '進撃の巨人 Final Season サウンドトラック' },
    { name: '東京喰種', query: '東京喰種 トーキョーグール サウンドトラック' },
    { name: 'ソードアートオンライン', query: 'ソードアートオンライン サウンドトラック' },
    { name: '新世紀エヴァンゲリオン', query: 'エヴァンゲリオン サウンドトラック' },
    { name: 'ドラゴンボールZ', query: 'ドラゴンボールZ サウンドトラック' },
    { name: 'ブラッククローバー', query: 'ブラッククローバー サウンドトラック' },
    { name: 'フェアリーテイル', query: 'フェアリーテイル サウンドトラック' },
]

async function fetchHotAnimeOst(): Promise<HotAnime[]> {
    const tmdbPosters: Record<string, string> = {}
    try {
        if (TMDB_KEY) {
            const res = await fetch(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&language=ko-KR&page=1`
            )
            const data = await res.json()
                ; (data.results || []).forEach((anime: any) => {
                    const n = (anime.name || anime.original_name || '').toLowerCase()
                    if (anime.poster_path) tmdbPosters[n] = `https://image.tmdb.org/t/p/w342${anime.poster_path}`
                })
        }
    } catch { }

    const results = await Promise.all(
        HOT_ANIME_LIST.map(async (anime, idx) => {
            const tracks = await fetchItunesAnime(anime.query, 10)
            const tmdbPoster = Object.entries(tmdbPosters).find(([k]) =>
                k.includes(anime.name.toLowerCase().split(' ')[0]) ||
                anime.name.toLowerCase().includes(k.split(' ')[0])
            )?.[1] || ''
            return {
                id: idx,
                name: anime.name,
                poster: tracks[0]?.cover || tmdbPoster || '',
                track: tracks[0] || null,
                tracks,
            }
        })
    )
    return results.filter(a => a.tracks.length > 0)
}

// ── 반응형 훅 ─────────────────────────────────────────────────
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])
    return isMobile
}

function useIsTablet() {
    const [isTablet, setIsTablet] = useState(false)
    useEffect(() => {
        const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])
    return isTablet
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
    const isMobile = useIsMobile()

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
                /* ── 데스크탑 플레이어 (원본 유지) ── */
                .bp{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:var(--bg-card);backdrop-filter:blur(24px);border-top:1px solid var(--border-subtle);height:88px;display:flex;align-items:center;padding:0 24px;animation:bp-in .25s ease}
                @keyframes bp-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
                .bp-seekbar{position:absolute;top:-1px;left:0;right:0;height:4px;background:var(--border);cursor:pointer}
                .bp-left{display:flex;align-items:center;gap:13px;width:280px;flex-shrink:0}
                .bp-cover{width:52px;height:52px;border-radius:8px;overflow:hidden;background:var(--bg-secondary);flex-shrink:0;position:relative}
                .bp-cover img{width:100%;height:100%;object-fit:cover}
                .bp-tinfo{min-width:0}
                .bp-tname{font-size:13px;font-weight:700;color:var(--text-primary);margin:0 0 2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .bp-tsub{font-size:11px;color:var(--text-subtle);margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .bp-center{flex:1;display:flex;flex-direction:column;align-items:center;gap:7px}
                .bp-btns{display:flex;align-items:center;gap:16px}
                .bp-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);transition:color .2s;padding:0}
                .bp-btn:hover{color:var(--text-primary)}
                .bp-play{width:40px;height:40px;border-radius:50%;background:var(--text-primary);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--bg-primary);transition:transform .15s}
                .bp-play:hover{transform:scale(1.07)}
                .bp-prog-row{display:flex;align-items:center;gap:10px;width:100%;max-width:480px}
                .bp-time{font-size:11px;color:var(--text-faint);flex-shrink:0;width:34px}
                .bp-progbar{flex:1;height:3px;background:var(--border);border-radius:2px;cursor:pointer}
                .bp-right{display:flex;align-items:center;gap:12px;width:200px;justify-content:flex-end;flex-shrink:0}
                .bp-volbar{width:72px;height:3px;background:var(--border);border-radius:2px;cursor:pointer}
                .bp-close{width:28px;height:28px;border-radius:50%;background:var(--border-subtle);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-subtle);transition:all .2s}
                .bp-close:hover{background:var(--border);color:var(--text-primary)}
                .bp-eq{display:flex;align-items:flex-end;gap:2px;height:24px}
                .bp-eq span{display:block;width:3px;border-radius:2px;transition:height .06s ease}

                /* ── 모바일 플레이어 ── */
                @media (max-width: 767px) {
                    .bp{
                        height:auto;
                        flex-direction:column;
                        padding:0;
                        padding-bottom:env(safe-area-inset-bottom, 0px);
                    }
                    .bp-seekbar{
                        position:relative;
                        top:0;
                        height:3px;
                        width:100%;
                        flex-shrink:0;
                    }
                    .bp-mobile-main{
                        display:flex;
                        align-items:center;
                        gap:10px;
                        width:100%;
                        padding:10px 16px;
                        box-sizing:border-box;
                    }
                    .bp-left{width:auto;flex:1;min-width:0;}
                    .bp-center{flex:none;}
                    .bp-right{width:auto;gap:8px;}
                    .bp-prog-row{display:none;}
                    .bp-time{display:none;}
                    .bp-eq{display:none;}
                    .bp-volbar{display:none;}
                    .bp-cover{width:42px;height:42px;}
                    .bp-tname{font-size:13px;}
                    .bp-tsub{font-size:11px;}
                    .bp-btns{gap:10px;}
                    .bp-play{width:36px;height:36px;}
                    .bp-btn svg{width:16px;height:16px;}
                }

                /* ── 태블릿 플레이어 ── */
                @media (min-width: 768px) and (max-width: 1023px) {
                    .bp-left{width:220px;}
                    .bp-right{width:160px;}
                    .bp-volbar{width:56px;}
                    .bp-eq{display:none;}
                }
            `}</style>

            {isMobile ? (
                /* 모바일: 심플 2줄 레이아웃 */
                <div className="bp">
                    <div className="bp-seekbar" onClick={handleSeek}>
                        <div style={{ height: '100%', background: `linear-gradient(to right,${accent},${accent}99)`, width: `${progress}%`, transition: 'width .2s linear' }} />
                    </div>
                    <div className="bp-mobile-main">
                        <div className="bp-cover">
                            {track.cover
                                ? <img src={track.cover} alt={track.title} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎵</div>
                            }
                        </div>
                        <div className="bp-tinfo" style={{ flex: 1, minWidth: 0 }}>
                            <p className="bp-tname">{track.title}</p>
                            <p className="bp-tsub">{track.animeName} · {track.artist}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <button className="bp-btn" onClick={onPrev}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="3" height="16" /></svg>
                            </button>
                            <button className="bp-play" onClick={onPlayPause}>
                                {isPlaying
                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5,3 19,12 5,21" /></svg>
                                }
                            </button>
                            <button className="bp-btn" onClick={onNext}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20" /><rect x="16" y="4" width="3" height="16" /></svg>
                            </button>
                            <button className="bp-close" onClick={onClose}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* 태블릿 + 데스크탑: 원본 레이아웃 */
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
                                <div style={{ height: '100%', background: 'var(--text-muted)', borderRadius: 2, width: `${volume * 100}%` }} />
                            </div>
                        </div>
                        <button className="bp-close" onClick={onClose}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                    </div>
                </div>
            )}
        </>
    )
}

function TrackRow({ track, index, isPlaying, onPlay }: { track: Track; index: number; isPlaying: boolean; onPlay: (t: Track) => void }) {
    return (
        <div onClick={() => onPlay(track)}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                borderRadius: 8, cursor: track.previewUrl ? 'pointer' : 'default',
                opacity: track.previewUrl ? 1 : 0.35,
                background: isPlaying ? 'rgba(108,99,255,.1)' : '',
                border: `1px solid ${isPlaying ? 'rgba(108,99,255,.2)' : 'transparent'}`,
                transition: 'background .15s',
            }}
            onMouseEnter={e => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (!isPlaying) (e.currentTarget as HTMLDivElement).style.background = '' }}>
            <span style={{ fontSize: 12, color: isPlaying ? '#6c63ff' : 'var(--text-faint)', width: 22, textAlign: 'center', flexShrink: 0 }}>{index + 1}</span>
            <div style={{ width: 42, height: 42, borderRadius: 7, overflow: 'hidden', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                {track.cover ? <img src={track.cover} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎵</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? '#a5a0ff' : 'var(--text-high)', margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.artist}</p>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 32, textAlign: 'right', flexShrink: 0 }}>{ft(track.duration)}</span>
            {isPlaying
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--text-faint)"><polygon points="5,3 19,12 5,21" /></svg>
            }
        </div>
    )
}

function NewSection({ tracks, playingId, onPlay, hotAnimePoster }: {
    tracks: Track[]
    playingId: string | null
    onPlay: (t: Track) => void
    hotAnimePoster?: string
}) {
    const main = tracks[0]
    const subs = tracks.slice(1, 7)
    if (!main) return null
    const GAP = 25
    const mainImg = hotAnimePoster || main.cover

    return (
        <section style={{ marginBottom: 60 }}>
            <style>{`
                /* NewSection 반응형 */
                .new-section-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    grid-template-rows: repeat(2, 1fr);
                    gap: ${GAP}px;
                    aspect-ratio: 5/2;
                }
                .new-section-main {
                    grid-column: 1 / 3;
                    grid-row: 1 / 3;
                }
                .new-section-sub {
                    /* 기본 그리드 아이템 */
                }

                /* 태블릿: 3열 */
                @media (min-width: 768px) and (max-width: 1023px) {
                    .new-section-grid {
                        grid-template-columns: repeat(3, 1fr);
                        grid-template-rows: auto;
                        aspect-ratio: unset;
                        gap: 14px;
                    }
                    .new-section-main {
                        grid-column: 1 / 3;
                        grid-row: 1;
                        aspect-ratio: 2/1.2;
                    }
                    .new-section-sub {
                        aspect-ratio: 1;
                    }
                }

                /* 모바일: 1열 메인 + 2열 서브 */
                @media (max-width: 767px) {
                    .new-section-grid {
                        grid-template-columns: repeat(2, 1fr);
                        grid-template-rows: auto;
                        aspect-ratio: unset;
                        gap: 10px;
                    }
                    .new-section-main {
                        grid-column: 1 / 3;
                        grid-row: 1;
                        aspect-ratio: 16/9;
                    }
                    .new-section-sub {
                        aspect-ratio: 1;
                    }
                }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 25, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>방금 공개된 OST</h2>
            </div>
            <div className="new-section-grid">
                <div
                    className="new-section-main"
                    onClick={() => main.previewUrl && onPlay(main)}
                    style={{ borderRadius: 20, overflow: 'hidden', cursor: main.previewUrl ? 'pointer' : 'default', position: 'relative', background: 'var(--bg-secondary)', transition: 'transform .25s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                    {mainImg && <img src={mainImg} alt={main.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
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
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', margin: '0 0 6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{main.title}</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{main.animeName} · {main.artist}</p>
                    </div>
                </div>
                {subs.map(t => (
                    <div
                        key={t.id}
                        className="new-section-sub"
                        onClick={() => t.previewUrl && onPlay(t)}
                        style={{ borderRadius: 14, overflow: 'hidden', cursor: t.previewUrl ? 'pointer' : 'default', position: 'relative', background: 'var(--bg-secondary)', transition: 'transform .2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                        {t.cover && <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.82) 0%, transparent 55%)' }} />
                        {playingId === t.id && <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.35)' }} />}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', margin: '0 0 2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

function WeeklyTop10({ tracks, playingId, onPlay }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void }) {
    const isMobile = useIsMobile()
    if (!tracks.length) return null

    const cardWidth = isMobile ? 150 : 210
    const cardHeight = isMobile ? 210 : 300

    return (
        <section style={{ marginBottom: 60, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 25, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>주간 TOP 10</h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode={{ sticky: false }} slidesPerView={'auto'} spaceBetween={isMobile ? 10 : 16} style={{ overflow: 'visible', marginRight: 'calc(-5vw - 20px)', paddingRight: 'calc(5vw + 20px)' }}>
                {tracks.map((t, i) => {
                    const playing = playingId === t.id
                    return (
                        <SwiperSlide key={t.id} style={{ width: cardWidth }}>
                            <div onClick={() => onPlay(t)} style={{ cursor: 'pointer', transition: 'transform .25s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                                <div style={{
                                    position: 'relative', width: cardWidth, height: cardHeight, borderRadius: 14,
                                    overflow: 'hidden', background: 'var(--bg-card)',
                                    border: `3px solid ${playing ? '#6c63ff' : 'transparent'}`,
                                    boxShadow: playing ? '0 0 20px rgba(108,99,255,.55), 0 8px 24px rgba(0,0,0,.4)' : '0 8px 24px rgba(0,0,0,.2)',
                                    transition: 'border-color .2s, box-shadow .2s',
                                }}>
                                    {t.cover ? <img src={t.cover} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎵</div>}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 50%)' }} />
                                    <span style={{ position: 'absolute', left: 8, bottom: -8, fontSize: isMobile ? 52 : 72, fontWeight: 900, lineHeight: 1, color: playing ? '#a5a0ff' : '#fff', textShadow: '0 2px 12px rgba(0,0,0,.9)', userSelect: 'none', pointerEvents: 'none', transition: 'color .2s', letterSpacing: '-3px' }}>
                                        {i + 1}
                                    </span>
                                    {playing && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                                                {[5, 12, 8, 10].map((h, j) => (
                                                    <div key={j} style={{ width: 3, height: h, background: '#fff', borderRadius: 2, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${j * 0.1}s` }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ paddingLeft: 4 }}>
                                    <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: playing ? '#a5a0ff' : 'var(--text-high)', margin: '8px 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                                    <p style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-subtle)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.animeName}</p>
                                </div>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </section>
    )
}

function RecommendSection({ tracks, playingId, onPlay, userName }: { tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void; userName: string }) {
    const isMobile = useIsMobile()
    const picks = useMemo(() => [...tracks].sort(() => Math.random() - 0.5).slice(0, 21), [tracks.length > 0 ? tracks[0].id : ''])
    if (!picks.length) return null

    const cardSize = isMobile ? 120 : 160

    return (
        <section style={{ marginBottom: 60, position: 'relative', zIndex: 1 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: isMobile ? 20 : 25, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    <span style={{ color: '#9d97ff' }}>"{userName}"</span> 님 취향저격
                </h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode slidesPerView={'auto'} spaceBetween={isMobile ? 10 : 14} style={{ overflow: 'visible', marginRight: 'calc(-5vw - 20px)', paddingRight: 'calc(5vw + 20px)' }}>
                {picks.map(t => (
                    <SwiperSlide key={t.id} style={{ width: cardSize }}>
                        <div onClick={() => onPlay(t)} style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform .25s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                            <div style={{ width: cardSize, height: cardSize, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', border: playingId === t.id ? '4px solid #6c63ff' : '4px solid var(--border)', boxShadow: playingId === t.id ? '0 0 24px rgba(108,99,255,.6)' : 'none', transition: 'border-color .2s' }}>
                                {t.cover ? <img src={t.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 26 : 36 }}>🎵</div>}
                            </div>
                            <p style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: 'var(--text-high)', margin: '10px 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: cardSize }}>{t.animeName}</p>
                            <p style={{ fontSize: isMobile ? 9 : 10, color: 'var(--text-subtle)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: cardSize }}>{t.artist}</p>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}

function HotAnimeSection({ hotAnimes, playingId, onPlayAnime }: { hotAnimes: HotAnime[]; playingId: string | null; onPlayAnime: (anime: HotAnime) => void }) {
    const isMobile = useIsMobile()
    if (!hotAnimes.length) return null

    const cardW = isMobile ? 130 : 180
    const cardH = isMobile ? 185 : 255

    return (
        <section style={{ marginBottom: 60, position: 'relative', zIndex: 1 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: isMobile ? 20 : 25, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>화제의 애니메이션 OST</h2>
            </div>
            <Swiper modules={[FreeMode]} freeMode slidesPerView={'auto'} spaceBetween={isMobile ? 10 : 14} style={{ overflow: 'visible', marginRight: 'calc(-5vw - 20px)', paddingRight: 'calc(5vw + 20px)' }}>
                {hotAnimes.map(anime => {
                    const isActive = anime.tracks.some(t => t.id === playingId)
                    const playingTrack = anime.tracks.find(t => t.id === playingId)
                    return (
                        <SwiperSlide key={anime.id} style={{ width: cardW }}>
                            <div onClick={() => anime.tracks.length > 0 && onPlayAnime(anime)} style={{ cursor: anime.tracks.length > 0 ? 'pointer' : 'default', transition: 'transform .25s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}>
                                <div style={{
                                    width: cardW, height: cardH, borderRadius: 14,
                                    overflow: 'hidden', background: 'var(--bg-card)', marginBottom: 10,
                                    position: 'relative',
                                    border: `3px solid ${isActive ? '#6c63ff' : 'transparent'}`,
                                    boxShadow: isActive ? '0 0 20px rgba(108,99,255,.45), 0 8px 24px rgba(0,0,0,.3)' : '0 8px 24px rgba(0,0,0,.15)',
                                    transition: 'border-color .2s, box-shadow .2s',
                                }}>
                                    {anime.poster ? <img src={anime.poster} alt={anime.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎌</div>}
                                    {isActive && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                                                {[8, 18, 12, 16, 10].map((h, j) => (
                                                    <div key={j} style={{ width: 4, height: h, background: '#fff', borderRadius: 2, animation: 'eq .5s ease-in-out infinite alternate', animationDelay: `${j * 0.1}s` }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {anime.tracks.length > 0 && (
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,.95), transparent)' }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#6c63ff', color: '#fff' }}>
                                                ▶ {(anime.tracks[0].type || 'OST').toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginLeft: 6 }}>{anime.tracks.length}곡</span>
                                        </div>
                                    )}
                                </div>
                                <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: isActive ? '#a5a0ff' : 'var(--text-high)', margin: '0 0 3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: cardW }}>{anime.name}</p>
                                {anime.tracks[0] && (
                                    <p style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: cardW }}>
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

function OstTab({ tracks, playingId, onPlay, onPlayAnime, newTracks, hotAnimes, userName }: {
    tracks: Track[]; playingId: string | null; onPlay: (t: Track) => void
    onPlayAnime: (anime: HotAnime) => void; newTracks: Track[]; hotAnimes: HotAnime[]; userName: string
}) {
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState('전체')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeType, setActiveType] = useState('전체')
    const isMobile = useIsMobile()
    const isTablet = useIsTablet()

    // 모바일/태블릿에서는 기본적으로 사이드바 닫힘
    useEffect(() => {
        if (isMobile || isTablet) setSidebarOpen(false)
        else setSidebarOpen(true)
    }, [isMobile, isTablet])

    const top10 = useMemo(() => {
        if (!tracks.length) return []
        const sorted = [...tracks].sort((a, b) => (b.popularity || b.duration || 0) - (a.popularity || a.duration || 0))
        const seenCovers = new Set<string>()
        const seenAnimes = new Set<string>()
        const unique: typeof sorted = []
        for (const t of sorted) {
            const coverKey = t.cover.replace(/\/\d+x\d+/, '')
            const animeKey = t.animeName.toLowerCase().trim()
            if (!seenCovers.has(coverKey) && !seenAnimes.has(animeKey)) {
                seenCovers.add(coverKey); seenAnimes.add(animeKey); unique.push(t)
                if (unique.length >= 10) break
            }
        }
        return unique
    }, [tracks.length > 0 ? tracks[0].id : ''])

    const allTags = ['전체', '오프닝', '엔딩', 'BGM', '전투', '감성', '로맨스', '새벽감성', '열혈', '힐링']
    const typeFilters = ['전체', 'OP', 'ED', 'BGM', 'OST']

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
    const activeFilterCount = Number(activeTag !== '전체') + Number(activeType !== '전체')

    const sidebarFilterBtn = (active: boolean) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 8, border: 'none',
        background: active ? 'rgba(108,99,255,.15)' : 'transparent',
        color: active ? '#9d97ff' : 'var(--text-muted)',
        fontSize: 13, fontWeight: active ? 700 : 400,
        cursor: 'pointer', textAlign: 'left' as const, transition: 'all .15s', width: '100%',
    })

    const sidebarCountBadge = (active: boolean) => ({
        fontSize: 11, fontWeight: 600,
        color: active ? '#9d97ff' : 'var(--text-faint)',
        background: active ? 'rgba(108,99,255,.2)' : 'var(--border-subtle)',
        padding: '1px 7px', borderRadius: 10, minWidth: 28, textAlign: 'center' as const,
    })

    return (
        <>
            <style>{`
                /* 모바일 사이드바 오버레이 */
                .sidebar-overlay {
                    display: none;
                }
                @media (max-width: 1023px) {
                    .sidebar-overlay {
                        display: block;
                        position: fixed;
                        inset: 0;
                        background: rgba(0,0,0,.5);
                        z-index: 40;
                        animation: fadeIn .2s ease;
                    }
                    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                    .sidebar-drawer {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        width: 280px !important;
                        z-index: 50 !important;
                        background: var(--bg-primary) !important;
                        overflow-y: auto;
                        padding: 60px 20px 20px !important;
                        box-shadow: 4px 0 24px rgba(0,0,0,.3);
                        animation: slideIn .25s ease;
                    }
                    @keyframes slideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }
                }
                /* 모바일 헤더 필터 태그 바 */
                .mobile-tag-bar {
                    display: none;
                }
                @media (max-width: 1023px) {
                    .mobile-tag-bar {
                        display: flex;
                        gap: 8px;
                        overflow-x: auto;
                        padding-bottom: 4px;
                        margin-bottom: 16px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    .mobile-tag-bar::-webkit-scrollbar { display: none; }
                }
            `}</style>

            <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', width: '100%', position: 'relative' }}>

                {/* 모바일/태블릿: 오버레이 사이드바 */}
                {sidebarOpen && (isMobile || isTablet) && (
                    <>
                        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
                        <div className="sidebar-drawer">
                            {/* 닫기 버튼 */}
                            <button
                                onClick={() => setSidebarOpen(false)}
                                style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'var(--border-subtle)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '.08em', margin: '0 0 10px' }}>타입</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {typeFilters.map(f => {
                                        const cnt = typeCounts[f as keyof typeof typeCounts] ?? 0
                                        const active = activeType === f
                                        return (
                                            <button key={f} onClick={() => { setActiveType(f); if (isMobile || isTablet) setSidebarOpen(false) }} style={sidebarFilterBtn(active)}>
                                                <span>{f}</span>
                                                <span style={sidebarCountBadge(active)}>{cnt}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '.08em', margin: '0 0 10px' }}>분위기</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {allTags.map(tag => {
                                        const cnt = tagCounts[tag as keyof typeof tagCounts] ?? 0
                                        const active = activeTag === tag
                                        return (
                                            <button key={tag} onClick={() => { setActiveTag(tag); if (isMobile || isTablet) setSidebarOpen(false) }} style={sidebarFilterBtn(active)}>
                                                <span>{tag}</span>
                                                <span style={sidebarCountBadge(active)}>{cnt}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 데스크탑: 인라인 사이드바 (원본 그대로) */}
                {sidebarOpen && !isMobile && !isTablet && (
                    <div style={{ width: 280, flexShrink: 0, alignSelf: 'stretch', position: 'relative' }}>
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: 'calc(-1 * (100vw - 90%) / 2)', right: 0,
                            background: 'var(--bg-primary)', zIndex: 28, pointerEvents: 'none',
                        }} />
                        <div style={{ position: 'sticky', top: 75, maxHeight: 'calc(100vh - 75px)', overflowY: 'auto', zIndex: 30, paddingRight: 28 }}>
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '.08em', margin: '0 0 10px' }}>타입</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {typeFilters.map(f => {
                                        const cnt = typeCounts[f as keyof typeof typeCounts] ?? 0
                                        const active = activeType === f
                                        return (
                                            <button key={f} onClick={() => setActiveType(f)} style={sidebarFilterBtn(active)}>
                                                <span>{f}</span>
                                                <span style={sidebarCountBadge(active)}>{cnt}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '.08em', margin: '0 0 10px' }}>분위기</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {allTags.map(tag => {
                                        const cnt = tagCounts[tag as keyof typeof tagCounts] ?? 0
                                        const active = activeTag === tag
                                        return (
                                            <button key={tag} onClick={() => setActiveTag(tag)} style={sidebarFilterBtn(active)}>
                                                <span>{tag}</span>
                                                <span style={sidebarCountBadge(active)}>{cnt}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, minWidth: 0, paddingLeft: 10, position: 'relative', zIndex: 25 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                        <button onClick={() => setSidebarOpen(v => !v)}
                            style={{
                                minHeight: 36,
                                padding: isMobile ? '8px 12px' : '9px 18px',
                                borderRadius: 10,
                                background: sidebarOpen ? 'rgba(108,99,255,.2)' : 'rgba(108,99,255,.1)',
                                border: `1px solid ${sidebarOpen ? 'rgba(108,99,255,.5)' : 'rgba(108,99,255,.25)'}`,
                                color: '#6c63ff',
                                fontSize: isMobile ? 12 : 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'all .2s',
                            }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
                            </svg>
                            {sidebarOpen ? '필터 닫기' : '필터 열기'}
                            {activeFilterCount > 0 && (
                                <span style={{
                                    minWidth: 18,
                                    height: 18,
                                    padding: '0 5px',
                                    borderRadius: 999,
                                    background: '#6c63ff',
                                    color: '#fff',
                                    fontSize: 11,
                                    lineHeight: '18px',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="애니·곡·아티스트 검색"
                                style={{ width: '100%', height: 36, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, padding: '0 16px 0 36px', outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => (e.target.style.borderColor = '#6c63ff')}
                                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                        </div>
                    </div>

                    {/* 모바일/태블릿 태그 바 (사이드바 대신 빠른 필터) */}
                    {(isMobile || isTablet) && (
                        <div className="mobile-tag-bar">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setActiveTag(tag)}
                                    style={{
                                        flexShrink: 0,
                                        padding: '5px 12px',
                                        borderRadius: 20,
                                        border: `1px solid ${activeTag === tag ? '#6c63ff' : 'var(--border)'}`,
                                        background: activeTag === tag ? 'rgba(108,99,255,.15)' : 'var(--bg-card)',
                                        color: activeTag === tag ? '#9d97ff' : 'var(--text-muted)',
                                        fontSize: 12, fontWeight: activeTag === tag ? 700 : 400,
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                        transition: 'all .15s',
                                    }}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {isFiltering ? (
                        <div>
                            <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 12 }}>{filtered.length}곡</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {filtered.map((t, i) => <TrackRow key={t.id} track={t} index={i} isPlaying={playingId === t.id} onPlay={onPlay} />)}
                            </div>
                        </div>
                    ) : (
                        <>
                            <NewSection tracks={newTracks} playingId={playingId} onPlay={onPlay} hotAnimePoster={hotAnimes[0]?.poster || hotAnimes[0]?.tracks[0]?.cover} />
                            <WeeklyTop10 tracks={top10} playingId={playingId} onPlay={onPlay} />
                            <RecommendSection tracks={tracks} playingId={playingId} onPlay={onPlay} userName={userName} />
                            <HotAnimeSection hotAnimes={hotAnimes} playingId={playingId} onPlayAnime={onPlayAnime} />
                            {['전투', '감성', '로맨스', '새벽감성', '열혈', '힐링', '오프닝', '엔딩'].map(tag => {
                                const tagged = tracks.filter(t => t.tags.includes(tag))
                                if (!tagged.length) return null
                                return (
                                    <section key={tag} style={{ marginBottom: 32 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-high)', margin: 0 }}>#{tag}</h2>
                                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{tagged.length}곡</span>
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
            </div>
        </>
    )
}

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
    const volumeRef = useRef(0.8)
    const currentTrackRef = useRef<Track | null>(null)
    const userName = user?.name || user?.email?.split('@')[0] || '라프텔'
    const isMobile = useIsMobile()
    const [showMembershipModal, setShowMembershipModal] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const hasOstMembership = user?.membership === 'ost' || user?.membership === 'allinone'

    useEffect(() => { tracksRef.current = tracks }, [tracks])
    useEffect(() => { volumeRef.current = volume; if (audioRef.current) audioRef.current.volume = volume }, [volume])
    const getPlayableTracks = useCallback(() => tracksRef.current.filter(t => t.previewUrl), [])

    // 모바일에서는 커서 이펙트 비활성화
    useEffect(() => {
        if (isMobile) return
        const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [isMobile])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const priorityQueries = [
                '呪術廻戦 サウンドトラック', '鬼滅の刃 サウンドトラック', '進撃の巨人 サウンドトラック',
                'スパイファミリー サウンドトラック', '葬送のフリーレン サウンドトラック', 'チェンソーマン サウンドトラック',
            ]
            const seen = new Set<string>()
            const firstResults = await Promise.all(priorityQueries.map(q => fetchItunesAnime(q, 20)))
            const firstTracks: Track[] = []
            firstResults.flat().forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); firstTracks.push(t) } })
            setTracks(firstTracks); setLoadCount(firstTracks.length); setLoading(false)

            const [newT, hotA] = await Promise.all([fetchNewReleases(), fetchHotAnimeOst()])
            const hotFirstTrack = hotA[0]?.tracks?.find(t => t.previewUrl)
            const mergedNewT = hotFirstTrack ? [hotFirstTrack, ...newT.filter(t => t.id !== hotFirstTrack.id).slice(0, 6)] : newT
            setNewTracks(mergedNewT); setHotAnimes(hotA)

            const restQueries = [
                'アニメ オープニング サウンドトラック', 'アニメ エンディング サウンドトラック',
                'アニメ BGM サウンドトラック 2023', 'アニメ サウンドトラック 2024',
                'ナルト疾風伝 サウンドトラック', 'BLEACH サウンドトラック',
                'ワンピース サウンドトラック', 'ヴァイオレット エヴァーガーデン サウンドトラック',
                '鋼の錬金術師 BROTHERHOOD サウンドトラック', 'ハイキュー サウンドトラック',
                'モブサイコ100 サウンドトラック', 'ブルーロック サウンドトラック',
                'リゼロ サウンドトラック', 'オーバーロード サウンドトラック',
                'デスノート サウンドトラック', 'ソードアートオンライン サウンドトラック',
                'エヴァンゲリオン サウンドトラック', 'ドラゴンボールZ サウンドトラック',
                '僕のヒーローアカデミア サウンドトラック', '東京喰種 サウンドトラック',
                'シュタインズゲート サウンドトラック', 'コードギアス サウンドトラック',
                'ヴィンランドサガ サウンドトラック', 'HUNTER HUNTER サウンドトラック',
                'フェアリーテイル サウンドトラック', 'ブラッククローバー サウンドトラック',
            ]
            const batchSize = 4
            for (let i = 0; i < restQueries.length; i += batchSize) {
                const batch = restQueries.slice(i, i + batchSize)
                const batchResults = await Promise.all(batch.map(q => fetchItunesAnime(q, 30)))
                const newBatchTracks: Track[] = []
                batchResults.flat().forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); newBatchTracks.push(t) } })
                if (newBatchTracks.length > 0) { setTracks(prev => [...prev, ...newBatchTracks]); setLoadCount(prev => prev + newBatchTracks.length) }
                await new Promise(r => setTimeout(r, 300))
            }
        }
        load()
    }, [])

    const stopAudio = useCallback(() => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.onended = null; audioRef.current.src = ''; audioRef.current = null }
        if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null }
        setPlayingId(null); setProgress(0)
    }, [])

    useEffect(() => {
        return () => {
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.onended = null; audioRef.current.src = '' }
            if (progressRef.current) clearInterval(progressRef.current)
        }
    }, [])

    const startPlay = useCallback((track: Track) => {
        if (!track.previewUrl) return
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.onended = null; audioRef.current.src = '' }
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        audio.src = track.previewUrl
        audio.volume = volumeRef.current
        audioRef.current = audio
        currentTrackRef.current = track
        setCurrentTrack(track); setPlayingId(track.id); setProgress(0)
        audio.play().catch(err => console.warn('play error:', err))
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = setInterval(() => {
            if (!audioRef.current) return
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 30)) * 100)
        }, 200)
        audioRef.current.onended = () => {
            const all = getPlayableTracks()
            const idx = all.findIndex(t => t.id === currentTrackRef.current?.id)
            if (idx >= 0 && idx < all.length - 1) startPlay(all[idx + 1]); else stopAudio()
        }
    }, [stopAudio, getPlayableTracks])

    const handlePlayAnime = useCallback((anime: HotAnime) => {
        if (!anime.tracks.length) return
        const firstPlayable = anime.tracks.find(t => t.previewUrl)
        if (firstPlayable) startPlay(firstPlayable)
    }, [startPlay, playingId])

    const playingIdRef = useRef<string | null>(null)
    useEffect(() => { playingIdRef.current = playingId }, [playingId])

    const handlePlay = useCallback((track: Track) => {
        if (!user) { setShowLoginModal(true); return }
        if (!hasOstMembership) { setShowMembershipModal(true); return }
        if (playingIdRef.current === track.id) { stopAudio(); return }
        startPlay(track)
    }, [startPlay, stopAudio, user, hasOstMembership])

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
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            <MembershipRequiredModal isOpen={showMembershipModal} onClose={() => setShowMembershipModal(false)} type="ost" />
            {/* 나머지 기존 코드 */}
            {/* 커서 이펙트: 데스크탑 전용 */}
            {!isMobile && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: 50, height: 50,
                    pointerEvents: 'none', zIndex: 99999,
                    transform: `translate(${cursor.x + 10}px, ${cursor.y + 10}px)`,
                    transition: 'transform .12s cubic-bezier(.25,.46,.45,.94)',
                }}>
                    <img src="/images/laftel-icon/sing.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            )}

            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: currentTrack ? (isMobile ? 72 : 96) : 0 }}>
                <style>{`
                    @keyframes ost-shimmer { to { left: 100% } }
                    @keyframes eq { from { transform: scaleY(.35) } to { transform: scaleY(1) } }
                    @keyframes spin { to { transform: rotate(360deg) } }
                `}</style>

                <div style={{
                    width: isMobile ? '92%' : '90%',
                    margin: '0 auto',
                    paddingTop: isMobile ? 80 : 115,
                    paddingBottom: 60,
                    overflow: 'visible',
                }}>
                    <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: '18px 0', marginBottom: 28, position: 'relative', zIndex: 29 }}>
                        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>OST</h1>
                        <p style={{ fontSize: isMobile ? 12 : 13, color: 'var(--text-subtle)', margin: '8px 0 0' }}>애니메이션 속 그 노래, 여기서 다시 들어요</p>
                    </div>
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{loadCount}곡 로드 중...</span>
                        </div>
                    )}
                    <OstTab tracks={tracks} playingId={playingId} onPlay={handlePlay} onPlayAnime={handlePlayAnime} newTracks={newTracks} hotAnimes={hotAnimes} userName={userName} />
                </div>
            </div>

            {currentTrack && (
                <BottomPlayer
                    track={currentTrackRef.current || currentTrack}
                    isPlaying={playingId === (currentTrackRef.current || currentTrack)?.id}
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
