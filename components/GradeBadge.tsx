// components/GradeBadge.tsx
// 등급 뱃지 공용 컴포넌트 — 닉네임 옆에 사용

const GRADES = [
    { level: 0, name: '베이비', req: 0, color: '#a78bfa', image: 'https://thumbnail.laftel.net/profiles/default/48363a65-24d6-45a0-9eac-8c1726656c63.png' },
    { level: 1, name: '루키', req: 1, color: '#34d399', image: 'https://thumbnail.laftel.net/profiles/default/7478566c-4b3c-4a10-a7c0-2f8c05fb2370.jpg' },
    { level: 2, name: '뉴비', req: 3, color: '#60a5fa', image: 'https://thumbnail.laftel.net/profiles/default/fb48c8c7-ad22-4aa9-9038-c0637ba7e275.png' },
    { level: 3, name: '입문자', req: 5, color: '#f97316', image: 'https://thumbnail.laftel.net/profiles/default/b700435b-3ad2-4a31-9b72-3e9ae631dc47.png' },
    { level: 4, name: '덕후', req: 10, color: '#f43f5e', image: 'https://thumbnail.laftel.net/profiles/default/c38a5328-857c-4c12-a404-53d288460e2a.jpg' },
    { level: 5, name: '중독자', req: 30, color: '#ec4899', image: 'https://thumbnail.laftel.net/profiles/default/40028ff2-895a-4606-b759-2674b1cdc18e.jpg' },
    { level: 6, name: '오타쿠', req: 50, color: '#facc15', image: 'https://thumbnail.laftel.net/profiles/default/37710afc-0caa-4ea3-bd6d-1c900674141e.jpg' },
    { level: 7, name: '신', req: 100, color: '#6c63ff', image: 'https://thumbnail.laftel.net/profiles/default/8c6f615f-b949-4ed8-b027-bcf2bee4ea4a.jpg' },
]

export function getGrade(watched: number) {
    return [...GRADES].reverse().find(g => watched >= g.req) || GRADES[0]
}

interface Props {
    watched: number   // 시청 편수
    size?: 'sm' | 'md'
    showName?: boolean
}

export default function GradeBadge({ watched, size = 'sm', showName = true }: Props) {
    const grade = getGrade(watched)
    const imgSize = size === 'sm' ? 16 : 20
    const fontSize = size === 'sm' ? 10 : 11

    return (
        <span
            title={`${grade.name} (${watched}편 시청)`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: showName ? '1px 6px 1px 2px' : '1px 2px',
                borderRadius: 10,
                background: `${grade.color}18`,
                border: `1px solid ${grade.color}30`,
                verticalAlign: 'middle',
                flexShrink: 0,
            }}
        >
            <img
                src={grade.image}
                alt={grade.name}
                style={{ width: imgSize, height: imgSize, borderRadius: '50%', objectFit: 'cover' }}
            />
            {showName && (
                <span style={{ fontSize, fontWeight: 700, color: grade.color, lineHeight: 1 }}>
                    {grade.name}
                </span>
            )}
        </span>
    )
}
