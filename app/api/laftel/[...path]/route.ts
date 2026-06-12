import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.laftel.net/api/events/v2'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params
    const pathStr = path.join('/')
    const { searchParams } = new URL(req.url)
    const query = searchParams.toString()
    const url = `${BASE}/${pathStr}/${query ? '?' + query : ''}`
    try {
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json({ error: 'failed' }, { status: 500 })
    }
}