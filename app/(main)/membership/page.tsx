"use client"
import { useEffect, useState } from 'react'
import { useAniStore } from '@/store/useAniStore'
import MembershipHero from '@/components/MembershipHero'
import MembershipMarquee from '@/components/MembershipMarquee'
import MembershipPlayer from '@/components/MembershipPlayer'
import MembershipTV from '@/components/MembershipTv'
import MembershipProfiles from '@/components/MembershipProfiles'
import MembershipLive from '@/components/MembershipLive'
import MembershipOST from '@/components/MembershipOst'
import MembershipReviews from '@/components/MembershipViews'
import MembershipPlans from '@/components/MembershipPlans'
import MembershipNotice from '@/components/MembershipNotice'
import MembershipModal from '@/components/MembershipModal'

type PlanId = 'anime' | 'ost' | 'allinone'

interface Anime {
    backdrop_path: string
    name: string
}

export default function MembershipPage() {
    const { aniList, onFetchAni } = useAniStore()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalPlan, setModalPlan] = useState<PlanId>('allinone')

    useEffect(() => {
        if (aniList.length === 0) onFetchAni()
    }, [])

    const gridAnime: Anime[] = (aniList as Anime[]).filter(a => a.backdrop_path).slice(0, 12)

    const openModal = (plan: PlanId = 'allinone') => {
        setModalPlan(plan)
        setIsModalOpen(true)
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <MembershipHero onOpenModal={() => openModal()} />
            <MembershipMarquee gridAnime={gridAnime} onOpenModal={() => openModal()} />
            <MembershipPlayer />
            <MembershipTV />
            <MembershipProfiles />
            <MembershipLive />
            <MembershipOST />
            <MembershipReviews />
            <MembershipPlans onOpenModal={openModal} />
            <MembershipNotice />
            <MembershipModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                defaultPlan={modalPlan}
            />
        </div>
    )
}