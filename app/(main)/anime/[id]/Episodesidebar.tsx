'use client'
import styles from "./scss/EpisodesideBar.module.scss"

interface Episode {
    episode_number: number
    name: string
    still_path?: string
    runtime?: number
    overview?: string
}

interface Season {
    season_number: number
    episode_count: number
}

interface Props {
    seriesTitle: string
    seasonList: Season[]
    selectedSeason: number
    onSeasonChange: (n: number) => void
    episodes: Episode[]
    currentEpisode: Episode | null
    onEpisodeClick: (ep: Episode) => void
}

export default function EpisodeSidebar({
    seriesTitle,
    seasonList,
    selectedSeason,
    onSeasonChange,
    episodes,
    currentEpisode,
    onEpisodeClick,
}: Props) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <span className={styles.seriesTitle}>{seriesTitle}</span>
            </div>

            <div className={styles.seasonRow}>
                <select
                    value={selectedSeason}
                    onChange={e => onSeasonChange(Number(e.target.value))}
                    className={styles.seasonSelect}
                >
                    {seasonList.map(s => (
                        <option key={s.season_number} value={s.season_number} className={styles.seasonOption}>
                            시즌 {s.season_number} ({s.episode_count}화)
                        </option>
                    ))}
                </select>
            </div>

            <ul className={styles.episodeList}>
                {episodes.map(ep => {
                    const isActive = currentEpisode?.episode_number === ep.episode_number
                    return (
                        <li
                            key={ep.episode_number}
                            className={`${styles.episodeItem} ${isActive ? styles.active : ''}`}
                            onClick={() => onEpisodeClick(ep)}
                        >
                            <div className={styles.thumb}>
                                {ep.still_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                        alt={ep.name}
                                        className={styles.thumbImg}
                                    />
                                ) : (
                                    <span className={styles.thumbFallback}>{ep.episode_number}</span>
                                )}
                                {isActive && (
                                    <div className={styles.playOverlay}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                            <polygon points="5,3 19,12 5,21" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className={styles.epInfo}>
                                <p className={styles.epNum}>{ep.episode_number}화</p>
                                <p className={styles.epName}>{ep.name}</p>
                                {ep.runtime && (
                                    <p className={styles.epRuntime}>{ep.runtime}분</p>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </aside>
    )
}