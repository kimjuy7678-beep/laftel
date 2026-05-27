'use client'
import { useEffect, useRef, useState } from 'react'
import Marquee from 'react-fast-marquee'

const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY

// 한국 + 미국 + 일본 종목
const STOCKS = [
    // 미국
    { symbol: 'NFLX', name: '넷플릭스', flag: '🇺🇸' },
    { symbol: 'DIS', name: '디즈니', flag: '🇺🇸' },
    { symbol: 'SONY', name: '소니', flag: '🇺🇸' },
    { symbol: 'AMZN', name: '아마존', flag: '🇺🇸' },
    { symbol: 'MSFT', name: '마이크로소프트', flag: '🇺🇸' },
    // 한국 (KRX - Yahoo Finance 포맷)
    { symbol: '005930.KS', name: '삼성전자', flag: '🇰🇷' },
    { symbol: '035420.KS', name: 'NAVER', flag: '🇰🇷' },
    { symbol: '035720.KS', name: '카카오', flag: '🇰🇷' },
    { symbol: '251270.KS', name: '넷마블', flag: '🇰🇷' },
    { symbol: '263750.KS', name: '펄어비스', flag: '🇰🇷' },
    // 일본 (Finnhub - Tokyo Stock Exchange)
    { symbol: 'TYO:4689', name: 'Z홀딩스', flag: '🇯🇵' },
    { symbol: 'TYO:7832', name: '반다이남코', flag: '🇯🇵' },
    { symbol: 'TYO:4751', name: 'DeNA', flag: '🇯🇵' },
    { symbol: 'TYO:3632', name: 'GREE', flag: '🇯🇵' },
    { symbol: 'TYO:9684', name: '스퀘어에닉스', flag: '🇯🇵' },
]

interface StockData {
    symbol: string
    name: string
    flag: string
    price: number
    change: number
    changePct: number
}

async function fetchFinnhub(symbol: string): Promise<{ price: number; change: number; changePct: number } | null> {
    try {
        const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
        )
        const data = await res.json()
        if (!data.c || data.c === 0) return null
        return {
            price: data.c,
            change: data.d || 0,
            changePct: data.dp || 0,
        }
    } catch { return null }
}

export default function StockMarquee() {
    const [stocks, setStocks] = useState<StockData[]>([])
    const [loading, setLoading] = useState(true)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchAll = async () => {
        const results: StockData[] = []
        // 5개씩 배치 (API 레이트리밋)
        for (let i = 0; i < STOCKS.length; i += 5) {
            const batch = STOCKS.slice(i, i + 5)
            const batchResults = await Promise.all(
                batch.map(async s => {
                    const data = await fetchFinnhub(s.symbol)
                    if (!data) return null
                    return { ...s, ...data }
                })
            )
            batchResults.forEach(r => r && results.push(r))
            if (i + 5 < STOCKS.length) await new Promise(r => setTimeout(r, 300))
        }
        if (results.length > 0) setStocks(results)
        setLoading(false)
    }

    useEffect(() => {
        fetchAll()
        // 30초마다 갱신
        intervalRef.current = setInterval(fetchAll, 30000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [])

    if (loading && stocks.length === 0) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9998,
            background: 'rgba(10,10,10,0.97)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,.08)',
            padding: '9px 0',
            overflow: 'hidden',
        }}>
            <style>{`
                .stock-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 28px;
                    border-right: 1px solid rgba(255,255,255,.08);
                    white-space: nowrap;
                }
                .stock-flag { font-size: 13px; }
                .stock-name { font-size: 12px; color: rgba(255,255,255,.5); font-weight: 600; }
                .stock-price { font-size: 13px; font-weight: 700; color: #fff; }
                .stock-change-up { font-size: 11px; font-weight: 700; color: #22c55e; display: flex; align-items: center; gap: 2px; }
                .stock-change-down { font-size: 11px; font-weight: 700; color: #ef4444; display: flex; align-items: center; gap: 2px; }
                .stock-change-flat { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.4); }
            `}</style>
            <Marquee speed={40} gradient={false} pauseOnHover>
                {[...stocks, ...stocks].map((s, i) => (
                    <div key={`${s.symbol}-${i}`} className="stock-item">
                        <span className="stock-flag">{s.flag}</span>
                        <span className="stock-name">{s.name}</span>
                        <span className="stock-price">
                            {s.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {s.changePct > 0.05 ? (
                            <span className="stock-change-up">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,4 22,20 2,20" /></svg>
                                {s.changePct.toFixed(2)}%
                            </span>
                        ) : s.changePct < -0.05 ? (
                            <span className="stock-change-down">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,20 22,4 2,4" /></svg>
                                {Math.abs(s.changePct).toFixed(2)}%
                            </span>
                        ) : (
                            <span className="stock-change-flat">-</span>
                        )}
                    </div>
                ))}
            </Marquee>
        </div>
    )
}
