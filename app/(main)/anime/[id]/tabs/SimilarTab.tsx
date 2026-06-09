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
                    <div className="w-5 h-5 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'var(--border)', borderTopColor: '#6c63ff' }} />
                </div>
            ) : similar.map((item: any) => (
                <div key={item.id} className="cursor-pointer group" onClick={() => setPreviewId(item.id)}>
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-2 transition-transform duration-300 group-hover:scale-[1.03]"
                        style={{ background: 'var(--bg-card)' }}>
                        {item.poster_path
                            ? <img src={`${IMG}/w342${item.poster_path}`} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl font-black"
                                style={{ color: 'var(--text-faint)' }}>{(item.name || '?')[0]}</div>
                        }
                    </div>
                    <p className="text-xs font-semibold line-clamp-2" style={{ color: 'var(--text-high)' }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>{item.first_air_date?.slice(0, 4)}</p>
                </div>
            ))}
        </div>
    )
}