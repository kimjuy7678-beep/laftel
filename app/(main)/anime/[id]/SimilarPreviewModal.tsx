'use client'
import { useRouter } from 'next/navigation'
import { IMG } from './useAnimeDetail'

interface Props { item: any; onClose: () => void }

export default function SimilarPreviewModal({ item, onClose }: Props) {
    const router = useRouter()
    if (!item) return null

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="relative h-[200px] overflow-hidden">
                    <img src={`${IMG}/w780${item.backdrop_path || item.poster_path}`} className="w-full h-full object-cover" alt={item.name} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-card), transparent)' }} />
                </div>
                <div className="px-6 pb-6 -mt-6 relative">
                    <h2 className="text-lg font-black mb-1 text-[var(--text-primary)]">{item.name}</h2>
                    <p className="text-xs text-[var(--text-faint)] mb-3">{item.first_air_date?.slice(0, 4)}</p>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-3 mb-5">
                        {item.overview || '줄거리 정보가 없어요'}
                    </p>
                    <div className="flex gap-2">
                        <button className="flex-1 py-2.5 bg-[#6c63ff] rounded-lg text-sm font-bold text-white hover:bg-[#5a52e0] transition-colors"
                            onClick={() => router.push(`/anime/${item.id}?play=1`)}>
                            ▶ 재생하기
                        </button>
                        <button className="flex-1 py-2.5 bg-[var(--bg-hover)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                            onClick={() => router.push(`/anime/${item.id}`)}>
                            상세보기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
