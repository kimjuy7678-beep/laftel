"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Marquee from "react-fast-marquee"
import { useAuthStore } from "@/store/useAuthStore"

interface AnimeItem {
    id: number
    backdrop_path: string
}

export default function LoginPage() {
    const router = useRouter()
    const { googleLogin } = useAuthStore()
    const [images, setImages] = useState<string[]>([])

    useEffect(() => {
        const fetchAnime = async () => {
            try {
                const res = await fetch(
                    `https://api.themoviedb.org/3/discover/tv?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&page=1`
                )
                const data = await res.json()
                const backdrops = data.results
                    .filter((item: AnimeItem) => item.backdrop_path)
                    .map((item: AnimeItem) => `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`)
                setImages([...backdrops, ...backdrops, ...backdrops])
            } catch (err) {
                console.error(err)
            }
        }
        fetchAnime()
    }, [])

    const marqueeRows = useMemo(() => [
        images.slice(0, 12), images.slice(12, 24), images.slice(24, 36),
        images.slice(36, 48), images.slice(48, 60), images.slice(60, 72), images.slice(72, 84),
    ], [images])

    const handleGoogleLogin = async () => {
        try {
            await googleLogin()
            router.push('/profile')
        } catch (err) {
            console.error("구글 로그인 실패:", err)
        }
    }

    const handleNaverLogin = () => {
        const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
        const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/login/naver/callback`)
        const STATE = Math.random().toString(36).substring(2)
        sessionStorage.setItem('naver_state', STATE)
        const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}`
        window.location.href = url
    }

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-black/70 z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black z-10" />
                <div className="absolute inset-[-25%] rotate-[-12deg] scale-[1.35] flex flex-col justify-center gap-5">
                    {marqueeRows.map((row, idx) => (
                        <Marquee key={idx} speed={35 + idx * 5} gradient={false} direction={idx % 2 === 0 ? "left" : "right"}>
                            <div className="flex gap-5 pr-5">
                                {[...row, ...row].map((img, i) => (
                                    <div key={i} className="w-[360px] aspect-video rounded-2xl overflow-hidden shrink-0">
                                        <img src={img} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" />
                                    </div>
                                ))}
                            </div>
                        </Marquee>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-[420px] flex flex-col items-center gap-6 relative z-20">
                <img src="/images/logo-white.svg" alt="" />
                <p className="text-white text-xl font-medium text-center leading-relaxed">
                    동시방영 신작부터 역대 인기작까지<br />
                    한 곳에서 편-안하게!
                </p>

                <div className="w-full flex flex-col gap-3 mt-2">
                    <Link href="/login/email" className="w-full h-[56px] bg-[#6c63ff] hover:bg-[#5a52e0] transition-colors rounded-xl flex items-center text-white font-bold text-base relative">
                        <span className="absolute left-5">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                        </span>
                        <span className="w-full text-center">이메일로 시작</span>
                    </Link>
                </div>

                <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-px bg-white/20" />
                    <span className="text-white/50 text-sm">또는</span>
                    <div className="flex-1 h-px bg-white/20" />
                </div>

                <div className="flex items-center gap-5">
                    <Link href="/login/kakao" className="w-[72px] h-[72px] rounded-full bg-[#FEE500] hover:brightness-95 transition-all flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#3C1E1E">
                            <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.548 1.516 4.787 3.805 6.116L4.94 20.13a.5.5 0 0 0 .718.543l4.498-2.937A11.6 11.6 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
                        </svg>
                    </Link>
                    <button onClick={handleGoogleLogin} className="w-[72px] h-[72px] rounded-full bg-white hover:brightness-95 transition-all flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    </button>
                    <button onClick={handleNaverLogin} className="w-[72px] h-[72px] rounded-full bg-[#03C75A] hover:brightness-95 transition-all flex items-center justify-center">
                        <span className="text-white font-black text-2xl leading-none">N</span>
                    </button>
                </div>

                <Link href="/login/help" className="text-white/50 text-sm underline underline-offset-2 hover:text-white/80 transition-colors mt-2">
                    로그인에 어려움을 겪고 계신가요?
                </Link>
            </div>
        </div>
    )
}