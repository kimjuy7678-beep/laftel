'use client'
import { usePreviewStore } from '@/store/usePreviewStore'

const IMG = 'https://image.tmdb.org/t/p'

interface Props {
    similar: any[]
}

export default function SimilarTab({ similar }: Props) {
    const { setPreviewId } = usePreviewStore()

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {similar.length === 0 ? (
                <div className="flex items-center justify-center py-10 col-span-full">
                    <div className="w-5 h-5 border-2 border-white/10 border-t-[#6c63ff] rounded-full animate-spin" />
                </div>
            ) : similar.map((item: any) => (
                <div key={item.id} className="cursor-pointer group" onClick={() => setPreviewId(item.id)}>
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#181818] mb-2 transition-transform duration-300 group-hover:scale-[1.03]">
                        {item.poster_path
                            ? <img src={`${IMG}/w342${item.poster_path}`} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/10">{(item.name || '?')[0]}</div>
                        }
                    </div>
                    <p className="text-xs font-semibold text-white/80 line-clamp-2">{item.name}</p>
                    <p className="text-[11px] text-white/30">{item.first_air_date?.slice(0, 4)}</p>
                </div>
            ))}
        </div>
    )
}