'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { db } from '@/firebase/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const LAFTEL_AVATARS = [
    'https://thumbnail.laftel.net/profiles/default/48363a65-24d6-45a0-9eac-8c1726656c63.png',
    'https://thumbnail.laftel.net/profiles/default/fb48c8c7-ad22-4aa9-9038-c0637ba7e275.png',
    'https://thumbnail.laftel.net/profiles/default/b700435b-3ad2-4a31-9b72-3e9ae631dc47.png',
    'https://thumbnail.laftel.net/profiles/default/58888b41-8ecd-4f4e-a890-24b2023d7f29.png',
    'https://thumbnail.laftel.net/profiles/default/257801c8-eda4-4401-8672-509080db808b.png',
    'https://thumbnail.laftel.net/profiles/default/7478566c-4b3c-4a10-a7c0-2f8c05fb2370.jpg',
    'https://thumbnail.laftel.net/profiles/default/c38a5328-857c-4c12-a404-53d288460e2a.jpg',
    'https://thumbnail.laftel.net/profiles/default/40028ff2-895a-4606-b759-2674b1cdc18e.jpg',
    'https://thumbnail.laftel.net/profiles/default/37710afc-0caa-4ea3-bd6d-1c900674141e.jpg',
    'https://thumbnail.laftel.net/profiles/default/8c6f615f-b949-4ed8-b027-bcf2bee4ea4a.jpg',
]

const DICEBEAR_AVATARS = Array.from({ length: 20 }, (_, i) =>
    `https://api.dicebear.com/7.x/thumbs/svg?seed=laftel${i + 1}&backgroundColor=6c63ff,ff6b6b,ffd93d,6bcb77,4d96ff`
)

const AGE_OPTIONS = [
    { value: 'ALL', label: 'ALL', desc: 'ALL 연령 콘텐츠만 시청 가능' },
    { value: '7', label: '7+', desc: '7세 연령 콘텐츠까지 시청 가능' },
    { value: '12', label: '12+', desc: '12세 연령 콘텐츠까지 시청 가능' },
    { value: '15', label: '15+', desc: '15세 연령 콘텐츠까지 시청 가능' },
    { value: '19', label: '19+', desc: '19세 연령 콘텐츠까지 시청 가능' },
]

type Step = 'select' | 'edit' | 'image' | 'age_pw' | 'age_select'
type ImageTab = 'laftel' | 'dicebear' | 'custom'

interface ProfileData {
    id: string
    nickname: string
    avatarUrl: string
    ageLimit: string
}

export default function ProfilePage() {
    const { user, onLogin } = useAuthStore()
    const router = useRouter()
    const fileRef = useRef<HTMLInputElement>(null)

    const [step, setStep] = useState<Step>('select')
    const [profiles, setProfiles] = useState<ProfileData[]>([])
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editNickname, setEditNickname] = useState('')
    const [selectedAvatar, setSelectedAvatar] = useState(LAFTEL_AVATARS[0])
    const [editAgeLimit, setEditAgeLimit] = useState('19')
    const [saving, setSaving] = useState(false)
    const [showPremiumModal, setShowPremiumModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const [imageTab, setImageTab] = useState<ImageTab>('laftel')
    const [customPreview, setCustomPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [agePw, setAgePw] = useState('')
    const [agePwError, setAgePwError] = useState('')
    const [selectedAge, setSelectedAge] = useState('19')

    const hasMembership = user?.membership && user.membership !== 'none'

    useEffect(() => {
        if (!user) { router.push('/login'); return }
        loadProfiles()
    }, [user])

    const loadProfiles = async () => {
        if (!user?.uid) return
        setLoading(true)
        try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            const data = snap.data()
            const savedProfiles: ProfileData[] = data?.profiles || []
            if (savedProfiles.length === 0) {
                setProfiles([{
                    id: 'main',
                    nickname: data?.nickname || user.name || `laftel_${user.uid.slice(-4).toUpperCase()}`,
                    avatarUrl: data?.avatarUrl || user.photoURL || LAFTEL_AVATARS[0],
                    ageLimit: data?.ageLimit || '19',
                }])
            } else {
                setProfiles(savedProfiles)
            }
        } catch {
            setProfiles([{
                id: 'main',
                nickname: user.name || `laftel_${user.uid?.slice(-4).toUpperCase()}`,
                avatarUrl: user.photoURL || LAFTEL_AVATARS[0],
                ageLimit: '19',
            }])
        } finally {
            setLoading(false)
        }
    }

    const openEdit = (profile: ProfileData) => {
        setEditingId(profile.id)
        setEditNickname(profile.nickname)
        setSelectedAvatar(profile.avatarUrl)
        setEditAgeLimit(profile.ageLimit)
        setCustomPreview(null)
        setStep('edit')
    }

    const openNew = () => {
        setEditingId(null)
        setEditNickname('')
        setSelectedAvatar(LAFTEL_AVATARS[0])
        setEditAgeLimit('19')
        setCustomPreview(null)
        setStep('edit')
    }

    const compressImage = (file: File): Promise<string> => {
        return new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = e => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = 200; canvas.height = 200
                    const ctx = canvas.getContext('2d')!
                    ctx.drawImage(img, 0, 0, 200, 200)
                    resolve(canvas.toDataURL('image/jpeg', 0.8))
                }
                img.src = e.target?.result as string
            }
            reader.readAsDataURL(file)
        })
    }

    const saveProfile = async () => {
        if (!user?.uid) return
        setSaving(true)
        try {
            const finalAvatarUrl = selectedAvatar
            let newProfiles: ProfileData[]
            if (editingId) {
                newProfiles = profiles.map(p =>
                    p.id === editingId
                        ? { ...p, nickname: editNickname.trim() || p.nickname, avatarUrl: finalAvatarUrl, ageLimit: editAgeLimit }
                        : p
                )
            } else {
                newProfiles = [...profiles, {
                    id: `profile_${Date.now()}`,
                    nickname: editNickname.trim() || `프로필 ${profiles.length + 1}`,
                    avatarUrl: finalAvatarUrl,
                    ageLimit: editAgeLimit,
                }]
            }
            await setDoc(doc(db, 'users', user.uid), {
                profiles: newProfiles,
                nickname: newProfiles[0].nickname,
                avatarUrl: newProfiles[0].avatarUrl,
                updatedAt: new Date().toISOString(),
            }, { merge: true })
            setProfiles(newProfiles)
            onLogin({ ...user, name: newProfiles[0].nickname, photoURL: newProfiles[0].avatarUrl })
            setStep('select')
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
    }

    const saveAgeLimit = async () => {
        if (!user?.uid) return
        setSaving(true)
        try {
            const newProfiles = profiles.map(p => p.id === editingId ? { ...p, ageLimit: selectedAge } : p)
            await setDoc(doc(db, 'users', user.uid), { profiles: newProfiles }, { merge: true })
            setProfiles(newProfiles)
            setEditAgeLimit(selectedAge)
            setStep('edit')
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
    }

    const handleAgePwNext = () => {
        if (!agePw.trim()) { setAgePwError('비밀번호를 입력해주세요.'); return }
        setAgePwError('')
        setStep('age_select')
    }

    const processFile = async (file: File) => {
        const compressed = await compressImage(file)
        setCustomPreview(compressed)
        setSelectedAvatar(compressed)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) processFile(file)
    }

    if (!user || loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    const editingProfile = profiles.find(p => p.id === editingId)
    const ageLimitLabel = AGE_OPTIONS.find(a => a.value === editAgeLimit)?.desc || '19세 연령 콘텐츠까지 시청 가능'

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes fade-up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
                .pf-page { animation: fade-up .35s ease; width: 100%; }
                .pf-box { animation: fade-up .35s ease; width: 100%; max-width: 440px; background: #141420; border-radius: 20px; border: 1px solid rgba(255,255,255,.08); overflow: hidden; }
                .custom-scroll::-webkit-scrollbar { width: 5px; }
                .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.04); border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(108,99,255,.5); border-radius: 10px; }
                .img-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; padding: 4px 2px; }
                .img-item { aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; border: 3px solid transparent; transition: border-color .15s, transform .15s; background: #1a1a22; }
                .img-item:hover { transform: scale(1.06); }
                .img-item.selected { border-color: #6c63ff; box-shadow: 0 0 0 2px rgba(108,99,255,.3); }
                .img-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .img-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 16px; }
                .img-tab { flex: 1; padding: 10px 0; font-size: 13px; font-weight: 500; color: rgba(255,255,255,.3); background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; transition: all .18s; }
                .img-tab.on { color: #fff; border-bottom-color: #6c63ff; }
                .drop-zone { border: 2px dashed rgba(255,255,255,.15); border-radius: 16px; padding: 48px 24px; text-align: center; transition: all .2s; cursor: pointer; }
                .drop-zone.dragging { border-color: #6c63ff; background: rgba(108,99,255,.08); }

                /* 넷플릭스 스타일 프로필 카드 */
                .pf-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: transform .2s;
                }
                .pf-card:hover { transform: scale(1.05); }
                .pf-avatar-wrap {
                    width: 180px;
                    height: 180px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #1a1a22;
                    transition: border .2s, box-shadow .2s;
                    border: 4px solid transparent;
                }
                .pf-card:hover .pf-avatar-wrap {
                    border-color: #fff;
                }
                .pf-card.selected .pf-avatar-wrap {
                    border-color: #6c63ff;
                    box-shadow: 0 0 0 4px rgba(108,99,255,.35);
                }
                .pf-card-name {
                    font-size: 16px;
                    font-weight: 500;
                    color: rgba(255,255,255,.55);
                    transition: color .2s;
                }
                .pf-card:hover .pf-card-name { color: #fff; }
                .pf-card.selected .pf-card-name { color: #fff; font-weight: 700; }
            `}</style>

            {/* 프리미엄 모달 */}
            {showPremiumModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
                    <div style={{ background: '#1a1a22', borderRadius: 16, padding: '28px 24px', maxWidth: 380, width: '100%', border: '1px solid rgba(255,255,255,.1)' }}>
                        <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>프리미엄 멤버십 안내</h3>
                        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                            프리미엄 멤버십을 이용하면 총 4개까지 프로필을 추가하고 동시재생 하실 수 있습니다.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => setShowPremiumModal(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>아니요</button>
                            <button onClick={() => { setShowPremiumModal(false); router.push('/membership') }} style={{ padding: '10px 24px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>네, 구경할래요</button>
                        </div>
                    </div>
                </div>
            )}

            {(step === 'age_pw' || step === 'age_select') && (
                <h1 style={{ fontSize: 32, fontWeight: 900, color: '#6c63ff', letterSpacing: 2, marginBottom: 32, fontStyle: 'italic' }}>LAFTEL</h1>
            )}

            {/* ── STEP 1: 프로필 선택 — 넷플릭스 스타일 ── */}
            {step === 'select' && (
                <div className="pf-page">
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>프로필 선택</h1>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 40, marginBottom: 64 }}>
                        {profiles.map(p => {
                            const isSelected = selectedProfileId === p.id
                            return (
                                <div
                                    key={p.id}
                                    className={`pf-card${isSelected ? ' selected' : ''}`}
                                    onClick={() => {
                                        if (isSelected) {
                                            onLogin({ ...user!, name: p.nickname, photoURL: p.avatarUrl, ageLimit: p.ageLimit })
                                            router.push('/')
                                        } else {
                                            setSelectedProfileId(p.id)
                                        }
                                    }}
                                >
                                    <div className="pf-avatar-wrap">
                                        <img src={p.avatarUrl} alt={p.nickname}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                                    </div>
                                    <span className="pf-card-name">{p.nickname}</span>
                                    {isSelected && (
                                        <span style={{ fontSize: 12, color: '#9d97ff', fontWeight: 600, marginTop: -8 }}>
                                            한 번 더 클릭하여 입장 →
                                        </span>
                                    )}
                                </div>
                            )
                        })}

                        {/* 새 프로필 */}
                        {profiles.length < 4 && (
                            <div
                                className="pf-card"
                                onClick={() => hasMembership ? openNew() : setShowPremiumModal(true)}
                            >
                                <div className="pf-avatar-wrap" style={{
                                    background: hasMembership ? 'rgba(108,99,255,.1)' : 'rgba(255,255,255,.04)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderColor: hasMembership ? 'rgba(108,99,255,.3)' : 'rgba(255,255,255,.1)',
                                }}>
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none"
                                        stroke={hasMembership ? '#9d97ff' : 'rgba(255,255,255,.2)'} strokeWidth="1.5">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </div>
                                <span className="pf-card-name">
                                    {hasMembership ? '프로필 추가' : '프로필 추가'}
                                    {!hasMembership && (
                                        <span style={{ display: 'block', fontSize: 11, color: '#6c63ff', marginTop: 4, textAlign: 'center' }}>멤버십 필요</span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 프로필 편집 버튼 */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => {
                                const target = profiles.find(p => p.id === selectedProfileId) || profiles[0]
                                if (target) openEdit(target)
                            }}
                            style={{
                                padding: '12px 48px',
                                background: 'none',
                                border: '1px solid rgba(255,255,255,.4)',
                                borderRadius: 4,
                                color: 'rgba(255,255,255,.7)',
                                fontSize: 16,
                                fontWeight: 400,
                                cursor: 'pointer',
                                letterSpacing: '0.05em',
                                transition: 'all .2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.4)' }}
                        >
                            프로필 편집
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 2: 프로필 편집 ── */}
            {step === 'edit' && (
                <div className="pf-page" style={{ maxWidth: 440, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', margin: '0 0 10px' }}>프로필 편집</p>
                        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>
                            {editingId ? '편집할 프로필을 선택해주세요.' : '새 프로필을 만들어주세요.'}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 48 }}>
                        <div style={{ position: 'relative', cursor: 'pointer', width: 120, height: 120 }} onClick={() => setStep('image')}>
                            <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: 'hidden', background: '#1a1a22' }}>
                                <img src={selectedAvatar} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                            </div>
                            <div style={{ position: 'absolute', inset: 0, borderRadius: "50%", background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </div>
                        </div>
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.2)', paddingBottom: 8, marginBottom: 16 }}>
                                <input value={editNickname} onChange={e => setEditNickname(e.target.value.slice(0, 15))}
                                    placeholder="닉네임을 입력하세요"
                                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontWeight: 700 }} />
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>{editNickname.length}/15자</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,.08)', cursor: 'pointer' }}
                                onClick={() => { setAgePw(''); setAgePwError(''); setSelectedAge(editAgeLimit); setStep('age_pw') }}>
                                <div>
                                    <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 3px' }}>콘텐츠 연령 제한</p>
                                    <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, margin: 0 }}>{ageLimitLabel}</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button onClick={() => setStep('select')}
                            style={{ padding: '12px 28px', background: 'none', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                            취소
                        </button>
                        <button onClick={saveProfile} disabled={saving}
                            style={{ padding: '12px 28px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? .6 : 1 }}>
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: 이미지 선택 ── */}
            {step === 'image' && (
                <div style={{ width: '100%', maxWidth: 560, animation: 'fade-up .3s ease' }}>
                    <div style={{ background: '#141420', borderRadius: 20, padding: '28px 24px', border: '1px solid rgba(255,255,255,.1)' }}>
                        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>이미지 선택</h2>
                        <div className="img-tabs">
                            {([['laftel', '라프텔 캐릭터'], ['dicebear', '아바타'], ['custom', '직접 업로드']] as [ImageTab, string][]).map(([id, label]) => (
                                <button key={id} className={`img-tab${imageTab === id ? ' on' : ''}`} onClick={() => setImageTab(id)}>{label}</button>
                            ))}
                        </div>
                        {imageTab === 'laftel' && (
                            <div className="custom-scroll" style={{ maxHeight: 380, overflowY: 'auto' }}>
                                <div className="img-grid">
                                    {LAFTEL_AVATARS.map((url, i) => (
                                        <div key={i} className={`img-item${selectedAvatar === url ? ' selected' : ''}`} onClick={() => setSelectedAvatar(url)}>
                                            <img src={url} alt="" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {imageTab === 'dicebear' && (
                            <div className="custom-scroll" style={{ maxHeight: 380, overflowY: 'auto' }}>
                                <div className="img-grid">
                                    {DICEBEAR_AVATARS.map((url, i) => (
                                        <div key={i} className={`img-item${selectedAvatar === url ? ' selected' : ''}`} onClick={() => setSelectedAvatar(url)}>
                                            <img src={url} alt="" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {imageTab === 'custom' && (
                            <>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
                                <div className={`drop-zone${isDragging ? ' dragging' : ''}`}
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}>
                                    {customPreview ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: 'hidden', border: '3px solid #6c63ff' }}>
                                                <img src={customPreview} alt="custom" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, margin: 0 }}>클릭해서 다른 이미지 선택</p>
                                        </div>
                                    ) : (
                                        <>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, margin: '0 0 6px', fontWeight: 600 }}>이미지를 드래그하거나 클릭해서 업로드</p>
                                            <p style={{ color: 'rgba(255,255,255,.25)', fontSize: 12, margin: 0 }}>PNG, JPG, GIF (자동 압축 적용)</p>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                            <button onClick={() => setStep('edit')}
                                style={{ padding: '10px 20px', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                            <button onClick={() => setStep('edit')}
                                style={{ padding: '10px 24px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>선택</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 4: 연령제한 비밀번호 ── */}
            {step === 'age_pw' && (
                <div className="pf-box">
                    <div style={{ padding: '32px 28px 0' }}>
                        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>콘텐츠 연령 제한</h2>
                        <p style={{ color: '#6c63ff', fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>
                            {editingProfile?.nickname || editNickname}님의 시청 가능 연령을 변경합니다.
                        </p>
                        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
                            설정을 위해 <strong style={{ color: '#fff' }}>계정 비밀번호</strong> 확인이 필요해요.<br />
                            로그인 시 입력한 계정 비밀번호를 입력해주세요.
                        </p>
                        <input type="password" value={agePw} onChange={e => { setAgePw(e.target.value); setAgePwError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleAgePwNext()}
                            placeholder="계정 비밀번호를 입력해주세요."
                            style={{ width: '100%', background: 'none', border: 'none', borderBottom: `1px solid ${agePwError ? '#f87171' : '#6c63ff'}`, outline: 'none', color: '#fff', fontSize: 15, padding: '8px 0', boxSizing: 'border-box', marginBottom: agePwError ? 6 : 40 }} />
                        {agePwError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 28px' }}>{agePwError}</p>}
                    </div>
                    <button onClick={handleAgePwNext}
                        style={{ width: '100%', padding: '18px', background: agePw.trim() ? '#6c63ff' : 'rgba(255,255,255,.1)', border: 'none', color: agePw.trim() ? '#fff' : 'rgba(255,255,255,.3)', fontSize: 16, fontWeight: 700, cursor: agePw.trim() ? 'pointer' : 'default', transition: 'background .2s' }}>
                        다음
                    </button>
                </div>
            )}

            {/* ── STEP 5: 연령 선택 ── */}
            {step === 'age_select' && (
                <div className="pf-box">
                    <div style={{ padding: '28px 24px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                            <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', background: '#1a1a22', flexShrink: 0 }}>
                                <img src={selectedAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                            </div>
                            <div>
                                <p style={{ color: '#6c63ff', fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>{editingProfile?.nickname || editNickname}님의</p>
                                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>시청 가능 연령을 선택해 주세요.</p>
                            </div>
                        </div>
                        <div style={{ background: '#1e1e2a', borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
                            {AGE_OPTIONS.map((opt, i) => (
                                <div key={opt.value} onClick={() => setSelectedAge(opt.value)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < AGE_OPTIONS.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selectedAge === opt.value ? '#6c63ff' : 'rgba(255,255,255,.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color .15s' }}>
                                        {selectedAge === opt.value && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6c63ff' }} />}
                                    </div>
                                    <div>
                                        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>{opt.label}</p>
                                        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, margin: 0 }}>{opt.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={saveAgeLimit} disabled={saving}
                        style={{ width: '100%', padding: '18px', background: '#6c63ff', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            )}
        </div>
    )
}
