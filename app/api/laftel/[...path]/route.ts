import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.laftel.net/api'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params
    const pathStr = path.join('/')
    const { searchParams } = new URL(req.url)
    const query = searchParams.toString()
    const url = `${BASE}/${pathStr}${query ? '?' + query : ''}`

    console.log('프록시 요청 URL:', url)  // ← 추가

    try {
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0',  // ← 추가 (봇 차단 우회)
            }
        })
        console.log('응답 status:', res.status)  // ← 추가
        const data = await res.json()
        return NextResponse.json(data)
    } catch (e) {
        console.error('프록시 에러:', e)  // ← 추가
        return NextResponse.json({ error: 'failed' }, { status: 500 })
    }
}