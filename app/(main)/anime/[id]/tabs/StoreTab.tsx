'use client'
import { useRouter } from 'next/navigation'
import { usePreviewStore } from '@/store/usePreviewStore'
import storeData from '@/data/store.json'

interface Props {
    detail: any
}

export default function StoreTab({ detail }: Props) {
    const router = useRouter()
    const { setPreviewId } = usePreviewStore()

    const storeItems = detail ? (storeData as any[]).filter((p: any) => {
        if (!p.category || !detail.name) return false
        const cat = p.category.replace(/[!！★\s]/g, '').toLowerCase()
        const name = detail.name.replace(/[!！★\s]/g, '').toLowerCase()
        return name.includes(cat) || cat.includes(name)
    }).slice(0, 8) : []

    if (storeItems.length === 0) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p className="text-white/25 text-sm">관련 굿즈가 없어요</p>
        </div>
    )

    return (
        <div className="py-2">
            <p className="text-white/40 text-xs mb-4">{storeItems.length}개의 관련 굿즈</p>
            <div className="grid grid-cols-4 gap-3">
                {storeItems.map((item: any) => (
                    <div key={item.productId} className="cursor-pointer group"
                        onClick={() => { router.push(`/store/${item.productId}`); setPreviewId(null) }}>
                        <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.05] mb-2 border border-white/[0.06] group-hover:border-[#6c63ff]/40 transition-colors">
                            <img src={item.thumbnail} alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
                        </div>
                        <p className="text-[11px] text-white/30 mb-0.5">{item.category}</p>
                        <p className="text-xs font-semibold text-white/80 line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-xs font-bold text-[#9d97ff] mt-1">{item.soldout ? '품절' : item.price}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}