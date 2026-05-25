'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAniStore } from '@/store/useAniStore'

const LASTFM_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const ITUNES_BASE = 'https://itunes.apple.com/search'
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0'

interface OstTrack {
    id: string; title: string; artist: string; animeName: string
    cover: string; previewUrl: string | null; duration: number; genre: string
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
    '약사의 혼잣말': 'The Apothecary Diaries', '장송의 프리렌': 'Frieren',
    '풀메탈': 'Fullmetal Alchemist Brotherhood', '카우보이 비밥': 'Cowboy Bebop',
    '바이올렛 에버가든': 'Violet Evergarden', '귀멸': 'Demon Slayer',
    '진격': 'Attack on Titan', '프리렌': 'Frieren', '주술': 'Jujutsu Kaisen',
    '드래곤볼': 'Dragon Ball', '포켓몬': 'Pokemon', '하이큐': 'Haikyuu',
    '모브사이코': 'Mob Psycho 100', '리제로': 'Re:Zero', '오버로드': 'Overlord',
    '카구야': 'Kaguya-sama Love is War', '던밥': 'Dungeon Meshi',
}

const POPULAR_ANIME: Record<string, string[]> = {
    all: ['Attack on Titan','Demon Slayer','Jujutsu Kaisen','Spy x Family','Bleach','Frieren','Mushoku Tensei','Re:Zero','Violet Evergarden','Fullmetal Alchemist Brotherhood','One Punch Man','Chainsaw Man'],
    opening: ['Attack on Titan','Demon Slayer','Jujutsu Kaisen','My Hero Academia','Naruto','One Piece','Bleach','Dragon Ball','Haikyuu','Mob Psycho 100'],
    ending: ['Spy x Family','Violet Evergarden','Re:Zero','Frieren','Kaguya-sama','Mushoku Tensei','Made in Abyss','Chainsaw Man'],
    bgm: ['Fullmetal Alchemist Brotherhood','Violet Evergarden','Frieren','Mushishi','Cowboy Bebop','Ghost in the Shell','Made in Abyss','Princess Mononoke'],
    jpop: ['Naruto','Bleach','One Piece','Dragon Ball','Sword Art Online','Attack on Titan','Demon Slayer','My Hero Academia'],
}

const FILTER_TABS = [
    { id: 'all', label: '전체', icon: '🎵' },
    { id: 'opening', label: '오프닝', icon: '🎬' },
    { id: 'ending', label: '엔딩', icon: '🌙' },
    { id: 'bgm', label: 'BGM', icon: '🎼' },
    { id: 'jpop', label: 'J-POP', icon: '🎤' },
]

const SORT_OPTIONS = [
    { id: 'default', label: '인기순' },
    { id: 'alpha', label: '제목순' },
]

async function fetchOst(animeName: string, genre = 'all'): Promise<OstTrack[]> {
    try {
        const sfx: Record<string,string> = { opening:'opening theme', ending:'ending theme', bgm:'original soundtrack', jpop:'anime song', all:'ost' }
        const lfRes = await fetch(`${LASTFM_BASE}/?method=album.search&album=${encodeURIComponent(animeName+' '+(sfx[genre]||'ost'))}&api_key=${LASTFM_KEY}&format=json&limit=5`)
        const lfData = await lfRes.json()
        const albums = lfData.results?.albummatches?.album || []
        if (!albums.length) return []
        let usedAlbum = albums[0], tracks: any[] = []
        for (const alb of albums.slice(0,3)) {
            const td = await fetch(`${LASTFM_BASE}/?method=album.getinfo&artist=${encodeURIComponent(alb.artist)}&album=${encodeURIComponent(alb.name)}&api_key=${LASTFM_KEY}&format=json`)
            const tj = await td.json()
            tracks = tj.album?.tracks?.track || []
            if (tracks.length) { usedAlbum = alb; break }
        }
        if (!tracks.length) return []
        const results: OstTrack[] = []
        for (const t of tracks.slice(0,6)) {
            const tn = typeof t === 'string' ? t : t.name
            try {
                const ir = await fetch(`${ITUNES_BASE}?term=${encodeURIComponent(tn+' '+animeName)}&media=music&limit=1&country=JP`)
                const ij = await ir.json()
                const item = ij.results?.[0]
                results.push({
                    id: `${animeName}-${tn}`, title: tn,
                    artist: typeof t==='string' ? usedAlbum.artist : (t.artist?.name||usedAlbum.artist),
                    animeName, genre,
                    cover: item?.artworkUrl100?.replace('100x100','600x600') || usedAlbum.image?.[3]?.['#text'] || '',
                    previewUrl: item?.previewUrl||null,
                    duration: item?.trackTimeMillis ? Math.floor(item.trackTimeMillis/1000) : 0,
                })
            } catch {}
        }
        return results
    } catch { return [] }
}

const ft = (s: number) => s ? `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` : '0:30'

// ── 앨범 팝업 ─────────────────────────────────────────────────
function AlbumPopup({ animeName, tracks, playingId, onPlay, onClose }: any) {
    const cover = tracks.find((t:OstTrack)=>t.cover)?.cover||''
    return (
        <div style={{position:'fixed',inset:0,zIndex:8000,background:'rgba(0,0,0,.8)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
            <div style={{width:520,maxHeight:'78vh',background:'#141420',borderRadius:20,border:'1px solid rgba(255,255,255,.1)',overflow:'hidden',display:'flex',flexDirection:'column',animation:'ap-up .2s ease'}} onClick={e=>e.stopPropagation()}>
                <style>{`@keyframes ap-up{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
                {/* 헤더 */}
                <div style={{display:'flex',alignItems:'center',gap:16,padding:24,borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>
                    <div style={{width:64,height:64,borderRadius:10,overflow:'hidden',background:'#1a1a2e',flexShrink:0}}>
                        {cover?<img src={cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🎵</div>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:17,fontWeight:800,color:'#fff',margin:'0 0 4px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{animeName}</p>
                        <p style={{fontSize:12,color:'rgba(255,255,255,.4)',margin:0}}>{tracks.length}곡 · OST</p>
                    </div>
                    <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.5)',flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                {/* 리스트 */}
                <div style={{overflowY:'auto',flex:1,padding:'8px 0 16px'}}>
                    {tracks.map((t:OstTrack,i:number)=>(
                        <div key={t.id} onClick={()=>t.previewUrl&&onPlay(t)}
                            style={{display:'flex',alignItems:'center',gap:12,padding:'9px 20px',margin:'0 8px',borderRadius:8,cursor:t.previewUrl?'pointer':'default',opacity:t.previewUrl?1:.35,background:playingId===t.id?'rgba(108,99,255,.12)':'',transition:'background .15s'}}
                        >
                            <span style={{fontSize:12,color:playingId===t.id?'#6c63ff':'rgba(255,255,255,.25)',width:18,textAlign:'center',flexShrink:0}}>{i+1}</span>
                            <div style={{width:38,height:38,borderRadius:6,overflow:'hidden',background:'#1a1a1a',flexShrink:0}}>
                                {t.cover?<img src={t.cover} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🎵</div>}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                                <p style={{fontSize:13,fontWeight:600,color:playingId===t.id?'#9d97ff':'rgba(255,255,255,.85)',margin:'0 0 2px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{t.title}</p>
                                <p style={{fontSize:11,color:'rgba(255,255,255,.3)',margin:0}}>{t.artist}</p>
                            </div>
                            <span style={{fontSize:11,color:'rgba(255,255,255,.25)',flexShrink:0}}>{ft(t.duration)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── 하단 플레이어 ─────────────────────────────────────────────
function BottomPlayer({ track, isPlaying, progress, volume, onPlayPause, onSeek, onPrev, onNext, onClose, onVolume }: any) {
    const barRef = useRef<HTMLDivElement>(null)
    const volRef = useRef<HTMLDivElement>(null)
    const [showVol, setShowVol] = useState(false)
    const elapsed = Math.floor((progress/100)*(track.duration||30))

    const handleSeekClick = (e: React.MouseEvent) => {
        if (!barRef.current) return
        const r = barRef.current.getBoundingClientRect()
        onSeek(Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)))
    }
    const handleVolClick = (e: React.MouseEvent) => {
        if (!volRef.current) return
        const r = volRef.current.getBoundingClientRect()
        onVolume(Math.max(0,Math.min(1,((e.clientX-r.left)/r.width))))
    }

    return (
        <>
            <style>{`
                .bp{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(12,11,22,.97);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,.08);height:88px;display:flex;align-items:center;padding:0 24px;gap:0;animation:bp-in .25s ease}
                @keyframes bp-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
                .bp-seekbar{position:absolute;top:-1px;left:0;right:0;height:4px;background:rgba(255,255,255,.08);cursor:pointer;transition:height .15s}
                .bp-seekbar:hover{height:6px;top:-3px}
                .bp-seekbar:hover .bp-seekfill::after{opacity:1}
                .bp-seekfill{height:100%;background:linear-gradient(to right,#6c63ff,#a78bfa);position:relative;transition:width .2s linear}
                .bp-seekfill::after{content:'';position:absolute;right:-5px;top:50%;transform:translateY(-50%);width:12px;height:12px;border-radius:50%;background:#fff;opacity:0;transition:opacity .15s;pointer-events:none}
                /* 왼쪽: 트랙 정보 */
                .bp-left{display:flex;align-items:center;gap:13px;width:300px;flex-shrink:0}
                .bp-cover{width:52px;height:52px;border-radius:8px;overflow:hidden;background:#1a1a1a;flex-shrink:0}
                .bp-cover img{width:100%;height:100%;object-fit:cover}
                .bp-cover-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,#1a1535,#0f0f1a)}
                .bp-tinfo{min-width:0}
                .bp-tname{font-size:14px;font-weight:700;color:#fff;margin:0 0 3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                .bp-tartist{font-size:12px;color:rgba(255,255,255,.45);margin:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                /* 가운데: 컨트롤 */
                .bp-center{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px}
                .bp-btns{display:flex;align-items:center;gap:16px}
                .bp-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5);transition:color .2s;padding:0}
                .bp-btn:hover{color:#fff}
                .bp-play{width:40px;height:40px;border-radius:50%;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#111;transition:transform .15s,background .2s}
                .bp-play:hover{transform:scale(1.07);background:#e8e8e8}
                .bp-prog-row{display:flex;align-items:center;gap:10px;width:100%;max-width:500px}
                .bp-time{font-size:11px;color:rgba(255,255,255,.3);flex-shrink:0;width:36px}
                .bp-time.right{text-align:right}
                .bp-progbar{flex:1;height:4px;background:rgba(255,255,255,.12);border-radius:2px;cursor:pointer;position:relative}
                .bp-progbar:hover{height:6px}
                .bp-progfill{height:100%;background:#fff;border-radius:2px;transition:width .2s linear}
                .bp-progbar:hover .bp-progfill{background:#6c63ff}
                /* 오른쪽: 볼륨 */
                .bp-right{display:flex;align-items:center;gap:12px;width:220px;justify-content:flex-end;flex-shrink:0}
                .bp-close{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.07);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);transition:all .2s}
                .bp-close:hover{background:rgba(255,255,255,.13);color:#fff}
                .bp-vol-wrap{display:flex;align-items:center;gap:8px}
                .bp-volbar{width:80px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;cursor:pointer;position:relative}
                .bp-volbar:hover{height:6px}
                .bp-volfill{height:100%;background:rgba(255,255,255,.7);border-radius:2px;transition:width .1s}
                .bp-volbar:hover .bp-volfill{background:#6c63ff}
                .bp-eq{display:flex;align-items:flex-end;gap:2px;height:14px}
                .bp-eq span{display:block;width:3px;background:#6c63ff;border-radius:1px;animation:bp-bar .5s ease-in-out infinite alternate}
                .bp-eq span:nth-child(1){height:5px;animation-delay:0s}
                .bp-eq span:nth-child(2){height:12px;animation-delay:.15s}
                .bp-eq span:nth-child(3){height:8px;animation-delay:.3s}
                .bp-eq span:nth-child(4){height:14px;animation-delay:.08s}
                @keyframes bp-bar{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
            `}</style>
            <div className="bp">
                {/* 시크바 (최상단) */}
                <div ref={barRef} className="bp-seekbar" onClick={handleSeekClick}>
                    <div className="bp-seekfill" style={{width:`${progress}%`}}/>
                </div>

                {/* 왼쪽: 트랙 정보 */}
                <div className="bp-left">
                    <div className="bp-cover">
                        {track.cover?<img src={track.cover} alt={track.title}/>:<div className="bp-cover-np">🎵</div>}
                    </div>
                    <div className="bp-tinfo">
                        <p className="bp-tname">{track.title}</p>
                        <p className="bp-tartist">{track.animeName} · {track.artist}</p>
                    </div>
                </div>

                {/* 가운데: 컨트롤 + 프로그레스 */}
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
                        <div ref={barRef} className="bp-progbar" onClick={handleSeekClick}>
                            <div className="bp-progfill" style={{width:`${progress}%`}}/>
                        </div>
                        <span className="bp-time right">{ft(track.duration||30)}</span>
                    </div>
                </div>

                {/* 오른쪽: EQ + 볼륨 + 닫기 */}
                <div className="bp-right">
                    {isPlaying && <div className="bp-eq"><span/><span/><span/><span/></div>}
                    <div className="bp-vol-wrap">
                        <button className="bp-btn" onClick={()=>onVolume(volume===0?0.7:0)}>
                            {volume===0
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                                : volume<0.5
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            }
                        </button>
                        <div ref={volRef} className="bp-volbar" onClick={handleVolClick}>
                            <div className="bp-volfill" style={{width:`${volume*100}%`}}/>
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

// ── 로딩 프로그레스 바 ─────────────────────────────────────────
function LoadProgress({ loaded, total }: { loaded: number; total: number }) {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
                <div style={{ height: '100%', background: 'linear-gradient(to right,#6c63ff,#a78bfa)', borderRadius: 2, width: `${pct}%`, transition: 'width .4s ease' }}/>
            </div>
            <span style={{ flexShrink: 0 }}>{loaded}/{total} 로드 중...</span>
        </div>
    )
}

// ── 스켈레톤 카드 ─────────────────────────────────────────────
function SkeletonRow() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 10 }}>
            <div style={{ width: 22, height: 14, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}/>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,.06)', flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
                <div style={{ height: 13, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,.07)', marginBottom: 7 }}/>
                <div style={{ height: 11, width: '35%', borderRadius: 4, background: 'rgba(255,255,255,.05)' }}/>
            </div>
            <div style={{ width: 32, height: 11, borderRadius: 4, background: 'rgba(255,255,255,.05)' }}/>
        </div>
    )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function OstPage() {
    const { aniList, onFetchAni } = useAniStore()
    const [trackMap, setTrackMap] = useState<Record<string,OstTrack[]>>({ all:[], opening:[], ending:[], bgm:[], jpop:[] })
    const [loadProgress, setLoadProgress] = useState<Record<string,{loaded:number,total:number}>>({ all:{loaded:0,total:0}, opening:{loaded:0,total:0}, ending:{loaded:0,total:0}, bgm:{loaded:0,total:0}, jpop:{loaded:0,total:0} })
    const [activeFilter, setActiveFilter] = useState('all')
    const [sort, setSort] = useState('default')
    const [sortOpen, setSortOpen] = useState(false)
    const [playingId, setPlayingId] = useState<string|null>(null)
    const [currentTrack, setCurrentTrack] = useState<OstTrack|null>(null)
    const [progress, setProgress] = useState(0)
    const [volume, setVolume] = useState(0.8)
    const [search, setSearch] = useState('')
    const [searching, setSearching] = useState(false)
    const [popup, setPopup] = useState<string|null>(null)
    const [showPreviewOnly, setShowPreviewOnly] = useState(false)
    const audioRef = useRef<HTMLAudioElement|null>(null)
    const progressRef = useRef<ReturnType<typeof setInterval>|null>(null)
    const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
    const tracksRef = useRef<OstTrack[]>([])
    const loadedGenres = useRef<Set<string>>(new Set())

    const currentTracks = trackMap[activeFilter] || []
    useEffect(() => { tracksRef.current = currentTracks }, [currentTracks])
    useEffect(() => { if (!audioRef.current) return; audioRef.current.volume = volume }, [volume])
    useEffect(() => { if (aniList.length===0) onFetchAni() }, [])

    const loadGenre = useCallback(async (genre: string) => {
        if (loadedGenres.current.has(genre)) return
        loadedGenres.current.add(genre)
        const names = aniList.length>0
            ? [...aniList].sort((a:any,b:any)=>b.popularity-a.popularity).slice(0,12).map((a:any)=>a.original_name||a.name)
            : POPULAR_ANIME[genre]||POPULAR_ANIME.all
        setLoadProgress(p=>({...p,[genre]:{loaded:0,total:names.length}}))
        for (let i=0; i<names.length; i++) {
            const result = await fetchOst(names[i], genre)
            if (result.length>0) {
                setTrackMap(prev=>{
                    const exists = new Set(prev[genre].map(t=>t.animeName))
                    if (exists.has(result[0].animeName)) return prev
                    return {...prev,[genre]:[...prev[genre],...result]}
                })
            }
            setLoadProgress(p=>({...p,[genre]:{...p[genre],loaded:i+1}}))
            await new Promise(r=>setTimeout(r,280))
        }
    }, [aniList])

    useEffect(() => { loadGenre('all') }, [aniList])
    useEffect(() => { if (activeFilter!=='all') loadGenre(activeFilter) }, [activeFilter, loadGenre])

    // 검색
    useEffect(() => {
        if (!search.trim()) return
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(async () => {
            setSearching(true)
            try {
                let q = KO_TO_EN[search.trim()] || Object.entries(KO_TO_EN).find(([k])=>search.trim().includes(k))?.[1] || null
                if (!q) {
                    const ir = await fetch(`${ITUNES_BASE}?term=${encodeURIComponent(search.trim())}&media=music&limit=5&country=JP`)
                    const ij = await ir.json()
                    const oi = ij.results?.find((r:any)=>r.collectionName?.toLowerCase().includes('ost')||r.primaryGenreName?.includes('Anime'))
                    q = oi?.collectionName?.replace(/(ost|soundtrack)/gi,'').trim() || search.trim()
                }
                const result = await fetchOst(q, activeFilter)
                if (result.length>0) setTrackMap(prev=>({...prev,[activeFilter]:[...result,...prev[activeFilter].filter(t=>t.animeName!==result[0].animeName)]}))
            } finally { setSearching(false) }
        }, 600)
    }, [search, activeFilter])

    const stopAudio = useCallback(() => {
        audioRef.current?.pause()
        if (progressRef.current) clearInterval(progressRef.current)
        setPlayingId(null); setProgress(0)
    }, [])

    const startPlay = useCallback((track: OstTrack) => {
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
            setProgress((audioRef.current.currentTime/(audioRef.current.duration||30))*100)
        }, 200)
        audioRef.current.onended = () => {
            const all = tracksRef.current.filter(t=>t.previewUrl)
            const idx = all.findIndex(t=>t.id===track.id)
            if (idx<all.length-1) startPlay(all[idx+1]); else stopAudio()
        }
    }, [stopAudio, volume])

    const handlePlay = useCallback((track: OstTrack) => {
        if (playingId===track.id) { stopAudio(); return }
        startPlay(track)
    }, [playingId, startPlay, stopAudio])

    const handleSeek = useCallback((pct: number) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = (pct/100)*(audioRef.current.duration||30)
        setProgress(pct)
    }, [])

    const handlePrev = useCallback(() => {
        if (!currentTrack) return
        const all = tracksRef.current.filter(t=>t.previewUrl)
        const idx = all.findIndex(t=>t.id===currentTrack.id)
        if (idx>0) startPlay(all[idx-1])
    }, [currentTrack, startPlay])

    const handleNext = useCallback(() => {
        if (!currentTrack) return
        const all = tracksRef.current.filter(t=>t.previewUrl)
        const idx = all.findIndex(t=>t.id===currentTrack.id)
        if (idx<all.length-1) startPlay(all[idx+1])
    }, [currentTrack, startPlay])

    const sorted = [...currentTracks]
        .filter(t=>!showPreviewOnly||t.previewUrl)
        .sort((a,b)=>sort==='alpha'?a.title.localeCompare(b.title):0)

    const searchFiltered = search.trim()
        ? sorted.filter(t=>t.title.toLowerCase().includes(search.toLowerCase())||t.animeName.toLowerCase().includes(search.toLowerCase())||t.artist.toLowerCase().includes(search.toLowerCase()))
        : sorted

    const groups = Array.from(new Set(searchFiltered.map(t=>t.animeName)))
    const gtracks = (n: string) => searchFiltered.filter(t=>t.animeName===n)
    const total = groups.reduce((s,n)=>s+gtracks(n).length,0)
    const prog = loadProgress[activeFilter]
    const isLoading = prog && prog.total > 0 && prog.loaded < prog.total

    return (
        <>
            <div style={{minHeight:'100vh',background:'#0a0a0a',paddingTop:56,paddingBottom:currentTrack?96:0,display:'flex'}}>
                <style>{`
                    .ost-sb{width:220px;min-width:220px;border-right:1px solid rgba(255,255,255,.07);padding:24px 0 60px;overflow-y:auto;position:sticky;top:56px;height:calc(100vh - 56px)}
                    .ost-sb-top{display:flex;align-items:center;justify-content:space-between;padding:0 18px 18px}
                    .ost-sb-top h2{font-size:15px;font-weight:700;color:#fff;margin:0}
                    .ost-sb-reset{display:flex;align-items:center;gap:4px;background:none;border:none;color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;padding:0;transition:color .2s}
                    .ost-sb-reset:hover{color:rgba(255,255,255,.65)}
                    .ost-divider{border:none;border-top:1px solid rgba(255,255,255,.07);margin:0 0 14px}
                    .ost-sb-sec{padding:14px 18px 6px}
                    .ost-sb-sec-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px}
                    .ost-toggle-row{display:flex;align-items:center;gap:10px;padding:5px 18px;cursor:pointer;user-select:none}
                    .ost-sw{width:34px;height:18px;border-radius:9px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);position:relative;transition:background .2s;flex-shrink:0}
                    .ost-sw.on{background:#6c63ff;border-color:#6c63ff}
                    .ost-knob{width:12px;height:12px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
                    .ost-sw.on .ost-knob{left:18px}
                    .ost-sw-label{font-size:12.5px;color:rgba(255,255,255,.5)}
                    .ost-sw.on+.ost-sw-label{color:rgba(255,255,255,.82)}
                    .ost-tab{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border-radius:8px;background:none;border:none;color:rgba(255,255,255,.48);font-size:13px;cursor:pointer;transition:all .15s;text-align:left;margin:1px 0}
                    .ost-tab:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.82)}
                    .ost-tab.active{background:rgba(108,99,255,.15);color:#a5a0ff;font-weight:600}
                    .ost-tab-icon{font-size:13px;flex-shrink:0}
                    .ost-tab-cnt{margin-left:auto;font-size:10px;color:rgba(255,255,255,.22);background:rgba(255,255,255,.06);padding:1px 6px;border-radius:8px}
                    .ost-tab.active .ost-tab-cnt{background:rgba(108,99,255,.2);color:#a5a0ff}

                    .ost-main{flex:1;display:flex;flex-direction:column;min-width:0}
                    .ost-topbar{padding:28px 32px 0;background:linear-gradient(160deg,rgba(108,99,255,.12) 0%,transparent 60%)}
                    .ost-page-title{font-size:28px;font-weight:900;color:#fff;margin:0 0 4px;display:flex;align-items:center;gap:10px}
                    .ost-page-sub{font-size:13px;color:rgba(255,255,255,.38);margin:0 0 22px}
                    .ost-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:20px}
                    .ost-search-wrap{position:relative;flex:1;max-width:380px}
                    .ost-search{width:100%;height:40px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:13px;padding:0 38px 0 36px;outline:none;transition:border-color .2s;box-sizing:border-box}
                    .ost-search:focus{border-color:#6c63ff;background:rgba(108,99,255,.08)}
                    .ost-search::placeholder{color:rgba(255,255,255,.22)}
                    .ost-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.3);pointer-events:none}
                    .ost-spin{position:absolute;right:11px;top:50%;width:13px;height:13px;border:2px solid rgba(255,255,255,.1);border-top-color:#6c63ff;border-radius:50%;animation:ospin .7s linear infinite;transform:translateY(-50%)}
                    @keyframes ospin{to{transform:translateY(-50%) rotate(360deg)}}
                    .ost-sort-wrap{position:relative}
                    .ost-sort-btn{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:rgba(255,255,255,.55);font-size:12px;cursor:pointer;padding:7px 12px;transition:all .2s;white-space:nowrap}
                    .ost-sort-btn:hover{color:#fff;background:rgba(255,255,255,.1)}
                    .ost-sort-dd{position:absolute;right:0;top:calc(100% + 4px);width:110px;background:#1c1c1e;border:1px solid rgba(255,255,255,.1);border-radius:9px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,.6);z-index:300}
                    .ost-sort-item{display:flex;align-items:center;gap:7px;width:100%;padding:9px 13px;background:none;border:none;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer;text-align:left;transition:all .15s}
                    .ost-sort-item:hover{background:rgba(255,255,255,.06);color:#fff}
                    .ost-sort-item.active{color:#fff}
                    .ost-result-info{font-size:12px;color:rgba(255,255,255,.24);padding:0 32px 10px}
                    .ost-body{padding:4px 32px 60px}
                    .ost-section{margin-bottom:28px}
                    .ost-sec-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
                    .ost-sec-title{font-size:15px;font-weight:800;color:rgba(255,255,255,.85);margin:0;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap}
                    .ost-sec-title:hover{color:#fff}
                    .ost-sec-title:hover .ost-arr{opacity:1}
                    .ost-arr{opacity:0;transition:opacity .2s;color:#6c63ff}
                    .ost-line{flex:1;height:1px;background:rgba(255,255,255,.06)}
                    .ost-list{display:flex;flex-direction:column;gap:1px}
                    .ost-row{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:8px;cursor:pointer;transition:background .12s;border:1px solid transparent}
                    .ost-row:hover{background:rgba(255,255,255,.05)}
                    .ost-row.playing{background:rgba(108,99,255,.1);border-color:rgba(108,99,255,.18)}
                    .ost-row.nop{opacity:.32;cursor:default}
                    .ost-rnum{font-size:12px;color:rgba(255,255,255,.22);width:20px;text-align:center;flex-shrink:0}
                    .ost-row.playing .ost-rnum{color:#6c63ff}
                    .ost-rthumb{width:44px;height:44px;border-radius:7px;overflow:hidden;background:#1a1a1a;flex-shrink:0}
                    .ost-rthumb img{width:100%;height:100%;object-fit:cover}
                    .ost-rthumb-np{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;background:linear-gradient(135deg,#1a1535,#0f0f1a)}
                    .ost-rinfo{flex:1;min-width:0}
                    .ost-rname{font-size:13px;font-weight:600;color:rgba(255,255,255,.83);margin:0 0 2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
                    .ost-row.playing .ost-rname{color:#a5a0ff}
                    .ost-rartist{font-size:11px;color:rgba(255,255,255,.3);margin:0}
                    .ost-rright{display:flex;align-items:center;gap:8px;flex-shrink:0}
                    .ost-rdur{font-size:11px;color:rgba(255,255,255,.22);width:32px;text-align:right}
                    .ost-eq{display:flex;align-items:flex-end;gap:2px;height:13px}
                    .ost-eq span{display:block;width:2px;background:#6c63ff;border-radius:1px;animation:oeq .5s ease-in-out infinite alternate}
                    .ost-eq span:nth-child(1){height:4px;animation-delay:0s}
                    .ost-eq span:nth-child(2){height:11px;animation-delay:.15s}
                    .ost-eq span:nth-child(3){height:7px;animation-delay:.3s}
                    @keyframes oeq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
                    .ost-more{display:flex;align-items:center;gap:5px;padding:6px 13px;background:rgba(108,99,255,.1);border:1px solid rgba(108,99,255,.18);border-radius:6px;color:#a5a0ff;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;margin-top:4px}
                    .ost-more:hover{background:rgba(108,99,255,.2)}
                    .ost-sk-section{margin-bottom:28px}
                    .ost-sk-title{height:14px;width:140px;border-radius:4px;background:rgba(255,255,255,.07);margin-bottom:12px}
                `}</style>

                {/* 사이드바 */}
                <aside className="ost-sb">
                    <div className="ost-sb-top">
                        <h2>필터</h2>
                        <button className="ost-sb-reset" onClick={()=>{setActiveFilter('all');setShowPreviewOnly(false);setSearch('')}}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            초기화
                        </button>
                    </div>
                    <hr className="ost-divider"/>
                    <div className="ost-toggle-row" onClick={()=>setShowPreviewOnly(v=>!v)}>
                        <div className={`ost-sw${showPreviewOnly?' on':''}`}><div className="ost-knob"/></div>
                        <span className="ost-sw-label">미리듣기 가능만</span>
                    </div>
                    <div className="ost-sb-sec" style={{marginTop:14}}>
                        <p className="ost-sb-sec-label">장르</p>
                        {FILTER_TABS.map(f=>(
                            <button key={f.id} className={`ost-tab${activeFilter===f.id?' active':''}`} onClick={()=>setActiveFilter(f.id)}>
                                <span className="ost-tab-icon">{f.icon}</span>
                                {f.label}
                                <span className="ost-tab-cnt">{(trackMap[f.id]||[]).length}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* 메인 */}
                <div className="ost-main">
                    <div className="ost-topbar">
                        <h1 className="ost-page-title">🎵 애니 OST</h1>
                        <p className="ost-page-sub">인기 애니메이션 OST · 30초 미리듣기</p>
                        <div className="ost-toolbar">
                            <div className="ost-search-wrap">
                                <svg className="ost-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input className="ost-search" placeholder="애니·곡·아티스트 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
                                {searching && <div className="ost-spin"/>}
                            </div>
                            <div className="ost-sort-wrap">
                                <button className="ost-sort-btn" onClick={()=>setSortOpen(v=>!v)}>
                                    {SORT_OPTIONS.find(o=>o.id===sort)?.label||'인기순'}
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                {sortOpen && (
                                    <div className="ost-sort-dd">
                                        {SORT_OPTIONS.map(o=>(
                                            <button key={o.id} className={`ost-sort-item${sort===o.id?' active':''}`} onClick={()=>{setSort(o.id);setSortOpen(false)}}>
                                                {sort===o.id && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>}
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="ost-result-info">{total}곡</p>

                    <div className="ost-body">
                        {/* 로딩 프로그레스 */}
                        {isLoading && <LoadProgress loaded={prog.loaded} total={prog.total}/>}

                        {/* 스켈레톤 (처음 로딩중) */}
                        {currentTracks.length===0 && isLoading ? (
                            [0,1,2].map(i=>(
                                <div key={i} className="ost-sk-section">
                                    <div className="ost-sk-title" style={{animationDelay:`${i*0.1}s`}}/>
                                    {[0,1,2,3].map(j=><SkeletonRow key={j}/>)}
                                </div>
                            ))
                        ) : (
                            <>
                                {groups.map(animeName=>{
                                    const at = gtracks(animeName)
                                    if (!at.length) return null
                                    const preview = at.slice(0,4)
                                    const hasMore = at.length>4
                                    return (
                                        <div key={animeName} className="ost-section">
                                            <div className="ost-sec-head">
                                                <h2 className="ost-sec-title" onClick={()=>setPopup(animeName)}>
                                                    {animeName}
                                                    <span className="ost-arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg></span>
                                                </h2>
                                                <div className="ost-line"/>
                                            </div>
                                            <div className="ost-list">
                                                {preview.map((t,i)=>(
                                                    <div key={t.id} className={`ost-row${playingId===t.id?' playing':''}${!t.previewUrl?' nop':''}`} onClick={()=>handlePlay(t)}>
                                                        <span className="ost-rnum">
                                                            {playingId===t.id?<div className="ost-eq"><span/><span/><span/></div>:i+1}
                                                        </span>
                                                        <div className="ost-rthumb">
                                                            {t.cover?<img src={t.cover} alt={t.title}/>:<div className="ost-rthumb-np">🎵</div>}
                                                        </div>
                                                        <div className="ost-rinfo">
                                                            <p className="ost-rname">{t.title}</p>
                                                            <p className="ost-rartist">{t.artist}</p>
                                                        </div>
                                                        <div className="ost-rright">
                                                            <span className="ost-rdur">{ft(t.duration)}</span>
                                                            {playingId===t.id
                                                                ?<svg width="13" height="13" viewBox="0 0 24 24" fill="#6c63ff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                                                :<svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.22)"><polygon points="5,3 19,12 5,21"/></svg>
                                                            }
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {hasMore&&(
                                                <button className="ost-more" onClick={()=>setPopup(animeName)}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                    {at.length-4}곡 더보기
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {popup&&<AlbumPopup animeName={popup} tracks={currentTracks.filter(t=>t.animeName===popup)} playingId={playingId} onPlay={handlePlay} onClose={()=>setPopup(null)}/>}

            {currentTrack&&(
                <BottomPlayer
                    track={currentTrack} isPlaying={playingId===currentTrack.id}
                    progress={progress} volume={volume}
                    onPlayPause={()=>playingId===currentTrack.id?stopAudio():startPlay(currentTrack)}
                    onSeek={handleSeek} onPrev={handlePrev} onNext={handleNext}
                    onVolume={setVolume}
                    onClose={()=>{stopAudio();setCurrentTrack(null)}}
                />
            )}
        </>
    )
}
