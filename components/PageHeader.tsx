'use client'

interface PageHeaderProps {
    title: string
    sub?: string
}

export default function PageHeader({ title, sub }: PageHeaderProps) {
    return (
        <div style={{
            width: '100%',
            margin: '0 auto',
            padding: '50px 0 32px',
        }}>
            <h1 style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
            }}>
                {title}
            </h1>
            {sub && (
                <p style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.4)',
                    margin: '8px 0 0',
                }}>
                    {sub}
                </p>
            )}
        </div>
    )
}
