'use client'
import { useState } from "react"
import styles from "./scss/EpisodeInfo.module.scss"

interface Episode {
    episode_number: number
    name: string
    overview?: string
}

interface Props {
    episode: Episode | null
    seriesTitle: string
}

export default function EpisodeInfo({ episode, seriesTitle }: Props) {
    const [expanded, setExpanded] = useState(false)

    if (!episode) return null

    const overview = episode.overview || ''
    const isLong = overview.length > 120

    return (
        <div className={styles.wrapper}>
            <p className={styles.seriesLabel}>{seriesTitle}</p>

            <h2 className={styles.epTitle}>
                {episode.episode_number}화 {episode.name}
            </h2>

            {overview && (
                <div className={styles.overviewWrap}>
                    <p className={`${styles.overview} ${!expanded && isLong ? styles.clamped : ''}`}>
                        {overview}
                    </p>
                    {isLong && (
                        <button
                            className={styles.expandBtn}
                            onClick={() => setExpanded(v => !v)}
                        >
                            {expanded ? '접기' : '...더 보기'}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}