'use client'
import OstSectionDetail from '@/components/anime/OstSectionDetail'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const IMG = 'https://image.tmdb.org/t/p'

const GENRE_MAP: Record<number, string> = {
    16: '애니메이션', 10759: '액션·어드벤처', 35: '코미디', 18: '드라마',
    14: '판타지', 10765: 'SF', 9648: '미스터리', 27: '공포',
    10751: '가족', 10762: '어린이', 10749: '로맨스', 80: '범죄',
    53: '스릴러', 99: '다큐멘터리',
}

export default function AnimeDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [detail, setDetail] = useState<any>(null)
    const [credits, setCredits] = useState<any[]>([])
    const [similar, setSimilar] = useState<any[]>([])
    const [trailer, setTrailer] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [liked, setLiked] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'cast' | 'similar'>('info')

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([
            fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/aggregate_credits?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/similar?api_key=${TMDB_KEY}&language=ko-KR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_KEY}`).then(r => r.json()),
        ]).then(([det, cred, sim, vids]) => {
            setDetail(det)
            setCredits((cred.cast || []).slice(0, 20))
            setSimilar((sim.results || []).slice(0, 12))
            const t = (vids.results || []).find((v: any) =>
                v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
            )
            if (t) setTrailer(t.key)
        }).finally(() => setLoading(false))
    }, [id])

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )

    if (!detail || detail.status_code === 34) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>작품을 찾을 수 없어요</p>
            <button onClick={() => router.back()} style={{ padding: '10px 24px', background: '#6c63ff', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 }}>돌아가기</button>
        </div>
    )

    const backdrop = detail.backdrop_path ? `${IMG}/original${detail.backdrop_path}` : null
    const poster   = detail.poster_path   ? `${IMG}/w500${detail.poster_path}`       : null
    const score    = Math.round((detail.vote_average || 0) * 10) / 10
    const year     = detail.first_air_date?.slice(0, 4) || ''
    const genres   = (detail.genres || []).map((g: any) => GENRE_MAP[g.id] || g.name)
    const seasons  = detail.number_of_seasons || 0
    const episodes = detail.number_of_episodes || 0
    const status   = detail.status === 'Returning Series' ? '방영중' : detail.status === 'Ended' ? '완결' : detail.status || ''

    return (
        <>
            <style>{`
                .det-wrap { min-height: 100vh; background: #0a0a0a; color: #fff; padding-top: 56px; }

                /* 히어로 */
                .det-hero { position: relative; width: 100%; height: 520px; overflow: hidden; }
                .det-hero-bg { position: absolute; inset: 0; }
                .det-hero-bg img { width: 100%; height: 100%; object-fit: cover; }
                .det-hero-dim {
                    position: absolute; inset: 0;
                    background: linear-gradient(to right, rgba(10,10,10,1) 30%, rgba(10,10,10,0.4) 70%, rgba(10,10,10,0.2) 100%),
                                linear-gradient(to top, rgba(10,10,10,1) 0%, transparent 60%);
                }
                .det-hero-content {
                    position: relative; z-index: 10;
                    display: flex; align-items: flex-end;
                    height: 100%; max-width: 1200px;
                    margin: 0 auto; padding: 0 48px 48px;
                    gap: 36px;
                }
                .det-poster {
                    width: 170px; min-width: 170px; height: 255px;
                    border-radius: 12px; overflow: hidden;
                    background: #1e1e1e;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.7);
                    flex-shrink: 0;
                }
                .det-poster img { width: 100%; height: 100%; object-fit: cover; }
                .det-poster-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 48px; font-weight: 800; color: rgba(255,255,255,0.08);
                }
                .det-meta { flex: 1; min-width: 0; }
                .det-badges { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
                .det-badge {
                    font-size: 11px; font-weight: 600;
                    padding: 3px 10px; border-radius: 4px;
                    background: rgba(108,99,255,0.2); color: #9d97ff;
                    border: 1px solid rgba(108,99,255,0.3);
                }
                .det-badge.green { background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.25); }
                .det-title { font-size: 34px; font-weight: 900; line-height: 1.2; margin: 0 0 8px; }
                .det-title-orig { font-size: 14px; color: rgba(255,255,255,0.35); margin: 0 0 14px; }
                .det-score-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
                .det-score { display: flex; align-items: center; gap: 5px; font-size: 22px; font-weight: 800; color: #fbbf24; }
                .det-score-sub { font-size: 13px; color: rgba(255,255,255,0.35); }
                .det-info-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
                .det-chip {
                    font-size: 12px; color: rgba(255,255,255,0.5);
                    padding: 4px 12px; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.04);
                }
                .det-actions { display: flex; gap: 10px; }
                .det-btn-play {
                    display: flex; align-items: center; gap-8px; gap: 8px;
                    height: 46px; padding: 0 28px;
                    background: #6c63ff; border: none; border-radius: 10px;
                    color: #fff; font-size: 15px; font-weight: 700;
                    cursor: pointer; transition: background .2s;
                }
                .det-btn-play:hover { background: #5a52e0; }
                .det-btn-icon {
                    width: 46px; height: 46px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px; cursor: pointer; transition: all .2s;
                    color: rgba(255,255,255,0.6);
                }
                .det-btn-icon:hover { background: rgba(255,255,255,0.14); color: #fff; }
                .det-btn-icon.liked { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }

                /* 바디 */
                .det-body { max-width: 1200px; margin: 0 auto; padding: 40px 48px 80px; }

                /* 탭 */
                .det-tabs { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 36px; }
                .det-tab {
                    padding: 12px 24px; font-size: 14px; font-weight: 600;
                    color: rgba(255,255,255,0.35); background: none; border: none;
                    cursor: pointer; position: relative; transition: color .2s;
                }
                .det-tab.active { color: #fff; }
                .det-tab.active::after {
                    content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
                    height: 2px; background: #6c63ff; border-radius: 1px;
                }

                /* 정보 탭 */
                .det-overview { font-size: 15px; line-height: 1.9; color: rgba(255,255,255,0.65); margin: 0 0 36px; max-width: 720px; }
                .det-section-title { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.85); margin: 0 0 16px; }
                .det-genre-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 36px; }
                .det-genre-tag {
                    font-size: 13px; padding: 6px 16px; border-radius: 20px;
                    background: rgba(108,99,255,0.12); color: #9d97ff;
                    border: 1px solid rgba(108,99,255,0.2);
                }
                .det-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
                .det-stat {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 12px; padding: 20px;
                }
                .det-stat-val { font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 4px; }
                .det-stat-label { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0; }

                /* 트레일러 */
                .det-trailer { margin-bottom: 36px; }
                .det-trailer-frame {
                    width: 100%; max-width: 720px;
                    aspect-ratio: 16/9;
                    border-radius: 12px; overflow: hidden;
                    background: #111;
                }
                .det-trailer-frame iframe { width: 100%; height: 100%; border: none; }

                /* 출연진 탭 */
                .det-cast-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; }
                .det-cast-card { text-align: center; }
                .det-cast-thumb {
                    width: 100%; aspect-ratio: 1/1; border-radius: 50%;
                    overflow: hidden; background: #1e1e1e; margin: 0 auto 10px;
                    max-width: 100px;
                }
                .det-cast-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .det-cast-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 28px; font-weight: 800; color: rgba(255,255,255,0.08);
                }
                .det-cast-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 3px; }
                .det-cast-role { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }

                /* 유사 탭 */
                .det-sim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 20px 13px; }
                .det-sim-card { cursor: pointer; }
                .det-sim-thumb {
                    width: 100%; aspect-ratio: 2/3; border-radius: 8px;
                    overflow: hidden; background: #181818; margin-bottom: 8px;
                    transition: transform .25s;
                }
                .det-sim-card:hover .det-sim-thumb { transform: scale(1.03); }
                .det-sim-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .det-sim-np {
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 32px; font-weight: 800; color: rgba(255,255,255,0.08);
                }
                .det-sim-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 3px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                .det-sim-year { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; }

                /* 백 버튼 */
                .det-back {
                    position: fixed; top: 70px; left: 24px; z-index: 100;
                    display: flex; align-items: center; gap-6px; gap: 6px;
                    padding: 8px 14px; border-radius: 8px;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.6); font-size: 13px;
                    cursor: pointer; transition: all .2s;
                }
                .det-back:hover { color: #fff; background: rgba(0,0,0,0.8); }
            `}</style>

            <div className="det-wrap">
                <button className="det-back" onClick={() => router.back()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                    뒤로
                </button>

                {/* 히어로 */}
                <div className="det-hero">
                    <div className="det-hero-bg">
                        {backdrop
                            ? <img src={backdrop} alt={detail.name} />
                            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
                        }
                    </div>
                    <div className="det-hero-dim" />
                    <div className="det-hero-content">
                        <div className="det-poster">
                            {poster
                                ? <img src={poster} alt={detail.name} />
                                : <div className="det-poster-np">{(detail.name||'?')[0]}</div>
                            }
                        </div>
                        <div className="det-meta">
                            <div className="det-badges">
                                {status && <span className={`det-badge${status === '방영중' ? ' green' : ''}`}>{status}</span>}
                                {genres.slice(0, 3).map((g: string) => (
                                    <span key={g} className="det-badge">{g}</span>
                                ))}
                            </div>
                            <h1 className="det-title">{detail.name}</h1>
                            {detail.original_name !== detail.name && (
                                <p className="det-title-orig">{detail.original_name}</p>
                            )}
                            <div className="det-score-row">
                                {score > 0 && (
                                    <div className="det-score">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                        {score}
                                    </div>
                                )}
                                <span className="det-score-sub">{detail.vote_count?.toLocaleString()}명 평가</span>
                            </div>
                            <div className="det-info-chips">
                                {year && <span className="det-chip">{year}</span>}
                                {seasons > 0 && <span className="det-chip">시즌 {seasons}</span>}
                                {episodes > 0 && <span className="det-chip">{episodes}화</span>}
                                {detail.original_language && <span className="det-chip">{detail.original_language.toUpperCase()}</span>}
                            </div>
                            <div className="det-actions">
                                <button className="det-btn-play">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                    재생하기
                                </button>
                                <button
                                    className={`det-btn-icon${liked ? ' liked' : ''}`}
                                    onClick={() => setLiked(v => !v)}
                                    title="찜하기"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                    </svg>
                                </button>
                                <button className="det-btn-icon" title="공유">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 바디 */}
                <div className="det-body">
                    {/* 탭 */}
                    <div className="det-tabs">
                        {(['info', 'cast', 'similar'] as const).map(tab => (
                            <button
                                key={tab}
                                className={`det-tab${activeTab === tab ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {{ info: '작품 정보', cast: '출연진', similar: '비슷한 작품' }[tab]}
                            </button>
                        ))}
                    </div>

                    {/* 정보 탭 */}
                    {activeTab === 'info' && (
                        <div>
                            {detail.overview && (
                                <p className="det-overview">{detail.overview}</p>
                            )}

                            {genres.length > 0 && (
                                <div style={{ marginBottom: 36 }}>
                                    <p className="det-section-title">장르</p>
                                    <div className="det-genre-list">
                                        {genres.map((g: string) => (
                                            <span key={g} className="det-genre-tag">{g}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="det-stats">
                                <div className="det-stat">
                                    <p className="det-stat-val">★ {score || '-'}</p>
                                    <p className="det-stat-label">TMDB 평점</p>
                                </div>
                                <div className="det-stat">
                                    <p className="det-stat-val">{seasons || '-'}</p>
                                    <p className="det-stat-label">시즌</p>
                                </div>
                                <div className="det-stat">
                                    <p className="det-stat-val">{episodes || '-'}</p>
                                    <p className="det-stat-label">총 에피소드</p>
                                </div>
                                <div className="det-stat">
                                    <p className="det-stat-val">{year || '-'}</p>
                                    <p className="det-stat-label">첫 방영</p>
                                </div>
                            </div>

                            {trailer && (
                                <div className="det-trailer">
                                    <p className="det-section-title">트레일러</p>
                                    <div className="det-trailer-frame">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${trailer}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                </div>
                            )}
                            <OstSectionDetail animeName={detail.original_name || detail.name} />
                        </div>
                    )}

                    {/* 출연진 탭 */}
                    {activeTab === 'cast' && (
                        <div className="det-cast-grid">
                            {credits.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>출연진 정보가 없어요</p>
                            ) : credits.map((c: any) => (
                                <div key={c.id} className="det-cast-card">
                                    <div className="det-cast-thumb">
                                        {c.profile_path
                                            ? <img src={`${IMG}/w185${c.profile_path}`} alt={c.name} loading="lazy" />
                                            : <div className="det-cast-np">{(c.name||'?')[0]}</div>
                                        }
                                    </div>
                                    <p className="det-cast-name">{c.name}</p>
                                    <p className="det-cast-role">{c.roles?.[0]?.character || ''}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 비슷한 작품 탭 */}
                    {activeTab === 'similar' && (
                        <div className="det-sim-grid">
                            {similar.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>비슷한 작품이 없어요</p>
                            ) : similar.map((item: any) => (
                                <div key={item.id} className="det-sim-card" onClick={() => router.push(`/anime/${item.id}`)}>
                                    <div className="det-sim-thumb">
                                        {item.poster_path
                                            ? <img src={`${IMG}/w342${item.poster_path}`} alt={item.name} loading="lazy" />
                                            : <div className="det-sim-np">{(item.name||'?')[0]}</div>
                                        }
                                    </div>
                                    <p className="det-sim-name">{item.name}</p>
                                    <p className="det-sim-year">{item.first_air_date?.slice(0,4) || ''}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
