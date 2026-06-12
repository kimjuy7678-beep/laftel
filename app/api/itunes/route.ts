import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const query = searchParams.toString()
    const url = `https://itunes.apple.com/search?${query}`
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json({ results: [] }, { status: 500 })
    }
}