'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'
import { createAvatar } from '@dicebear/core'
import * as avataaarsStyle from '@dicebear/avataaars'

// ── 타입 ──────────────────────────────────────────────────────
export interface AvatarConfig {
    top: string
    topColor: string        // hairColor
    clothing: string
    clothingColor: string
    eyes: string
    eyebrows: string
    mouth: string
    accessories: string
    accessoriesProbability: number
    facialHair: string
    facialHairProbability: number
    skinColor: string
    backgroundColor: string
}

const DEFAULT_CONFIG: AvatarConfig = {
    top: 'shortCurly',
    topColor: 'brown',
    clothing: 'hoodie',
    clothingColor: '6c63ff',
    eyes: 'default',
    eyebrows: 'defaultNatural',
    mouth: 'smile',
    accessories: 'prescription01',
    accessoriesProbability: 0,
    facialHair: 'beardLight',
    facialHairProbability: 0,
    skinColor: 'light',
    backgroundColor: '1a1a2e',
}

// ── 옵션 데이터 ───────────────────────────────────────────────
const TABS = [
    { id: 'hair',       label: '헤어' },
    { id: 'face',       label: '얼굴' },
    { id: 'clothing',   label: '의상' },
    { id: 'extras',     label: '기타' },
]

const HAIR_STYLES = [
    { id: 'bigHair',              label: '빅헤어' },
    { id: 'bob',                  label: '단발' },
    { id: 'bun',                  label: '번머리' },
    { id: 'curly',                label: '곱슬' },
    { id: 'curvy',                label: '웨이브' },
    { id: 'dreads',               label: '드레드' },
    { id: 'frida',                label: '프리다' },
    { id: 'fro',                  label: '아프로' },
    { id: 'froBand',              label: '아프로밴드' },
    { id: 'longButNotTooLong',    label: '긴생머리' },
    { id: 'miaWallace',           label: '미아왈라스' },
    { id: 'shavedSides',          label: '사이드컷' },
    { id: 'shortCurly',           label: '숏컬리' },
    { id: 'shortFlat',            label: '숏플랫' },
    { id: 'shortRound',           label: '숏라운드' },
    { id: 'shortWaved',           label: '숏웨이브' },
    { id: 'sides',                label: '사이드' },
    { id: 'straight01',           label: '생머리1' },
    { id: 'straight02',           label: '생머리2' },
    { id: 'straightAndStrand',    label: '생머리+잔머리' },
    { id: 'theCaesar',            label: '시저컷' },
    { id: 'hat',                  label: '모자' },
    { id: 'winterHat1',           label: '겨울모자1' },
    { id: 'winterHat02',          label: '겨울모자2' },
    { id: 'hijab',                label: '히잡' },
    { id: 'turban',               label: '터번' },
]

const HAIR_COLORS = [
    { id: 'auburn',       label: '오번',   hex: '#A55728' },
    { id: 'black',        label: '검정',   hex: '#2C1B18' },
    { id: 'blonde',       label: '금발',   hex: '#B58143' },
    { id: 'blondeGolden', label: '골든',   hex: '#D6B370' },
    { id: 'brown',        label: '갈색',   hex: '#724133' },
    { id: 'brownDark',    label: '짙은갈', hex: '#4A312C' },
    { id: 'pastelPink',   label: '핑크',   hex: '#F59797' },
    { id: 'platinum',     label: '백금',   hex: '#ECDCBF' },
    { id: 'red',          label: '빨강',   hex: '#C93305' },
    { id: 'silverGray',   label: '실버',   hex: '#E8E1E1' },
]

const SKIN_COLORS = [
    { id: 'tanned',    label: '태닝',   hex: '#FD9841' },
    { id: 'yellow',    label: '황색',   hex: '#F8D25C' },
    { id: 'pale',      label: '창백',   hex: '#FDDBB4' },
    { id: 'light',     label: '밝음',   hex: '#EDB98A' },
    { id: 'brown',     label: '갈색',   hex: '#D08B5B' },
    { id: 'darkBrown', label: '짙은갈', hex: '#AE5D29' },
    { id: 'black',     label: '다크',   hex: '#614335' },
]

const EYES_OPTIONS = [
    { id: 'default',    label: '기본' },
    { id: 'happy',      label: '행복' },
    { id: 'closed',     label: '감은눈' },
    { id: 'hearts',     label: '하트' },
    { id: 'side',       label: '옆눈' },
    { id: 'squint',     label: '찡긋' },
    { id: 'surprised',  label: '놀람' },
    { id: 'wink',       label: '윙크' },
    { id: 'winkWacky',  label: '윙크2' },
    { id: 'xDizzy',     label: '빙글' },
    { id: 'cry',        label: '눈물' },
    { id: 'eyeRoll',    label: '눈굴림' },
]

const EYEBROW_OPTIONS = [
    { id: 'defaultNatural',       label: '기본' },
    { id: 'angryNatural',         label: '화남' },
    { id: 'flatNatural',          label: '일자' },
    { id: 'frownNatural',         label: '찡그림' },
    { id: 'raisedExcitedNatural', label: '들뜸' },
    { id: 'sadConcernedNatural',  label: '슬픔' },
    { id: 'upDownNatural',        label: '비대칭' },
    { id: 'unibrowNatural',       label: '일자눈썹' },
    { id: 'raisedExcited',        label: '들뜸2' },
    { id: 'sadConcerned',         label: '슬픔2' },
    { id: 'angry',                label: '화남2' },
    { id: 'upDown',               label: '비대칭2' },
]

const MOUTH_OPTIONS = [
    { id: 'smile',       label: '미소' },
    { id: 'default',     label: '기본' },
    { id: 'twinkle',     label: '반짝' },
    { id: 'tongue',      label: '혀' },
    { id: 'concerned',   label: '걱정' },
    { id: 'disbelief',   label: '황당' },
    { id: 'eating',      label: '먹는중' },
    { id: 'grimace',     label: '찡그림' },
    { id: 'sad',         label: '슬픔' },
    { id: 'screamOpen',  label: '비명' },
    { id: 'serious',     label: '진지' },
    { id: 'vomit',       label: '오바이트' },
]

const CLOTHING_OPTIONS = [
    { id: 'blazerAndShirt',   label: '블레이저+셔츠' },
    { id: 'blazerAndSweater', label: '블레이저+스웨터' },
    { id: 'collarAndSweater', label: '카라+스웨터' },
    { id: 'graphicShirt',     label: '그래픽티' },
    { id: 'hoodie',           label: '후디' },
    { id: 'overall',          label: '오버롤' },
    { id: 'shirtCrewNeck',    label: '크루넥' },
    { id: 'shirtScoopNeck',   label: '스쿱넥' },
    { id: 'shirtVNeck',       label: 'V넥' },
]

const CLOTHING_COLORS = [
    { id: '6c63ff', label: '라프텔', hex: '#6c63ff' },
    { id: 'ff6b6b', label: '레드',   hex: '#ff6b6b' },
    { id: 'ffd93d', label: '옐로우', hex: '#ffd93d' },
    { id: '6bcb77', label: '그린',   hex: '#6bcb77' },
    { id: '4d96ff', label: '블루',   hex: '#4d96ff' },
    { id: 'ff9f43', label: '오렌지', hex: '#ff9f43' },
    { id: 'ff88dd', label: '핑크',   hex: '#ff88dd' },
    { id: 'ffffff', label: '화이트', hex: '#ffffff' },
    { id: '262626', label: '블랙',   hex: '#262626' },
]

const ACCESSORIES_OPTIONS = [
    { id: 'none',           label: '없음',     prob: 0 },
    { id: 'kurt',           label: '틴트안경', prob: 100 },
    { id: 'prescription01', label: '뿔테',     prob: 100 },
    { id: 'prescription02', label: '반뿔테',   prob: 100 },
    { id: 'round',          label: '동그란',   prob: 100 },
    { id: 'sunglasses',     label: '선글라스', prob: 100 },
    { id: 'wayfarers',      label: '웨이파러', prob: 100 },
    { id: 'eyepatch',       label: '안대',     prob: 100 },
]

const FACIAL_HAIR_OPTIONS = [
    { id: 'none',           label: '없음',     prob: 0 },
    { id: 'beardLight',     label: '가는수염', prob: 100 },
    { id: 'beardMedium',    label: '중간수염', prob: 100 },
    { id: 'beardMajestic',  label: '풍성수염', prob: 100 },
    { id: 'moustacheFancy', label: '콧수염1',  prob: 100 },
    { id: 'moustacheMagnum',label: '콧수염2',  prob: 100 },
]

const BG_COLORS = [
    { id: '0a0a0a', label: '다크',   hex: '#0a0a0a' },
    { id: '1a1a2e', label: '네이비', hex: '#1a1a2e' },
    { id: '6c63ff', label: '보라',   hex: '#6c63ff' },
    { id: '16213e', label: '딥블루', hex: '#16213e' },
    { id: '2d3436', label: '그레이', hex: '#2d3436' },
    { id: '6d214f', label: '와인',   hex: '#6d214f' },
    { id: '1e3799', label: '블루',   hex: '#1e3799' },
    { id: '0a3d62', label: '틸',     hex: '#0a3d62' },
    { id: '4a235a', label: '퍼플',   hex: '#4a235a' },
]

const membershipConfig = {
    none:    { label: '멤버십 없음', color: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.4)' },
    basic:   { label: 'BASIC 회원',  color: '#3b82f6',                text: '#93c5fd' },
    premium: { label: 'PREMIUM 회원',color: '#f59e0b',                text: '#fcd34d' },
}

// ── SVG 생성 훅 ───────────────────────────────────────────────
function useAvatarSvg(config: AvatarConfig) {
    return useMemo(() => {
        try {
            return createAvatar(avataaarsStyle, {
                seed: 'laftel-' + JSON.stringify(config),
                top: [config.top as any],
                hairColor: [config.topColor as any],
                clothing: [config.clothing as any],
                clothesColor: [config.clothingColor as any],
                eyes: [config.eyes as any],
                eyebrows: [config.eyebrows as any],
                mouth: [config.mouth as any],
                accessories: [config.accessories as any],
                accessoriesProbability: config.accessoriesProbability,
                facialHair: [config.facialHair as any],
                facialHairProbability: config.facialHairProbability,
                skinColor: [config.skinColor as any],
                backgroundColor: [config.backgroundColor as any],
                backgroundType: ['solid'],
                size: 280,
            }).toString()
        } catch {
            return ''
        }
    }, [config])
}

// ── 색상 피커 ─────────────────────────────────────────────────
function ColorPicker({ colors, value, onChange }: {
    colors: { id: string; label: string; hex: string }[]
    value: string
    onChange: (id: string) => void
}) {
    return (
        <div className="color-row">
            {colors.map(c => (
                <button
                    key={c.id}
                    title={c.label}
                    className={`c-dot${value === c.id ? ' on' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => onChange(c.id)}
                />
            ))}
        </div>
    )
}

// ── 옵션 그리드 ───────────────────────────────────────────────
function OptionGrid({ options, value, onChange }: {
    options: { id: string; label: string }[]
    value: string
    onChange: (id: string) => void
}) {
    return (
        <div className="opt-grid">
            {options.map(o => (
                <button
                    key={o.id}
                    className={`opt-btn${value === o.id ? ' on' : ''}`}
                    onClick={() => onChange(o.id)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function ProfilePage() {
    const { user, setAvatarConfig } = useAuthStore()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('hair')
    const [saved, setSaved] = useState(false)

    const [config, setConfig] = useState<AvatarConfig>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('laftel-avatar')
            if (stored) {
                try { return JSON.parse(stored) } catch {}
            }
        }
        return DEFAULT_CONFIG
    })

    const svg = useAvatarSvg(config)
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

    const membership = (user?.membership || 'none') as 'none' | 'basic' | 'premium'
    const memberInfo = membershipConfig[membership]

    useEffect(() => {
        if (!user) router.push('/login')
    }, [user])

    const update = <K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: val }))
        setSaved(false)
    }

    const randomize = () => {
        const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
        const accOpt = pick(ACCESSORIES_OPTIONS)
        const fhOpt  = pick(FACIAL_HAIR_OPTIONS)
        setConfig({
            top:                    (pick(HAIR_STYLES) as any).id,
            topColor:               (pick(HAIR_COLORS) as any).id,
            clothing:               (pick(CLOTHING_OPTIONS) as any).id,
            clothingColor:          (pick(CLOTHING_COLORS) as any).id,
            eyes:                   (pick(EYES_OPTIONS) as any).id,
            eyebrows:               (pick(EYEBROW_OPTIONS) as any).id,
            mouth:                  (pick(MOUTH_OPTIONS) as any).id,
            accessories:            (accOpt as any).id,
            accessoriesProbability: (accOpt as any).prob,
            facialHair:             (fhOpt as any).id,
            facialHairProbability:  (fhOpt as any).prob,
            skinColor:              (pick(SKIN_COLORS) as any).id,
            backgroundColor:        (pick(BG_COLORS) as any).id,
        })
        setSaved(false)
    }

    const saveConfig = () => {
        localStorage.setItem('laftel-avatar', JSON.stringify(config))
        // 헤더/드롭다운 즉시 반영
        setAvatarConfig({ ...config, svgDataUrl })
        setSaved(true)
        setTimeout(() => setSaved(false), 2200)
    }

    if (!user) return null

    return (
        <>
            <style>{`
                .pp { min-height:100vh; background:#0a0a0a; padding:80px 0 80px; }
                .pp-inner { max-width:960px; margin:0 auto; padding:0 32px; }

                /* 헤더 */
                .pp-head { display:flex; align-items:center; gap:10px; margin-bottom:36px; }
                .pp-back { display:flex; align-items:center; gap:5px; background:none; border:none; color:rgba(255,255,255,.35); font-size:13px; cursor:pointer; padding:0; transition:color .2s; }
                .pp-back:hover { color:rgba(255,255,255,.7); }
                .pp-head h1 { font-size:20px; font-weight:700; color:#fff; margin:0; }

                /* 레이아웃 */
                .pp-layout { display:grid; grid-template-columns:260px 1fr; gap:20px; align-items:start; }

                /* 왼쪽 카드 */
                .pp-card { background:#111; border:1px solid rgba(255,255,255,.08); border-radius:16px; overflow:hidden; }
                .avatar-area { display:flex; align-items:center; justify-content:center; padding:0; }
                .avatar-area img { width:100%; height:auto; display:block; border-radius:0; }
                .pp-card-body { padding:20px; display:flex; flex-direction:column; align-items:center; gap:12px; border-top:1px solid rgba(255,255,255,.06); }
                .pp-name { font-size:16px; font-weight:700; color:#fff; margin:0; }
                .pp-email { font-size:12px; color:rgba(255,255,255,.3); margin:0; }
                .pp-badge { font-size:11px; font-weight:700; padding:4px 12px; border-radius:20px; border:1px solid; letter-spacing:.3px; }
                .pp-btns { display:flex; gap:8px; width:100%; }
                .btn-random { flex:1; height:38px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:10px; color:rgba(255,255,255,.55); font-size:13px; cursor:pointer; transition:all .18s; }
                .btn-random:hover { background:rgba(255,255,255,.1); color:#fff; }
                .btn-save { flex:1; height:38px; background:#6c63ff; border:none; border-radius:10px; color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:background .18s; }
                .btn-save:hover { background:#5a52e0; }
                .btn-save.saved { background:#22c55e; }

                /* 빠른 링크 */
                .pp-links { display:flex; flex-direction:column; gap:1px; margin-top:12px; }
                .pp-link { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; border-radius:10px; color:rgba(255,255,255,.45); font-size:13px; text-decoration:none; transition:all .15s; }
                .pp-link:hover { background:rgba(255,255,255,.05); color:rgba(255,255,255,.8); }

                /* 오른쪽 커스터마이저 */
                .cust { background:#111; border:1px solid rgba(255,255,255,.08); border-radius:16px; overflow:hidden; }
                .cust-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,.07); }
                .ctab { flex:1; padding:14px 0; font-size:13px; font-weight:500; color:rgba(255,255,255,.3); background:none; border:none; cursor:pointer; border-bottom:2px solid transparent; transition:all .18s; }
                .ctab:hover { color:rgba(255,255,255,.6); }
                .ctab.on { color:#fff; border-bottom-color:#6c63ff; }
                .cust-body { padding:22px; display:flex; flex-direction:column; gap:22px; overflow-y:auto; max-height:540px; }

                /* 섹션 */
                .c-sec { display:flex; flex-direction:column; gap:10px; }
                .c-sec-label { font-size:10.5px; font-weight:700; color:rgba(255,255,255,.3); text-transform:uppercase; letter-spacing:.8px; margin:0; }

                /* 색상 피커 */
                .color-row { display:flex; flex-wrap:wrap; gap:8px; }
                .c-dot { width:28px; height:28px; border-radius:50%; cursor:pointer; border:2.5px solid transparent; transition:transform .14s, border-color .14s; flex-shrink:0; outline:none; }
                .c-dot:hover { transform:scale(1.18); }
                .c-dot.on { border-color:#fff; box-shadow:0 0 0 1.5px rgba(255,255,255,.25); }

                /* 옵션 그리드 */
                .opt-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
                .opt-btn { padding:9px 4px; border-radius:8px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); color:rgba(255,255,255,.4); font-size:11.5px; font-weight:500; cursor:pointer; transition:all .15s; text-align:center; }
                .opt-btn:hover { border-color:rgba(255,255,255,.2); color:rgba(255,255,255,.75); background:rgba(255,255,255,.06); }
                .opt-btn.on { border-color:#6c63ff; background:rgba(108,99,255,.2); color:#c4c0ff; }

                /* 토글 */
                .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:4px 0; }
                .toggle-label { font-size:12px; color:rgba(255,255,255,.5); }
                .toggle-sw { width:40px; height:22px; border-radius:11px; background:rgba(255,255,255,.1); border:none; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
                .toggle-sw.on { background:#6c63ff; }
                .toggle-knob { width:16px; height:16px; border-radius:50%; background:#fff; position:absolute; top:3px; left:3px; transition:left .2s; pointer-events:none; }
                .toggle-sw.on .toggle-knob { left:21px; }

                /* 스크롤바 */
                .cust-body::-webkit-scrollbar { width:4px; }
                .cust-body::-webkit-scrollbar-track { background:transparent; }
                .cust-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }
            `}</style>

            <div className="pp">
                <div className="pp-inner">
                    <div className="pp-head">
                        <button className="pp-back" onClick={() => router.back()}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 18-6-6 6-6"/>
                            </svg>
                            뒤로
                        </button>
                        <h1>프로필 설정</h1>
                    </div>

                    <div className="pp-layout">
                        {/* ── 왼쪽 카드 ── */}
                        <div>
                            <div className="pp-card">
                                <div className="avatar-area">
                                    {svg && (
                                        <img
                                            src={svgDataUrl}
                                            alt="내 아바타"
                                            width={260}
                                            height={260}
                                        />
                                    )}
                                </div>
                                <div className="pp-card-body">
                                    <p className="pp-name">{user?.name}</p>
                                    <p className="pp-email">{user?.email}</p>
                                    <span
                                        className="pp-badge"
                                        style={{ borderColor: memberInfo.color, color: memberInfo.text }}
                                    >
                                        {memberInfo.label}
                                    </span>
                                    <div className="pp-btns">
                                        <button className="btn-random" onClick={randomize}>🎲 랜덤</button>
                                        <button
                                            className={`btn-save${saved ? ' saved' : ''}`}
                                            onClick={saveConfig}
                                        >
                                            {saved ? '✓ 저장됨' : '저장'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pp-links">
                                {[
                                    { href: '/membership', label: '멤버십 관리' },
                                    { href: '/point',      label: '내 포인트' },
                                    { href: '/coupon',     label: '쿠폰 등록' },
                                    { href: '/history',    label: '이용내역' },
                                    { href: '/setting',    label: '설정' },
                                ].map(l => (
                                    <Link key={l.href} href={l.href} className="pp-link">
                                        {l.label}
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="m9 18 6-6-6-6"/>
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* ── 오른쪽 커스터마이저 ── */}
                        <div className="cust">
                            <div className="cust-tabs">
                                {TABS.map(t => (
                                    <button
                                        key={t.id}
                                        className={`ctab${activeTab === t.id ? ' on' : ''}`}
                                        onClick={() => setActiveTab(t.id)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="cust-body">
                                {/* ── 헤어 탭 ── */}
                                {activeTab === 'hair' && (
                                    <>
                                        <div className="c-sec">
                                            <p className="c-sec-label">피부 색상</p>
                                            <ColorPicker
                                                colors={SKIN_COLORS}
                                                value={config.skinColor}
                                                onChange={v => update('skinColor', v)}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">헤어 스타일</p>
                                            <OptionGrid
                                                options={HAIR_STYLES}
                                                value={config.top}
                                                onChange={v => update('top', v)}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">헤어 색상</p>
                                            <ColorPicker
                                                colors={HAIR_COLORS}
                                                value={config.topColor}
                                                onChange={v => update('topColor', v)}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ── 얼굴 탭 ── */}
                                {activeTab === 'face' && (
                                    <>
                                        <div className="c-sec">
                                            <p className="c-sec-label">눈</p>
                                            <OptionGrid
                                                options={EYES_OPTIONS}
                                                value={config.eyes}
                                                onChange={v => update('eyes', v)}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">눈썹</p>
                                            <OptionGrid
                                                options={EYEBROW_OPTIONS}
                                                value={config.eyebrows}
                                                onChange={v => update('eyebrows', v)}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">입</p>
                                            <OptionGrid
                                                options={MOUTH_OPTIONS}
                                                value={config.mouth}
                                                onChange={v => update('mouth', v)}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ── 의상 탭 ── */}
                                {activeTab === 'clothing' && (
                                    <>
                                        <div className="c-sec">
                                            <p className="c-sec-label">의상</p>
                                            <OptionGrid
                                                options={CLOTHING_OPTIONS}
                                                value={config.clothing}
                                                onChange={v => update('clothing', v)}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">의상 색상</p>
                                            <ColorPicker
                                                colors={CLOTHING_COLORS}
                                                value={config.clothingColor}
                                                onChange={v => update('clothingColor', v)}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">배경 색상</p>
                                            <ColorPicker
                                                colors={BG_COLORS}
                                                value={config.backgroundColor}
                                                onChange={v => update('backgroundColor', v)}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ── 기타 탭 ── */}
                                {activeTab === 'extras' && (
                                    <>
                                        <div className="c-sec">
                                            <p className="c-sec-label">악세사리</p>
                                            <OptionGrid
                                                options={ACCESSORIES_OPTIONS}
                                                value={config.accessoriesProbability === 0 ? 'none' : config.accessories}
                                                onChange={v => {
                                                    const opt = ACCESSORIES_OPTIONS.find(o => o.id === v)!
                                                    update('accessories', v === 'none' ? 'prescription01' : v)
                                                    update('accessoriesProbability', opt.prob)
                                                }}
                                            />
                                        </div>
                                        <div className="c-sec">
                                            <p className="c-sec-label">수염</p>
                                            <OptionGrid
                                                options={FACIAL_HAIR_OPTIONS}
                                                value={config.facialHairProbability === 0 ? 'none' : config.facialHair}
                                                onChange={v => {
                                                    const opt = FACIAL_HAIR_OPTIONS.find(o => o.id === v)!
                                                    update('facialHair', v === 'none' ? 'beardLight' : v)
                                                    update('facialHairProbability', opt.prob)
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
