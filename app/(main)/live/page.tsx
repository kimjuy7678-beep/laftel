import Link from 'next/link'
import channels from '@/data/channels.json'

export default function LivePage() {
    return (
        <div className="min-h-screen">
            <div className="inner px-6 py-16">
                <div className="flex items-center gap-3 mb-8">
                    <h1 className="text-2xl font-bold">라이브</h1>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                    </span>
                </div>

                <ul className="grid grid-cols-3 gap-6">
                    {channels.map((ch) => (
                        <li key={ch.id}>
                            <Link href={`/live/${ch.slug}`} className="group block">
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] flex items-center justify-center border border-white/5 hover:border-white/20 transition-colors">
                                    {/* 라이브 배지 */}
                                    <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full text-xs font-bold text-white z-10">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                        LIVE
                                    </span>
                                    {/* 채널 로고 */}
                                    <div className="flex flex-col items-center gap-3">
                                        <img
                                            src={ch.logo}
                                            alt={ch.name}
                                            className="w-50 h-16 object-contain"
                                        />
                                        <span className="text-white/80 text-m">{ch.name}</span>
                                    </div>
                                    {/* 호버 오버레이 */}
                                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                                <polygon points="5,3 19,12 5,21"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <p className="text-white font-medium">{ch.name}</p>
                                    <p className="text-white/40 text-xs mt-0.5">{ch.description}</p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}