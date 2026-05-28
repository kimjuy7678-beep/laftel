import animeMeta from '@/data/animeMeta.json'

interface AnimeMetaItem {
    tmdbId: number
    koTitle: string
}

export interface ScheduleItem {
    tmdbId: number
    koTitle: string
    time: string
    minutesFromStart: number
}

function seededRandom(seed: number) {
    let s = seed
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff
        return (s >>> 0) / 0xffffffff
    }
}

export function getTodaySeed(): number {
    const now = new Date()
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
    const rand = seededRandom(seed)
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

const START_MINUTES = 8 * 60
const END_MINUTES = 26 * 60

function buildTimes(count: number): number[] {
    const slotSize = Math.floor((END_MINUTES - START_MINUTES) / count)
    return Array.from({ length: count }, (_, i) => START_MINUTES + i * slotSize)
}

function minutesToHHMM(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function nowInMinutes(): number {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
}

export function buildChannels(seed: number) {
    const ALL = animeMeta.animeMeta as AnimeMetaItem[]
    const shuffled = shuffleWithSeed(ALL, seed)
    const perChannel = Math.ceil(shuffled.length / 3)

    const raw = [
        { id: 'aniplus', label: './images/brand-logo/animax.svg', anime: shuffled.slice(0, perChannel) },
        { id: 'animax',  label: './images/brand-logo/anione.svg',  anime: shuffled.slice(perChannel, perChannel * 2) },
        { id: 'anione',  label: './images/brand-logo/aniplus.svg', anime: shuffled.slice(perChannel * 2) },
    ]

    return raw.map((ch) => {
        const times = buildTimes(ch.anime.length)
        const items: ScheduleItem[] = ch.anime.map((anime, i) => ({
            tmdbId: anime.tmdbId,
            koTitle: anime.koTitle,
            time: minutesToHHMM(times[i]),
            minutesFromStart: times[i],
        }))
        return { ...ch, items }
    })
}

export function getCurrentIdx(items: ScheduleItem[], nowMin: number): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (nowMin >= items[i].minutesFromStart) return i
    }
    return -1
}