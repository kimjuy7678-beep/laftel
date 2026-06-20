'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAniStore } from '@/store/useAniStore'
import { usePreviewStore } from '@/store/usePreviewStore'
import { useFilteredAniList } from '@/hook/useFilteredAniList'
import OnboardingModal from '@/components/OnboardingModal'
import Image from 'next/image'

const GENRE_TO_TMDB: Record<string, number> = {
    action: 10759, romance: 10749, fantasy: 14, scifi: 10765,
    comedy: 35, horror: 27, sports: 10762, slice: 16,
    mystery: 9648, mecha: 10759, music: 10402, isekai: 14,
}

const GENRE_LABEL: Record<string, string> = {
    action: '액션', romance: '로맨스', fantasy: '판타지', scifi: 'SF',
    comedy: '개그', horror: '공포', sports: '스포츠', slice: '일상',
    mystery: '미스터리', mecha: '메카', music: '음악', isekai: '이세계',
}

interface Preferences { genres: string[]; moods: string[]; watchStyle: string }

interface Props {
    onNoResult?: () => void  // ✅ 추가 — 결과 없을 때 홈에서 모달 다시 열기
}

export default function PersonalRecommendSection({ onNoResult }: Props) {
    const { user } = useAuthStore()
    const { onFetchAni } = useAniStore()
    const { setPreviewId } = usePreviewStore()
    const router = useRouter()
    const [prefs, setPrefs] = useState<Preferences | null>(null)
    const [ready, setReady] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [noResultCalled, setNoResultCalled] = useState(false)  // ✅ 중복 호출 방지
    const aniList = useFilteredAniList()

    const loadPrefs = (uid: string) => {
        getDoc(doc(db, 'users', uid)).then(snap => {
            const data = snap.data()
            if (data?.preferences && data?.onboardingDone) {
                setPrefs(data.preferences as Preferences)
            }
        })
    }

    useEffect(() => {
        if (!user?.uid) return
        loadPrefs(user.uid)
    }, [user?.uid])

    // ✅ user.preferences 바뀌면 즉시 반영 (onLogin 후)
    useEffect(() => {
        if (user?.preferences) {
            setPrefs(user.preferences as Preferences)
        }
    }, [user?.preferences])

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    useEffect(() => {
        if (aniList.length > 0) setReady(true)
    }, [aniList.length])

    if (!prefs || !ready || prefs.genres.length === 0) return null

    const sections = prefs.genres.slice(0, 3).map(genreKey => {
        const tmdbId = GENRE_TO_TMDB[genreKey]
        if (!tmdbId) return null
        const items = aniList.filter((a: any) => a.genre_ids?.includes(tmdbId)).slice(0, 8)
        if (items.length === 0) return null
        return { genreKey, tmdbId, label: GENRE_LABEL[genreKey], items }
    }).filter(Boolean)

    // ✅ 결과가 없으면 onNoResult 호출
    if (sections.length === 0) {
        if (onNoResult && !noResultCalled) {
            setNoResultCalled(true)
            setTimeout(() => onNoResult(), 500)  // 약간의 딜레이 후 모달 오픈
        }
        return null
    }

    const userName = user?.name?.split(' ')[0] || '님'

    return (
        <section style={{ padding: '80px 0 0' }}>
            <style>{`
                .pr-wrap { width: 90%; margin: 0 auto; }
                .pr-header { margin-bottom: 32px; }
                .pr-title { font-size: 26px; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.3; }
                .pr-sub { font-size: 14px; color: var(--text-muted); margin-top: 8px; }
                .pr-edit-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--text-muted); background: none; border: 1px dashed var(--border-subtle); border-radius: 99px; padding: 3px 10px; cursor: pointer; transition: color .18s, border-color .18s; white-space: nowrap; opacity: 0.7; }
                .pr-edit-btn:hover { color: #a78bfa; border-color: rgba(108,99,255,0.5); opacity: 1; }
                .pr-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
                .pr-tag { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 99px; background: rgba(108,99,255,0.12); color: #a78bfa; border: 1px solid rgba(108,99,255,0.25); }
                .pr-section { margin-bottom: 48px; }
                .pr-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
                .pr-section-title { font-size: 18px; font-weight: 700; color: var(--text-high); }
                .pr-more { font-size: 12px; color: var(--text-subtle); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 3px; transition: color .2s; }
                .pr-more:hover { color: var(--text-high); }
                .pr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
                .pr-card { cursor: pointer; border-radius: 10px; overflow: hidden; transition: transform .22s cubic-bezier(.25,.46,.45,.94); }
                .pr-card:hover { transform: translateY(-4px); }
                .pr-card:hover .pr-img { transform: scale(1.05); }
                .pr-thumb { width: 100%; aspect-ratio: 16/9; position: relative; overflow: hidden; background: var(--bg-secondary); }
                .pr-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .25s; }
                .pr-np { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: var(--border-subtle); }
                .pr-pill { position: absolute; top: 8px; left: 8px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(108,99,255,0.85); color: #fff; }
                .pr-info { padding: 10px 10px 12px; }
                .pr-name { font-size: 14px; font-weight: 600; color: var(--text-high); margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                @media (max-width: 900px) { .pr-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; } }
                @media (max-width: 640px) {
                    .pr-wrap { width: calc(100% - 32px); }
                    .pr-header { margin-bottom: 26px; }
                    .pr-title { font-size: 21px; }
                    .pr-sub { font-size: 13px; }
                    .pr-tags { flex-wrap: nowrap; overflow-x: auto; padding-right: 16px; margin-right: -16px; scrollbar-width: none; }
                    .pr-tags::-webkit-scrollbar { display: none; }
                    .pr-tag { flex: 0 0 auto; }
                    .pr-section { margin-bottom: 40px; }
                    .pr-grid { display: flex; gap: 12px; margin-right: -16px; padding-right: 16px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
                    .pr-grid::-webkit-scrollbar { display: none; }
                    .pr-card { flex: 0 0 min(78vw, 320px); scroll-snap-align: start; }
                }
            `}</style>

            <div className="pr-wrap">
                <div className="pr-header">
                    <h2 className="pr-title">
                        <span style={{ color: '#826cff' }}>{userName}</span>님이 좋아할 것 같아요
                    </h2>
                    <p className="pr-sub">선택하신 취향을 바탕으로 골라봤어요</p>
                    <div className="pr-tags">
                        {prefs.genres.map(g => (
                            <span key={g} className="pr-tag">#{GENRE_LABEL[g]}</span>
                        ))}
                        <button className="pr-edit-btn" onClick={() => setEditOpen(true)}>
                            <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                                <path d="M9.5 1.5a1.414 1.414 0 0 1 2 2L4 11H1.5V8.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            수정
                        </button>
                    </div>
                </div>

                {sections.map((sec: any) => (
                    <div key={sec.genreKey} className="pr-section">
                        <div className="pr-section-head">
                            <h3 className="pr-section-title">{sec.label} 추천</h3>
                        </div>
                        <div className="pr-grid">
                            {sec.items.map((ani: any, idx: number) => (
                                <div key={ani.id} className="pr-card" onClick={() => setPreviewId(ani.id)}>
                                    <div className="pr-thumb">
                                        {ani.backdrop_path
                                            ? <Image className="pr-img" src={`https://image.tmdb.org/t/p/w780${ani.backdrop_path}`} alt={ani.name} fill sizes="(max-width:640px) 78vw, 25vw" style={{ objectFit: 'cover' }} />
                                            : <div className="pr-np">{(ani.name || '?')[0]}</div>
                                        }
                                        {idx === 0 && <span className="pr-pill">추천</span>}
                                    </div>
                                    <div className="pr-info">
                                        <p className="pr-name">{ani.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {editOpen && user?.uid && (
                <OnboardingModal
                    uid={user.uid}
                    onComplete={() => {
                        setEditOpen(false)
                        setNoResultCalled(false)  // ✅ 수정 완료 후 리셋
                        if (user?.uid) loadPrefs(user.uid)
                    }}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </section>
    )
}