'use client'
import { useRouter } from 'next/navigation'

const MOODS = [
    { id: 'emotional_damage', img: '/images/mood/mood1.png', label: '눈물이 멈추지 않아..', sub: '여운이 감게 남는 후유증 레전드 애니', color: '#6366f1' },
    { id: 'action_hype', img: '/images/mood/mood2.png', label: '스트레스 풀고 싶어 !!', sub: '화려한 전투씬을 자랑하는 애니', color: '#ef4444' },
    { id: 'dopamine', img: '/images/mood/mood3.png', label: '어라..? 벌써 새벽 3시?!', sub: '중독성 미쳐서 멈출 수 없는 애니', color: '#f59e0b' },
    { id: 'dark_fantasy', img: '/images/mood/mood4.png', label: '히키코모리가 되어 볼까..?', sub: '어두움의 대명사! 애니', color: '#8b5cf6' },
    { id: 'healing', img: '/images/mood/mood5.png', label: '각박한 세상..힐링이 필요해', sub: '마음이 풍실풍실해지는 애니', color: '#10b981' },
    { id: 'random', img: '/images/mood/mood6.png', label: "애니 가차 Let's Go!", sub: '오늘의 운세에 맞는 애니 추천', color: '#94a3b8' },
]

export default function MoodSection() {
    const router = useRouter()

    return (
        <section style={{ padding: '56px 0 0' }}>
            <style>{`
                .mood-wrap { width: 90%; margin: 0 auto; }
                .mood-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
                .mood-eyebrow { font-size: 13px; font-weight: 500; color: var(--text-faint); letter-spacing: .08em; text-transform: uppercase; margin: 0 0 5px; }
                .mood-title { font-size: 25px; font-weight: 700; color: var(--text-primary); margin: 0; }
                .mood-more { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--text-faint); font-size: 13px; cursor: pointer; padding: 0; transition: color .2s; }
                .mood-more:hover { color: var(--text-high); }
                .mood-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
                .mood-card { position: relative; aspect-ratio: 3 / 4; border-radius: 16px; overflow: hidden; cursor: pointer; border: none; padding: 0; background: var(--bg-card); transition: transform .22s cubic-bezier(.25,.46,.45,.94); }
                .mood-card:hover { transform: translateY(-4px); }
                .mood-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: filter .3s, transform .3s; transform: scale(1); }
                .mood-card:hover .mood-bg { filter: blur(4px) brightness(0.35); transform: scale(1.06); }
                .mood-grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%); pointer-events: none; transition: opacity .3s; }
                .mood-card:hover .mood-grad { opacity: 0; }
                .mood-overlay { position: absolute; inset:0; backdrop-filter: blur(4px) saturate(150%) brightness(1.1); -webkit-backdrop-filter: blur(4px) saturate(150%) brightness(1.1); background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; opacity: 0; transition: opacity .3s; pointer-events: none; }
                .mood-card:hover .mood-overlay { opacity: 1; }
                .mood-default { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 16px 18px; transition: opacity .25s, transform .25s; }
                .mood-card:hover .mood-default { opacity: 0; transform: translateY(8px); }
                .mood-label { font-size: 20px; font-weight: 700; color: #fff; line-height: 1.35; margin: 0 0 4px; text-align: left; }
                .mood-sub { font-size: 15px; color: rgba(255,255,255,.5); margin: 0; line-height: 1.4; text-align: left; }
                .mood-hover { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; opacity: 0; transform: translateY(6px); transition: opacity .25s, transform .25s; pointer-events: none; }
                .mood-card:hover .mood-hover { opacity: 1; transform: translateY(0); pointer-events: auto; }
                .mood-hover-label { font-size: 25px; font-weight: 700; color: #fff; line-height: 1.35; margin-bottom: 6px; text-align: center; }
                .mood-hover-sub { font-size: 15px; color: rgba(255,255,255,.55); margin-bottom: 20px; text-align: center; line-height: 1.5; }
                .mood-btn { padding: 8px 20px; border-radius: 20px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .18s; backdrop-filter: blur(4px); margin-top: 10px; }
                .mood-btn:hover { background: rgba(255,255,255,0.25); }
                @media (max-width: 1180px) {
                    .mood-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 640px) {
                    .mood-wrap { width: calc(100% - 32px); }
                    .mood-eyebrow { font-size: 11px; line-height: 1.4; }
                    .mood-title { font-size: 21px; line-height: 1.35; }
                    .mood-grid { display: flex; gap: 12px; margin-right: -16px; padding-right: 16px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
                    .mood-grid::-webkit-scrollbar { display: none; }
                    .mood-card { flex: 0 0 min(48vw, 190px); scroll-snap-align: start; border-radius: 12px; }
                    .mood-label { font-size: 16px; }
                    .mood-sub { font-size: 12px; }
                    .mood-hover-label { font-size: 18px; }
                    .mood-hover-sub { font-size: 12px; margin-bottom: 10px; }
                }
            `}</style>

            <div className="mood-wrap">
                <div className="mood-head">
                    <div>
                        <p className="mood-eyebrow">라프텔이 추천하는 감정 맞춤 애니메이션</p>
                        <h2 className="mood-title">오늘 당신의 덕심을 채워 줄 감정은?</h2>
                    </div>
                </div>
                <div className="mood-grid">
                    {MOODS.map((mood) => (
                        <button key={mood.id} className="mood-card"
                            onClick={() => router.push(`/mood?emotion=${mood.id}`)}>
                            <img className="mood-bg" src={mood.img} alt={mood.label} />
                            <div className="mood-grad" />
                            <div className="mood-overlay" />
                            <div className="mood-default">
                                <p className="mood-label">{mood.label}</p>
                                <p className="mood-sub">{mood.sub}</p>
                            </div>
                            <div className="mood-hover">
                                <p className="mood-hover-label">{mood.label}</p>
                                <p className="mood-hover-sub">{mood.sub}</p>
                                <span className="mood-btn">보러가기</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    )
}
