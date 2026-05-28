export interface Party {
    id: string
    title: string
    animeId: number
    animeName: string
    animePoster: string
    hostId: string
    hostName: string
    scheduledAt: string
    maxAttendees: number
    attendees: number
    status: 'upcoming' | 'live' | 'ended'
    createdAt: string
}

export type PartyStatus = Party['status']

// Firestore 저장 시 id 제외
export type CreatePartyInput = Omit<Party, 'id'>