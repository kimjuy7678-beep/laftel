'use client'
import { useRouter } from 'next/navigation'
import { usePreviewStore } from '@/store/usePreviewStore'

const IMG = 'https://image.tmdb.org/t/p'

interface Props {
    detail: any
    episodes: any[]
    selectedSeason: number
    setSelectedSeason: (v: number) => void
}

export default function EpisodesTab({ detail, episodes, selectedSeason, setSelectedSeason }: Props) {
    const router = useRouter()
    const { previewId, setPreviewId } = usePreviewStore()

    return (
        <div className="flex flex-col gap-2">
            <select
                value={selectedSeason}
                onChange={e => setSelectedSeason(Number(e.target.value))}
                className="mb-3 bg-white/[0.06] border border-[var(--border)] text-white text-sm rounded-lg px-3 py-2 w-fit cursor-pointer"
            >
                {(detail?.seasons || [])
                    .filter((s: any) => s.season_number > 0)
                    .map((s: any) => (
                        <option key={s.season_number} value={s.season_number} className="bg-[var(--bg-card)]">
                            시즌 {s.season_number} ({s.episode_count}화)
                        </option>
                    ))
                }
            </select>
            {episodes.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[#6c63ff] rounded-full animate-spin" />
                </div>
            ) : episodes.map((ep: any) => (
                <div
                    key={ep.episode_number}
                    className="flex gap-3 items-center p-3 rounded-xl hover:bg-white/[0.05] cursor-pointer group transition-colors"
                    onClick={() => { router.push(`/anime/${previewId}?ep=${ep.episode_number}`); setPreviewId(null) }}
                >
                    <div className="relative w-[120px] min-w-[120px] aspect-video rounded-lg overflow-hidden bg-[var(--bg-card)] shrink-0">
                        {ep.still_path
                            ? <img src={`${IMG}/w300${ep.still_path}`} alt={ep.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-white/10 text-xl font-black">{ep.episode_number}</div>
                        }
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[var(--text-faint)] mb-0.5">{ep.episode_number}화</p>
                        <p className="text-sm font-semibold text-white/90 truncate">{ep.name}</p>
                        {ep.runtime && <p className="text-[11px] text-[var(--text-faint)] mt-0.5">{ep.runtime}분</p>}
                    </div>
                </div>
            ))}
        </div>
    )
}