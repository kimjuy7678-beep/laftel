"use client"
import { useAuthStore } from '@/store/useAuthStore'
import { usePointStore } from '@/store/usePointStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import Link from 'next/link'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePageTransition } from '@/hook/usePageTransition'
import GradeModal from './GradeModal'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const MenuList = [
    { id: 1, title: "태그검색", path: "/tag-search" },
    { id: 2, title: "요일별 신작", path: "/day-new" },
    { id: 3, title: "라이브", path: "/live", live: true },
    { id: 4, title: "OST", path: "/ost" },
    { id: 5, title: "스토어", path: "/store", badge: "N" },
    { id: 6, title: "이벤트", path: "/event" },
]

const membershipConfig: Record<string, { label: string; color: string | null }> = {
    none: { label: '라프텔 멤버십', color: null },
    basic: { label: 'BASIC 회원', color: '#3b82f6' },
    premium: { label: 'PREMIUM 회원', color: '#f59e0b' },
    anime: { label: '애니 멤버십', color: '#6c63ff' },
    ost: { label: 'OST 멤버십', color: '#ec4899' },
    allinone: { label: '올인원 멤버십', color: '#f59e0b' },
}

const typeIcon: Record<string, string> = {
    point: '💰', coupon: '🎟️', membership: '⭐', event: '🎉', live: '📺',
}

const formatTime = (ts: any) => {
    if (!ts) return ''
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
}

function EventNotifications() {
    const [events, setEvents] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        fetch('https://api.laftel.net/api/events/v2/list/?offset=0&limit=5')
            .then(r => r.json())
            .then(d => setEvents(d.results?.filter((e: any) => e.status === 'ongoing').slice(0, 3) || []))
            .catch(() => { })
    }, [])

    if (events.length === 0) return null

    return (
        <div className="border-t border-white/10">
            <p className="text-[10px] text-white/30 px-4 py-2 font-medium">진행중인 이벤트</p>
            {events.map((e: any) => (
                <div key={e.id} onClick={() => router.push(`/event/${e.id}`)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0">
                    <img src={e.img} alt={e.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs text-white/70 truncate">{e.name}</p>
                        <p className="text-[10px] text-[#6c63ff]">진행중</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [ostResults, setOstResults] = useState<any[]>([])
    const [trending, setTrending] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [activeCategory, setActiveCategory] = useState('trending')
    const [categoryItems, setCategoryItems] = useState<any[]>([])
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const CATS = [
        { id: 'trending', label: '🔥 인기', genre: null },
        { id: '16', label: '🎌 애니메이션', genre: 16 },
        { id: 'action', label: '⚔️ 액션', genre: 10759 },
        { id: 'romance', label: '💕 로맨스', genre: 10749 },
        { id: 'fantasy', label: '✨ 판타지', genre: 10765 },
        { id: 'comedy', label: '😂 개그', genre: 35 },
        { id: 'drama', label: '😭 드라마', genre: 18 },
        { id: 'mystery', label: '🌑 미스터리', genre: 9648 },
    ]

    useEffect(() => {
        inputRef.current?.focus()
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        loadCategory('trending', null)
        // 카운트만 백그라운드로
        Promise.all(CATS.slice(1).map(c =>
            fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=${c.genre}&with_original_language=ja&language=ko-KR&page=1`)
                .then(r => r.json()).then(d => ({ id: c.id, count: d.total_results || 0 })).catch(() => ({ id: c.id, count: 0 }))
        )).then(results => {
            const counts: Record<string, number> = {}
            results.forEach(r => { counts[r.id] = r.count })
            setCategoryCounts(counts)
        })
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    const loadCategory = async (id: string, genre: number | null) => {
        setLoading(true)
        try {
            const url = id === 'trending'
                ? `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_KEY}&language=ko-KR`
                : `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=${genre}&with_original_language=ja&language=ko-KR&sort_by=popularity.desc`
            const data = await fetch(url).then(r => r.json())
            const list = (data.results || []).filter((r: any) => r.original_language === 'ja')
            setTrending(list.slice(0, 3))
            setCategoryItems(list.slice(0, 12))
        } catch { }
        finally { setLoading(false) }
    }

    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); setOstResults([]); return }
        setLoading(true)
        try {
            const [a, o] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ko-KR`).then(r => r.json()),
                fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q + ' anime ost')}&media=music&genreId=27&limit=3&country=JP`).then(r => r.json()),
            ])
            setResults((a.results || []).filter((r: any) => r.origin_country?.includes('JP') || r.original_language === 'ja').slice(0, 8))
            setOstResults((o.results || []).filter((r: any) => r.previewUrl).slice(0, 3))
        } catch { }
        finally { setLoading(false) }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        setQuery(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => search(v), 320)
    }

    const handleCat = (cat: typeof CATS[0]) => {
        setActiveCategory(cat.id)
        setQuery('')
        loadCategory(cat.id, cat.genre)
    }

    const handleSubmit = () => {
        if (!query.trim()) return
        onClose(); router.push(`/anime/search?q=${encodeURIComponent(query)}`)
    }

    const isSearching = query.trim().length > 0

    return (
        <>
            <style>{`
              
.so{
    position:fixed;
    inset:0;
    z-index:9999;
}

.so-bg{
    position:absolute;
    inset:0;
    background:rgba(0,0,0,.86);
    backdrop-filter:blur(18px);
}

.so-modal{
    position:absolute;
    top:70px;
    left:50%;
    transform:translateX(-50%);

    width:min(1400px,92vw);
    height:82vh;

    background:#070811;

    border:1px solid rgba(255,255,255,.05);
    border-radius:20px;

    overflow:hidden;

    display:flex;
    flex-direction:column;

    box-shadow:
    0 40px 120px rgba(0,0,0,.8);
}

.so-top{
    height:64px;

    display:flex;
    align-items:center;
    gap:12px;

    padding:0 18px;

    border-bottom:1px solid rgba(255,255,255,.05);

    flex-shrink:0;
}

.so-inp{
    flex:1;

    background:none;
    border:none;
    outline:none;

    color:#fff;

    font-size:14px;
}

.so-inp::placeholder{
    color:rgba(255,255,255,.25);
}

.so-esc-btn{
    height:28px;
    padding:0 10px;

    border:none;
    border-radius:6px;

    background:rgba(255,255,255,.05);

    color:rgba(255,255,255,.5);

    cursor:pointer;
}

.so-body{
    flex:1;
    display:flex;
    overflow:hidden;
}

.so-side{
    width:125px;

    border-right:1px solid rgba(255,255,255,.05);

    padding:14px 0;

    flex-shrink:0;
}

.so-side-lbl{
    display:block;

    padding:0 14px 10px;

    font-size:10px;
    color:rgba(255,255,255,.25);
}

.so-cat-btn{
    width:100%;

    height:38px;

    display:flex;
    align-items:center;
    justify-content:space-between;

    padding:0 14px;

    border:none;
    background:none;

    color:rgba(255,255,255,.45);

    cursor:pointer;

    font-size:12px;

    transition:.15s;
}

.so-cat-btn:hover{
    background:rgba(255,255,255,.04);
    color:#fff;
}

.so-cat-btn.on{
    background:rgba(108,99,255,.15);

    color:#fff;

    border-left:2px solid #7d75ff;
}

.so-right{
    flex:1;
    display:flex;
    overflow:hidden;
}

.so-posters{
    width:150px;

    padding:12px;

    border-right:1px solid rgba(255,255,255,.05);

    flex-shrink:0;

    overflow-y:auto;
}

.so-poster{
    width:100%;

    aspect-ratio:2/3;

    border-radius:10px;

    overflow:hidden;

    margin-bottom:12px;

    cursor:pointer;
}

.so-poster img{
    width:100%;
    height:100%;
    object-fit:cover;
}

.so-list{
    flex:1;

    overflow-y:auto;
}

.so-list-lbl{
    display:block;

    padding:18px 18px 10px;

    color:rgba(255,255,255,.25);

    font-size:11px;
}

.so-row{
    height:48px;

    display:flex;
    align-items:center;
    justify-content:space-between;

    padding:0 18px;

    cursor:pointer;

    transition:.15s;
}

.so-row:hover{
    background:rgba(255,255,255,.04);
}

.so-row-left{
    display:flex;
    align-items:center;
    gap:10px;
}

.so-row-thumb{
    width:28px;
    height:40px;

    border-radius:4px;

    overflow:hidden;
}

.so-row-thumb img{
    width:100%;
    height:100%;
    object-fit:cover;
}

.so-row-name{
    color:#e8e8e8;
    font-size:13px;
}

.so-row-year{
    color:rgba(255,255,255,.25);
    font-size:11px;
}
            `}</style>

            <div className="so" onClick={onClose}>
                <div className="so-bg" />
                <div className="so-modal" onClick={e => e.stopPropagation()}>

                    {/* 검색바 */}
                    <div className="so-top">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input ref={inputRef} className="so-inp" value={query} onChange={handleChange}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                            placeholder="애니, OST, 장르 검색..." />
                        <button className="so-esc-btn" onClick={onClose}>ESC</button>
                    </div>

                    {/* 바디 */}
                    <div className="so-body">
                        {/* 카테고리 사이드바 */}
                        <div className="so-side">
                            <span className="so-side-lbl">카테고리</span>
                            {CATS.map(cat => (
                                <button key={cat.id}
                                    className={`so-cat-btn ${activeCategory === cat.id && !isSearching ? 'on' : ''}`}
                                    onClick={() => handleCat(cat)}>
                                    <span>{cat.label}</span>
                                    {categoryCounts[cat.id] ? (
                                        <span className="so-cat-cnt">
                                            {categoryCounts[cat.id] > 999 ? `${Math.floor(categoryCounts[cat.id] / 1000)}k` : categoryCounts[cat.id]}
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                        </div>

                        {/* 오른쪽 */}
                        <div className="so-right">
                            {loading ? (
                                <div className="so-loading" style={{ flex: 1 }}><div className="so-spin" />불러오는 중...</div>
                            ) : isSearching ? (
                                /* 검색 결과 */
                                <div className="so-list" style={{ width: '100%' }}>
                                    {results.length === 0 && ostResults.length === 0 ? (
                                        <div className="so-empty">검색 결과가 없어요 😢</div>
                                    ) : (
                                        <>
                                            {results.length > 0 && (
                                                <>
                                                    <span className="so-list-lbl">애니 {results.length}개</span>
                                                    {results.map(item => (
                                                        <div key={item.id} className="so-row"
                                                            onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}>
                                                            <div className="so-row-left">
                                                                <div className="so-row-thumb">
                                                                    {item.poster_path && <img src={`${IMG}/w92${item.poster_path}`} alt={item.name} />}
                                                                </div>
                                                                <span className="so-row-name">{item.name}</span>
                                                            </div>
                                                            <span className="so-row-year">{item.first_air_date?.slice(0, 4)}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {ostResults.length > 0 && (
                                                <>
                                                    <div className="so-divider" />
                                                    <span className="so-list-lbl">🎵 OST {ostResults.length}개</span>
                                                    {ostResults.map((ost: any) => (
                                                        <div key={ost.trackId} className="so-ost-row"
                                                            onClick={() => { onClose(); router.push('/ost') }}>
                                                            <div className="so-ost-img"><img src={ost.artworkUrl100} alt={ost.trackName} /></div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p className="so-ost-title">{ost.trackName}</p>
                                                                <p className="so-ost-artist">{ost.artistName}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* 포스터 3개 */}
                                    <div className="so-posters">
                                        {trending.map(item => (
                                            <div key={item.id} className="so-poster"
                                                onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}>
                                                {item.poster_path
                                                    ? <img src={`${IMG}/w342${item.poster_path}`} alt={item.name} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: '#1a1a22' }}>🎌</div>
                                                }
                                                <div className="so-poster-ov">
                                                    <p className="so-poster-name">{item.name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 리스트 */}
                                    <div className="so-list">
                                        <span className="so-list-lbl">{CATS.find(c => c.id === activeCategory)?.label}</span>
                                        {categoryItems.map(item => (
                                            <div key={item.id} className="so-row"
                                                onClick={() => { onClose(); router.push(`/anime/${item.id}`) }}>
                                                <div className="so-row-left">
                                                    <div className="so-row-thumb">
                                                        {item.poster_path && <img src={`${IMG}/w92${item.poster_path}`} alt={item.name} />}
                                                    </div>
                                                    <span className="so-row-name">{item.name}</span>
                                                </div>
                                                <span className="so-row-year">{item.first_air_date?.slice(0, 4)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
export default function Header() {
    const user = useAuthStore(s => s.user)
    const avatarConfig = useAuthStore(s => s.avatarConfig)
    const { onLogout } = useAuthStore()
    const { points, fetchPoints } = usePointStore()
    const { notifications, unreadCount, subscribeNotifications, markAllRead, markOneRead } = useNotificationStore()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notiOpen, setNotiOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [gradeOpen, setGradeOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const notiRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const pathname = usePathname()
    const { navigate } = usePageTransition()

    const membership = user?.membership || 'none'
    const memberInfo = membershipConfig[membership] || membershipConfig['none']

    useEffect(() => {
        if (user?.uid) {
            fetchPoints(user.uid)
            subscribeNotifications(user.uid)
        }
    }, [user])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
            if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        document.body.style.overflow = searchOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [searchOpen])

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout = async () => {
        await onLogout()
        setDropdownOpen(false)
        router.push('/')
    }

    const DropdownMenu = [
        { title: memberInfo.label, path: "/membership", sub: membership !== 'none' ? '✓' : undefined, subColor: memberInfo.color, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /></svg> },
        { title: "내 포인트", path: "/point", sub: `${points.toLocaleString()}P`, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
        { title: "내 정보", path: "/mypage", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
        { title: "쿠폰 등록", path: "/coupon", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg> },
        { title: "이용내역", path: "/history", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg> },
        { title: "공지사항", path: "/notice", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
        { title: "고객센터", path: "https://help.laftel.net/hc/ko", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" /></svg> },
        { title: "설정", path: "/setting", sub: undefined, subColor: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
    ]

    return (
        <>
            {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
            {gradeOpen && <GradeModal onClose={() => setGradeOpen(false)} />}

            <header
                className="fixed top-0 left-0 w-full z-[9999] transition-colors duration-300 py-[10px] px-[10px]"
                style={{ background: scrolled ? '#000' : 'transparent' }}
            >
                <div
                    className="w-full h-[55px] flex items-center justify-between px-[28px] rounded-full transition-colors duration-300"
                    style={{ background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent' }}
                >

                    {/* 좌측: 로고 + 네비게이션 */}
                    <div className="flex items-center gap-[42px]">
                        {/* 로고 */}
                        <div className="flex items-center gap-[14px]">
                            <Link href="/" className="flex items-center gap-[12px]">
                                <img src="/images/stone.svg" alt="" className="h-10" />
                                <img src="/images/logo-white.svg" alt="logo" className="h-[22px] w-auto" />
                            </Link>
                            {/* OTT / Store 토글 */}
                            <div className="flex items-center bg-white/10 rounded-full p-[3px] gap-[2px]">
                                <button
                                    onClick={() => navigate('/', '#0a0a0a')}
                                    className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-200 ${!pathname.startsWith('/store')
                                        ? 'bg-white text-[#826CFF] shadow-sm'
                                        : 'text-white/60 hover:text-white'
                                        }`}
                                >
                                    OTT
                                </button>
                                <button
                                    onClick={() => navigate('/store', '#ffffff')}
                                    className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-200 ${pathname.startsWith('/store')
                                        ? 'bg-white text-[#826CFF] shadow-sm'
                                        : 'text-white/60 hover:text-white'
                                        }`}
                                >
                                    Store
                                </button>
                            </div>
                        </div>

                        <nav>
                            <ul className="flex items-center gap-[32px]">
                                {MenuList.map((menu) => {
                                    const isActive = pathname === menu.path || (menu.path !== '/' && pathname.startsWith(menu.path))
                                    return (
                                        <li key={menu.id} className="relative">
                                            <Link
                                                href={menu.path}
                                                className={`flex items-center gap-1.5 text-[15px] transition-all duration-200
                                                    ${isActive
                                                        ? 'text-white font-extrabold'
                                                        : 'text-white/70 font-medium hover:text-white hover:font-bold'
                                                    }`}
                                            >
                                                {menu.title}
                                                {menu.live && (
                                                    <span className="inline-flex items-center justify-center px-1.5 h-4 rounded bg-red-500 text-[10px] font-bold text-white animate-pulse">
                                                        LIVE
                                                    </span>
                                                )}
                                                {menu.badge && (
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#6c5ce7]/100 text-[10px] font-bold text-white">
                                                        {menu.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </nav>
                    </div>

                    {/* 우측: 아이콘 + 유저 */}
                    <div className="flex items-center gap-[8px]">

                        {/* 검색 */}
                        <button
                            type="button"
                            aria-label="검색"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 cursor-pointer text-white"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>

                        {/* 멤버십 */}
                        <Link
                            href="/membership"
                            aria-label="멤버십"
                            className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                <path d="M13 5v2M13 17v2M13 11v2" />
                            </svg>
                        </Link>

                        {/* 알림 */}
                        <div className="relative" ref={notiRef}>
                            <button
                                onClick={() => {
                                    setNotiOpen(!notiOpen)
                                    if (!notiOpen && user?.uid && unreadCount > 0) markAllRead(user.uid)
                                }}
                                aria-label="알림"
                                className="relative flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 text-white"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {notiOpen && (
                                <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                        <span className="text-sm font-bold text-white">알림</span>
                                        {unreadCount > 0 && (
                                            <button onClick={() => user?.uid && markAllRead(user.uid)} className="text-xs text-[#6c63ff] hover:text-[#5a52e0]">모두 읽음</button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto max-h-[360px]">
                                        {notifications.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                </svg>
                                                <p className="text-white/30 text-xs">알림이 없어요</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div key={n.id}
                                                    onClick={() => { if (user?.uid) markOneRead(user.uid, n.id); if (n.link) router.push(n.link); setNotiOpen(false) }}
                                                    className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? 'bg-[#6c63ff]/5' : ''}`}>
                                                    <span className="text-lg shrink-0">{typeIcon[n.type] || '🔔'}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-medium ${!n.read ? 'text-white' : 'text-white/70'}`}>{n.title}</p>
                                                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{n.body}</p>
                                                        <p className="text-[10px] text-white/25 mt-1">{formatTime(n.createdAt)}</p>
                                                    </div>
                                                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#6c63ff] shrink-0 mt-1" />}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <EventNotifications />
                                </div>
                            )}
                        </div>

                        {/* 구분선 */}
                        <div className="w-px h-5 bg-white/20 mx-1" />

                        {/* 유저 프로필 */}
                        {!user ? (
                            <Link
                                href="/login"
                                className="text-sm text-white/80 hover:text-white transition-colors px-2"
                            >
                                로그인
                            </Link>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-[8px] cursor-pointer group h-[55px]"
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/30 group-hover:ring-white/60 transition-all duration-200 shrink-0"
                                        style={{ background: memberInfo.color || '#5a52e0' }}
                                    >
                                        {avatarConfig?.svgDataUrl ? (
                                            <img src={avatarConfig.svgDataUrl} alt="프로필" className="w-full h-full object-cover" />
                                        ) : user.photoURL ? (
                                            <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xs font-bold">
                                                {user.name?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-white/90 group-hover:text-white transition-colors">
                                        {user.name}
                                    </span>
                                    <svg
                                        width="13" height="13" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2"
                                        className={`text-white/60 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 top-[calc(100%+4px)] w-[300px] bg-[#141420] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                        {/* 프로필 헤더 */}
                                        <div className="flex flex-col items-center gap-2 px-5 py-6 border-b border-white/10">
                                            <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                                                <div
                                                    className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-1 ring-2 ring-white/20 hover:ring-white/40 transition-all"
                                                    style={{ background: memberInfo.color || '#6c63ff' }}
                                                >
                                                    {avatarConfig?.svgDataUrl ? (
                                                        <img src={avatarConfig.svgDataUrl} alt="프로필" className="w-full h-full object-cover" />
                                                    ) : user.photoURL ? (
                                                        <img src={user.photoURL} alt="프로필" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-white text-2xl font-bold">{user?.name?.[0]?.toUpperCase() || '?'}</span>
                                                    )}
                                                </div>
                                            </Link>
                                            <div className="text-center">
                                                <Link href="/profile" onClick={() => setDropdownOpen(false)}
                                                    className="text-white font-bold text-sm flex items-center gap-1 justify-center hover:text-white/70 transition-colors cursor-pointer">
                                                    {user.name || user.email?.split('@')[0]}
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                                </Link>
                                                <button
                                                    onClick={() => { setGradeOpen(true); setDropdownOpen(false) }}
                                                    className="text-white/40 text-xs mt-0.5 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer p-0 block mx-auto">
                                                    😊 Lv.0 베이비
                                                </button>
                                                {membership !== 'none' && (
                                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                                                        style={{ background: `${memberInfo.color}30`, color: memberInfo.color! }}>
                                                        {memberInfo.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-6 mt-2">
                                                {[{ label: '별점', val: 0 }, { label: '리뷰', val: 0 }, { label: '댓글', val: 0 }].map(s => (
                                                    <div key={s.label} className="text-center">
                                                        <p className="text-white font-black text-base">{s.val}</p>
                                                        <p className="text-white/35 text-[11px]">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <Link href="/library" onClick={() => setDropdownOpen(false)}
                                                className="w-full mt-3 py-2.5 rounded-xl border border-white/10 bg-white/4 text-white/70 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/8 hover:text-white transition-colors">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                                                보관함
                                            </Link>
                                        </div>
                                        {/* 메뉴 리스트 */}
                                        <ul className="py-1">
                                            {DropdownMenu.map((item) => (
                                                <li key={item.title}>
                                                    <Link href={item.path} onClick={() => setDropdownOpen(false)}
                                                        target={item.path.startsWith('http') ? '_blank' : undefined}
                                                        rel={item.path.startsWith('http') ? 'noopener noreferrer' : undefined}
                                                        className="flex items-center justify-between px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">
                                                        <span className="flex items-center gap-3">
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : 'rgba(255,255,255,0.5)' }}>
                                                                {item.icon}
                                                            </span>
                                                            <span style={{ color: item.title === memberInfo.label && memberInfo.color ? memberInfo.color : undefined }}>
                                                                {item.title}
                                                            </span>
                                                        </span>
                                                        {item.sub && <span className="text-xs" style={{ color: item.subColor || undefined }}>{item.sub}</span>}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="border-t border-white/10 py-1">
                                            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                                                </svg>
                                                로그아웃
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    )
}
