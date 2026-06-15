import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_BASE = "https://api.laftel.net/api/events/v2";
const OUT_FILE = path.join(process.cwd(), "lib", "eventData.json");
const LIST_LIMIT = Number(process.env.EVENT_LIST_LIMIT ?? 100);
const COMMENTS_LIMIT = Number(process.env.EVENT_COMMENTS_LIMIT ?? 20);

function normalizeEventStatus(status) {
    if (status === "winners_announced") return "result";
    return status || "ongoing";
}

function normalizeEventItem(event) {
    return {
        ...event,
        status: normalizeEventStatus(event.status),
        type: event.type || "ott",
    };
}

function normalizeComment(comment) {
    return {
        id: comment.id,
        content: comment.content ?? "",
        created: comment.created ?? "",
        author: {
            id: comment.profile?.id ?? 0,
            nickname: comment.profile?.name ?? "알 수 없음",
            profile_img: comment.profile?.image ?? "",
            watched: comment.profile?.profile_rank?.rank ?? 0,
        },
        like_count: comment.count_like ?? 0,
        is_liked: comment.is_click_like ?? false,
        reply_count: comment.reply_count ?? 0,
    };
}

async function fetchJson(url) {
    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; laftel-event-sync/1.0)",
            "Origin": "https://laftel.net",
            "Referer": "https://laftel.net/",
        },
    });

    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}: ${url}`);
    }

    return res.json();
}

async function fetchEvents() {
    const events = [];
    let offset = 0;
    let total = 0;

    while (true) {
        const data = await fetchJson(`${API_BASE}/list/?offset=${offset}&limit=${LIST_LIMIT}`);
        const results = Array.isArray(data.results) ? data.results : [];
        events.push(...results.map(normalizeEventItem));
        total = data.count ?? events.length;

        if (!data.next || events.length >= total) break;
        offset += LIST_LIMIT;
    }

    return { events, total };
}

async function fetchEventDetail(event) {
    try {
        const detail = await fetchJson(`${API_BASE}/${event.id}/`);
        return [
            event.id,
            {
                ...event,
                ...detail,
                banner_img: detail.banner_img ?? event.banner_img,
                status: normalizeEventStatus(detail.status ?? event.status),
                type: detail.type ?? event.type ?? "ott",
            },
        ];
    } catch (error) {
        console.warn(`detail fallback: ${event.id} ${event.name} (${error.message})`);
        return [event.id, event];
    }
}

async function fetchEventComments(event) {
    if (!COMMENTS_LIMIT || COMMENTS_LIMIT < 1) return [event.id, []];

    try {
        const data = await fetchJson(`${API_BASE}/${event.id}/comments/?sorting=latest&limit=${COMMENTS_LIMIT}&offset=0`);
        const comments = Array.isArray(data.results) ? data.results.map(normalizeComment) : [];
        return [event.id, comments];
    } catch (error) {
        console.warn(`comments fallback: ${event.id} ${event.name} (${error.message})`);
        return [event.id, []];
    }
}

async function mapWithConcurrency(items, limit, mapper) {
    const results = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const currentIndex = index;
            index += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

async function main() {
    const generatedAt = new Date().toISOString();
    console.log("Fetching event list...");
    const { events, total } = await fetchEvents();
    console.log(`Fetched ${events.length}/${total} events`);

    console.log("Fetching event details...");
    const detailEntries = await mapWithConcurrency(events, 4, fetchEventDetail);

    console.log(`Fetching latest ${COMMENTS_LIMIT} comments per event...`);
    const commentEntries = await mapWithConcurrency(events, 4, fetchEventComments);

    const payload = {
        generatedAt,
        source: API_BASE,
        total,
        events,
        details: Object.fromEntries(detailEntries),
        comments: Object.fromEntries(commentEntries.filter(([, comments]) => comments.length > 0)),
    };

    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(`${OUT_FILE}.tmp`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Wrote ${OUT_FILE}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
