import { create } from "zustand"

interface EventItem {
    id: number
    name: string
    img: string
    banner_img?: string
    start_datetime: string
    end_datetime: string
    status: string
    type: string
}

interface EventContentText {
    kind: "text"
    content: string
}

interface EventContentBlock {
    id: string
    type: string
    src?: string
    size?: number
    level?: number
    content?: EventContentText[]
    textAlign?: "left" | "center" | "right"
}

interface EventDetail extends EventItem {
    content?: string
    contents?: {
        blocks: EventContentBlock[]
    }
}

interface Comment {
    id: number
    content: string
    created: string
    author: {
        id: number
        nickname: string
        profile_img: string
    }
    like_count: number
    is_liked: boolean
    reply_count: number
}

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

const BASE = "https://api.laftel.net/api/events/v2"

interface ApiComment {
    id: number
    content: string
    created: string
    profile?: {
        id: number
        name: string
        image: string
    }
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
                const res = await fetch(`${BASE}/list/?offset=${offset}&limit=${limit}`)
                const data = await res.json()
                allEvents = [...allEvents, ...data.results]
                if (!data.next) break
                offset += limit
            }
            set({ events: allEvents, total: allEvents.length })
        } finally {
            set({ loading: false })
        }
    },

    onFetchEventDetail: async (eventId: number) => {
        set({ detailLoading: true, selectedEvent: null })
        try {
            const res = await fetch(`${BASE}/${eventId}/`)
            const data: EventDetail = await res.json()
            set({ selectedEvent: data })
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
                `${BASE}/${eventId}/comments/?sorting=${sorting}&limit=20&offset=${offset}`
            )
            const data = await res.json()
            const comments = data.results.map(toComment)
            set((state) => ({
                comments: offset === 0 ? comments : [...state.comments, ...comments],
                commentTotal: data.count,
                hasNextComment: !!data.next,
            }))
        } finally {
            set({ commentLoading: false })
        }
    },
}))
