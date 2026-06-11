'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { db, storage } from '@/firebase/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
    collection, addDoc, getDocs, query, orderBy,
    limit, onSnapshot, doc, updateDoc, increment, where,
} from 'firebase/firestore'
import GradeBadge from '@/components/GradeBadge'
import UserProfilePopover from '@/components/UserProfilePopover'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300'
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY

const TAG_TMDB_IDS: Record<string, number> = {
    '#진격의거인': 1429, '#귀멸의칼날': 45576, '#주술회전': 95479,
    '#나루토': 46260, '#원피스': 37854, '#바이올렛에버가든': 79006,
    '#체인소맨': 114410, '#스파이패밀리': 130392,
}
const HOT_TAGS_BASE = [
    { tag: '#진격의거인', base: 284 }, { tag: '#귀멸의칼날', base: 193 },
    { tag: '#주술회전', base: 421 }, { tag: '#나루토', base: 156 },
    { tag: '#원피스', base: 89 }, { tag: '#바이올렛에버가든', base: 312 },
    { tag: '#체인소맨', base: 67 }, { tag: '#스파이패밀리', base: 44 },
]

async function searchAnimeByName(q: string) {
    if (!TMDB_KEY || !q.trim()) return []
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ko-KR&include_adult=false`
        )
        const data = await res.json()
        return (data.results || [])
            .filter((r: any) => r.original_language === 'ja')
            .slice(0, 8)
            .map((r: any) => ({
                id: r.id,
                name: r.name || r.original_name,
                tag: `#${(r.name || r.original_name).replace(/[\s·]+/g, '')}`,
                poster: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
            }))
    } catch { return [] }
}

const MOCK_BASE = [
    { id: 'm1', authorId: 'mock', authorNickname: '진격팬123', authorProfileImg: '', authorWatched: 42, title: '진격의 거인 파이널 마지막화 보고 멘탈 탈출...', content: '진짜 이게 뭐야... 엔딩 보고 30분 동안 멍 때렸음. 엘런 선택 어떻게 생각함?', tags: ['#진격의거인', '#결말스포'], category: '감상평', isSpoiler: true, likes: 284, commentCount: 2 },
    { id: 'm2', authorId: 'mock', authorNickname: '에렌옹호론자', authorProfileImg: '', authorWatched: 60, title: '엘런이 틀리지 않은 이유 — 논리적 분석', content: '많은 사람들이 엘런을 악인으로 보지만 그의 선택에는 일관된 논리가 있음. 자유를 위해 모든 걸 희생한다는 신념', tags: ['#진격의거인', '#분석'], category: '분석', isSpoiler: false, likes: 178, commentCount: 14 },
    { id: 'm3', authorId: 'mock', authorNickname: '리바이병장팬', authorProfileImg: '', authorWatched: 38, title: '리바이 병장이 역대급 캐릭터인 이유', content: '단순히 강한 게 아니라 인간적인 면이 계속 쌓여서 감동적이었음', tags: ['#진격의거인'], category: '분석', isSpoiler: false, likes: 241, commentCount: 31 },
    { id: 'm4', authorId: 'mock', authorNickname: 'WIT스튜디오러버', authorProfileImg: '', authorWatched: 29, title: '1기 작화가 그리운 이유', content: 'MAPPA도 훌륭하지만 WIT의 손으로 그린 느낌의 작화가 진격에는 더 어울렸다고 봄', tags: ['#진격의거인', '#작화덕'], category: '분석', isSpoiler: false, likes: 133, commentCount: 22 },
    { id: 'm5', authorId: 'mock', authorNickname: 'OST수집가', authorProfileImg: '', authorWatched: 51, title: '진격의 거인 OST 추천 TOP5', content: 'Sawano Hiroyuki의 음악이 진격의 세계관을 완성했다고 해도 과언이 아님', tags: ['#진격의거인', '#OST'], category: '추천', isSpoiler: false, likes: 196, commentCount: 18 },
    { id: 'm6', authorId: 'mock', authorNickname: '작화탐구자', authorProfileImg: '', authorWatched: 15, title: '귀멸 무한열차 작화 프레임 분석해봤음', content: '오프닝 없이 Ufotable이 어떻게 이걸 뽑아냈는지... 3분 12초부터 카메라무빙 진짜 미침', tags: ['#귀멸의칼날', '#작화덕'], category: '분석', isSpoiler: false, likes: 193, commentCount: 31 },
    { id: 'm7', authorId: 'mock', authorNickname: '렌고쿠팬', authorProfileImg: '', authorWatched: 22, title: '렌고쿠가 왜 역대급 캐릭터인지 설명해줌', content: '등장시간이 길지 않은데도 이렇게 임팩트를 남기는 캐릭터가 또 있을까', tags: ['#귀멸의칼날'], category: '감상평', isSpoiler: true, likes: 267, commentCount: 45 },
    { id: 'm8', authorId: 'mock', authorNickname: '도게자', authorProfileImg: '', authorWatched: 9, title: '귀멸 입문 순서 완벽 가이드', content: '극장판 먼저 봐야 하냐 2기부터 봐야 하냐 항상 헷갈리는 사람들을 위해 정리해봤음', tags: ['#귀멸의칼날', '#입문추천'], category: '추천', isSpoiler: false, likes: 89, commentCount: 37 },
    { id: 'm9', authorId: 'mock', authorNickname: '네즈코수호대', authorProfileImg: '', authorWatched: 17, title: '네즈코 성장 서사가 진짜 잘 쓰여진 이유', content: '처음엔 그냥 보호받는 캐릭터인 줄 알았는데 시즌 진행할수록 자기만의 서사가 생김', tags: ['#귀멸의칼날'], category: '분석', isSpoiler: false, likes: 154, commentCount: 19 },
    { id: 'm10', authorId: 'mock', authorNickname: 'BGM덕후', authorProfileImg: '', authorWatched: 33, title: '귀멸 OST 유이가오카 들어봤음?', content: 'Go!가 유명하지만 개인적으로 유이가오카가 제일 좋음', tags: ['#귀멸의칼날', '#OST'], category: '감상평', isSpoiler: false, likes: 211, commentCount: 27 },
    { id: 'm11', authorId: 'mock', authorNickname: '오타쿠9년차', authorProfileImg: '', authorWatched: 67, title: '주술회전 vs 귀멸 vs 진격 — 역대급 3대장 순위', content: '작화/스토리/연출/BGM 4개 기준으로 직접 분석해봤음', tags: ['#주술회전', '#귀멸의칼날', '#진격의거인'], category: '분석', isSpoiler: false, likes: 421, commentCount: 83 },
    { id: 'm12', authorId: 'mock', authorNickname: '고조사토루빠', authorProfileImg: '', authorWatched: 44, title: '고조 선생 없는 주술회전 어떻게 볼 거임', content: '고조 없이도 이야기가 굴러가는 게 신기함. 확실히 긴장감이 다른 방향으로 흘러가서 나름 재밌음', tags: ['#주술회전'], category: '감상평', isSpoiler: true, likes: 298, commentCount: 61 },
    { id: 'm13', authorId: 'mock', authorNickname: 'MAPPA신도', authorProfileImg: '', authorWatched: 55, title: '주술 2기 작화가 역대급인 진짜 이유', content: '시부야 사변 아크 중간에 작화 퀄리티가 극장판급으로 올라갔음', tags: ['#주술회전', '#작화덕'], category: '분석', isSpoiler: false, likes: 334, commentCount: 42 },
    { id: 'm14', authorId: 'mock', authorNickname: '노바라진영', authorProfileImg: '', authorWatched: 28, title: '카우게이 노바라가 주인공이어야 한다', content: '솔직히 노바라가 제일 현실적이고 공감 가는 캐릭터임', tags: ['#주술회전'], category: '감상평', isSpoiler: false, likes: 177, commentCount: 34 },
    { id: 'm15', authorId: 'mock', authorNickname: '원피스마라톤러', authorProfileImg: '', authorWatched: 120, title: '원피스 1000화 돌파 기념 후기', content: '1000화를 달려왔다... 처음 보기 시작했을 때가 중학생인데 이제 직장인이 됐음. 루피 기어5 보면서 진짜 울었다', tags: ['#원피스'], category: '감상평', isSpoiler: false, likes: 445, commentCount: 77 },
    { id: 'm16', authorId: 'mock', authorNickname: '조로최애', authorProfileImg: '', authorWatched: 85, title: '조로가 원피스 최강이 되어야 하는 이유', content: '루피가 주인공이지만 최강 검호의 꿈을 가진 조로가 결국 세계 최강이 되는 게 맞는 흐름임', tags: ['#원피스', '#분석'], category: '분석', isSpoiler: false, likes: 289, commentCount: 51 },
    { id: 'm17', authorId: 'mock', authorNickname: '나루토세대', authorProfileImg: '', authorWatched: 77, title: '나루토 세대가 지금 봐도 감동인 이유', content: '어릴 때 보고 다시 봤는데 더 감동이다. 어릴 땐 몰랐던 가이선생, 이루카선생 서사가 이렇게 짠할 줄이야', tags: ['#나루토'], category: '감상평', isSpoiler: false, likes: 367, commentCount: 89 },
    { id: 'm18', authorId: 'mock', authorNickname: '바이올렛덕후', authorProfileImg: '', authorWatched: 19, title: '바이올렛 에버가든 극장판 3번째 봤음', content: '볼 때마다 새로운 게 보임. 특히 길버트 소령이 바이올렛을 처음 만났을 때 장면 해석이 계속 달라짐', tags: ['#바이올렛에버가든'], category: '분석', isSpoiler: true, likes: 198, commentCount: 34 },
    { id: 'm19', authorId: 'mock', authorNickname: '나만아는BGM', authorProfileImg: '', authorWatched: 30, title: '이 애니 OST 듣다가 눈물 흘린 사람 나만?', content: '바이올렛 에버가든 OST 출퇴근길에 듣다가 지하철에서 눈물 참은 사람 손 ✋', tags: ['#바이올렛에버가든', '#OST'], category: '감상평', isSpoiler: false, likes: 312, commentCount: 58 },
    { id: 'm20', authorId: 'mock', authorNickname: '체인소맨빠', authorProfileImg: '', authorWatched: 11, title: '체인소맨 2부 기대치 어느 정도임?', content: '1부 애니 퀄리티가 너무 좋아서 2부 기대가 큰데 MAPPA 일정 이슈가 좀 걱정됨', tags: ['#체인소맨'], category: '감상평', isSpoiler: false, likes: 143, commentCount: 43 },
    { id: 'm21', authorId: 'mock', authorNickname: '스파이패밀리팬', authorProfileImg: '', authorWatched: 14, title: '아냐 짤이 국민짤이 된 이유', content: '표정이 너무 다양하고 개성이 넘침. 보면 볼수록 웃기고 귀여운데 서사도 탄탄함', tags: ['#스파이패밀리'], category: '추천', isSpoiler: false, likes: 256, commentCount: 38 },
    { id: 'm22', authorId: 'mock', authorNickname: '소년점프러버', authorProfileImg: '', authorWatched: 88, title: '이번 시즌 최고 애니 뭐임? 내 픽 공유', content: '다들 이번 분기 뭐 보고 있음? 개인적으로 올해 본 것 중에 최고가 될 것 같은 작품 발견함', tags: ['#2026봄애니', '#추천'], category: '추천', isSpoiler: false, likes: 156, commentCount: 62 },
    { id: 'm23', authorId: 'mock', authorNickname: '덕후입문3일차', authorProfileImg: '', authorWatched: 3, title: '애니 입문자인데 뭐부터 봐야 함??', content: '친구 추천으로 귀멸 보고 빠졌는데 다음에 뭐 봐야 할지 모르겠음', tags: ['#입문추천'], category: '추천', isSpoiler: false, likes: 89, commentCount: 104 },
    { id: 'm24', authorId: 'mock', authorNickname: '애니장인', authorProfileImg: '', authorWatched: 200, title: '2026 봄 애니 중간 총평', content: '이번 분기 의외의 다크호스가 몇 개 있음. 전체적으로 평균 퀄이 높고 장르 다양성도 좋음', tags: ['#2026봄애니', '#추천'], category: '추천', isSpoiler: false, likes: 378, commentCount: 92 },
    { id: 'm25', authorId: 'mock', authorNickname: '주술뉴비', authorProfileImg: '', authorWatched: 5, title: '주술회전 정주행 완료! 후기 남김', content: '귀멸 보다가 추천받아서 봤는데 진짜 미쳤다. 능력 시스템이 독특하고 캐릭터들 하나하나 개성이 살아있음', tags: ['#주술회전', '#입문추천'], category: '추천', isSpoiler: false, likes: 98, commentCount: 22 },
]

function generateRandomPosts() {
    const offsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100]
    const shuffled = [...MOCK_BASE].sort(() => Math.random() - 0.5)
    return Array.from({ length: 100 }, (_, i) => ({
        ...shuffled[i % shuffled.length],
        id: `rand_${i}_${shuffled[i % shuffled.length].id}`,
        isMock: true,
        likes: Math.max(0, shuffled[i % shuffled.length].likes + Math.floor((Math.random() - 0.3) * 80)),
        commentCount: Math.max(0, shuffled[i % shuffled.length].commentCount + Math.floor((Math.random() - 0.3) * 20)),
        createdAt: new Date(Date.now() - 3600000 * (offsets[i % offsets.length] + Math.random() * 8)).toISOString(),
    }))
}

const MOCK_COMMENTS: Record<string, any[]> = {
    m1: [
        { id: 'mc1', authorNickname: '에렌빠', authorProfileImg: '', authorWatched: 55, content: '엘런 입장에서는 그게 유일한 방법이었다고 봄.', createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 23 },
        { id: 'mc2', authorNickname: '미카사사랑', authorProfileImg: '', authorWatched: 8, content: '미카사 엔딩이 너무 슬펐음 ㅠㅠ', createdAt: new Date(Date.now() - 1800000).toISOString(), likes: 11 },
    ],
}

type SortType = 'latest' | 'hot'
interface Comment { id: string; authorId?: string; authorNickname: string; authorProfileImg: string; authorWatched: number; content: string; createdAt: string; likes: number }
interface Post { id: string; authorId: string; authorNickname: string; authorProfileImg: string; authorWatched: number; title: string; content: string; tags: string[]; category?: string; isSpoiler: boolean; likes: number; commentCount: number; createdAt: string; isMock?: boolean; images?: string[] }

function formatTime(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

const CAT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
    '분석': { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
    '감상평': { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
    '추천': { bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.3)' },
}

const PAGE_SIZE = 20

export default function CommunityPage() {
    const router = useRouter()
    const { user } = useAuthStore()

    const [realPosts, setRealPosts] = useState<Post[]>([])
    const [randomMockPosts] = useState<Post[]>(() => generateRandomPosts())
    const [sort, setSort] = useState<SortType>('latest')
    const [activeTag, setActiveTag] = useState<string | null>(null)           // 태그바 선택
    const [customTag, setCustomTag] = useState<string | null>(null)           // 검색으로 들어온 커스텀 태그
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')                        // 게시글 본문 검색
    const [searchInput, setSearchInput] = useState('')
    const [showMyPosts, setShowMyPosts] = useState(false)
    const [myActiveCategory, setMyActiveCategory] = useState<string | null>(null)
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

    // 애니 검색 팝업 (더 찾아보기)
    const [showAnimeSearch, setShowAnimeSearch] = useState(false)
    const [animeQuery, setAnimeQuery] = useState('')
    const [animeSuggestions, setAnimeSuggestions] = useState<any[]>([])
    const [animeLoading, setAnimeLoading] = useState(false)
    const animeTimer = useRef<NodeJS.Timeout | null>(null)

    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [spoilerVisible, setSpoilerVisible] = useState<Set<string>>(new Set())
    const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
    const [commentInput, setCommentInput] = useState<Record<string, string>>({})
    const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})

    const [tagCounts, setTagCounts] = useState<Record<string, number>>(Object.fromEntries(HOT_TAGS_BASE.map(t => [t.tag, t.base])))
    const [tagImgs, setTagImgs] = useState<Record<string, string>>({})

    const [writeTitle, setWriteTitle] = useState('')
    const [writeContent, setWriteContent] = useState('')
    const [writeTags, setWriteTags] = useState('')
    const [writeCategory, setWriteCategory] = useState('')
    const [writeSpoiler, setWriteSpoiler] = useState(false)
    const [posting, setPosting] = useState(false)
    const [writeImages, setWriteImages] = useState<File[]>([])
    const [writeImagePreviews, setWriteImagePreviews] = useState<string[]>([])
    const [uploadingImages, setUploadingImages] = useState(false)
    const [showWrite, setShowWrite] = useState(false)
    const [showSidebar, setShowSidebar] = useState(false)

    // 내 재생 기록에서 애니 이름 가져오기
    const [recentWatched, setRecentWatched] = useState<{ name: string; tag: string }[]>([])

    const loaderRef = useRef<HTMLDivElement>(null)

    // Firebase 재생기록에서 최근 시청 애니 이름 로드
    useEffect(() => {
        if (!user?.uid) return
        const fetchWatched = async () => {
            try {
                // watch_history 또는 watch-progress 컬렉션에서 최근 5개
                const q = query(
                    collection(db, 'watch_history'),
                    where('userId', '==', user.uid),
                    orderBy('watchedAt', 'desc'),
                    limit(6)
                )
                const snap = await getDocs(q)
                const items = snap.docs.map(d => {
                    const data = d.data()
                    const name = data.animeName || data.title || data.name || ''
                    return { name, tag: `#${name.replace(/[\s·]+/g, '')}` }
                }).filter(i => i.name)
                setRecentWatched(items)
            } catch {
                // localStorage 폴백
                try {
                    const s = localStorage.getItem('watch-progress-storage')
                    if (s) {
                        const items = JSON.parse(s)?.state?.items || []
                        const recent = items.slice(0, 6).map((item: any) => {
                            const name = item.animeName || item.title || item.name || ''
                            return { name, tag: `#${name.replace(/[\s·]+/g, '')}` }
                        }).filter((i: any) => i.name)
                        setRecentWatched(recent)
                    }
                } catch { }
            }
        }
        fetchWatched()
    }, [user?.uid])

    const myWatched = (() => {
        try {
            const s = typeof window !== 'undefined' ? localStorage.getItem('watch-progress-storage') : null
            return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0
        } catch { return 0 }
    })()

    // TMDB 포스터
    useEffect(() => {
        if (!TMDB_KEY) return
        HOT_TAGS_BASE.forEach(async ({ tag }) => {
            const id = TAG_TMDB_IDS[tag]
            if (!id) return
            try {
                const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`)
                const data = await res.json()
                const path = data.poster_path || data.backdrop_path
                if (path) setTagImgs(prev => ({ ...prev, [tag]: `${TMDB_IMG}${path}` }))
            } catch { }
        })
    }, [])

    // Firebase 게시글
    useEffect(() => {
        const q = query(collection(db, 'community_posts'), orderBy('createdAt', 'desc'), limit(50))
        const unsub = onSnapshot(q, snap => {
            const posts: Post[] = snap.docs.map(d => ({ id: d.id, isMock: false, ...(d.data() as any) }))
            setRealPosts(posts)
            const counts = Object.fromEntries(HOT_TAGS_BASE.map(t => [t.tag, t.base]))
            posts.forEach(p => p.tags?.forEach(t => { if (counts[t] !== undefined) counts[t]++ }))
            setTagCounts(counts)
        })
        return () => unsub()
    }, [])

    // 애니 검색 디바운스
    useEffect(() => {
        if (animeTimer.current) clearTimeout(animeTimer.current)
        if (!animeQuery.trim()) { setAnimeSuggestions([]); return }
        setAnimeLoading(true)
        animeTimer.current = setTimeout(async () => {
            const r = await searchAnimeByName(animeQuery)
            setAnimeSuggestions(r)
            setAnimeLoading(false)
        }, 350)
    }, [animeQuery])

    // 무한스크롤
    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        if (entries[0].isIntersecting) setVisibleCount(p => p + PAGE_SIZE)
    }, [])
    useEffect(() => {
        const el = loaderRef.current; if (!el) return
        const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 })
        obs.observe(el)
        return () => obs.disconnect()
    }, [handleObserver])

    useEffect(() => { setVisibleCount(PAGE_SIZE) }, [sort, activeTag, customTag, activeCategory, searchQuery, showMyPosts, myActiveCategory])

    const loadComments = async (postId: string) => {
        const baseId = postId.replace(/^rand_\d+_/, '')
        if (postId.startsWith('m') || postId.startsWith('rand')) {
            setCommentsMap(prev => ({ ...prev, [postId]: MOCK_COMMENTS[baseId] || [] })); return
        }
        setCommentLoading(prev => ({ ...prev, [postId]: true }))
        try {
            const q = query(collection(db, 'community_posts', postId, 'comments'), orderBy('createdAt', 'asc'))
            const snap = await getDocs(q)
            setCommentsMap(prev => ({ ...prev, [postId]: snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) }))
        } catch { }
        finally { setCommentLoading(prev => ({ ...prev, [postId]: false })) }
    }

    const handleCardClick = (postId: string) => {
        if (expandedId === postId) { setExpandedId(null); return }
        setExpandedId(postId)
        if (!commentsMap[postId]) loadComments(postId)
    }

    const handleComment = async (postId: string, isMock: boolean) => {
        const text = commentInput[postId]?.trim()
        if (!text || !user) return
        const newComment: Comment = { id: `temp_${Date.now()}`, authorId: user.uid || '', authorNickname: user.name || '익명', authorProfileImg: user.photoURL || '', authorWatched: myWatched, content: text, createdAt: new Date().toISOString(), likes: 0 }
        setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }))
        setCommentInput(prev => ({ ...prev, [postId]: '' }))
        if (!isMock) {
            try {
                await addDoc(collection(db, 'community_posts', postId, 'comments'), { authorId: user.uid, authorNickname: user.name || '익명', authorProfileImg: user.photoURL || '', authorWatched: myWatched, content: text, createdAt: new Date().toISOString(), likes: 0 })
                await updateDoc(doc(db, 'community_posts', postId), { commentCount: increment(1) })
            } catch { }
        }
    }

    const handleLike = async (e: React.MouseEvent, post: Post) => {
        e.stopPropagation()
        const isLiked = likedPostIds.has(post.id)
        setLikedPostIds(prev => { const n = new Set(prev); isLiked ? n.delete(post.id) : n.add(post.id); return n })
        setRealPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 } : p))
        if (!post.isMock) {
            try { await updateDoc(doc(db, 'community_posts', post.id), { likes: increment(isLiked ? -1 : 1) }) } catch { }
        }
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/') && f.size < 5 * 1024 * 1024)
        if (files.length + writeImages.length > 4) { alert('이미지는 최대 4장'); return }
        setWriteImages(prev => [...prev, ...files])
        files.forEach(file => { const r = new FileReader(); r.onload = e => setWriteImagePreviews(prev => [...prev, e.target?.result as string]); r.readAsDataURL(file) })
        e.target.value = ''
    }
    const removeImage = (idx: number) => { setWriteImages(p => p.filter((_, i) => i !== idx)); setWriteImagePreviews(p => p.filter((_, i) => i !== idx)) }

    const handlePost = async () => {
        if (!writeTitle.trim() || !writeContent.trim() || !user) return
        setPosting(true)
        try {
            const tags = writeTags.split(/[\s,]+/).filter(t => t.startsWith('#') && t.length > 1).slice(0, 5)
            let imageUrls: string[] = []
            if (writeImages.length > 0) {
                setUploadingImages(true)
                imageUrls = await Promise.all(writeImages.map(async file => {
                    const storageRef = ref(storage, `community/${user.uid}/${Date.now()}_${file.name}`)
                    await uploadBytes(storageRef, file)
                    return getDownloadURL(storageRef)
                }))
                setUploadingImages(false)
            }
            await addDoc(collection(db, 'community_posts'), { authorId: user.uid, authorNickname: user.name || user.email?.split('@')[0] || '익명', authorProfileImg: user.photoURL || '', authorWatched: myWatched, title: writeTitle.trim(), content: writeContent.trim(), tags, category: writeCategory || null, isSpoiler: writeSpoiler, likes: 0, commentCount: 0, images: imageUrls, createdAt: new Date().toISOString() })
            setWriteTitle(''); setWriteContent(''); setWriteTags(''); setWriteSpoiler(false); setWriteCategory(''); setWriteImages([]); setWriteImagePreviews([]); setShowWrite(false)
        } catch { }
        finally { setPosting(false) }
    }

    // 게시글 필터링
    const knownTags = new Set(HOT_TAGS_BASE.map(t => t.tag))
    const allPosts: Post[] = [...realPosts, ...randomMockPosts]
    const myRealPosts = realPosts.filter(p => p.authorId === user?.uid)
    const effectiveTag = customTag || activeTag

    const filtered = (showMyPosts ? myRealPosts : allPosts).filter(p => {
        if (showMyPosts && myActiveCategory && p.category !== myActiveCategory) return false
        if (!showMyPosts) {
            if (effectiveTag) {
                if (effectiveTag === '#기타') { if (p.tags.some(t => knownTags.has(t))) return false }
                else { if (!p.tags.includes(effectiveTag) && !p.tags.some(t => t.toLowerCase().includes(effectiveTag.slice(1).toLowerCase()))) return false }
            }
            if (activeCategory) {
                if (activeCategory === '스포일러') { if (!p.isSpoiler) return false }
                else { if (p.category !== activeCategory) return false }
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))
            }
        }
        return true
    }).sort((a, b) => sort === 'hot'
        ? (b.likes + (commentsMap[b.id]?.length ?? b.commentCount) * 2) - (a.likes + (commentsMap[a.id]?.length ?? a.commentCount) * 2)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const visiblePosts = filtered.slice(0, visibleCount)
    const hasMore = visibleCount < filtered.length
    const otherCount = allPosts.filter(p => !p.tags.some(t => knownTags.has(t))).length
    const myPostCount = myRealPosts.length
    const myCatCounts = ['분석', '감상평', '추천'].reduce((acc, cat) => { acc[cat] = myRealPosts.filter(p => p.category === cat).length; return acc }, {} as Record<string, number>)

    // 탭바에 표시할 태그 목록: HOT_TAGS_BASE + 커스텀태그(있으면)
    const tabTags = customTag && !HOT_TAGS_BASE.some(t => t.tag === customTag)
        ? [...HOT_TAGS_BASE, { tag: customTag, base: 0 }]
        : HOT_TAGS_BASE

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
            <style>{`
                @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
                @keyframes floatOrb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-25px) scale(1.1)} 66%{transform:translate(-20px,18px) scale(0.95)} }
                @keyframes floatOrb2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-30px,22px) scale(1.08)} 70%{transform:translate(22px,-18px) scale(0.97)} }
                @keyframes floatOrb3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,28px)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                @keyframes expandDown { from{opacity:0} to{opacity:1} }
                @keyframes spin { to{transform:rotate(360deg)} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
                @keyframes backdropIn { from{opacity:0} to{opacity:1} }
                @keyframes popupFadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

                /* ── HERO: 헤더 아래 full-width, 이너 맞춤 ── */
                .cp-hero {
                    position: relative; overflow: hidden;
                    padding: 28px 0 26px;
                    background: linear-gradient(270deg,#120824,#0e1a3f,#081c30,#1a0a3a,#120824);
                    background-size: 500% 500%;
                    animation: gradientShift 12s ease infinite;
                }
                .cp-hero-inner {
                    width: 100%; max-width: 1500px; margin: 0 auto;
                    padding: 0 24px; box-sizing: border-box;
                    position: relative; z-index: 1;
                }
                .cp-hero-orb { position:absolute; border-radius:50%; filter:blur(72px); pointer-events:none; will-change:transform; }
                .cp-hero-orb1 { width:380px;height:380px;background:radial-gradient(circle,rgba(124,58,237,0.4) 0%,transparent 65%);top:-120px;left:-80px;animation:floatOrb1 9s ease-in-out infinite; }
                .cp-hero-orb2 { width:300px;height:300px;background:radial-gradient(circle,rgba(37,99,235,0.28) 0%,transparent 65%);top:-60px;right:8%;animation:floatOrb2 11s ease-in-out infinite; }
                .cp-hero-orb3 { width:240px;height:240px;background:radial-gradient(circle,rgba(219,39,119,0.18) 0%,transparent 65%);bottom:-80px;right:28%;animation:floatOrb3 7s ease-in-out infinite; }
                .cp-hero-eyebrow { display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;letter-spacing:0.1em;color:rgba(196,181,253,0.85);text-transform:uppercase;margin-bottom:7px; }
                .cp-hero-dot { width:6px;height:6px;border-radius:50%;background:#a78bfa;animation:blink 2.2s ease-in-out infinite; }
                .cp-hero-title { font-size:28px;font-weight:900;color:#fff;margin:0 0 5px;letter-spacing:-0.5px;line-height:1.15; }
                .cp-hero-sub { font-size:12.5px;color:rgba(196,181,253,0.65);margin:0; }

                /* ── 검색 섹션 (image1 스타일) ── */
                .cp-search-section {
                    background: var(--bg-card);
                    border-bottom: 1px solid var(--border-subtle);
                    padding: 12px 0;
                }
                .cp-search-inner {
                    width: 100%; max-width: 1500px; margin: 0 auto;
                    padding: 0 24px; box-sizing: border-box;
                }
                .cp-search-wrap { position:relative; width:100%; }
                .cp-search-input {
                    width: 100%; box-sizing: border-box;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: 24px;
                    padding: 10px 44px 10px 18px;
                    font-size: 13px; color: var(--text-primary);
                    outline: none; font-family: inherit;
                    transition: border-color .2s, box-shadow .2s;
                }
                .cp-search-input:focus { border-color:rgba(139,92,246,.5);box-shadow:0 0 0 3px rgba(139,92,246,.07); }
                .cp-search-input::placeholder { color:var(--text-faint); }
                .cp-search-icon { position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--text-faint);pointer-events:none; }
                .cp-search-clear { position:absolute;right:40px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:13px;line-height:1;padding:2px 4px; }

                /* 최근 시청 칩 */
                .cp-recent-row { display:flex;align-items:center;gap:7px;margin-top:9px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px; }
                .cp-recent-row::-webkit-scrollbar { display:none; }
                .cp-recent-label { font-size:11px;font-weight:800;color:var(--text-faint);white-space:nowrap;flex-shrink:0; }
                .cp-recent-chip { display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;border:1px solid var(--border);background:var(--bg-secondary);font-size:11px;font-weight:700;color:var(--text-muted);cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;font-family:inherit; }
                .cp-recent-chip:hover { border-color:rgba(139,92,246,.4);color:#a78bfa;background:rgba(139,92,246,.08); }
                .cp-recent-chip.active { border-color:rgba(139,92,246,.5);color:#a78bfa;background:rgba(139,92,246,.1); }

                /* ── 태그바 ── */
                .cp-tagbar {
                    background:rgba(88,28,220,0.18);
                    border-bottom:1px solid rgba(139,92,246,0.15);
                    padding:0;
                }
                .cp-tagbar-inner {
                    width:100%;max-width:1500px;margin:0 auto;
                    padding:0 24px;box-sizing:border-box;
                    display:flex;align-items:center;gap:0;
                    overflow-x:auto;scrollbar-width:none;
                }
                .cp-tagbar-inner::-webkit-scrollbar { display:none; }
                .cp-tagbar-more { display:inline-flex;align-items:center;gap:5px;padding:11px 14px 11px 0;margin-right:10px;font-size:11.5px;font-weight:700;color:rgba(196,181,253,0.8);cursor:pointer;white-space:nowrap;background:none;border:none;font-family:inherit;border-right:1px solid rgba(139,92,246,0.2);padding-right:14px;transition:color .15s;flex-shrink:0; }
                .cp-tagbar-more:hover { color:#a78bfa; }
                .cp-tagbar-item { display:inline-flex;align-items:center;gap:6px;padding:10px 11px;font-size:11.5px;font-weight:700;color:rgba(196,181,253,0.65);cursor:pointer;white-space:nowrap;background:none;border:none;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;flex-shrink:0; }
                .cp-tagbar-item img { width:16px;height:16px;border-radius:50%;object-fit:cover; }
                .cp-tagbar-item:hover { color:#c4b5fd; }
                .cp-tagbar-item.active { color:#c4b5fd;border-bottom-color:#a78bfa; }
                .cp-tagbar-all { padding:10px 11px;font-size:11.5px;font-weight:800;color:rgba(196,181,253,0.65);cursor:pointer;white-space:nowrap;background:none;border:none;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;flex-shrink:0; }
                .cp-tagbar-all:hover { color:#c4b5fd; }
                .cp-tagbar-all.active { color:#c4b5fd;border-bottom-color:#a78bfa; }
                /* 커스텀 태그 (검색으로 추가된) */
                .cp-tagbar-custom { display:inline-flex;align-items:center;gap:5px;padding:10px 11px;font-size:11.5px;font-weight:700;color:rgba(196,181,253,0.65);cursor:pointer;white-space:nowrap;background:none;border:none;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;flex-shrink:0; }
                .cp-tagbar-custom.active { color:#c4b5fd;border-bottom-color:#a78bfa; }

                /* ── 애니 검색 팝업 ── */
                .cp-anime-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:800;backdrop-filter:blur(4px);animation:backdropIn .2s ease; }
                .cp-anime-popup {
                    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                    width:100%;max-width:520px;
                    background:var(--bg-card);border-radius:20px;border:1px solid var(--border);
                    z-index:900;padding:22px 22px 12px;box-shadow:0 20px 60px rgba(0,0,0,.4);
                    animation:popupFadeIn .2s ease;
                }
                .cp-anime-popup-title { font-size:14px;font-weight:800;color:var(--text-primary);margin:0 0 14px; }
                .cp-anime-popup-input {
                    width:100%;box-sizing:border-box;
                    background:var(--bg-secondary);border:1px solid var(--border);
                    border-radius:12px;padding:10px 14px;font-size:14px;
                    color:var(--text-primary);outline:none;font-family:inherit;
                    transition:border-color .2s;
                }
                .cp-anime-popup-input:focus { border-color:rgba(139,92,246,.5); }
                .cp-anime-popup-input::placeholder { color:var(--text-faint); }
                .cp-anime-list { margin-top:10px;max-height:320px;overflow-y:auto;scrollbar-width:thin; }
                .cp-anime-item { display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:10px;cursor:pointer;transition:background .12s; }
                .cp-anime-item:hover { background:rgba(139,92,246,.08); }
                .cp-anime-thumb { width:36px;height:36px;border-radius:8px;object-fit:cover;background:var(--bg-secondary);flex-shrink:0; }
                .cp-anime-thumb-empty { width:36px;height:36px;border-radius:8px;background:rgba(139,92,246,.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0; }
                .cp-anime-name { font-size:13px;font-weight:700;color:var(--text-primary); }
                .cp-anime-tag-label { font-size:11px;color:#8b5cf6;margin-top:2px; }
                .cp-anime-loading { padding:20px;text-align:center;font-size:13px;color:var(--text-faint); }

                /* ── OUTER ── */
                .cp-outer { width:100%;max-width:1500px;margin:0 auto;padding:0 24px 80px;box-sizing:border-box; }

                /* ── 3열 레이아웃 ── */
                .cp-layout { display:grid;grid-template-columns:80px 1fr 260px;gap:0 20px;align-items:start;padding-top:22px; }
                @media (max-width:1200px) { .cp-layout { grid-template-columns:72px 1fr 240px; } }
                @media (max-width:1000px) { .cp-layout { grid-template-columns:72px 1fr; } .cp-right-sidebar { display:none; } }
                @media (max-width:768px) { .cp-layout { grid-template-columns:1fr; } .cp-left-rail { display:none!important; } .cp-right-sidebar { display:none; } }

                /* ── 왼쪽 레일 ── */
                .cp-left-rail { position:sticky;top:80px;display:flex;flex-direction:column;align-items:flex-end;gap:0; }
                .cp-sort-group { display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin-bottom:22px;width:100%; }
                .cp-sort-btn { width:100%;text-align:right;padding:7px 0;font-size:13px;font-weight:700;cursor:pointer;background:none;border:none;font-family:inherit;transition:color .15s;color:var(--text-faint); }
                .cp-sort-btn:hover { color:var(--text-muted); }
                .cp-sort-btn.active { color:#a78bfa; }
                .cp-cat-group { display:flex;flex-direction:column;align-items:flex-end;gap:0;width:100%;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.18);border-radius:12px;overflow:hidden; }
                .cp-cat-item { width:100%;text-align:right;padding:10px 12px;font-size:12px;font-weight:700;cursor:pointer;background:none;border:none;font-family:inherit;transition:all .15s;color:var(--text-subtle);border-bottom:1px solid rgba(139,92,246,0.1);line-height:1; }
                .cp-cat-item:last-child { border-bottom:none; }
                .cp-cat-item:hover { background:rgba(139,92,246,0.12);color:#c4b5fd; }
                .cp-cat-item.active { background:rgba(139,92,246,0.2);color:#c4b5fd; }
                .cp-cat-item.cat-sp.active { background:rgba(248,113,113,0.12);color:#f87171; }
                .cp-cat-item.cat-sp:hover { background:rgba(248,113,113,0.08);color:#fca5a5; }

                /* ── 피드 ── */
                .cp-feed-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px; }
                .cp-feed-tabs { display:flex;align-items:center;gap:6px; }
                .cp-feed-tab { padding:5px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:none;color:var(--text-faint);font-family:inherit;transition:all .15s; }
                .cp-feed-tab.active { background:rgba(139,92,246,.15);border-color:rgba(139,92,246,.4);color:#a78bfa; }
                .cp-my-cats { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px; }
                .cp-my-cat-btn { padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:none;color:var(--text-faint);font-family:inherit;transition:all .15s; }
                .cp-my-cat-btn.active { background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.35);color:#a78bfa; }

                .cp-post { background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;margin-bottom:10px;overflow:hidden;transition:border-color .2s,box-shadow .2s;animation:fadeUp .2s ease; }
                .cp-post:hover { border-color:rgba(139,92,246,.22);box-shadow:0 4px 24px rgba(0,0,0,.18); }
                .cp-post-body { padding:16px 20px;cursor:pointer; }
                .cp-post-header { display:flex;align-items:center;gap:8px;margin-bottom:10px; }
                .cp-avatar { width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--bg-secondary);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--text-subtle); }
                .cp-post-badges { display:flex;align-items:center;gap:5px;margin-left:auto; }
                .cp-badge { font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px; }
                .cp-post-title { font-size:15px;font-weight:800;color:var(--text-primary);margin:0 0 7px;line-height:1.4; }
                .cp-post-content { font-size:13px;color:var(--text-subtle);line-height:1.7;margin:0; }
                .cp-post-tags { display:flex;gap:5px;flex-wrap:wrap;margin-top:10px; }
                .cp-tag-chip { font-size:11px;font-weight:700;color:#8b5cf6;background:rgba(139,92,246,.08);padding:2px 8px;border-radius:5px;cursor:pointer;transition:background .15s; }
                .cp-tag-chip:hover { background:rgba(139,92,246,.18); }
                .cp-post-footer { display:flex;align-items:center;gap:10px;padding:8px 20px;border-top:1px solid var(--border-faint); }
                .cp-action-btn { display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-faint);background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:7px;font-family:inherit;transition:all .15s; }
                .cp-action-btn:hover { background:var(--bg-hover);color:var(--text-muted); }
                .cp-action-btn.active { color:#8b5cf6; }
                .spoiler-blur { filter:blur(5px);user-select:none; }

                /* ── 댓글 ── */
                .cp-comments { border-top:1px solid var(--border-subtle);background:var(--bg-secondary);animation:expandDown .2s ease; }
                .cp-comment-item { display:flex;gap:10px;padding:11px 20px;border-bottom:1px solid var(--border-faint); }
                .cp-comment-item:last-child { border-bottom:none; }
                .cp-comment-avatar { width:26px;height:26px;border-radius:50%;overflow:hidden;background:var(--bg-card);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--text-subtle); }
                .cp-input-wrap { display:flex;gap:8px;padding:10px 20px;align-items:center;border-top:1px solid var(--border-faint); }
                .cp-comment-input { flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;color:var(--text-primary);outline:none;font-family:inherit;line-height:1.5;transition:border-color .2s;resize:none; }
                .cp-comment-input:focus { border-color:rgba(139,92,246,.5); }
                .cp-comment-input::placeholder { color:var(--text-faint); }

                /* ── 사이드바 ── */
                .cp-sidebar-card { background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;padding:15px 17px;margin-bottom:12px;overflow:hidden; }
                .cp-sidebar-title { font-size:11px;font-weight:800;color:var(--text-faint);letter-spacing:0.08em;text-transform:uppercase;margin:0 0 11px; }
                .cp-user-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border-faint);border-radius:10px;overflow:hidden;margin-top:11px; }
                .cp-stat-cell { background:var(--bg-secondary);padding:9px 6px;text-align:center;cursor:pointer;transition:background .15s; }
                .cp-stat-cell:hover { background:rgba(139,92,246,.08); }
                .cp-stat-num { font-size:16px;font-weight:900;color:var(--text-primary);display:block;line-height:1; }
                .cp-stat-label { font-size:10px;color:var(--text-faint);margin-top:3px;display:block; }
                .cp-hot-row { display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid var(--border-faint);cursor:pointer;transition:all .15s; }
                .cp-hot-row:last-child { border-bottom:none; }
                .cp-hot-row:hover .cp-hot-label { color:#a78bfa; }
                .cp-hot-thumb { width:26px;height:26px;border-radius:6px;object-fit:cover;flex-shrink:0;background:var(--bg-secondary); }
                .cp-hot-label { font-size:12px;font-weight:600;color:var(--text-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s; }
                .cp-write-btn { display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 15px;background:#7c3aed;border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;white-space:nowrap; }
                .cp-write-btn:hover { background:#6d28d9;box-shadow:0 4px 16px rgba(124,58,237,.35); }

                /* 햄버거 (반응형) */
                .cp-sidebar-toggle { display:none;position:fixed;bottom:22px;right:18px;z-index:500;width:46px;height:46px;border-radius:50%;background:#7c3aed;border:none;color:#fff;cursor:pointer;box-shadow:0 4px 20px rgba(124,58,237,.4);align-items:center;justify-content:center;transition:all .2s; }
                .cp-sidebar-toggle:hover { background:#6d28d9;transform:scale(1.05); }
                @media (max-width:1000px) { .cp-sidebar-toggle { display:flex; } }

                /* 슬라이드 패널 */
                .cp-sidebar-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:590;backdrop-filter:blur(3px);animation:backdropIn .2s ease; }
                .cp-sidebar-panel { position:fixed;top:0;right:0;bottom:0;width:290px;background:var(--bg-card);z-index:600;border-left:1px solid var(--border);padding:18px 14px;overflow-y:auto;animation:slideInRight .25s ease;box-shadow:-8px 0 40px rgba(0,0,0,.3); }
                .cp-sidebar-panel-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle); }

                /* 모달 */
                .cp-modal-bg { position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px); }
                .cp-modal { background:var(--bg-card);border-radius:20px;width:100%;max-width:560px;border:1px solid var(--border);overflow:hidden;animation:fadeUp .2s ease; }
                .cp-field { width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;color:var(--text-primary);outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .2s; }
                .cp-field:focus { border-color:rgba(139,92,246,.5); }
                .cp-field::placeholder { color:var(--text-faint); }

                .cp-loader { display:flex;justify-content:center;padding:18px; }
                .cp-loader-dot { width:20px;height:20px;border:2px solid var(--border);border-top-color:#8b5cf6;border-radius:50%;animation:spin .6s linear infinite; }

                /* 모바일 컨트롤 */
                .cp-mobile-controls { display:none;gap:7px;margin-bottom:12px;flex-wrap:wrap;align-items:center; }
                @media (max-width:768px) { .cp-mobile-controls { display:flex; } }
                .cp-mobile-btn { padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:none;color:var(--text-faint);font-family:inherit;transition:all .15s; }
                .cp-mobile-btn.active { background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.35);color:#a78bfa; }
            `}</style>

            {/* ── 히어로 (full-width, 이너 max-width 맞춤) ── */}
            <div className="cp-hero">
                <div className="cp-hero-orb cp-hero-orb1" />
                <div className="cp-hero-orb cp-hero-orb2" />
                <div className="cp-hero-orb cp-hero-orb3" />
                <div className="cp-hero-inner">
                    <div className="cp-hero-eyebrow"><span className="cp-hero-dot" />Community of Laftel</div>
                    <h1 className="cp-hero-title">덕후들의 광장</h1>
                    <p className="cp-hero-sub">애니라면 뭐든 ! 분석, 감상, 추천, 스포일러까지</p>
                </div>
            </div>

            {/* ── 검색 섹션 (image1: 흰배경, 둥근 검색창, 최근시청) ── */}
            <div className="cp-search-section">
                <div className="cp-search-inner">
                    <div className="cp-search-wrap">
                        <input
                            className="cp-search-input"
                            placeholder="게시글 제목, 내용, 태그를 검색해보세요..."
                            value={searchInput}
                            onChange={e => { setSearchInput(e.target.value); setSearchQuery(e.target.value) }}
                            onKeyDown={e => { if (e.key === 'Enter') setSearchQuery(searchInput) }}
                        />
                        {searchInput && <button className="cp-search-clear" onClick={() => { setSearchInput(''); setSearchQuery('') }}>✕</button>}
                        <svg className="cp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                    {/* 최근 시청 (Firebase 재생기록) */}
                    <div className="cp-recent-row">
                        <span className="cp-recent-label">{user?.name ? `${user.name}님의` : ''} 최근시청 바로가기</span>
                        {recentWatched.length > 0
                            ? recentWatched.map(w => (
                                <button key={w.tag} className={`cp-recent-chip${effectiveTag === w.tag ? ' active' : ''}`}
                                    onClick={() => { setCustomTag(w.tag); setActiveTag(null); setShowMyPosts(false); setSearchInput(''); setSearchQuery('') }}>
                                    🎌 {w.tag}
                                </button>
                            ))
                            : HOT_TAGS_BASE.slice(0, 5).map(({ tag }) => (
                                <button key={tag} className={`cp-recent-chip${effectiveTag === tag ? ' active' : ''}`}
                                    onClick={() => { setActiveTag(tag); setCustomTag(null); setShowMyPosts(false) }}>
                                    {tagImgs[tag] && <img src={tagImgs[tag]} style={{ width: 13, height: 13, borderRadius: '50%', objectFit: 'cover' }} alt="" />}
                                    {tag}
                                </button>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* ── 태그바 ── */}
            <div className="cp-tagbar">
                <div className="cp-tagbar-inner">
                    {/* 애니 더 찾아보기 → 팝업 */}
                    <button className="cp-tagbar-more" onClick={() => { setShowAnimeSearch(true); setAnimeQuery('') }}>
                        애니 더 찾아보기
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    {/* 전체 */}
                    <button className={`cp-tagbar-all${!effectiveTag && !showMyPosts ? ' active' : ''}`}
                        onClick={() => { setActiveTag(null); setCustomTag(null); setShowMyPosts(false); setSearchInput(''); setSearchQuery('') }}>
                        전체
                    </button>

                    {/* HOT 태그 */}
                    {HOT_TAGS_BASE.map(({ tag }) => (
                        <button key={tag} className={`cp-tagbar-item${effectiveTag === tag ? ' active' : ''}`}
                            onClick={() => { setActiveTag(tag); setCustomTag(null); setShowMyPosts(false); setSearchInput(''); setSearchQuery('') }}>
                            {tagImgs[tag] && <img src={tagImgs[tag]} alt={tag} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                            {tag}
                        </button>
                    ))}

                    {/* 커스텀 태그 (검색으로 들어온 경우) */}
                    {customTag && !HOT_TAGS_BASE.some(t => t.tag === customTag) && (
                        <button className={`cp-tagbar-custom active`}>
                            🔍 {customTag}
                            <span style={{ marginLeft: 4, fontSize: 10, cursor: 'pointer', opacity: 0.7 }}
                                onClick={e => { e.stopPropagation(); setCustomTag(null) }}>✕</span>
                        </button>
                    )}

                    <button className={`cp-tagbar-all${effectiveTag === '#기타' ? ' active' : ''}`}
                        onClick={() => { setActiveTag('#기타'); setCustomTag(null); setShowMyPosts(false) }}>#기타</button>
                </div>
            </div>

            {/* ── 애니 검색 팝업 ── */}
            {showAnimeSearch && (
                <>
                    <div className="cp-anime-backdrop" onClick={() => setShowAnimeSearch(false)} />
                    <div className="cp-anime-popup">
                        <p className="cp-anime-popup-title">🎌 애니메이션 검색</p>
                        <input
                            className="cp-anime-popup-input"
                            placeholder="애니 제목을 입력하세요..."
                            value={animeQuery}
                            onChange={e => setAnimeQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="cp-anime-list">
                            {animeLoading && <div className="cp-anime-loading">검색 중...</div>}
                            {!animeLoading && animeQuery && animeSuggestions.length === 0 && (
                                <div className="cp-anime-loading">검색 결과가 없어요</div>
                            )}
                            {!animeLoading && !animeQuery && (
                                <div style={{ padding: '10px 8px' }}>
                                    {HOT_TAGS_BASE.map(({ tag }) => (
                                        <div key={tag} className="cp-anime-item" onClick={() => { setActiveTag(tag); setCustomTag(null); setShowMyPosts(false); setShowAnimeSearch(false) }}>
                                            {tagImgs[tag]
                                                ? <img className="cp-hot-thumb" src={tagImgs[tag]} alt={tag} style={{ width: 36, height: 36, borderRadius: 8 }} />
                                                : <div className="cp-anime-thumb-empty">🎌</div>
                                            }
                                            <div>
                                                <div className="cp-anime-name">{tag}</div>
                                                <div className="cp-anime-tag-label">{tagCounts[tag] ?? 0}개 게시글</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {animeSuggestions.map(s => (
                                <div key={s.id} className="cp-anime-item" onClick={() => {
                                    setCustomTag(s.tag); setActiveTag(null); setShowMyPosts(false)
                                    setShowAnimeSearch(false); setSearchInput(''); setSearchQuery('')
                                }}>
                                    {s.poster
                                        ? <img src={s.poster} alt={s.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                                        : <div className="cp-anime-thumb-empty">🎌</div>
                                    }
                                    <div>
                                        <div className="cp-anime-name">{s.name}</div>
                                        <div className="cp-anime-tag-label">{s.tag}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowAnimeSearch(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>닫기</button>
                        </div>
                    </div>
                </>
            )}

            <div className="cp-outer">
                <div className="cp-layout">

                    {/* 왼쪽 레일 */}
                    <div className="cp-left-rail">
                        <div className="cp-sort-group">
                            {(['hot', 'latest'] as SortType[]).map(v => (
                                <button key={v} className={`cp-sort-btn${sort === v ? ' active' : ''}`} onClick={() => setSort(v)}>
                                    {v === 'hot' ? '인기순' : '최신순'}
                                </button>
                            ))}
                        </div>
                        <div className="cp-cat-group">
                            {[{ label: '분석', value: '분석' }, { label: '감상평', value: '감상평' }, { label: '추천해요', value: '추천' }, { label: '스포일러', value: '스포일러', sp: true }].map(({ label, value, sp }) => (
                                <button key={value} className={`cp-cat-item${sp ? ' cat-sp' : ''}${activeCategory === value ? ' active' : ''}`}
                                    onClick={() => setActiveCategory(activeCategory === value ? null : value)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 피드 */}
                    <div>
                        <div className="cp-feed-header">
                            <div className="cp-feed-tabs">
                                <button className={`cp-feed-tab${!showMyPosts ? ' active' : ''}`} onClick={() => setShowMyPosts(false)}>전체 게시글</button>
                                {user && <button className={`cp-feed-tab${showMyPosts ? ' active' : ''}`} onClick={() => setShowMyPosts(true)}>내 글 모아보기</button>}
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{filtered.length.toLocaleString()}+개</span>
                        </div>

                        {/* 모바일 컨트롤 */}
                        <div className="cp-mobile-controls">
                            {(['hot', 'latest'] as SortType[]).map(v => (
                                <button key={v} className={`cp-mobile-btn${sort === v ? ' active' : ''}`} onClick={() => setSort(v)}>{v === 'hot' ? '인기순' : '최신순'}</button>
                            ))}
                            {[{ label: '분석', value: '분석' }, { label: '감상평', value: '감상평' }, { label: '추천', value: '추천' }, { label: '스포', value: '스포일러' }].map(({ label, value }) => (
                                <button key={value} className={`cp-mobile-btn${activeCategory === value ? ' active' : ''}`}
                                    onClick={() => setActiveCategory(activeCategory === value ? null : value)}>{label}</button>
                            ))}
                        </div>

                        {/* 내 글 카테고리 필터 */}
                        {showMyPosts && user && (
                            <div className="cp-my-cats">
                                <button className={`cp-my-cat-btn${!myActiveCategory ? ' active' : ''}`} onClick={() => setMyActiveCategory(null)}>전체 ({myRealPosts.length})</button>
                                {['분석', '감상평', '추천'].map(cat => (
                                    <button key={cat} className={`cp-my-cat-btn${myActiveCategory === cat ? ' active' : ''}`}
                                        onClick={() => setMyActiveCategory(myActiveCategory === cat ? null : cat)}>
                                        {cat} ({myCatCounts[cat] || 0})
                                    </button>
                                ))}
                            </div>
                        )}

                        {visiblePosts.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-faint)', fontSize: 14 }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>{showMyPosts ? '✍️' : searchQuery ? '🔍' : '📭'}</div>
                                {showMyPosts ? '작성한 게시글이 없어요' : searchQuery ? `"${searchQuery}"에 대한 게시글이 없어요` : '게시글이 없어요'}
                            </div>
                        )}

                        {visiblePosts.map(post => {
                            const isExpanded = expandedId === post.id
                            const comments = commentsMap[post.id] || []
                            const isLiked = likedPostIds.has(post.id)
                            const isSpoilerHidden = post.isSpoiler && !spoilerVisible.has(post.id)
                            const commentCount = comments.length || post.commentCount
                            const catStyle = post.category ? CAT_STYLES[post.category] : null

                            return (
                                <div key={post.id} className="cp-post">
                                    <div className="cp-post-body" onClick={() => handleCardClick(post.id)}>
                                        <div className="cp-post-header">
                                            <div className="cp-avatar">
                                                {post.authorProfileImg ? <img src={post.authorProfileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : post.authorNickname[0]}
                                            </div>
                                            <UserProfilePopover authorId={post.authorId} authorNickname={post.authorNickname} authorProfileImg={post.authorProfileImg} authorWatched={post.authorWatched ?? 0}>
                                                {post.authorNickname}
                                            </UserProfilePopover>
                                            <GradeBadge watched={post.authorWatched ?? 0} size="sm" showName={true} />
                                            <div className="cp-post-badges">
                                                {catStyle && post.category && <span className="cp-badge" style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>{post.category}</span>}
                                                {post.isSpoiler && <span className="cp-badge" style={{ background: 'rgba(248,113,113,.1)', color: '#f87171', border: '1px solid rgba(248,113,113,.25)' }}>스포</span>}
                                                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{formatTime(post.createdAt)}</span>
                                            </div>
                                        </div>
                                        <p className="cp-post-title">{post.title}</p>
                                        <div style={{ position: 'relative' }}>
                                            <p className={`cp-post-content${isSpoilerHidden ? ' spoiler-blur' : ''}`}
                                                style={{ WebkitLineClamp: isExpanded ? undefined : 2, display: isExpanded ? 'block' : '-webkit-box', WebkitBoxOrient: 'vertical', overflow: isExpanded ? 'visible' : 'hidden' }}>
                                                {post.content}
                                            </p>
                                            {isSpoilerHidden && (
                                                <button onClick={e => { e.stopPropagation(); setSpoilerVisible(p => new Set([...p, post.id])) }}
                                                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: '#a78bfa', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    스포일러 보기
                                                </button>
                                            )}
                                        </div>
                                        {post.tags.length > 0 && (
                                            <div className="cp-post-tags">
                                                {post.tags.map(tag => (
                                                    <span key={tag} className="cp-tag-chip"
                                                        onClick={e => {
                                                            e.stopPropagation()
                                                            // 태그 클릭 → 전체 게시글로 + 해당 태그 필터
                                                            setShowMyPosts(false)
                                                            if (HOT_TAGS_BASE.some(t => t.tag === tag)) { setActiveTag(tag); setCustomTag(null) }
                                                            else { setCustomTag(tag); setActiveTag(null) }
                                                        }}>{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                        {post.images && post.images.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(2,1fr)', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                                                {post.images.map((url, i) => (
                                                    <div key={i} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: post.images!.length === 1 ? '16/9' : '1/1', background: 'var(--bg-secondary)', cursor: 'zoom-in' }} onClick={() => window.open(url, '_blank')}>
                                                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="cp-post-footer">
                                        <button className={`cp-action-btn${isLiked ? ' active' : ''}`} onClick={e => handleLike(e, post)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                                                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                            </svg>
                                            {post.likes + (isLiked ? 1 : 0)}
                                        </button>
                                        <button className={`cp-action-btn${isExpanded ? ' active' : ''}`} onClick={() => handleCardClick(post.id)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                            댓글 {commentCount}
                                            {isExpanded ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>}
                                        </button>
                                    </div>
                                    {isExpanded && (
                                        <div className="cp-comments">
                                            {commentLoading[post.id]
                                                ? <div style={{ padding: 20, textAlign: 'center' }}><div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto' }} /></div>
                                                : comments.length === 0
                                                    ? <p style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>첫 댓글을 남겨보세요!</p>
                                                    : comments.map(c => (
                                                        <div key={c.id} className="cp-comment-item">
                                                            <div className="cp-comment-avatar">
                                                                {c.authorProfileImg ? <img src={c.authorProfileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : c.authorNickname[0]}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                                    <UserProfilePopover authorId={c.authorId || 'mock'} authorNickname={c.authorNickname} authorProfileImg={c.authorProfileImg} authorWatched={c.authorWatched ?? 0}>{c.authorNickname}</UserProfilePopover>
                                                                    <GradeBadge watched={c.authorWatched ?? 0} size="sm" showName={true} />
                                                                    <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>{formatTime(c.createdAt)}</span>
                                                                </div>
                                                                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{c.content}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                            }
                                            <div className="cp-input-wrap">
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#8b5cf6' }}>
                                                    {user?.photoURL ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : user?.name?.[0] || '?'}
                                                </div>
                                                <input className="cp-comment-input" placeholder={user ? '댓글을 남겨보세요 (Enter로 등록)' : '로그인 후 댓글을 달 수 있어요'}
                                                    value={commentInput[post.id] || ''} onChange={e => setCommentInput(p => ({ ...p, [post.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, !!post.isMock) } }} disabled={!user} />
                                                <button onClick={() => handleComment(post.id, !!post.isMock)} disabled={!commentInput[post.id]?.trim() || !user}
                                                    style={{ padding: '0 13px', height: 34, background: commentInput[post.id]?.trim() && user ? '#7c3aed' : 'var(--bg-hover)', border: 'none', borderRadius: 9, color: commentInput[post.id]?.trim() && user ? '#fff' : 'var(--text-faint)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    등록
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        <div ref={loaderRef} className="cp-loader">{hasMore && <div className="cp-loader-dot" />}</div>
                    </div>

                    {/* 오른쪽 사이드바 */}
                    <aside className="cp-right-sidebar">
                        {user ? (
                            <div className="cp-sidebar-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                                        {user.photoURL ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 13 }}>{user.name?.[0]}</div>}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                                        <GradeBadge watched={myWatched} size="sm" showName={true} />
                                    </div>
                                    <button className="cp-write-btn" onClick={() => setShowWrite(true)}>글쓰기</button>
                                </div>
                                {/* 통계 → 클릭 시 내 글 탭 + 카테고리 */}
                                <div className="cp-user-stats">
                                    <div className="cp-stat-cell" title="작성한 글 보기" onClick={() => { setShowMyPosts(true); setMyActiveCategory(null) }}>
                                        <span className="cp-stat-num">{myPostCount}</span>
                                        <span className="cp-stat-label">작성한 글</span>
                                    </div>
                                    <div className="cp-stat-cell" title="댓글 보기" onClick={() => { setShowMyPosts(true); setMyActiveCategory('감상평') }}>
                                        <span className="cp-stat-num">0</span>
                                        <span className="cp-stat-label">작성한 댓글</span>
                                    </div>
                                    <div className="cp-stat-cell" title="보관글 보기" onClick={() => { setShowMyPosts(true); setMyActiveCategory(null) }}>
                                        <span className="cp-stat-num">0</span>
                                        <span className="cp-stat-label">보관게시글</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="cp-sidebar-card" style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 13, color: 'var(--text-subtle)', marginBottom: 12 }}>로그인하고 덕후들과 소통해요!</p>
                                <button className="cp-write-btn" style={{ width: '100%' }} onClick={() => router.push('/login')}>로그인</button>
                            </div>
                        )}
                        <div className="cp-sidebar-card">
                            <p className="cp-sidebar-title">#인기태그</p>
                            {HOT_TAGS_BASE.map(({ tag }) => {
                                const img = tagImgs[tag]
                                return (
                                    <div key={tag} className="cp-hot-row" onClick={() => { setActiveTag(tag); setCustomTag(null); setShowMyPosts(false) }}>
                                        {img ? <img className="cp-hot-thumb" src={img} alt={tag} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                                            : <div className="cp-hot-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, borderRadius: 6 }}>🎌</div>}
                                        <span className="cp-hot-label" style={{ color: effectiveTag === tag ? '#a78bfa' : undefined }}>{tag}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{tagCounts[tag] ?? 0}개</span>
                                    </div>
                                )
                            })}
                            <div className="cp-hot-row" onClick={() => { setActiveTag('#기타'); setCustomTag(null); setShowMyPosts(false) }}>
                                <div className="cp-hot-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, borderRadius: 6 }}>—</div>
                                <span className="cp-hot-label" style={{ color: effectiveTag === '#기타' ? '#a78bfa' : undefined }}>#기타</span>
                                <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{otherCount}개</span>
                            </div>
                        </div>
                        <div className="cp-sidebar-card">
                            <p className="cp-sidebar-title">커뮤니티 규칙</p>
                            {['스포일러는 반드시 태그 달기', '서로 존중하는 덕후 문화', '도배·광고 금지', '작품 비하 발언 금지'].map((rule, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', flexShrink: 0, background: 'rgba(124,58,237,.12)', borderRadius: 4, padding: '1px 5px', marginTop: 1 }}>{i + 1}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5 }}>{rule}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>

            {/* 햄버거 버튼 */}
            <button className="cp-sidebar-toggle" onClick={() => setShowSidebar(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* 슬라이드 패널 */}
            {showSidebar && (
                <>
                    <div className="cp-sidebar-overlay" onClick={() => setShowSidebar(false)} />
                    <div className="cp-sidebar-panel">
                        <div className="cp-sidebar-panel-header">
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>메뉴</span>
                            <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                        </div>
                        {user ? (
                            <div className="cp-sidebar-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                        {user.photoURL ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 13 }}>{user.name?.[0]}</div>}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>{user.name}</p>
                                        <GradeBadge watched={myWatched} size="sm" showName={true} />
                                    </div>
                                </div>
                                <button className="cp-write-btn" style={{ width: '100%' }} onClick={() => { setShowSidebar(false); setShowWrite(true) }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                    글쓰기
                                </button>
                                <div className="cp-user-stats" style={{ marginTop: 10 }}>
                                    <div className="cp-stat-cell" onClick={() => { setShowMyPosts(true); setMyActiveCategory(null); setShowSidebar(false) }}>
                                        <span className="cp-stat-num">{myPostCount}</span><span className="cp-stat-label">작성한 글</span>
                                    </div>
                                    <div className="cp-stat-cell" onClick={() => { setShowMyPosts(true); setShowSidebar(false) }}>
                                        <span className="cp-stat-num">0</span><span className="cp-stat-label">댓글</span>
                                    </div>
                                    <div className="cp-stat-cell" onClick={() => { setShowMyPosts(true); setShowSidebar(false) }}>
                                        <span className="cp-stat-num">0</span><span className="cp-stat-label">보관글</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="cp-sidebar-card" style={{ textAlign: 'center' }}>
                                <button className="cp-write-btn" style={{ width: '100%' }} onClick={() => { setShowSidebar(false); router.push('/login') }}>로그인</button>
                            </div>
                        )}
                        <div className="cp-sidebar-card">
                            <p className="cp-sidebar-title">#인기태그</p>
                            {HOT_TAGS_BASE.map(({ tag }) => {
                                const img = tagImgs[tag]
                                return (
                                    <div key={tag} className="cp-hot-row" onClick={() => { setActiveTag(tag); setCustomTag(null); setShowMyPosts(false); setShowSidebar(false) }}>
                                        {img ? <img className="cp-hot-thumb" src={img} alt={tag} /> : <div className="cp-hot-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>🎌</div>}
                                        <span className="cp-hot-label">{tag}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{tagCounts[tag] ?? 0}개</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="cp-sidebar-card">
                            <p className="cp-sidebar-title">정렬</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['hot', 'latest'] as SortType[]).map(v => (
                                    <button key={v} onClick={() => { setSort(v); setShowSidebar(false) }}
                                        style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: sort === v ? 'rgba(139,92,246,.15)' : 'var(--bg-secondary)', border: `1px solid ${sort === v ? 'rgba(139,92,246,.4)' : 'var(--border)'}`, color: sort === v ? '#a78bfa' : 'var(--text-muted)' }}>
                                        {v === 'hot' ? '인기순' : '최신순'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 글쓰기 모달 */}
            {showWrite && (
                <div className="cp-modal-bg" onClick={() => setShowWrite(false)}>
                    <div className="cp-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>새 글 작성</h2>
                            <button onClick={() => setShowWrite(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input className="cp-field" placeholder="제목" value={writeTitle} onChange={e => setWriteTitle(e.target.value)} maxLength={100} />
                            <textarea className="cp-field" placeholder="덕후답게 마음껏 써보세요!" value={writeContent} onChange={e => setWriteContent(e.target.value)} rows={5} maxLength={2000} style={{ resize: 'none', lineHeight: 1.7 }} />
                            <input className="cp-field" placeholder="태그 (예: #진격의거인 #감상)" value={writeTags} onChange={e => setWriteTags(e.target.value)} />
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['분석', '감상평', '추천', '기타'].map(cat => (
                                    <button key={cat} onClick={() => setWriteCategory(writeCategory === cat ? '' : cat)}
                                        style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: writeCategory === cat ? 'rgba(124,58,237,.15)' : 'var(--bg-secondary)', border: `1px solid ${writeCategory === cat ? 'rgba(124,58,237,.5)' : 'var(--border)'}`, color: writeCategory === cat ? '#a78bfa' : 'var(--text-subtle)' }}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            {writeImagePreviews.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                                    {writeImagePreviews.map((src, i) => (
                                        <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                                            <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 3, right: 3, width: 17, height: 17, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                        </div>
                                    ))}
                                    {writeImages.length < 4 && (
                                        <label style={{ aspectRatio: '1/1', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 20 }}>
                                            +<input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
                                        </label>
                                    )}
                                </div>
                            )}
                            {writeImagePreviews.length === 0 && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-faint)', fontSize: 13 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                                    이미지 첨부 (최대 4장)
                                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
                                </label>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setWriteSpoiler(v => !v)}>
                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${writeSpoiler ? '#7c3aed' : 'var(--border)'}`, background: writeSpoiler ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                        {writeSpoiler && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                    </div>
                                    <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>스포일러 포함</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowWrite(false)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                                    <button onClick={handlePost} disabled={!writeTitle.trim() || !writeContent.trim() || posting || uploadingImages}
                                        style={{ padding: '8px 18px', background: writeTitle.trim() && writeContent.trim() ? '#7c3aed' : 'var(--bg-hover)', border: 'none', borderRadius: 9, color: writeTitle.trim() && writeContent.trim() ? '#fff' : 'var(--text-faint)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                                        {uploadingImages ? '업로드 중...' : posting ? '등록 중...' : '등록'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}