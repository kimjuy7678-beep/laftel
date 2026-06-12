import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.laftel.net/api'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params
    const pathStr = path.join('/')
    const { searchParams } = new URL(req.url)
    const query = searchParams.toString()
    const url = `${BASE}/${pathStr}${query ? '?' + query : ''}`

    try {
        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://laftel.net',
                'Referer': 'https://laftel.net/',
            }
        })
        const data = await res.json()
        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: 'failed' }, { status: 500 })
    }
}