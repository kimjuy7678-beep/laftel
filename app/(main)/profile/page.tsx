'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { db, auth } from '@/firebase/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import OnboardingModal from '@/components/OnboardingModal'
import { useActivityStore } from '@/store/useActiveStore'

async function hashPin(pin: string): Promise<string> {
    const data = new TextEncoder().encode(pin + '_laftel_salt')
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

type Step = 'select' | 'edit' | 'image' | 'age_pw' | 'age_select' | 'pin_enter' | 'pin_setup' | 'pin_setup_confirm'
type ImageTab = 'laftel' | 'dicebear' | 'custom'

interface ProfileData {
    id: string
    nickname: string
    avatarUrl: string
    ageLimit: string
    pinHash?: string
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
    const [showOnboarding, setShowOnboarding] = useState(false)

    const [pinInput, setPinInput] = useState('')
    const [pinError, setPinError] = useState('')
    const [pinConfirm, setPinConfirm] = useState('')
    const [pinConfirmError, setPinConfirmError] = useState('')
    const [pendingProfile, setPendingProfile] = useState<ProfileData | null>(null)
    const [pinAttempts, setPinAttempts] = useState(0)
    const [pinLocked, setPinLocked] = useState(false)
    const [pinLockTimer, setPinLockTimer] = useState(0)
    const [showForgotPin, setShowForgotPin] = useState(false)
    const [forgotPinSent, setForgotPinSent] = useState(false)
    const [forgotPinLoading, setForgotPinLoading] = useState(false)
    const pinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [hydrated, setHydrated] = useState(false)
    const hasMembership = user?.membership && user.membership !== 'none'
    const membershipConfig: Record<string, { label: string; color: string }> = {
        anime: { label: '애니 멤버십', color: '#6c63ff' },
        ost: { label: 'OST 멤버십', color: '#ec4899' },
        allinone: { label: '올인원 멤버십', color: '#f59e0b' },
    }
    const memberInfo = user?.membership && user.membership !== 'none'
        ? membershipConfig[user.membership] ?? null
        : null

    useEffect(() => { setHydrated(true) }, [])

    useEffect(() => {
        if (!hydrated) return
        if (!user) { router.push('/login'); return }
        loadProfiles()
    }, [hydrated, user])

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

    useEffect(() => {
        if (pinLocked && pinLockTimer > 0) {
            pinTimerRef.current = setInterval(() => {
                setPinLockTimer(prev => {
                    if (prev <= 1) { setPinLocked(false); setPinAttempts(0); if (pinTimerRef.current) clearInterval(pinTimerRef.current); return 0 }
                    return prev - 1
                })
            }, 1000)
        }
        return () => { if (pinTimerRef.current) clearInterval(pinTimerRef.current) }
    }, [pinLocked])

    const enterProfile = async (p: ProfileData) => {
        await setDoc(doc(db, 'users', user!.uid!), { lastProfileId: p.id }, { merge: true })
        onLogin({
            ...user!,
            name: p.nickname,
            photoURL: p.avatarUrl,
            ageLimit: p.ageLimit,
            profileId: p.id,
            currentProfileId: p.id,
        })
        router.push('/')
    }

    const handleProfileClick = (p: ProfileData) => {
        if (selectedProfileId !== p.id) { setSelectedProfileId(p.id); return }
        if (p.pinHash) {
            setPendingProfile(p); setPinInput(''); setPinError('')
            setPinAttempts(0); setPinLocked(false); setShowForgotPin(false); setForgotPinSent(false)
            setStep('pin_enter')
        } else { enterProfile(p) }
    }

    const verifyPin = async (pin: string) => {
        if (!pendingProfile) return
        const hashed = await hashPin(pin)
        if (hashed === pendingProfile.pinHash) { setPinInput(''); setPinError(''); enterProfile(pendingProfile) }
        else {
            const n = pinAttempts + 1; setPinAttempts(n); setPinInput('')
            if (n >= 5) { setPinLocked(true); setPinLockTimer(30); setPinError('5회 실패 — 30초 잠금') }
            else setPinError(`PIN이 틀렸습니다 (${n}/5)`)
        }
    }

    const handleForgotPin = async () => {
        if (!user?.email) return
        setForgotPinLoading(true)
        try {
            if (pendingProfile && user.uid) {
                const newProfiles = profiles.map(p =>
                    p.id === pendingProfile.id
                        ? (({ pinHash: _r, ...rest }) => rest)(p) as ProfileData
                        : p
                )
                await setDoc(doc(db, 'users', user.uid), { profiles: newProfiles }, { merge: true })
                setProfiles(newProfiles)
            }
            await sendPasswordResetEmail(auth, user.email)
            setForgotPinSent(true)
        } catch (e) { console.error(e) }
        finally { setForgotPinLoading(false) }
    }

    const openPinSetup = () => { setPinInput(''); setPinConfirm(''); setPinError(''); setPinConfirmError(''); setStep('pin_setup') }

    const removePin = async () => {
        if (!user?.uid || !editingId) return
        setSaving(true)
        try {
            const newProfiles = profiles.map(p =>
                p.id === editingId
                    ? (({ pinHash: _r, ...rest }) => rest)(p) as ProfileData
                    : p
            )
            await setDoc(doc(db, 'users', user.uid), { profiles: newProfiles }, { merge: true })
            setProfiles(newProfiles)
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
    }

    const savePinHash = async (pin: string) => {
        if (!user?.uid || !editingId) return
        setSaving(true)
        try {
            const hashed = await hashPin(pin)
            const newProfiles = profiles.map(p => p.id === editingId ? { ...p, pinHash: hashed } : p)
            await setDoc(doc(db, 'users', user.uid), { profiles: newProfiles }, { merge: true })
            setProfiles(newProfiles); setStep('edit')
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
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

    const handleAgePinInput = async (v: string) => {
        setAgePw(v)
        setAgePwError('')
        if (v.length === 4) {
            const profile = profiles.find(p => p.id === editingId)
            if (!profile?.pinHash) {
                setStep('age_select')
                return
            }
            const hashed = await hashPin(v)
            if (hashed === profile.pinHash) {
                setAgePw('')
                setStep('age_select')
            } else {
                setAgePwError('PIN이 올바르지 않습니다.')
                setTimeout(() => setAgePw(''), 600)
            }
        }
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
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    const editingProfile = profiles.find(p => p.id === editingId)
    const ageLimitLabel = AGE_OPTIONS.find(a => a.value === editAgeLimit)?.desc || '19세 연령 콘텐츠까지 시청 가능'
    const editingHasPin = !!(editingProfile?.pinHash)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes fade-up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
                @keyframes pin-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

                .pf-page { animation: fade-up .35s ease; width: 100%; }
                .pf-box { animation: fade-up .35s ease; width: 100%; max-width: 600px; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-subtle); overflow: hidden; }

                /* ─── 공통 스크롤 ─── */
                .custom-scroll::-webkit-scrollbar { width: 5px; }
                .custom-scroll::-webkit-scrollbar-track { background: var(--border-faint); border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(108,99,255,.5); border-radius: 10px; }

                /* ─── 이미지 그리드 ─── */
                .img-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; padding: 4px 2px; }
                .img-item { aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; border: 3px solid transparent; transition: border-color .15s, transform .15s; background: var(--bg-hover); }
                .img-item:hover { transform: scale(1.06); }
                .img-item.selected { border-color: #6c63ff; box-shadow: 0 0 0 2px rgba(108,99,255,.3); }
                .img-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .img-tabs { display: flex; border-bottom: 1px solid var(--border-subtle); margin-bottom: 16px; }
                .img-tab { flex: 1; padding: 10px 0; font-size: 13px; font-weight: 500; color: var(--text-subtle); background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; transition: all .18s; }
                .img-tab.on { color: var(--text-primary); border-bottom-color: #6c63ff; }
                .drop-zone { border: 2px dashed var(--border); border-radius: 16px; padding: 48px 24px; text-align: center; transition: all .2s; cursor: pointer; }
                .drop-zone.dragging { border-color: #6c63ff; background: rgba(108,99,255,.08); }

                /* ─── select 단계: 프로필 카드 ─── */
                .pf-card { display: flex; flex-direction: column; align-items: center; gap: 16px; cursor: pointer; transition: transform .2s; }
                .pf-card:hover { transform: scale(1.05); }
                .pf-avatar-wrap { width: 180px; height: 180px; border-radius: 50%; overflow: hidden; background: var(--bg-card); transition: border .2s, box-shadow .2s; border: 4px solid transparent; }
                .pf-card:hover .pf-avatar-wrap { border-color: var(--text-primary); }
                .pf-card.selected .pf-avatar-wrap { border-color: #6c63ff; box-shadow: 0 0 0 4px rgba(108,99,255,.35); }
                .pf-card-name { font-size: 16px; font-weight: 500; color: var(--text-muted); transition: color .2s; }
                .pf-card:hover .pf-card-name { color: var(--text-primary); }
                .pf-card.selected .pf-card-name { color: var(--text-primary); font-weight: 700; }

                /* ─── select 단계: 카드 목록 ─── */
                .pf-card-list { display: flex; justify-content: center; flex-wrap: wrap; gap: 40px; margin-bottom: 64px; }

                /* ─── edit 단계: 2컬럼 레이아웃 ─── */
                .edit-layout { display: flex; justify-content: center; gap: 64px; margin-bottom: 64px; align-items: flex-start; }
                .edit-fields { width: 380px; }

                /* ─── edit 단계: 버튼 그룹 ─── */
                .edit-btns { display: flex; justify-content: center; gap: 16px; }
                .edit-btn { padding: 13px 52px; border-radius: 4px; font-size: 15px; font-weight: 400; cursor: pointer; letter-spacing: 0.06em; transition: all .2s; font-family: inherit; }

                /* ─── pin/age 단계: 입력 영역 ─── */
                .pin-wrap { max-width: 360px; margin: 0 auto; width: 100%; }

                /* ─── 타이틀 공통 ─── */
                .step-title { font-size: 48px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
                .step-title-mb { margin-bottom: 56px; text-align: center; }

                /* ══════════════════════════════════════
                   모바일 (≤ 480px)
                ══════════════════════════════════════ */
                @media (max-width: 480px) {
                    /* 공통 타이틀 축소 */
                    .step-title { font-size: 28px; }
                    .step-title-mb { margin-bottom: 32px; }

                    /* ── select: 카드 목록 ── */
                    .pf-card-list { gap: 24px; margin-bottom: 40px; }
                    .pf-avatar-wrap { width: 110px; height: 110px; }
                    .pf-card-name { font-size: 13px; }

                    /* ── edit: 세로 1컬럼 ── */
                    .edit-layout { flex-direction: column; align-items: center; gap: 28px; margin-bottom: 36px; }
                    .edit-fields { width: 100%; max-width: 100%; }

                    /* ── edit: 버튼 꽉 채우기 ── */
                    .edit-btns { flex-direction: column; gap: 10px; }
                    .edit-btn { padding: 13px 0; width: 100%; text-align: center; }

                    /* ── pin/age: 여백 줄이기 ── */
                    .pin-wrap { max-width: 100%; padding: 0 4px; }

                    /* ── image 단계: 4열 그리드 ── */
                    .img-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }

                    /* ── drop-zone 높이 줄이기 ── */
                    .drop-zone { padding: 32px 16px; }
                }

                /* ══════════════════════════════════════
                   태블릿 (481px ~ 768px)
                ══════════════════════════════════════ */
                @media (min-width: 481px) and (max-width: 768px) {
                    .step-title { font-size: 36px; }
                    .step-title-mb { margin-bottom: 40px; }

                    .pf-card-list { gap: 28px; margin-bottom: 48px; }
                    .pf-avatar-wrap { width: 140px; height: 140px; }

                    .edit-layout { flex-direction: column; align-items: center; gap: 32px; margin-bottom: 40px; }
                    .edit-fields { width: 100%; max-width: 480px; }

                    .edit-btns { gap: 12px; }
                    .edit-btn { padding: 13px 36px; }

                    .img-grid { grid-template-columns: repeat(5, 1fr); }
                }
            `}</style>

            {showOnboarding && user?.uid && (
                <OnboardingModal
                    uid={user.uid}
                    onComplete={() => router.push('/')}
                    onClose={() => router.push('/')}
                />
            )}

            {showPremiumModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '28px 24px', maxWidth: 380, width: '100%', border: '1px solid var(--border)' }}>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>프리미엄 멤버십 안내</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                            프리미엄 멤버십을 이용하면 총 4개까지 프로필을 추가하고 동시재생 하실 수 있습니다.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => setShowPremiumModal(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', color: 'var(--text-subtle)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>아니요</button>
                            <button onClick={() => { setShowPremiumModal(false); router.push('/membership') }} style={{ padding: '10px 24px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>네, 구경할래요</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════ PIN 입력 단계 ════════════ */}
            {step === 'pin_enter' && pendingProfile && (
                <div className="pf-page" style={{ animation: 'pin-fade .3s ease' }}>
                    <div className="step-title-mb">
                        <h1 className="step-title" style={{ marginBottom: 48 }}>프로필 잠금</h1>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '4px solid rgba(108,99,255,.4)' }}>
                            <img src={pendingProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                        </div>
                        <p style={{ color: 'var(--text-subtle)', fontSize: 15, margin: '0 0 6px' }}>{pendingProfile.nickname}</p>
                        <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: 0 }}>
                            {pinLocked ? `⏳ ${pinLockTimer}초 후 다시 시도` : 'PIN을 입력해주세요'}
                        </h2>
                    </div>
                    <div className="pin-wrap">
                        {!showForgotPin && (
                            <div style={{ position: 'relative', marginBottom: pinError ? 8 : 40 }}>
                                <input
                                    type="password" inputMode="numeric" maxLength={4} value={pinInput}
                                    disabled={pinLocked} autoFocus
                                    onChange={async e => {
                                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                                        setPinInput(v); setPinError('')
                                        if (v.length === 4) await verifyPin(v)
                                    }}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'default' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, padding: '16px 0', borderBottom: `1px solid ${pinError ? '#f87171' : '#6c63ff'}` }}>
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} style={{ width: i < pinInput.length ? 14 : 12, height: i < pinInput.length ? 14 : 12, borderRadius: '50%', background: i < pinInput.length ? (pinError ? '#f87171' : '#6c63ff') : 'var(--border)', transition: 'all .15s', opacity: pinLocked ? .4 : 1 }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {pinError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 28px', fontWeight: 600 }}>{pinError}</p>}
                        {!showForgotPin ? (
                            <button onClick={() => setShowForgotPin(true)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>PIN을 잊으셨나요?</button>
                        ) : forgotPinSent ? (
                            <div style={{ background: 'rgba(108,99,255,.08)', borderRadius: 12, border: '1px solid rgba(108,99,255,.2)', padding: '20px', animation: 'pin-fade .3s ease' }}>
                                <p style={{ color: '#9d97ff', fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>✉️ 이메일을 전송했어요</p>
                                <p style={{ color: 'var(--text-subtle)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.7 }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>으로 안내 메일을 보냈습니다.<br />해당 프로필의 PIN이 제거되었어요.
                                </p>
                                <button onClick={() => { setShowForgotPin(false); setForgotPinSent(false); setStep('select') }}
                                    style={{ width: '100%', padding: '12px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    프로필 선택으로 돌아가기
                                </button>
                            </div>
                        ) : (
                            <div style={{ animation: 'pin-fade .3s ease' }}>
                                <p style={{ color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8, margin: '0 0 20px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>으로<br />PIN 초기화 메일을 보내드릴게요.<br />해당 프로필의 PIN이 즉시 제거됩니다.
                                </p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowForgotPin(false)} style={{ flex: 1, padding: '12px', background: 'none', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-subtle)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                                    <button onClick={handleForgotPin} disabled={forgotPinLoading}
                                        style={{ flex: 1, padding: '12px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: forgotPinLoading ? 'default' : 'pointer', opacity: forgotPinLoading ? .7 : 1, fontFamily: 'inherit' }}>
                                        {forgotPinLoading ? '처리 중...' : '이메일 전송'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 32 }}>
                        <button onClick={() => { setStep('select'); setSelectedProfileId(null) }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                            다른 프로필 선택
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════ PIN 설정 단계 ════════════ */}
            {(step === 'pin_setup' || step === 'pin_setup_confirm') && (
                <div className="pf-page" style={{ animation: 'pin-fade .3s ease' }}>
                    <div className="step-title-mb">
                        <h1 className="step-title" style={{ marginBottom: 16 }}>프로필 잠금 설정</h1>
                        <p style={{ color: 'var(--text-subtle)', fontSize: 18, margin: 0 }}>
                            {step === 'pin_setup' ? '새 PIN 4자리를 입력해주세요' : '한 번 더 입력해주세요'}
                        </p>
                    </div>
                    <div className="pin-wrap" style={{ textAlign: 'center' }}>
                        {(() => {
                            const isSetup = step === 'pin_setup'
                            const val = isSetup ? pinInput : pinConfirm
                            const err = isSetup ? pinError : pinConfirmError
                            return (
                                <div style={{ position: 'relative', marginBottom: err ? 8 : 40 }}>
                                    <input
                                        type="password" inputMode="numeric" maxLength={4} value={val}
                                        autoFocus disabled={saving}
                                        onChange={async e => {
                                            const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                                            if (isSetup) {
                                                setPinInput(v); setPinError('')
                                                if (v.length === 4) setTimeout(() => setStep('pin_setup_confirm'), 150)
                                            } else {
                                                setPinConfirm(v); setPinConfirmError('')
                                                if (v.length === 4) {
                                                    if (v !== pinInput) {
                                                        setPinConfirmError('PIN이 일치하지 않습니다')
                                                        setTimeout(() => { setPinConfirm(''); setPinInput(''); setStep('pin_setup') }, 1000)
                                                    } else { await savePinHash(v) }
                                                }
                                            }
                                        }}
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'default' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, padding: '16px 0', borderBottom: `1px solid ${err ? '#f87171' : '#6c63ff'}` }}>
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} style={{ width: i < val.length ? 14 : 12, height: i < val.length ? 14 : 12, borderRadius: '50%', background: i < val.length ? (err ? '#f87171' : '#6c63ff') : 'var(--border)', transition: 'all .15s', opacity: saving ? .6 : 1 }} />
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                        {(pinError || pinConfirmError) && (
                            <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 28px', fontWeight: 600 }}>
                                {step === 'pin_setup' ? pinError : pinConfirmError}
                            </p>
                        )}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 32 }}>
                        <button onClick={() => { if (step === 'pin_setup') setStep('edit'); else { setStep('pin_setup'); setPinInput(''); setPinConfirm('') } }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                            {step === 'pin_setup' ? '취소' : '다시 입력'}
                        </button>
                    </div>
                </div>
            )}

            {(step === 'age_pw' || step === 'age_select') && (
                <img src="/images/logo-white.svg" alt="" style={{ display: 'block', marginBottom: '30px' }} />
            )}

            {/* ════════════ 프로필 선택 단계 ════════════ */}
            {step === 'select' && (
                <div className="pf-page">
                    <div className="step-title-mb">
                        <h1 className="step-title">프로필 선택</h1>
                    </div>
                    <div className="pf-card-list">
                        {profiles.map(p => {
                            const isSelected = selectedProfileId === p.id
                            const isMainProfile = p.id === profiles[0].id
                            return (
                                <div key={p.id} className={`pf-card${isSelected ? ' selected' : ''}`} onClick={() => handleProfileClick(p)}>
                                    <div className="pf-avatar-wrap" style={{ position: 'relative' }}>
                                        <img src={p.avatarUrl} alt={p.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                                        {p.pinHash && (
                                            <div style={{ position: 'absolute', bottom: 6, right: 6, width: 26, height: 26, background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(108,99,255,.5)' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(108,99,255,.9)" strokeWidth="2.5">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <span className="pf-card-name">{p.nickname}</span>

                                    {isSelected && (
                                        <span style={{ fontSize: 12, color: '#9d97ff', fontWeight: 600, marginTop: -8 }}>
                                            {p.pinHash ? '🔒 한 번 더 클릭' : '한 번 더 클릭하여 입장 →'}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                        {profiles.length < 4 && (
                            <div className="pf-card" onClick={() => hasMembership ? openNew() : setShowPremiumModal(true)}>
                                <div className="pf-avatar-wrap" style={{ background: hasMembership ? 'rgba(108,99,255,.1)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: hasMembership ? 'rgba(108,99,255,.3)' : 'var(--border)' }}>
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={hasMembership ? '#9d97ff' : 'var(--text-faint)'} strokeWidth="1.5">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </div>
                                <span className="pf-card-name">
                                    프로필 추가
                                    {!hasMembership && <span style={{ display: 'block', fontSize: 11, color: '#6c63ff', marginTop: 4, textAlign: 'center' }}>멤버십 필요</span>}
                                </span>
                            </div>
                        )}
                    </div>
                    {memberInfo && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, background: `${memberInfo.color}20`, color: memberInfo.color, border: `1px solid ${memberInfo.color}40` }}>
                                ✓ {memberInfo.label} 이용중
                            </span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => { const target = profiles.find(p => p.id === selectedProfileId) || profiles[0]; if (target) openEdit(target) }}
                            style={{ padding: '12px 48px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', fontSize: 16, fontWeight: 400, cursor: 'pointer', letterSpacing: '0.05em', transition: 'all .2s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-primary)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                            프로필 편집
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════ 프로필 편집 단계 ════════════ */}
            {step === 'edit' && (
                <div className="pf-page">
                    <div className="step-title-mb">
                        <h1 className="step-title">프로필 편집</h1>
                    </div>
                    <div className="edit-layout">
                        {/* 아바타 */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <div style={{ position: 'relative', cursor: 'pointer', width: 160, height: 160 }} onClick={() => setStep('image')}>
                                <div style={{ width: 160, height: 160, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', border: '4px solid transparent', transition: 'border-color .2s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-primary)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}>
                                    <img src={selectedAvatar} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                                </div>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>클릭하여 변경</span>
                        </div>

                        {/* 필드 */}
                        <div className="edit-fields">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16 }}>
                                <input value={editNickname} onChange={e => setEditNickname(e.target.value.slice(0, 15))}
                                    placeholder="닉네임을 입력하세요"
                                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }} />
                                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{editNickname.length}/15자</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                                onClick={() => { setAgePw(''); setAgePwError(''); setSelectedAge(editAgeLimit); setStep('age_pw') }}>
                                <div>
                                    <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: '0 0 3px' }}>콘텐츠 연령 제한</p>
                                    <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: 0 }}>{ageLimitLabel}</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                            </div>
                            {editingId && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', marginTop: 4 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                            <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: 0 }}>프로필 잠금 (PIN)</p>
                                            {editingHasPin && <span style={{ fontSize: 10, background: 'rgba(108,99,255,.2)', color: '#9d97ff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>설정됨</span>}
                                        </div>
                                        <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: 0 }}>
                                            {editingHasPin ? '입장 시 PIN 4자리 필요' : '설정하면 이 프로필 입장 시 번호 입력'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        {editingHasPin ? (
                                            <>
                                                <button onClick={openPinSetup} style={{ padding: '7px 14px', background: 'rgba(108,99,255,.12)', border: '1px solid rgba(108,99,255,.3)', borderRadius: 8, color: '#9d97ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>변경</button>
                                                <button onClick={removePin} disabled={saving} style={{ padding: '7px 14px', background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-subtle)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? '...' : '해제'}</button>
                                            </>
                                        ) : (
                                            <button onClick={openPinSetup} style={{ padding: '7px 18px', background: '#6c63ff', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>PIN 설정</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 저장/취소 버튼 */}
                    <div className="edit-btns">
                        <button
                            className="edit-btn"
                            onClick={() => setStep('select')}
                            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-primary)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                            취소
                        </button>
                        <button
                            className="edit-btn"
                            onClick={saveProfile} disabled={saving}
                            style={{ background: '#6c63ff', border: '1px solid #6c63ff', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? .6 : 1 }}
                            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#7d74ff' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#6c63ff' }}>
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════ 이미지 선택 단계 ════════════ */}
            {step === 'image' && (
                <div style={{ width: '100%', maxWidth: 560, animation: 'fade-up .3s ease' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '28px 24px', border: '1px solid var(--border-subtle)' }}>
                        <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>이미지 선택</h2>
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
                                            <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid #6c63ff' }}>
                                                <img src={customPreview} alt="custom" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>클릭해서 다른 이미지 선택</p>
                                        </div>
                                    ) : (
                                        <>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 6px', fontWeight: 600 }}>이미지를 드래그하거나 클릭해서 업로드</p>
                                            <p style={{ color: 'var(--text-faint)', fontSize: 12, margin: 0 }}>PNG, JPG, GIF (자동 압축 적용)</p>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                            <button onClick={() => setStep('edit')} style={{ padding: '10px 20px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                            <button onClick={() => setStep('edit')} style={{ padding: '10px 24px', background: '#6c63ff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>선택</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════ 연령 PIN 확인 단계 ════════════ */}
            {step === 'age_pw' && (
                <div className="pf-page" style={{ animation: 'pin-fade .3s ease' }}>
                    <div className="step-title-mb">
                        <h1 className="step-title" style={{ marginBottom: 16 }}>연령 제한 변경</h1>
                        <p style={{ color: 'var(--text-subtle)', fontSize: 18, margin: 0 }}>
                            {editingProfile?.pinHash ? '프로필 PIN을 입력해주세요' : 'PIN이 설정되지 않아 바로 변경할 수 있어요'}
                        </p>
                    </div>
                    {editingProfile?.pinHash ? (
                        <div className="pin-wrap" style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', marginBottom: agePwError ? 8 : 40 }}>
                                <input
                                    type="password" inputMode="numeric" maxLength={4}
                                    value={agePw} autoFocus
                                    onChange={async e => {
                                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                                        await handleAgePinInput(v)
                                    }}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'default' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, padding: '16px 0', borderBottom: `1px solid ${agePwError ? '#f87171' : '#6c63ff'}` }}>
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} style={{ width: i < agePw.length ? 14 : 12, height: i < agePw.length ? 14 : 12, borderRadius: '50%', background: i < agePw.length ? (agePwError ? '#f87171' : '#6c63ff') : 'var(--border)', transition: 'all .15s' }} />
                                    ))}
                                </div>
                            </div>
                            {agePwError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 28px', fontWeight: 600 }}>{agePwError}</p>}
                        </div>
                    ) : (
                        <div style={{ maxWidth: 360, margin: '0 auto 40px', textAlign: 'center' }}>
                            <button onClick={() => setStep('age_select')}
                                style={{ padding: '13px 52px', background: '#6c63ff', border: 'none', borderRadius: 4, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                계속하기
                            </button>
                        </div>
                    )}
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <button onClick={() => setStep('edit')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════ 연령 선택 단계 ════════════ */}
            {step === 'age_select' && (
                <div className="pf-box">
                    <div style={{ padding: '28px 24px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                            <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-card)', flexShrink: 0 }}>
                                <img src={selectedAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { (e.target as HTMLImageElement).src = LAFTEL_AVATARS[0] }} />
                            </div>
                            <div>
                                <p style={{ color: '#6c63ff', fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>{editingProfile?.nickname || editNickname}님의</p>
                                <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, margin: 0 }}>시청 가능 연령을 선택해 주세요.</p>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
                            {AGE_OPTIONS.map((opt, i) => (
                                <div key={opt.value} onClick={() => setSelectedAge(opt.value)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < AGE_OPTIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selectedAge === opt.value ? '#6c63ff' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color .15s' }}>
                                        {selectedAge === opt.value && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6c63ff' }} />}
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>{opt.label}</p>
                                        <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: 0 }}>{opt.desc}</p>
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
