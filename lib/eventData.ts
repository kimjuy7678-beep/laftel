import eventDataJson from "./eventData.json";

export type EventStatus = "ongoing" | "result" | "past" | string;

export interface EventItem {
    id: number;
    name: string;
    img: string;
    banner_img?: string | null;
    start_datetime: string;
    end_datetime: string;
    status: EventStatus;
    type: string;
    rating?: number;
}

export interface EventContentText {
    kind: "text";
    content: string;
}

export interface EventContentBlock {
    id: string;
    type: string;
    src?: string;
    size?: number;
    level?: number;
    content?: EventContentText[];
    textAlign?: "left" | "center" | "right" | null;
    productNos?: number[];
}

export interface EventDetail extends EventItem {
    content?: string;
    contents?: {
        blocks: EventContentBlock[];
    };
    is_comment_visible?: boolean;
}

export interface EventComment {
    id: number;
    content: string;
    created: string;
    author: {
        id: number;
        nickname: string;
        profile_img: string;
        watched?: number;
    };
    like_count: number;
    is_liked: boolean;
    reply_count: number;
}

interface EventDataFile {
    generatedAt: string;
    source: string;
    total: number;
    events: EventItem[];
    details: Record<string, EventDetail>;
    comments: Record<string, EventComment[]>;
}

const EVENT_DATA = eventDataJson as EventDataFile;

export const EVENT_DATA_GENERATED_AT = EVENT_DATA.generatedAt;
export const FALLBACK_EVENTS: EventItem[] = EVENT_DATA.events;
export const FALLBACK_EVENT_DETAILS: Record<number, EventDetail> = Object.fromEntries(
    Object.entries(EVENT_DATA.details).map(([id, detail]) => [Number(id), detail])
);
export const FALLBACK_EVENT_COMMENTS: Record<number, EventComment[]> = Object.fromEntries(
    Object.entries(EVENT_DATA.comments).map(([id, comments]) => [Number(id), comments])
);

export function normalizeEventStatus(status?: string) {
    if (status === "winners_announced") return "result";
    return status || "ongoing";
}

export function normalizeEventItem(event: EventItem): EventItem {
    return {
        ...event,
        status: normalizeEventStatus(event.status),
        type: event.type || "ott",
    };
}

export function getFallbackEventDetail(eventId: number): EventDetail | null {
    const detail = FALLBACK_EVENT_DETAILS[eventId];
    if (detail) return detail;

    const summary = FALLBACK_EVENTS.find(event => event.id === eventId);
    return summary ?? null;
}
