import { create } from "zustand"
import {
    FALLBACK_EVENT_COMMENTS,
    FALLBACK_EVENTS,
    getFallbackEventDetail,
    normalizeEventItem,
    normalizeEventStatus,
    type EventComment as Comment,
    type EventDetail,
    type EventItem,
} from "@/lib/eventData"

interface EventStore {
    events: EventItem[]
    total: number
    loading: boolean
    onFetchEvents: () => Promise<void>

    selectedEvent: EventDetail | null
    detailLoading: boolean
    onFetchEventDetail: (eventId: number) => Promise<void>

    comments: Comment[]
    commentTotal: number
    commentLoading: boolean
    hasNextComment: boolean
    onFetchComments: (eventId: number, sorting?: "latest" | "popular", offset?: number) => Promise<void>
}

const BASE = '/api/laftel/events/v2'

interface ApiComment {
    id: number
    content: string
    created: string
    profile?: { id: number; name: string; image: string }
    count_like?: number
    is_click_like?: boolean
    reply_count?: number
}

const toComment = (comment: ApiComment): Comment => ({
    id: comment.id,
    content: comment.content,
    created: comment.created,
    author: {
        id: comment.profile?.id ?? 0,
        nickname: comment.profile?.name ?? "알 수 없음",
        profile_img: comment.profile?.image ?? "",
    },
    like_count: comment.count_like ?? 0,
    is_liked: comment.is_click_like ?? false,
    reply_count: comment.reply_count ?? 0,
})

export const useEventStore = create<EventStore>((set) => ({
    events: [],
    total: 0,
    loading: false,
    selectedEvent: null,
    detailLoading: false,
    comments: [],
    commentTotal: 0,
    commentLoading: false,
    hasNextComment: false,

    onFetchEvents: async () => {
        set({ loading: true })
        try {
            let allEvents: EventItem[] = []
            let offset = 0
            const limit = 20
            while (true) {
                const res = await fetch(`${BASE}/list?offset=${offset}&limit=${limit}`)
                if (!res.ok) throw new Error("failed to fetch events")
                const data = await res.json()
                if (!Array.isArray(data.results)) throw new Error("invalid event response")
                allEvents = [...allEvents, ...data.results.map(normalizeEventItem)]
                if (!data.next) break
                offset += limit
            }
            set({ events: allEvents, total: allEvents.length })
        } catch {
            set({ events: FALLBACK_EVENTS, total: FALLBACK_EVENTS.length })
        } finally {
            set({ loading: false })
        }
    },

    onFetchEventDetail: async (eventId: number) => {
        set({ detailLoading: true, selectedEvent: null })
        try {
            const res = await fetch(`${BASE}/${eventId}`)
            if (!res.ok) throw new Error("failed to fetch event detail")
            const data: Partial<EventDetail> = await res.json()
            const fallback = getFallbackEventDetail(eventId)
            if (!data?.id && !fallback) throw new Error("invalid event detail")
            set({
                selectedEvent: {
                    ...(fallback ?? {}),
                    ...data,
                    id: data.id ?? fallback!.id,
                    name: data.name ?? fallback!.name,
                    img: data.img ?? fallback!.img,
                    banner_img: data.banner_img ?? fallback?.banner_img,
                    start_datetime: data.start_datetime ?? fallback!.start_datetime,
                    end_datetime: data.end_datetime ?? fallback!.end_datetime,
                    status: normalizeEventStatus(data.status ?? fallback?.status),
                    type: data.type ?? fallback?.type ?? "ott",
                },
            })
        } catch {
            set({ selectedEvent: getFallbackEventDetail(eventId) })
        } finally {
            set({ detailLoading: false })
        }
    },

    onFetchComments: async (eventId, sorting = "latest", offset = 0) => {
        set(offset === 0
            ? { commentLoading: true, comments: [], hasNextComment: false }
            : { commentLoading: true }
        )
        try {
            const res = await fetch(
                `${BASE}/${eventId}/comments?sorting=${sorting}&limit=20&offset=${offset}`
            )
            if (!res.ok) throw new Error("failed to fetch event comments")
            const data = await res.json()
            if (!Array.isArray(data.results)) throw new Error("invalid comments response")
            const comments = data.results.map(toComment)
            set((state) => ({
                comments: offset === 0 ? comments : [...state.comments, ...comments],
                commentTotal: data.count,
                hasNextComment: !!data.next,
            }))
        } catch {
            const fallbackComments = FALLBACK_EVENT_COMMENTS[eventId] ?? []
            set((state) => ({
                comments: offset === 0 ? fallbackComments : state.comments,
                commentTotal: fallbackComments.length,
                hasNextComment: false,
            }))
        } finally {
            set({ commentLoading: false })
        }
    },
}))
