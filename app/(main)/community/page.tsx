'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { db, storage } from '@/firebase/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
    collection, addDoc, getDocs, query, orderBy,
    limit, onSnapshot, doc, updateDoc, increment,
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

const MOCK_POSTS = [
    { id: 'm1', authorId: 'mock', authorNickname: '진격팬123', authorProfileImg: '', authorWatched: 42, title: '진격의 거인 파이널 마지막화 보고 멘탈 탈출...', content: '진짜 이게 뭐야... 엔딩 보고 30분 동안 멍 때렸음. 엘런 선택 어떻게 생각함? 나는 결국 그게 최선이었다고 보는데 의견들이 너무 갈리네', tags: ['#진격의거인', '#결말스포'], category: '감상평', isSpoiler: true, likes: 284, commentCount: 2, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 'm2', authorId: 'mock', authorNickname: '에렌옹호론자', authorProfileImg: '', authorWatched: 60, title: '엘런이 틀리지 않은 이유 — 논리적 분석', content: '많은 사람들이 엘런을 악인으로 보지만 그의 선택에는 일관된 논리가 있음. 자유를 위해 모든 걸 희생한다는 신념이 처음부터 끝까지 유지됐다', tags: ['#진격의거인', '#분석'], category: '분석', isSpoiler: false, likes: 178, commentCount: 14, createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: 'm3', authorId: 'mock', authorNickname: '리바이병장팬', authorProfileImg: '', authorWatched: 38, title: '리바이 병장이 역대급 캐릭터인 이유', content: '단순히 강한 게 아니라 인간적인 면이 계속 쌓여서 감동적이었음. 4기에서 눈 하나 잃은 장면 진짜 심장 쿵', tags: ['#진격의거인'], category: '분석', isSpoiler: false, likes: 241, commentCount: 31, createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
    { id: 'm4', authorId: 'mock', authorNickname: 'WIT스튜디오러버', authorProfileImg: '', authorWatched: 29, title: '1기 작화가 그리운 이유 — WIT vs MAPPA 비교', content: 'MAPPA도 훌륭하지만 WIT의 손으로 그린 느낌의 작화가 진격에는 더 어울렸다고 봄. 1기 104기 훈련병단 오프닝 지금도 닭살', tags: ['#진격의거인', '#작화덕'], category: '분석', isSpoiler: false, likes: 133, commentCount: 22, createdAt: new Date(Date.now() - 3600000 * 15).toISOString() },
    { id: 'm5', authorId: 'mock', authorNickname: 'OST수집가', authorProfileImg: '', authorWatched: 51, title: '진격의 거인 OST 추천 TOP5', content: 'Sawano Hiroyuki의 음악이 진격의 세계관을 완성했다고 해도 과언이 아님. 특히 YouSeeBIGGIRL/T:T 들을 때마다 소름', tags: ['#진격의거인', '#OST'], category: '추천', isSpoiler: false, likes: 196, commentCount: 18, createdAt: new Date(Date.now() - 3600000 * 20).toISOString() },
    { id: 'm6', authorId: 'mock', authorNickname: '작화탐구자', authorProfileImg: '', authorWatched: 15, title: '귀멸 무한열차 작화 프레임 분석해봤음', content: '오프닝 없이 Ufotable이 어떻게 이걸 뽑아냈는지... 3분 12초부터 카메라무빙 진짜 미침. 원화가가 누군지 찾아봤더니 역시나', tags: ['#귀멸의칼날', '#작화덕'], category: '분석', isSpoiler: false, likes: 193, commentCount: 31, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: 'm7', authorId: 'mock', authorNickname: '렌고쿠팬', authorProfileImg: '', authorWatched: 22, title: '렌고쿠가 왜 역대급 캐릭터인지 설명해줌', content: '등장시간이 길지 않은데도 이렇게 임팩트를 남기는 캐릭터가 또 있을까. 무한열차 마지막 장면은 10번 봐도 울게 됨', tags: ['#귀멸의칼날'], category: '감상평', isSpoiler: true, likes: 267, commentCount: 45, createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 'm8', authorId: 'mock', authorNickname: '도게자', authorProfileImg: '', authorWatched: 9, title: '귀멸 입문 순서 완벽 가이드', content: '극장판 먼저 봐야 하냐 2기부터 봐야 하냐 항상 헷갈리는 사람들을 위해 정리해봤음. 결론은 1기 → 극장판 → 2기 순서', tags: ['#귀멸의칼날', '#입문추천'], category: '추천', isSpoiler: false, likes: 89, commentCount: 37, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: 'm9', authorId: 'mock', authorNickname: '네즈코수호대', authorProfileImg: '', authorWatched: 17, title: '네즈코 성장 서사가 진짜 잘 쓰여진 이유', content: '처음엔 그냥 보호받는 캐릭터인 줄 알았는데 시즌 진행할수록 자기만의 서사가 생기면서 진짜 주인공급 임팩트', tags: ['#귀멸의칼날'], category: '분석', isSpoiler: false, likes: 154, commentCount: 19, createdAt: new Date(Date.now() - 3600000 * 18).toISOString() },
    { id: 'm10', authorId: 'mock', authorNickname: 'BGM덕후', authorProfileImg: '', authorWatched: 33, title: '귀멸 OST 유이가오카 들어봤음?', content: 'Go!가 유명하지만 개인적으로 유이가오카가 제일 좋음. 탄지로 누나 장면에서 나올 때 진짜 눈물 차오름', tags: ['#귀멸의칼날', '#OST'], category: '감상평', isSpoiler: false, likes: 211, commentCount: 27, createdAt: new Date(Date.now() - 3600000 * 22).toISOString() },
    { id: 'm11', authorId: 'mock', authorNickname: '오타쿠9년차', authorProfileImg: '', authorWatched: 67, title: '주술회전 vs 귀멸 vs 진격 — 역대급 3대장 순위', content: '작화/스토리/연출/BGM 4개 기준으로 직접 분석해봤음. 각각 장단점이 명확한데 개인적으로는 연출 면에서 압도적인 게 있더라', tags: ['#주술회전', '#귀멸의칼날', '#진격의거인', '#논쟁'], category: '분석', isSpoiler: false, likes: 421, commentCount: 83, createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 'm12', authorId: 'mock', authorNickname: '고조사토루빠', authorProfileImg: '', authorWatched: 44, title: '고조 선생 없는 주술회전 어떻게 볼 거임', content: '고조 없이도 이야기가 굴러가는 게 신기함. 근데 확실히 긴장감이 다른 방향으로 흘러가서 나름 재밌는 것 같기도', tags: ['#주술회전'], category: '감상평', isSpoiler: true, likes: 298, commentCount: 61, createdAt: new Date(Date.now() - 3600000 * 30).toISOString() },
    { id: 'm13', authorId: 'mock', authorNickname: 'MAPPA신도', authorProfileImg: '', authorWatched: 55, title: '주술 2기 작화가 역대급인 진짜 이유', content: '시부야 사변 아크 중간에 작화 퀄리티가 극장판급으로 올라갔음. 특히 이타도리 대 마화노 싸움은 진짜 입 벌어짐', tags: ['#주술회전', '#작화덕'], category: '분석', isSpoiler: false, likes: 334, commentCount: 42, createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
    { id: 'm14', authorId: 'mock', authorNickname: '노바라진영', authorProfileImg: '', authorWatched: 28, title: '카우게이 노바라가 주인공이어야 한다', content: '솔직히 노바라가 제일 현실적이고 공감 가는 캐릭터임. 이타도리도 좋지만 노바라 시점으로 전개됐으면 더 재밌었을 것 같음', tags: ['#주술회전'], category: '감상평', isSpoiler: false, likes: 177, commentCount: 34, createdAt: new Date(Date.now() - 3600000 * 40).toISOString() },
    { id: 'm15', authorId: 'mock', authorNickname: '주술뉴비', authorProfileImg: '', authorWatched: 5, title: '주술회전 정주행 완료! 후기 남김', content: '귀멸 보다가 추천받아서 봤는데 진짜 미쳤다. 능력 시스템이 독특하고 캐릭터들 하나하나 개성이 살아있음. 2기 바로 들어감', tags: ['#주술회전', '#입문추천'], category: '추천', isSpoiler: false, likes: 98, commentCount: 22, createdAt: new Date(Date.now() - 3600000 * 44).toISOString() },
    { id: 'm16', authorId: 'mock', authorNickname: '소년점프러버', authorProfileImg: '', authorWatched: 88, title: '이번 시즌 최고 애니 뭐임? 내 픽 공유', content: '다들 이번 분기 뭐 보고 있음? 개인적으로 올해 본 것 중에 최고가 될 것 같은 작품 발견함. 스토리 구성이 진짜 탄탄하고 작화도 심상치 않음', tags: ['#2026봄애니', '#추천'], category: '추천', isSpoiler: false, likes: 156, commentCount: 62, createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 'm17', authorId: 'mock', authorNickname: '덕후입문3일차', authorProfileImg: '', authorWatched: 3, title: '애니 입문자인데 뭐부터 봐야 함??', content: '친구 추천으로 귀멸 보고 빠졌는데 다음에 뭐 봐야 할지 모르겠음. 비슷한 분위기거나 더 좋은 거 추천해줘요 장르 안 가림', tags: ['#입문추천'], category: '추천', isSpoiler: false, likes: 89, commentCount: 104, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: 'm18', authorId: 'mock', authorNickname: '나만아는BGM', authorProfileImg: '', authorWatched: 30, title: '이 애니 OST 듣다가 눈물 흘린 사람 나만?', content: '바이올렛 에버가든 OST 출퇴근길에 듣다가 지하철에서 눈물 참은 사람 손 ✋ 진짜 반칙임. 어떻게 음악만으로 이런 감정을 만들어내지', tags: ['#바이올렛에버가든', '#OST', '#눈물주의'], category: '감상평', isSpoiler: false, likes: 312, commentCount: 58, createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
]

const MOCK_COMMENTS: Record<string, { id: string; authorNickname: string; authorProfileImg: string; authorWatched: number; content: string; createdAt: string; likes: number }[]> = {
    m1: [
        { id: 'mc1', authorNickname: '에렌빠', authorProfileImg: '', authorWatched: 55, content: '엘런 입장에서는 그게 유일한 방법이었다고 봄. 근데 결과적으로 너무 많은 걸 잃었지...', createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 23 },
        { id: 'mc2', authorNickname: '미카사사랑', authorProfileImg: '', authorWatched: 8, content: '미카사 엔딩이 너무 슬펐음 ㅠㅠ', createdAt: new Date(Date.now() - 1800000).toISOString(), likes: 11 },
    ],
    m11: [
        { id: 'mc3', authorNickname: '애니평론가지망생', authorProfileImg: '', authorWatched: 100, content: 'BGM은 진격이 압도적이고 스토리는 귀멸이 대중성 있고... 연출만큼은 주술이 요즘 제일 미친 것 같음', createdAt: new Date(Date.now() - 7200000).toISOString(), likes: 67 },
        { id: 'mc4', authorNickname: 'MAPPA신도', authorProfileImg: '', authorWatched: 55, content: '시부야 사변 기준으로 주술 연출은 진짜 넘사벽이었음', createdAt: new Date(Date.now() - 5400000).toISOString(), likes: 44 },
    ],
    m7: [
        { id: 'mc5', authorNickname: '렌고쿠최애', authorProfileImg: '', authorWatched: 22, content: '극장에서 봤을 때 옆에 앉은 아저씨도 울고 있었음... 세대를 초월하는 캐릭터임', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), likes: 89 },
    ],
}

type SortType = 'latest' | 'hot'

interface Comment {
    id: string; authorId?: string; authorNickname: string; authorProfileImg: string
    authorWatched: number; content: string; createdAt: string; likes: number
}
interface Post {
    id: string; authorId: string; authorNickname: string; authorProfileImg: string
    authorWatched: number; title: string; content: string; tags: string[]
    category?: string; isSpoiler: boolean; likes: number; commentCount: number
    createdAt: string; isMock?: boolean; images?: string[]
}

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
    '스포일러': { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.3)' },
}

export default function CommunityPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [realPosts, setRealPosts] = useState<Post[]>([])
    const [sort, setSort] = useState<SortType>('latest')
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showTagDropdown, setShowTagDropdown] = useState(false)
    const [showWrite, setShowWrite] = useState(false)
    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [spoilerVisible, setSpoilerVisible] = useState<Set<string>>(new Set())
    const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
    const [commentInput, setCommentInput] = useState<Record<string, string>>({})
    const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
    const [tagCounts, setTagCounts] = useState<Record<string, number>>(
        Object.fromEntries(HOT_TAGS_BASE.map(t => [t.tag, t.base]))
    )
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

    const myWatched = (() => {
        try {
            const s = typeof window !== 'undefined' ? localStorage.getItem('watch-progress-storage') : null
            return s ? (JSON.parse(s)?.state?.items?.length ?? 0) : 0
        } catch { return 0 }
    })()

    const myPostCount = realPosts.filter(p => p.authorId === user?.uid).length
    const myCommentCount = 0 // placeholder

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

    const loadComments = async (postId: string) => {
        if (postId.startsWith('m')) { setCommentsMap(prev => ({ ...prev, [postId]: MOCK_COMMENTS[postId] || [] })); return }
        setCommentLoading(prev => ({ ...prev, [postId]: true }))
        try {
            const q = query(collection(db, 'community_posts', postId, 'comments'), orderBy('createdAt', 'asc'))
            const snap = await getDocs(q)
            setCommentsMap(prev => ({ ...prev, [postId]: snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) }))
        } catch (e) { console.error(e) }
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
        const newComment: Comment = {
            id: `temp_${Date.now()}`, authorId: user.uid || '',
            authorNickname: user.name || '익명', authorProfileImg: user.photoURL || '',
            authorWatched: myWatched, content: text,
            createdAt: new Date().toISOString(), likes: 0,
        }
        setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }))
        setCommentInput(prev => ({ ...prev, [postId]: '' }))
        if (!isMock) {
            try {
                await addDoc(collection(db, 'community_posts', postId, 'comments'), {
                    authorId: user.uid, authorNickname: user.name || '익명',
                    authorProfileImg: user.photoURL || '', authorWatched: myWatched,
                    content: text, createdAt: new Date().toISOString(), likes: 0,
                })
                await updateDoc(doc(db, 'community_posts', postId), { commentCount: increment(1) })
            } catch (e) { console.error(e) }
        }
    }

    const handleLike = async (e: React.MouseEvent, post: Post) => {
        e.stopPropagation()
        const isLiked = likedPostIds.has(post.id)
        setLikedPostIds(prev => { const n = new Set(prev); isLiked ? n.delete(post.id) : n.add(post.id); return n })
        setRealPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 } : p))
        if (!post.isMock) {
            try { await updateDoc(doc(db, 'community_posts', post.id), { likes: increment(isLiked ? -1 : 1) }) }
            catch (e) { console.error(e) }
        }
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const valid = files.filter(f => f.type.startsWith('image/') && f.size < 5 * 1024 * 1024)
        if (valid.length + writeImages.length > 4) { alert('이미지는 최대 4장까지 첨부할 수 있어요.'); return }
        setWriteImages(prev => [...prev, ...valid])
        valid.forEach(file => {
            const reader = new FileReader()
            reader.onload = e => setWriteImagePreviews(prev => [...prev, e.target?.result as string])
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    const removeImage = (idx: number) => {
        setWriteImages(prev => prev.filter((_, i) => i !== idx))
        setWriteImagePreviews(prev => prev.filter((_, i) => i !== idx))
    }

    const handlePost = async () => {
        if (!writeTitle.trim() || !writeContent.trim() || !user) return
        setPosting(true)
        try {
            const tags = writeTags.split(/[\s,]+/).filter(t => t.startsWith('#') && t.length > 1).slice(0, 5)
            let imageUrls: string[] = []
            if (writeImages.length > 0) {
                setUploadingImages(true)
                imageUrls = await Promise.all(writeImages.map(async (file) => {
                    const path = `community/${user.uid}/${Date.now()}_${file.name}`
                    const storageRef = ref(storage, path)
                    await uploadBytes(storageRef, file)
                    return getDownloadURL(storageRef)
                }))
                setUploadingImages(false)
            }
            await addDoc(collection(db, 'community_posts'), {
                authorId: user.uid,
                authorNickname: user.name || user.email?.split('@')[0] || '익명',
                authorProfileImg: user.photoURL || '',
                authorWatched: myWatched, title: writeTitle.trim(), content: writeContent.trim(),
                tags, category: writeCategory || null, isSpoiler: writeSpoiler,
                likes: 0, commentCount: 0, images: imageUrls,
                createdAt: new Date().toISOString(),
            })
            setWriteTitle(''); setWriteContent(''); setWriteTags(''); setWriteSpoiler(false); setWriteCategory('')
            setWriteImages([]); setWriteImagePreviews([]); setShowWrite(false)
        } catch (e) { console.error(e) }
        finally { setPosting(false) }
    }

    const allPosts: Post[] = [...realPosts, ...MOCK_POSTS.map(m => ({ ...m, isMock: true }))]
    const knownTags = new Set(HOT_TAGS_BASE.map(t => t.tag))

    const filtered = allPosts
        .filter(p => {
            if (activeTag) {
                if (activeTag === '#기타') { if (p.tags.some(t => knownTags.has(t))) return false }
                else { if (!p.tags.includes(activeTag)) return false }
            }
            if (activeCategory) {
                if (activeCategory === '스포일러') { if (!p.isSpoiler) return false }
                else { if (p.category !== activeCategory && !p.tags.some(t => t.includes(activeCategory))) return false }
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))
            }
            return true
        })
        .sort((a, b) => sort === 'hot'
            ? (b.likes + (commentsMap[b.id]?.length ?? b.commentCount) * 2) - (a.likes + (commentsMap[a.id]?.length ?? a.commentCount) * 2)
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

    const otherCount = allPosts.filter(p => !p.tags.some(t => knownTags.has(t))).length

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
            <style>{`
                @keyframes gradientShift {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes floatOrb1 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    33%     { transform: translate(40px,-25px) scale(1.1); }
                    66%     { transform: translate(-20px,18px) scale(0.95); }
                }
                @keyframes floatOrb2 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    40%     { transform: translate(-30px,22px) scale(1.08); }
                    70%     { transform: translate(22px,-18px) scale(0.97); }
                }
                @keyframes floatOrb3 {
                    0%,100% { transform: translate(0,0); }
                    50%     { transform: translate(18px,28px); }
                }
                @keyframes fadeUp {
                    from { opacity:0; transform:translateY(10px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes expandDown {
                    from { opacity:0; }
                    to   { opacity:1; }
                }
                @keyframes spin { to { transform:rotate(360deg); } }
                @keyframes blink {
                    0%,100% { opacity:1; } 50% { opacity:0.4; }
                }

                /* ── OUTER ── */
                .cp-outer { width: 90%; max-width: 1500px; margin: 0 auto; padding-bottom: 80px; }

                /* ── HERO ── */
                .cp-hero {
                    position: relative; overflow: hidden;
                    padding: 40px 44px 38px;
                    margin-bottom: 0;
                    background: linear-gradient(270deg, #120824, #0e1a3f, #081c30, #1a0a3a, #120824);
                    background-size: 500% 500%;
                    animation: gradientShift 12s ease infinite;
                }
                .cp-hero-orb {
                    position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none; will-change: transform;
                }
                .cp-hero-orb1 {
                    width: 380px; height: 380px;
                    background: radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 65%);
                    top: -120px; left: -80px;
                    animation: floatOrb1 9s ease-in-out infinite;
                }
                .cp-hero-orb2 {
                    width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 65%);
                    top: -60px; right: 8%;
                    animation: floatOrb2 11s ease-in-out infinite;
                }
                .cp-hero-orb3 {
                    width: 240px; height: 240px;
                    background: radial-gradient(circle, rgba(219,39,119,0.18) 0%, transparent 65%);
                    bottom: -80px; right: 28%;
                    animation: floatOrb3 7s ease-in-out infinite;
                }
                .cp-hero-content {
                    position: relative; z-index: 1;
                }
                .cp-hero-eyebrow {
                    display: inline-flex; align-items: center; gap: 7px;
                    font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em;
                    color: rgba(196,181,253,0.85); text-transform: uppercase;
                    margin-bottom: 10px;
                }
                .cp-hero-dot {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: #a78bfa;
                    animation: blink 2.2s ease-in-out infinite;
                }
                .cp-hero-title {
                    font-size: 34px; font-weight: 900; color: #fff;
                    margin: 0 0 7px; letter-spacing: -1px; line-height: 1.15;
                }
                .cp-hero-sub {
                    font-size: 13.5px; color: rgba(196,181,253,0.65); margin: 0;
                }

                /* ── TAG BAR (hero 바로 아래 퍼플 바) ── */
                .cp-tagbar {
                    background: rgba(88,28,220,0.18);
                    border-bottom: 1px solid rgba(139,92,246,0.15);
                    padding: 0 44px;
                    display: flex; align-items: center; gap: 0;
                    overflow-x: auto; scrollbar-width: none;
                    margin-bottom: 28px;
                }
                .cp-tagbar::-webkit-scrollbar { display: none; }
                .cp-tagbar-more {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 12px 16px 12px 0; margin-right: 12px;
                    font-size: 12px; font-weight: 700; color: rgba(196,181,253,0.8);
                    cursor: pointer; white-space: nowrap; background: none; border: none;
                    font-family: inherit; border-right: 1px solid rgba(139,92,246,0.2);
                    padding-right: 16px;
                    transition: color .15s;
                }
                .cp-tagbar-more:hover { color: #a78bfa; }
                .cp-tagbar-item {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 11px 14px; font-size: 12px; font-weight: 700;
                    color: rgba(196,181,253,0.65); cursor: pointer; white-space: nowrap;
                    background: none; border: none; font-family: inherit;
                    border-bottom: 2px solid transparent; margin-bottom: -1px;
                    transition: all .15s; flex-shrink: 0;
                }
                .cp-tagbar-item img { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }
                .cp-tagbar-item:hover { color: #c4b5fd; }
                .cp-tagbar-item.active { color: #c4b5fd; border-bottom-color: #a78bfa; }
                .cp-tagbar-all {
                    padding: 11px 14px; font-size: 12px; font-weight: 800;
                    color: rgba(196,181,253,0.65); cursor: pointer; white-space: nowrap;
                    background: none; border: none; font-family: inherit;
                    border-bottom: 2px solid transparent; margin-bottom: -1px;
                    transition: all .15s; flex-shrink: 0;
                }
                .cp-tagbar-all:hover { color: #c4b5fd; }
                .cp-tagbar-all.active { color: #c4b5fd; border-bottom-color: #a78bfa; }

                /* ── SEARCH ── */
                .cp-search-wrap {
                    position: relative; margin-bottom: 18px;
                }
                .cp-search-icon {
                    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
                    color: var(--text-faint); pointer-events: none;
                }
                .cp-search-input {
                    width: 100%; box-sizing: border-box;
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    border-radius: 12px; padding: 11px 14px 11px 40px;
                    font-size: 13px; color: var(--text-primary);
                    outline: none; font-family: inherit; transition: border-color .2s;
                }
                .cp-search-input:focus { border-color: rgba(139,92,246,.5); }
                .cp-search-input::placeholder { color: var(--text-faint); }
                .cp-search-clear {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    background: none; border: none; color: var(--text-faint);
                    cursor: pointer; font-size: 15px; line-height: 1; padding: 2px 4px;
                }

                /* ── MAIN LAYOUT ── */
                .cp-layout {
                    display: grid;
                    grid-template-columns: 88px 1fr 260px;
                    gap: 0 20px;
                    align-items: start;
                }
                @media (max-width: 1000px) {
                    .cp-layout { grid-template-columns: 1fr; }
                    .cp-left-rail { display: none; }
                    .cp-right-sidebar { display: none; }
                }
                @media (max-width: 1280px) and (min-width: 1001px) {
                    .cp-layout { grid-template-columns: 80px 1fr 240px; }
                }

                /* ── LEFT RAIL (sort + category) ── */
                .cp-left-rail {
                    position: sticky; top: 88px;
                    display: flex; flex-direction: column; align-items: flex-end; gap: 0;
                }
                .cp-sort-group {
                    display: flex; flex-direction: column; align-items: flex-end;
                    gap: 2px; margin-bottom: 24px; width: 100%;
                }
                .cp-sort-btn {
                    width: 100%; text-align: right; padding: 7px 0;
                    font-size: 13px; font-weight: 700; cursor: pointer;
                    background: none; border: none; font-family: inherit;
                    transition: color .15s; color: var(--text-faint);
                }
                .cp-sort-btn:hover { color: var(--text-muted); }
                .cp-sort-btn.active { color: #a78bfa; }
                .cp-cat-group {
                    display: flex; flex-direction: column; align-items: flex-end;
                    gap: 0; width: 100%;
                    background: rgba(139,92,246,0.08);
                    border: 1px solid rgba(139,92,246,0.18);
                    border-radius: 12px; overflow: hidden;
                }
                .cp-cat-item {
                    width: 100%; text-align: right; padding: 11px 14px;
                    font-size: 13px; font-weight: 700; cursor: pointer;
                    background: none; border: none; font-family: inherit;
                    transition: all .15s; color: var(--text-subtle);
                    border-bottom: 1px solid rgba(139,92,246,0.1);
                    line-height: 1;
                }
                .cp-cat-item:last-child { border-bottom: none; }
                .cp-cat-item:hover { background: rgba(139,92,246,0.12); color: #c4b5fd; }
                .cp-cat-item.active {
                    background: rgba(139,92,246,0.2);
                    color: #c4b5fd;
                }
                .cp-cat-item.cat-sp.active { background: rgba(248,113,113,0.12); color: #f87171; }
                .cp-cat-item.cat-sp:hover { background: rgba(248,113,113,0.08); color: #fca5a5; }

                /* ── FEED ── */
                .cp-feed-header {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 14px;
                }
                .cp-post {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px; margin-bottom: 12px; overflow: hidden;
                    transition: border-color .2s, box-shadow .2s;
                }
                .cp-post:hover {
                    border-color: rgba(139,92,246,.22);
                    box-shadow: 0 4px 24px rgba(0,0,0,.18);
                }
                .cp-post-body { padding: 20px 22px; cursor: pointer; }
                .cp-post-header {
                    display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
                }
                .cp-avatar {
                    width: 32px; height: 32px; border-radius: 50%; overflow: hidden;
                    background: var(--bg-secondary); flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 12px; font-weight: 800; color: var(--text-subtle);
                }
                .cp-post-badges {
                    display: flex; align-items: center; gap: 5px; margin-left: auto;
                }
                .cp-badge {
                    font-size: 10px; font-weight: 700; padding: 2px 7px;
                    border-radius: 5px;
                }
                .cp-post-title {
                    font-size: 16px; font-weight: 800; color: var(--text-primary);
                    margin: 0 0 8px; line-height: 1.4;
                }
                .cp-post-content {
                    font-size: 13.5px; color: var(--text-subtle); line-height: 1.7; margin: 0;
                }
                .cp-post-tags {
                    display: flex; gap: 5px; flex-wrap: wrap; margin-top: 11px;
                }
                .cp-tag-chip {
                    font-size: 11px; font-weight: 700; color: #8b5cf6;
                    background: rgba(139,92,246,.08); padding: 2px 8px;
                    border-radius: 5px; cursor: pointer; transition: background .15s;
                }
                .cp-tag-chip:hover { background: rgba(139,92,246,.18); }
                .cp-post-footer {
                    display: flex; align-items: center; gap: 12px;
                    padding: 10px 22px; border-top: 1px solid var(--border-faint);
                }
                .cp-action-btn {
                    display: flex; align-items: center; gap: 5px; font-size: 12px;
                    color: var(--text-faint); background: none; border: none;
                    cursor: pointer; padding: 4px 8px; border-radius: 7px;
                    font-family: inherit; transition: all .15s;
                }
                .cp-action-btn:hover { background: var(--bg-hover); color: var(--text-muted); }
                .cp-action-btn.active { color: #8b5cf6; }
                .spoiler-blur { filter: blur(5px); user-select: none; }

                /* ── COMMENTS ── */
                .cp-comments {
                    border-top: 1px solid var(--border-subtle);
                    background: var(--bg-secondary);
                    animation: expandDown .2s ease;
                }
                .cp-comment-item {
                    display: flex; gap: 10px; padding: 13px 22px;
                    border-bottom: 1px solid var(--border-faint);
                }
                .cp-comment-item:last-child { border-bottom: none; }
                .cp-comment-avatar {
                    width: 28px; height: 28px; border-radius: 50%; overflow: hidden;
                    background: var(--bg-card); flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px; font-weight: 800; color: var(--text-subtle);
                }
                .cp-input-wrap {
                    display: flex; gap: 8px; padding: 12px 22px;
                    align-items: center; border-top: 1px solid var(--border-faint);
                }
                .cp-comment-input {
                    flex: 1; background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 10px; padding: 9px 12px; font-size: 13px;
                    color: var(--text-primary); outline: none; font-family: inherit;
                    line-height: 1.5; transition: border-color .2s; resize: none;
                }
                .cp-comment-input:focus { border-color: rgba(139,92,246,.5); }
                .cp-comment-input::placeholder { color: var(--text-faint); }

                /* ── RIGHT SIDEBAR ── */
                .cp-sidebar-card {
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    border-radius: 16px; padding: 18px 20px; margin-bottom: 14px;
                    overflow: hidden;
                }
                .cp-sidebar-title {
                    font-size: 11px; font-weight: 800; color: var(--text-faint);
                    letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 14px;
                }
                /* 유저 카드 stats */
                .cp-user-stats {
                    display: grid; grid-template-columns: repeat(3, 1fr);
                    gap: 1px; background: var(--border-faint);
                    border-radius: 10px; overflow: hidden; margin-top: 14px;
                }
                .cp-stat-cell {
                    background: var(--bg-secondary);
                    padding: 10px 6px; text-align: center;
                }
                .cp-stat-num {
                    font-size: 17px; font-weight: 900; color: var(--text-primary);
                    display: block; line-height: 1;
                }
                .cp-stat-label {
                    font-size: 10px; color: var(--text-faint); margin-top: 3px; display: block;
                }
                /* 인기 태그 */
                .cp-hot-row {
                    display: flex; align-items: center; gap: 9px; padding: 7px 0;
                    border-bottom: 1px solid var(--border-faint); cursor: pointer;
                    transition: all .15s;
                }
                .cp-hot-row:last-child { border-bottom: none; }
                .cp-hot-row:hover .cp-hot-label { color: #a78bfa; }
                .cp-hot-thumb {
                    width: 28px; height: 28px; border-radius: 7px;
                    object-fit: cover; flex-shrink: 0; background: var(--bg-secondary);
                }
                .cp-hot-label {
                    font-size: 13px; font-weight: 600; color: var(--text-muted);
                    flex: 1; min-width: 0; overflow: hidden;
                    text-overflow: ellipsis; white-space: nowrap; transition: color .15s;
                }
                /* write btn */
                .cp-write-btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    padding: 9px 18px; background: #7c3aed;
                    border: none; border-radius: 9px; color: #fff;
                    font-size: 12px; font-weight: 700; cursor: pointer;
                    font-family: inherit; transition: all .2s; white-space: nowrap;
                }
                .cp-write-btn:hover {
                    background: #6d28d9;
                    box-shadow: 0 4px 16px rgba(124,58,237,.35);
                }

                /* ── MODAL ── */
                .cp-modal-bg {
                    position: fixed; inset: 0; background: rgba(0,0,0,.8);
                    z-index: 9999; display: flex; align-items: center;
                    justify-content: center; padding: 20px; backdrop-filter: blur(6px);
                }
                .cp-modal {
                    background: var(--bg-card); border-radius: 20px;
                    width: 100%; max-width: 580px;
                    border: 1px solid var(--border); overflow: hidden;
                    animation: fadeUp .2s ease;
                }
                .cp-field {
                    width: 100%; background: var(--bg-secondary);
                    border: 1px solid var(--border); border-radius: 10px;
                    padding: 10px 14px; font-size: 14px; color: var(--text-primary);
                    outline: none; font-family: inherit; box-sizing: border-box;
                    transition: border-color .2s;
                }
                .cp-field:focus { border-color: rgba(139,92,246,.5); }
                .cp-field::placeholder { color: var(--text-faint); }
            `}</style>

            {/* ── 히어로 ── */}
            <div className="cp-hero">
                <div className="cp-hero-orb cp-hero-orb1" />
                <div className="cp-hero-orb cp-hero-orb2" />
                <div className="cp-hero-orb cp-hero-orb3" />
                <div className="cp-hero-content">
                    <div className="cp-hero-eyebrow">
                        <span className="cp-hero-dot" />
                        Community of Laftel
                    </div>
                    <h1 className="cp-hero-title">덕후들의 광장</h1>
                    <p className="cp-hero-sub">애니라면 뭐든 ! 분석, 감상, 추천, 스포일러까지</p>
                </div>
            </div>

            {/* ── 태그 바 (히어로 바로 아래) ── */}
            <div className="cp-tagbar">
                <button className="cp-tagbar-more" onClick={() => setShowTagDropdown(v => !v)}>
                    애니 더 찾아보기
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d={showTagDropdown ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
                    </svg>
                </button>
                <button
                    className={`cp-tagbar-all${!activeTag ? ' active' : ''}`}
                    onClick={() => setActiveTag(null)}>전체</button>
                {HOT_TAGS_BASE.map(({ tag }) => {
                    const img = tagImgs[tag]
                    return (
                        <button
                            key={tag}
                            className={`cp-tagbar-item${activeTag === tag ? ' active' : ''}`}
                            onClick={() => setActiveTag(tag === activeTag ? null : tag)}>
                            {img && <img src={img} alt={tag} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                            {tag}
                        </button>
                    )
                })}
                <button
                    className={`cp-tagbar-all${activeTag === '#기타' ? ' active' : ''}`}
                    onClick={() => setActiveTag(activeTag === '#기타' ? null : '#기타')}>#기타</button>
            </div>

            <div className="cp-outer">
                {/* ── 검색 ── */}
                <div className="cp-search-wrap">
                    <svg className="cp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className="cp-search-input"
                        placeholder="제목, 내용, 태그 검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="cp-search-clear" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>

                {/* ── 3열 레이아웃 ── */}
                <div className="cp-layout">

                    {/* ── 왼쪽 레일: 정렬 + 카테고리 ── */}
                    <div className="cp-left-rail">
                        <div className="cp-sort-group">
                            {(['hot', 'latest'] as SortType[]).map(v => (
                                <button
                                    key={v}
                                    className={`cp-sort-btn${sort === v ? ' active' : ''}`}
                                    onClick={() => setSort(v)}>
                                    {v === 'hot' ? '인기순' : '최신순'}
                                </button>
                            ))}
                        </div>
                        <div className="cp-cat-group">
                            {[
                                { label: '분석', value: '분석' },
                                { label: '감상평', value: '감상평' },
                                { label: '추천해요', value: '추천' },
                                { label: '스포일러', value: '스포일러', sp: true },
                            ].map(({ label, value, sp }) => (
                                <button
                                    key={value}
                                    className={`cp-cat-item${sp ? ' cat-sp' : ''}${activeCategory === value ? ' active' : ''}`}
                                    onClick={() => setActiveCategory(activeCategory === value ? null : value)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── 피드 ── */}
                    <div>
                        <div className="cp-feed-header">
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                                게시글 총 {filtered.length.toLocaleString()}+
                            </span>
                            <button
                                className="cp-write-btn"
                                onClick={() => { if (!user) { router.push('/login'); return }; setShowWrite(true) }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                글쓰기
                            </button>
                        </div>

                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-faint)', fontSize: 14 }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                                {searchQuery ? `"${searchQuery}"에 대한 게시글이 없어요` : '게시글이 없어요'}
                            </div>
                        )}

                        {filtered.map(post => {
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
                                                {post.authorProfileImg
                                                    ? <img src={post.authorProfileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                    : post.authorNickname[0]
                                                }
                                            </div>
                                            <UserProfilePopover
                                                authorId={post.authorId}
                                                authorNickname={post.authorNickname}
                                                authorProfileImg={post.authorProfileImg}
                                                authorWatched={post.authorWatched ?? 0}>
                                                {post.authorNickname}
                                            </UserProfilePopover>
                                            <GradeBadge watched={post.authorWatched ?? 0} size="sm" showName={true} />
                                            <div className="cp-post-badges">
                                                {catStyle && post.category && (
                                                    <span className="cp-badge" style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                                                        {post.category}
                                                    </span>
                                                )}
                                                {post.isSpoiler && (
                                                    <span className="cp-badge" style={{ background: 'rgba(248,113,113,.1)', color: '#f87171', border: '1px solid rgba(248,113,113,.25)' }}>
                                                        스포
                                                    </span>
                                                )}
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
                                                        onClick={e => { e.stopPropagation(); setActiveTag(tag) }}>{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {post.images && post.images.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginTop: 12 }}
                                                onClick={e => e.stopPropagation()}>
                                                {post.images.map((url, i) => (
                                                    <div key={i} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: post.images!.length === 1 ? '16/9' : '1/1', background: 'var(--bg-secondary)', cursor: 'zoom-in' }}
                                                        onClick={() => window.open(url, '_blank')}>
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
                                            {isExpanded
                                                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>
                                                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                            }
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="cp-comments">
                                            {commentLoading[post.id] ? (
                                                <div style={{ padding: 20, textAlign: 'center' }}>
                                                    <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto' }} />
                                                </div>
                                            ) : comments.length === 0 ? (
                                                <p style={{ padding: '14px 22px', fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>첫 댓글을 남겨보세요!</p>
                                            ) : comments.map(c => (
                                                <div key={c.id} className="cp-comment-item">
                                                    <div className="cp-comment-avatar">
                                                        {c.authorProfileImg
                                                            ? <img src={c.authorProfileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                            : c.authorNickname[0]
                                                        }
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                            <UserProfilePopover
                                                                authorId={c.authorId || 'mock'}
                                                                authorNickname={c.authorNickname}
                                                                authorProfileImg={c.authorProfileImg}
                                                                authorWatched={c.authorWatched ?? 0}>
                                                                {c.authorNickname}
                                                            </UserProfilePopover>
                                                            <GradeBadge watched={c.authorWatched ?? 0} size="sm" showName={true} />
                                                            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>{formatTime(c.createdAt)}</span>
                                                        </div>
                                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{c.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="cp-input-wrap">
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#8b5cf6' }}>
                                                    {user?.photoURL
                                                        ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                        : user?.name?.[0] || '?'
                                                    }
                                                </div>
                                                <input
                                                    className="cp-comment-input"
                                                    placeholder={user ? '댓글을 남겨보세요 (Enter로 등록)' : '로그인 후 댓글을 달 수 있어요'}
                                                    value={commentInput[post.id] || ''}
                                                    onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, !!post.isMock) } }}
                                                    disabled={!user}
                                                />
                                                <button
                                                    onClick={() => handleComment(post.id, !!post.isMock)}
                                                    disabled={!commentInput[post.id]?.trim() || !user}
                                                    style={{ padding: '0 16px', height: 36, background: commentInput[post.id]?.trim() && user ? '#7c3aed' : 'var(--bg-hover)', border: 'none', borderRadius: 9, color: commentInput[post.id]?.trim() && user ? '#fff' : 'var(--text-faint)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    등록
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* ── 오른쪽 사이드바 ── */}
                    <aside className="cp-right-sidebar">
                        {/* 유저 프로필 카드 */}
                        {user ? (
                            <div className="cp-sidebar-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                                        {user.photoURL
                                            ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 14 }}>{user.name?.[0]}</div>
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                                        <GradeBadge watched={myWatched} size="sm" showName={true} />
                                    </div>
                                    <button className="cp-write-btn" onClick={() => setShowWrite(true)}>글쓰기</button>
                                </div>
                                <div className="cp-user-stats">
                                    <div className="cp-stat-cell">
                                        <span className="cp-stat-num">{myPostCount}</span>
                                        <span className="cp-stat-label">작성한 글</span>
                                    </div>
                                    <div className="cp-stat-cell">
                                        <span className="cp-stat-num">{myCommentCount}</span>
                                        <span className="cp-stat-label">작성한 댓글</span>
                                    </div>
                                    <div className="cp-stat-cell">
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

                        {/* 인기 태그 */}
                        <div className="cp-sidebar-card">
                            <p className="cp-sidebar-title">#인기태그</p>
                            {HOT_TAGS_BASE.map(({ tag }) => {
                                const img = tagImgs[tag]
                                return (
                                    <div key={tag} className="cp-hot-row" onClick={() => setActiveTag(tag === activeTag ? null : tag)}>
                                        {img
                                            ? <img className="cp-hot-thumb" src={img} alt={tag} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                                            : <div className="cp-hot-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🎌</div>
                                        }
                                        <span className="cp-hot-label" style={{ color: activeTag === tag ? '#a78bfa' : undefined }}>{tag}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{tagCounts[tag] ?? 0}개</span>
                                    </div>
                                )
                            })}
                            <div className="cp-hot-row" onClick={() => setActiveTag('#기타')}>
                                <div className="cp-hot-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 7 }}>—</div>
                                <span className="cp-hot-label" style={{ color: activeTag === '#기타' ? '#a78bfa' : undefined }}>#기타</span>
                                <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{otherCount}개</span>
                            </div>
                        </div>

                        {/* 커뮤니티 규칙 */}
                        <div className="cp-sidebar-card">
                            <p className="cp-sidebar-title">커뮤니티 규칙</p>
                            {['스포일러는 반드시 태그 달기', '서로 존중하는 덕후 문화', '도배·광고 금지', '작품 비하 발언 금지'].map((rule, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', flexShrink: 0, background: 'rgba(124,58,237,.12)', borderRadius: 4, padding: '1px 5px', marginTop: 1 }}>{i + 1}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5 }}>{rule}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>

            {/* ── 글쓰기 모달 ── */}
            {showWrite && (
                <div className="cp-modal-bg" onClick={() => setShowWrite(false)}>
                    <div className="cp-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>새 글 작성</h2>
                            <button onClick={() => setShowWrite(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input className="cp-field" placeholder="제목" value={writeTitle} onChange={e => setWriteTitle(e.target.value)} maxLength={100} />
                            <textarea className="cp-field" placeholder="덕후답게 마음껏 써보세요!" value={writeContent} onChange={e => setWriteContent(e.target.value)} rows={5} maxLength={2000} style={{ resize: 'none', lineHeight: 1.7 }} />
                            <input className="cp-field" placeholder="태그 (예: #진격의거인 #감상)" value={writeTags} onChange={e => setWriteTags(e.target.value)} />
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['분석', '감상평', '추천', '기타'].map(cat => (
                                    <button key={cat} onClick={() => setWriteCategory(writeCategory === cat ? '' : cat)}
                                        style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: writeCategory === cat ? 'rgba(124,58,237,.15)' : 'var(--bg-secondary)', border: `1px solid ${writeCategory === cat ? 'rgba(124,58,237,.5)' : 'var(--border)'}`, color: writeCategory === cat ? '#a78bfa' : 'var(--text-subtle)' }}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            {writeImagePreviews.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {writeImagePreviews.map((src, i) => (
                                        <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                                            <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
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
                                    <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${writeSpoiler ? '#7c3aed' : 'var(--border)'}`, background: writeSpoiler ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                        {writeSpoiler && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                    </div>
                                    <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>스포일러 포함</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowWrite(false)} style={{ padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 9, background: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                                    <button onClick={handlePost} disabled={!writeTitle.trim() || !writeContent.trim() || posting || uploadingImages}
                                        style={{ padding: '9px 20px', background: writeTitle.trim() && writeContent.trim() ? '#7c3aed' : 'var(--bg-hover)', border: 'none', borderRadius: 9, color: writeTitle.trim() && writeContent.trim() ? '#fff' : 'var(--text-faint)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
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