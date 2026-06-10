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

// 태그별 TMDB ID 매핑
const TAG_TMDB_IDS: Record<string, number> = {
    '#진격의거인': 1429,
    '#귀멸의칼날': 45576,
    '#주술회전': 95479,
    '#나루토': 46260,
    '#원피스': 37854,
    '#바이올렛에버가든': 79006,
    '#체인소맨': 114410,
    '#스파이패밀리': 130392,
}

const HOT_TAGS_BASE = [
    { tag: '#진격의거인', base: 284 },
    { tag: '#귀멸의칼날', base: 193 },
    { tag: '#주술회전', base: 421 },
    { tag: '#나루토', base: 156 },
    { tag: '#원피스', base: 89 },
    { tag: '#바이올렛에버가든', base: 312 },
    { tag: '#체인소맨', base: 67 },
    { tag: '#스파이패밀리', base: 44 },
]

// 태그별 목 게시글 (각 5개+)
const MOCK_POSTS = [
    // ── 진격의거인 ──
    { id: 'm1', authorId: 'mock', authorNickname: '진격팬123', authorProfileImg: '', authorWatched: 42, title: '진격의 거인 파이널 마지막화 보고 멘탈 탈출...', content: '진짜 이게 뭐야... 엔딩 보고 30분 동안 멍 때렸음. 엘런 선택 어떻게 생각함? 나는 결국 그게 최선이었다고 보는데 의견들이 너무 갈리네', tags: ['#진격의거인', '#결말스포'], isSpoiler: true, likes: 284, commentCount: 2, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 'm2', authorId: 'mock', authorNickname: '에렌옹호론자', authorProfileImg: '', authorWatched: 60, title: '엘런이 틀리지 않은 이유 — 논리적 분석', content: '많은 사람들이 엘런을 악인으로 보지만 그의 선택에는 일관된 논리가 있음. 자유를 위해 모든 걸 희생한다는 신념이 처음부터 끝까지 유지됐다', tags: ['#진격의거인', '#분석'], isSpoiler: false, likes: 178, commentCount: 14, createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: 'm3', authorId: 'mock', authorNickname: '리바이병장팬', authorProfileImg: '', authorWatched: 38, title: '리바이 병장이 역대급 캐릭터인 이유', content: '단순히 강한 게 아니라 인간적인 면이 계속 쌓여서 감동적이었음. 4기에서 눈 하나 잃은 장면 진짜 심장 쿵', tags: ['#진격의거인'], isSpoiler: false, likes: 241, commentCount: 31, createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
    { id: 'm4', authorId: 'mock', authorNickname: 'WIT스튜디오러버', authorProfileImg: '', authorWatched: 29, title: '1기 작화가 그리운 이유 — WIT vs MAPPA 비교', content: 'MAPPA도 훌륭하지만 WIT의 손으로 그린 느낌의 작화가 진격에는 더 어울렸다고 봄. 1기 104기 훈련병단 오프닝 지금도 닭살', tags: ['#진격의거인', '#작화덕'], isSpoiler: false, likes: 133, commentCount: 22, createdAt: new Date(Date.now() - 3600000 * 15).toISOString() },
    { id: 'm5', authorId: 'mock', authorNickname: 'OST수집가', authorProfileImg: '', authorWatched: 51, title: '진격의 거인 OST 추천 TOP5', content: 'Sawano Hiroyuki의 음악이 진격의 세계관을 완성했다고 해도 과언이 아님. 특히 YouSeeBIGGIRL/T:T 들을 때마다 소름', tags: ['#진격의거인', '#OST'], isSpoiler: false, likes: 196, commentCount: 18, createdAt: new Date(Date.now() - 3600000 * 20).toISOString() },

    // ── 귀멸의칼날 ──
    { id: 'm6', authorId: 'mock', authorNickname: '작화탐구자', authorProfileImg: '', authorWatched: 15, title: '귀멸 무한열차 작화 프레임 분석해봤음', content: '오프닝 없이 Ufotable이 어떻게 이걸 뽑아냈는지... 3분 12초부터 카메라무빙 진짜 미침. 원화가가 누군지 찾아봤더니 역시나', tags: ['#귀멸의칼날', '#작화덕'], isSpoiler: false, likes: 193, commentCount: 31, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: 'm7', authorId: 'mock', authorNickname: '렌고쿠팬', authorProfileImg: '', authorWatched: 22, title: '렌고쿠가 왜 역대급 캐릭터인지 설명해줌', content: '등장시간이 길지 않은데도 이렇게 임팩트를 남기는 캐릭터가 또 있을까. 무한열차 마지막 장면은 10번 봐도 울게 됨', tags: ['#귀멸의칼날'], isSpoiler: true, likes: 267, commentCount: 45, createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 'm8', authorId: 'mock', authorNickname: '도게자', authorProfileImg: '', authorWatched: 9, title: '귀멸 입문 순서 완벽 가이드', content: '극장판 먼저 봐야 하냐 2기부터 봐야 하냐 항상 헷갈리는 사람들을 위해 정리해봤음. 결론은 1기 → 극장판 → 2기 순서', tags: ['#귀멸의칼날', '#입문추천'], isSpoiler: false, likes: 89, commentCount: 37, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: 'm9', authorId: 'mock', authorNickname: '네즈코수호대', authorProfileImg: '', authorWatched: 17, title: '네즈코 성장 서사가 진짜 잘 쓰여진 이유', content: '처음엔 그냥 보호받는 캐릭터인 줄 알았는데 시즌 진행할수록 자기만의 서사가 생기면서 진짜 주인공급 임팩트', tags: ['#귀멸의칼날'], isSpoiler: false, likes: 154, commentCount: 19, createdAt: new Date(Date.now() - 3600000 * 18).toISOString() },
    { id: 'm10', authorId: 'mock', authorNickname: 'BGM덕후', authorProfileImg: '', authorWatched: 33, title: '귀멸 OST 유이가오카 들어봤음?', content: 'Go!가 유명하지만 개인적으로 유이가오카가 제일 좋음. 탄지로 누나 장면에서 나올 때 진짜 눈물 차오름', tags: ['#귀멸의칼날', '#OST'], isSpoiler: false, likes: 211, commentCount: 27, createdAt: new Date(Date.now() - 3600000 * 22).toISOString() },

    // ── 주술회전 ──
    { id: 'm11', authorId: 'mock', authorNickname: '오타쿠9년차', authorProfileImg: '', authorWatched: 67, title: '주술회전 vs 귀멸 vs 진격 — 역대급 3대장 순위', content: '작화/스토리/연출/BGM 4개 기준으로 직접 분석해봤음. 각각 장단점이 명확한데 개인적으로는 연출 면에서 압도적인 게 있더라', tags: ['#주술회전', '#귀멸의칼날', '#진격의거인', '#논쟁'], isSpoiler: false, likes: 421, commentCount: 83, createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 'm12', authorId: 'mock', authorNickname: '고조사토루빠', authorProfileImg: '', authorWatched: 44, title: '고조 선생 없는 주술회전 어떻게 볼 거임', content: '고조 없이도 이야기가 굴러가는 게 신기함. 근데 확실히 긴장감이 다른 방향으로 흘러가서 나름 재밌는 것 같기도', tags: ['#주술회전'], isSpoiler: true, likes: 298, commentCount: 61, createdAt: new Date(Date.now() - 3600000 * 30).toISOString() },
    { id: 'm13', authorId: 'mock', authorNickname: 'MAPPA신도', authorProfileImg: '', authorWatched: 55, title: '주술 2기 작화가 역대급인 진짜 이유', content: '시부야 사변 아크 중간에 작화 퀄리티가 극장판급으로 올라갔음. 특히 이타도리 대 마화노 싸움은 진짜 입 벌어짐', tags: ['#주술회전', '#작화덕'], isSpoiler: false, likes: 334, commentCount: 42, createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
    { id: 'm14', authorId: 'mock', authorNickname: '노바라진영', authorProfileImg: '', authorWatched: 28, title: '카우게이 노바라가 주인공이어야 한다', content: '솔직히 노바라가 제일 현실적이고 공감 가는 캐릭터임. 이타도리도 좋지만 노바라 시점으로 전개됐으면 더 재밌었을 것 같음', tags: ['#주술회전'], isSpoiler: false, likes: 177, commentCount: 34, createdAt: new Date(Date.now() - 3600000 * 40).toISOString() },
    { id: 'm15', authorId: 'mock', authorNickname: '주술뉴비', authorProfileImg: '', authorWatched: 5, title: '주술회전 정주행 완료! 후기 남김', content: '귀멸 보다가 추천받아서 봤는데 진짜 미쳤다. 능력 시스템이 독특하고 캐릭터들 하나하나 개성이 살아있음. 2기 바로 들어감', tags: ['#주술회전', '#입문추천'], isSpoiler: false, likes: 98, commentCount: 22, createdAt: new Date(Date.now() - 3600000 * 44).toISOString() },

    // ── 기타 ──
    { id: 'm16', authorId: 'mock', authorNickname: '소년점프러버', authorProfileImg: '', authorWatched: 88, title: '이번 시즌 최고 애니 뭐임? 내 픽 공유', content: '다들 이번 분기 뭐 보고 있음? 개인적으로 올해 본 것 중에 최고가 될 것 같은 작품 발견함. 스토리 구성이 진짜 탄탄하고 작화도 심상치 않음', tags: ['#2026봄애니', '#추천'], isSpoiler: false, likes: 156, commentCount: 62, createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 'm17', authorId: 'mock', authorNickname: '덕후입문3일차', authorProfileImg: '', authorWatched: 3, title: '애니 입문자인데 뭐부터 봐야 함??', content: '친구 추천으로 귀멸 보고 빠졌는데 다음에 뭐 봐야 할지 모르겠음. 비슷한 분위기거나 더 좋은 거 추천해줘요 장르 안 가림', tags: ['#입문추천'], isSpoiler: false, likes: 89, commentCount: 104, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: 'm18', authorId: 'mock', authorNickname: '나만아는BGM', authorProfileImg: '', authorWatched: 30, title: '이 애니 OST 듣다가 눈물 흘린 사람 나만?', content: '바이올렛 에버가든 OST 출퇴근길에 듣다가 지하철에서 눈물 참은 사람 손 ✋ 진짜 반칙임. 어떻게 음악만으로 이런 감정을 만들어내지', tags: ['#바이올렛에버가든', '#OST', '#눈물주의'], isSpoiler: false, likes: 312, commentCount: 58, createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
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
    isSpoiler: boolean; likes: number; commentCount: number; createdAt: string; isMock?: boolean; images?: string[]
}

function formatTime(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return '방금'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function CommunityPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [realPosts, setRealPosts] = useState<Post[]>([])
    const [sort, setSort] = useState<SortType>('latest')
    const [activeTag, setActiveTag] = useState<string | null>(null)
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

    // TMDB 이미지 동적 로딩
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
        if (postId.startsWith('m')) {
            setCommentsMap(prev => ({ ...prev, [postId]: MOCK_COMMENTS[postId] || [] }))
            return
        }
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
        if (valid.length + writeImages.length > 4) {
            alert('이미지는 최대 4장까지 첨부할 수 있어요.')
            return
        }
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

            // 이미지 업로드
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
                tags, isSpoiler: writeSpoiler, likes: 0, commentCount: 0,
                images: imageUrls,
                createdAt: new Date().toISOString(),
            })
            setWriteTitle(''); setWriteContent(''); setWriteTags(''); setWriteSpoiler(false)
            setWriteImages([]); setWriteImagePreviews([]); setShowWrite(false)
        } catch (e) { console.error(e) }
        finally { setPosting(false) }
    }

    const allPosts: Post[] = [...realPosts, ...MOCK_POSTS.map(m => ({ ...m, isMock: true }))]
    const knownTags = new Set(HOT_TAGS_BASE.map(t => t.tag))

    const filtered = allPosts
        .filter(p => {
            if (!activeTag) return true
            if (activeTag === '#기타') return !p.tags.some(t => knownTags.has(t))
            return p.tags.includes(activeTag)
        })
        .sort((a, b) => sort === 'hot'
            ? (b.likes + (commentsMap[b.id]?.length ?? b.commentCount) * 2) - (a.likes + (commentsMap[a.id]?.length ?? a.commentCount) * 2)
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

    const otherCount = allPosts.filter(p => !p.tags.some(t => knownTags.has(t))).length

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 72 }}>
            <style>{`
                .comm-outer { width: 90%; max-width: 1600px; margin: 0 auto; }
                .comm-hero { background: linear-gradient(135deg, rgba(108,99,255,.15), rgba(167,139,250,.08)); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
                .comm-hero-title { font-size: 24px; font-weight: 900; color: var(--text-primary); margin: 0 0 5px; letter-spacing: -0.5px; }
                .comm-hero-sub { font-size: 13px; color: var(--text-subtle); margin: 0; }
                .comm-write-btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 20px; background: #6c63ff; border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .2s; white-space: nowrap; font-family: inherit; }
                .comm-write-btn:hover { opacity: .85; }

                /* 태그 스크롤 */
                .comm-tags { display: flex; gap: 8px; margin-bottom: 18px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
                .comm-tags::-webkit-scrollbar { display: none; }
                .comm-tag { flex-shrink: 0; display: flex; align-items: center; gap: 6px; padding: 5px 12px 5px 5px; border-radius: 22px; font-size: 12px; font-weight: 700; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-subtle); cursor: pointer; transition: all .15s; font-family: inherit; }
                .comm-tag img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
                .comm-tag:hover { border-color: #6c63ff80; color: #6c63ff; }
                .comm-tag.active { background: #6c63ff; border-color: #6c63ff; color: #fff; }
                .comm-tag-plain { flex-shrink: 0; padding: 5px 12px; border-radius: 22px; font-size: 12px; font-weight: 700; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-subtle); cursor: pointer; transition: all .15s; font-family: inherit; }
                .comm-tag-plain:hover { border-color: #6c63ff80; color: #6c63ff; }
                .comm-tag-plain.active { background: #6c63ff; border-color: #6c63ff; color: #fff; }

                /* 그리드 */
                .comm-grid { display: grid; grid-template-columns: 1fr 268px; gap: 28px; align-items: start; }
                @media (max-width: 900px) { .comm-grid { grid-template-columns: 1fr; } .comm-sidebar { display: none; } }

                .comm-sort { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
                .comm-sort-btn { padding: 5px 13px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit; }

                /* 포스트 */
                .comm-post { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; margin-bottom: 10px; overflow: hidden; transition: border-color .2s; }
                .comm-post:hover { border-color: rgba(108,99,255,.25); }
                .comm-post-body { padding: 18px 20px; cursor: pointer; }
                .comm-post-header { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
                .comm-post-avatar { width: 30px; height: 30px; border-radius: 50%; overflow: hidden; background: var(--bg-secondary); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--text-subtle); }
                .comm-post-title { font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px; line-height: 1.4; }
                .comm-post-content { font-size: 13px; color: var(--text-subtle); line-height: 1.65; margin: 0; }
                .comm-post-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 10px; }
                .comm-post-tag { font-size: 11px; font-weight: 700; color: #6c63ff; background: rgba(108,99,255,.1); padding: 2px 7px; border-radius: 5px; cursor: pointer; }
                .comm-post-footer { display: flex; align-items: center; gap: 14px; padding: 10px 20px; border-top: 1px solid var(--border-faint); }
                .comm-action-btn { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-faint); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; font-family: inherit; transition: all .15s; }
                .comm-action-btn:hover { background: var(--bg-hover); color: var(--text-muted); }
                .comm-action-btn.active { color: #6c63ff; }
                .spoiler-blur { filter: blur(5px); user-select: none; }

                /* 댓글 */
                .comm-comments { border-top: 1px solid var(--border-subtle); background: var(--bg-secondary); animation: expandDown .2s ease; }
                @keyframes expandDown { from { opacity:0 } to { opacity:1 } }
                .comm-comment-item { display: flex; gap: 10px; padding: 12px 20px; border-bottom: 1px solid var(--border-faint); }
                .comm-comment-item:last-child { border-bottom: none; }
                .comm-comment-avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: var(--bg-card); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--text-subtle); }
                .comm-input-wrap { display: flex; gap: 8px; padding: 12px 20px; align-items: center; border-top: 1px solid var(--border-faint); }
                .comm-comment-input { flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; font-size: 13px; color: var(--text-primary); outline: none; font-family: inherit; line-height: 1.5; transition: border-color .2s; resize: none; }
                .comm-comment-input:focus { border-color: rgba(108,99,255,.5); }
                .comm-comment-input::placeholder { color: var(--text-faint); }

                /* 모달 */
                .comm-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .comm-modal { background: var(--bg-card); border-radius: 20px; width: 100%; max-width: 580px; border: 1px solid var(--border); overflow: hidden; animation: fadeUp .2s ease; }
                @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
                .comm-field { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 14px; color: var(--text-primary); outline: none; font-family: inherit; box-sizing: border-box; transition: border-color .2s; }
                .comm-field:focus { border-color: rgba(108,99,255,.5); }
                .comm-field::placeholder { color: var(--text-faint); }

                /* 사이드바 */
                .comm-sidebar-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; }
                .comm-sidebar-title { font-size: 13px; font-weight: 800; color: var(--text-primary); margin: 0 0 12px; }
                .comm-hot-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border-faint); cursor: pointer; transition: color .15s; }
                .comm-hot-row:last-child { border-bottom: none; }
                .comm-hot-row:hover .comm-hot-label { color: #6c63ff; }
                .comm-hot-thumb { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: var(--bg-secondary); }
                .comm-hot-label { font-size: 13px; font-weight: 600; color: var(--text-muted); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color .15s; }
            `}</style>

            <div className="comm-outer">
                {/* 히어로 */}
                <div className="comm-hero">
                    <div>
                        <h1 className="comm-hero-title">💬 덕후들의 광장</h1>
                        <p className="comm-hero-sub">애니 얘기라면 뭐든 — 분석, 감상, 추천, 스포일러까지</p>
                    </div>
                    <button className="comm-write-btn" onClick={() => { if (!user) { router.push('/login'); return }; setShowWrite(true) }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                        글쓰기
                    </button>
                </div>

                {/* 태그 필터 (썸네일 포함) */}
                <div className="comm-tags">
                    <button className={`comm-tag-plain${!activeTag ? ' active' : ''}`} onClick={() => setActiveTag(null)}>전체</button>
                    {HOT_TAGS_BASE.map(({ tag }) => {
                        const img = tagImgs[tag]
                        return (
                            <button key={tag} className={`comm-tag${activeTag === tag ? ' active' : ''}`}
                                onClick={() => setActiveTag(tag === activeTag ? null : tag)}>
                                {img && <img src={img} alt={tag} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                                {tag}
                            </button>
                        )
                    })}
                    <button className={`comm-tag-plain${activeTag === '#기타' ? ' active' : ''}`}
                        onClick={() => setActiveTag(activeTag === '#기타' ? null : '#기타')}>#기타</button>
                </div>

                <div className="comm-grid">
                    {/* ── 피드 ── */}
                    <div>
                        <div className="comm-sort">
                            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>게시글 {filtered.length}개</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {([['latest', '최신순'], ['hot', '인기순']] as [SortType, string][]).map(([v, l]) => (
                                    <button key={v} className="comm-sort-btn"
                                        style={{ background: sort === v ? '#6c63ff' : 'var(--bg-card)', color: sort === v ? '#fff' : 'var(--text-subtle)', border: `1px solid ${sort === v ? '#6c63ff' : 'var(--border)'}` }}
                                        onClick={() => setSort(v)}>{l}</button>
                                ))}
                            </div>
                        </div>

                        {filtered.map(post => {
                            const isExpanded = expandedId === post.id
                            const comments = commentsMap[post.id] || []
                            const isLiked = likedPostIds.has(post.id)
                            const isSpoilerHidden = post.isSpoiler && !spoilerVisible.has(post.id)
                            const commentCount = comments.length || post.commentCount

                            return (
                                <div key={post.id} className="comm-post">
                                    <div className="comm-post-body" onClick={() => handleCardClick(post.id)}>
                                        <div className="comm-post-header">
                                            <div className="comm-post-avatar">
                                                {post.authorProfileImg
                                                    ? <img src={post.authorProfileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                    : post.authorNickname[0]
                                                }
                                            </div>
                                            <UserProfilePopover
                                                authorId={post.authorId}
                                                authorNickname={post.authorNickname}
                                                authorProfileImg={post.authorProfileImg}
                                                authorWatched={post.authorWatched ?? 0}
                                            >
                                                {post.authorNickname}
                                            </UserProfilePopover>
                                            <GradeBadge watched={post.authorWatched ?? 0} size="sm" showName={true} />
                                            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>{formatTime(post.createdAt)}</span>
                                        </div>

                                        {post.isSpoiler && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 6, padding: '2px 8px', marginBottom: 8 }}>
                                                ⚠️ 스포일러
                                            </span>
                                        )}

                                        <p className="comm-post-title">{post.title}</p>

                                        <div style={{ position: 'relative' }}>
                                            <p className={`comm-post-content${isSpoilerHidden ? ' spoiler-blur' : ''}`}
                                                style={{ WebkitLineClamp: isExpanded ? undefined : 2, display: isExpanded ? 'block' : '-webkit-box', WebkitBoxOrient: 'vertical', overflow: isExpanded ? 'visible' : 'hidden' }}>
                                                {post.content}
                                            </p>
                                            {isSpoilerHidden && (
                                                <button onClick={e => { e.stopPropagation(); setSpoilerVisible(p => new Set([...p, post.id])) }}
                                                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: '#6c63ff', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    스포일러 보기
                                                </button>
                                            )}
                                        </div>

                                        {post.tags.length > 0 && (
                                            <div className="comm-post-tags">
                                                {post.tags.map(tag => (
                                                    <span key={tag} className="comm-post-tag"
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

                                    <div className="comm-post-footer">
                                        <button className={`comm-action-btn${isLiked ? ' active' : ''}`} onClick={e => handleLike(e, post)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                            </svg>
                                            {post.likes + (isLiked ? 1 : 0)}
                                        </button>
                                        <button className={`comm-action-btn${isExpanded ? ' active' : ''}`} onClick={() => handleCardClick(post.id)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                            댓글 {commentCount}
                                            {isExpanded
                                                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>
                                                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                            }
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="comm-comments">
                                            {commentLoading[post.id] ? (
                                                <div style={{ padding: 20, textAlign: 'center' }}>
                                                    <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto' }} />
                                                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                                </div>
                                            ) : comments.length === 0 ? (
                                                <p style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>첫 댓글을 남겨보세요!</p>
                                            ) : comments.map(c => (
                                                <div key={c.id} className="comm-comment-item">
                                                    <div className="comm-comment-avatar">
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
                                                                authorWatched={c.authorWatched ?? 0}
                                                            >
                                                                {c.authorNickname}
                                                            </UserProfilePopover>
                                                            <GradeBadge watched={c.authorWatched ?? 0} size="sm" showName={true} />
                                                            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>{formatTime(c.createdAt)}</span>
                                                        </div>
                                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{c.content}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* 댓글 입력 */}
                                            <div className="comm-input-wrap">
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#6c63ff' }}>
                                                    {user?.photoURL
                                                        ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                        : user?.name?.[0] || '?'
                                                    }
                                                </div>
                                                <input
                                                    className="comm-comment-input"
                                                    placeholder={user ? '댓글을 남겨보세요 (Enter로 등록)' : '로그인 후 댓글을 달 수 있어요'}
                                                    value={commentInput[post.id] || ''}
                                                    onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, !!post.isMock) } }}
                                                    disabled={!user}
                                                />
                                                <button
                                                    onClick={() => handleComment(post.id, !!post.isMock)}
                                                    disabled={!commentInput[post.id]?.trim() || !user}
                                                    style={{ padding: '0 16px', height: 36, background: commentInput[post.id]?.trim() && user ? '#6c63ff' : 'var(--bg-hover)', border: 'none', borderRadius: 9, color: commentInput[post.id]?.trim() && user ? '#fff' : 'var(--text-faint)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    등록
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* ── 사이드바 ── */}
                    <aside className="comm-sidebar">
                        {user && (
                            <div className="comm-sidebar-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                                        {user.photoURL
                                            ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6c63ff', color: '#fff', fontWeight: 800, fontSize: 13 }}>{user.name?.[0]}</div>
                                        }
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px' }}>{user.name}</p>
                                        <GradeBadge watched={myWatched} size="sm" showName={true} />
                                    </div>
                                </div>
                                <button className="comm-write-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowWrite(true)}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                    글쓰기
                                </button>
                            </div>
                        )}

                        <div className="comm-sidebar-card">
                            <p className="comm-sidebar-title">🔥 인기 태그</p>
                            {HOT_TAGS_BASE.map(({ tag }) => {
                                const img = tagImgs[tag]
                                return (
                                    <div key={tag} className="comm-hot-row" onClick={() => setActiveTag(tag === activeTag ? null : tag)}>
                                        {img
                                            ? <img className="comm-hot-thumb" src={img} alt={tag} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                                            : <div className="comm-hot-thumb" style={{ background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎌</div>
                                        }
                                        <span className="comm-hot-label" style={{ color: activeTag === tag ? '#6c63ff' : undefined }}>{tag}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{tagCounts[tag] ?? 0}개</span>
                                    </div>
                                )
                            })}
                            <div className="comm-hot-row" onClick={() => setActiveTag('#기타')}>
                                <div className="comm-hot-thumb" style={{ background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>···</div>
                                <span className="comm-hot-label" style={{ color: activeTag === '#기타' ? '#6c63ff' : undefined }}>#기타</span>
                                <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{otherCount}개</span>
                            </div>
                        </div>

                        <div className="comm-sidebar-card">
                            <p className="comm-sidebar-title">📋 커뮤니티 규칙</p>
                            {['스포일러는 반드시 태그 달기', '서로 존중하는 덕후 문화', '도배·광고 금지', '작품 비하 발언 금지'].map((rule, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6c63ff', marginTop: 1, flexShrink: 0 }}>{i + 1}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5 }}>{rule}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>

            {/* 글쓰기 모달 */}
            {showWrite && (
                <div className="comm-modal-bg" onClick={() => setShowWrite(false)}>
                    <div className="comm-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>새 글 작성</h2>
                            <button onClick={() => setShowWrite(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input className="comm-field" placeholder="제목" value={writeTitle} onChange={e => setWriteTitle(e.target.value)} maxLength={100} />
                            <textarea className="comm-field" placeholder="덕후답게 마음껏 써보세요!" value={writeContent} onChange={e => setWriteContent(e.target.value)} rows={5} maxLength={2000} style={{ resize: 'none', lineHeight: 1.7 }} />
                            <input className="comm-field" placeholder="태그 (예: #진격의거인 #감상)" value={writeTags} onChange={e => setWriteTags(e.target.value)} />

                            {/* 이미지 미리보기 */}
                            {writeImagePreviews.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {writeImagePreviews.map((src, i) => (
                                        <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                                            <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            <button onClick={() => removeImage(i)}
                                                style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {writeImages.length < 4 && (
                                        <label style={{ aspectRatio: '1/1', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 20 }}>
                                            +
                                            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
                                        </label>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setWriteSpoiler(v => !v)}>
                                    <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${writeSpoiler ? '#6c63ff' : 'var(--border)'}`, background: writeSpoiler ? '#6c63ff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                        {writeSpoiler && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                    </div>
                                    <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>스포일러 포함</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowWrite(false)} style={{ padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 9, background: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                                    <button onClick={handlePost} disabled={!writeTitle.trim() || !writeContent.trim() || posting || uploadingImages}
                                        style={{ padding: '9px 20px', background: writeTitle.trim() && writeContent.trim() ? '#6c63ff' : 'var(--bg-hover)', border: 'none', borderRadius: 9, color: writeTitle.trim() && writeContent.trim() ? '#fff' : 'var(--text-faint)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
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
