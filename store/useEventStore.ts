import { create } from "zustand"

interface EventItem {
    id: number
    name: string
    img: string
    banner_img: string
    start_datetime: string
    end_datetime: string
    status: string
    type: string
}

interface EventStore {
    events: EventItem[]
    total: number
    loading: boolean
    onFetchEvents: () => Promise<void>
}

export const useEventStore = create<EventStore>((set) => ({
    events: [],
    total: 0,
    loading: false,

    onFetchEvents: async () => {
        set({ loading: true })
        try {
            let allEvents: EventItem[] = []
            let offset = 0
            const limit = 20

            while (true) {
                const res = await fetch(
                    `https://api.laftel.net/api/events/v2/list/?offset=${offset}&limit=${limit}`
                )
                const data = await res.json()
                allEvents = [...allEvents, ...data.results]
                if (!data.next) break
                offset += limit
            }

            set({ events: allEvents, total: allEvents.length })
        } finally {
            set({ loading: false })
        }
    }
}))