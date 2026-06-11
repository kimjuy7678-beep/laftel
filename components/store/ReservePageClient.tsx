"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/store";
import { CartButton, WishButton } from "@/components/store/StoreProductCard";
import RestockAlertButton from "@/components/store/RestockAlertButton";

const INITIAL_PRODUCT_COUNT = 20;
const PAGE_GROUP = 5;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KOREA_TIME_ZONE = "Asia/Seoul";
const RESERVE_SORT_OPTIONS = ["마감 임박순", "예약 마감", "인기순", "신규 예약순", "낮은 가격순", "높은 가격순"] as const;
const RESERVE_KIND_OPTIONS = ["전체 종류", "피규어", "아크릴", "인형", "키링", "뱃지", "기타"] as const;

type ReserveSort = (typeof RESERVE_SORT_OPTIONS)[number];
type ReserveKind = (typeof RESERVE_KIND_OPTIONS)[number];

type DateParts = {
    year: number;
    month: number;
    day: number;
};

type CalendarEvent = {
    product: Product;
    date: DateParts;
    label: string;
};

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mx-auto w-full max-w-[1770px] px-5 md:px-[75px] ${className}`}>
            {children}
        </div>
    );
}

function getTodayParts(): DateParts {
    const parts = new Intl.DateTimeFormat("ko-KR", {
        timeZone: KOREA_TIME_ZONE,
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(new Date());

    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

    return {
        year: value("year"),
        month: value("month"),
        day: value("day"),
    };
}

function toSerial(date: DateParts) {
    return date.year * 10000 + date.month * 100 + date.day;
}

function toDate(date: DateParts) {
    return new Date(date.year, date.month - 1, date.day);
}

function addDays(date: DateParts, amount: number): DateParts {
    const next = toDate(date);
    next.setDate(next.getDate() + amount);
    return {
        year: next.getFullYear(),
        month: next.getMonth() + 1,
        day: next.getDate(),
    };
}

function cleanReserveTitle(title: string) {
    return title.replace(/\[예약\]/g, "").trim();
}

function parseDeadlineDate(product: Product, fallbackYear: number): DateParts | null {
    const text = product.productdetail.join(" ");
    const fullDate = text.match(/예약 마감일\s*\|?\s*(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (fullDate) {
        return {
            year: Number(fullDate[1]),
            month: Number(fullDate[2]),
            day: Number(fullDate[3]),
        };
    }

    const shortDate = text.match(/예약 마감일\s*\|?\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (shortDate) {
        return {
            year: fallbackYear,
            month: Number(shortDate[1]),
            day: Number(shortDate[2]),
        };
    }

    return null;
}

function isReserveOpen(product: Product, today: DateParts) {
    const deadline = parseDeadlineDate(product, today.year);
    return deadline ? toSerial(deadline) >= toSerial(today) : false;
}

function parsePrice(price: string) {
    return Number(price.replace(/[^0-9]/g, "")) || 0;
}

function getReserveKind(product: Product): Exclude<ReserveKind, "전체 종류"> {
    const text = `${product.title} ${product.category} ${product.productdetail.join(" ")}`;

    if (/아크릴|스탠드/.test(text)) return "아크릴";
    if (/키링|열쇠고리/.test(text)) return "키링";
    if (/뱃지|배지|캔뱃지|캔배지|badge/i.test(text)) return "뱃지";
    if (/인형|플러시|누이|봉제/.test(text)) return "인형";
    if (/피규어|룩업|넨도로이드|POP UP PARADE|Luminasta|SOFVIMATES|Trio-Try-iT|스케일|모형/i.test(text)) {
        return "피규어";
    }

    return "기타";
}

function hasProductOptions(product: Product) {
    const lines = product.productdetail.map((line) => line.trim()).filter(Boolean);
    if (lines.some((line) => /^옵션\s*[A-Z0-9가-힣]?\.?\s*/.test(line))) return true;
    return lines.findIndex((line) => /선택(하여|후)\s*구매/.test(line)) > 0 || product.title.includes("선택");
}

function buildEvents(products: Product[], today: DateParts): CalendarEvent[] {
    return products
        .map((product) => {
            const date = parseDeadlineDate(product, today.year);
            if (!date) return null;
            return {
                product,
                date,
                label: cleanReserveTitle(product.title),
            };
        })
        .filter((event): event is CalendarEvent => Boolean(event))
        .sort((a, b) => toSerial(a.date) - toSerial(b.date));
}

function ProductCard({ product, today }: { product: Product; today: DateParts }) {
    const showReserveBadge = isReserveOpen(product, today);
    const isReserveClosed = Boolean(parseDeadlineDate(product, today.year)) && !showReserveBadge;
    const isUnavailable = product.soldout || isReserveClosed;
    const requiresOption = hasProductOptions(product);
    const displayTitle = cleanReserveTitle(product.title);

    return (
        <div className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#f3f1ff]">
                <Link href={`/store/${product.productId}`} className="block">
                    <div
                        className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]"
                        role="img"
                        aria-label={product.title}
                        style={{
                            backgroundImage: `url(${product.thumbnail})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                        }}
                    />
                    {showReserveBadge && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#7865ff] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(120,101,255,0.36)]">
                            예약
                        </span>
                    )}
                    {isUnavailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">
                                {isReserveClosed ? "예약 마감" : "품절"}
                            </span>
                        </div>
                    )}
                </Link>
                <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
                    <WishButton
                        productId={product.productId}
                        title={displayTitle}
                        thumbnail={product.thumbnail}
                        disabled={product.soldout}
                    />
                    {isReserveClosed ? (
                        <RestockAlertButton
                            productId={product.productId}
                            title={displayTitle}
                            thumbnail={product.thumbnail}
                        />
                    ) : (
                        <CartButton
                            productId={product.productId}
                            title={displayTitle}
                            thumbnail={product.thumbnail}
                            requiresOption={requiresOption}
                            disabled={product.soldout}
                        />
                    )}
                </div>
            </div>
            <Link href={`/store/${product.productId}`} className="mt-3 block">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[#17151f]">
                    [예약] {displayTitle}
                </p>
                <p className={`mt-1.5 text-[17px] font-extrabold ${isUnavailable ? "text-[#aaa]" : "text-[#111018]"}`}>
                    {isReserveClosed ? "예약 마감" : product.soldout ? "품절" : product.price}
                </p>
            </Link>
        </div>
    );
}

function ReleaseCalendar({
    today,
    events,
    onOpenModal,
}: {
    today: DateParts;
    events: CalendarEvent[];
    onOpenModal: () => void;
}) {
    const todaySerial = toSerial(today);
    const visibleDates = Array.from({ length: 10 }, (_, index) => addDays(today, index - 2));

    return (
        <section className="rounded-[18px] bg-[#f6f3ff] px-4 py-5 sm:rounded-[24px] sm:px-6 sm:py-7">

            <p className="mb-3 text-[12px] text-[#9b94b2]">
                <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                <span className="mx-1.5">›</span>
                <span className="font-medium text-[#7865ff]">예약 굿즈</span>
            </p>
            <h2 className="pb-[10px] text-[24px] font-extrabold text-[#111018] sm:text-[30px]">예약 구매 굿즈</h2>
            {/* <p className="mt-2 text-[15px] text-[#8a8494] pb-[20px]">
                누구보다 빠르게 한정판 피규어와 공식 굿즈를 만나보세요.
            </p> */}
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[#7865ff] text-white">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v4M16 2v4M3 10h18" />
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                        </svg>
                    </span>
                    <h1 className="text-[17px] font-extrabold text-[#15121d] sm:text-[20px]">굿즈 출시 캘린더</h1>
                    <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#7865ff] sm:ml-3 sm:text-[13px]">
                        {today.year}년 {today.month}월
                    </span>
                </div>
                <button type="button" onClick={onOpenModal} className="hidden w-fit text-[13px] font-semibold text-[#7865ff] sm:block">
                    일정 전체보기
                </button>
            </div>

            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-10">
                {visibleDates.map((date) => {
                    const dateObj = toDate(date);
                    const weekday = WEEKDAYS[dateObj.getDay()];
                    const isToday = toSerial(date) === todaySerial;
                    const isWeekend = weekday === "Sun" || weekday === "Sat";
                    const dateEvents = events.filter((event) => toSerial(event.date) === toSerial(date));
                    const firstEvent = dateEvents[0];

                    return (
                        <Link
                            key={`${date.year}-${date.month}-${date.day}`}
                            href={firstEvent ? `/store/${firstEvent.product.productId}` : "/store/reserve"}
                            className={`flex h-[108px] w-[86px] shrink-0 snap-start flex-col items-center justify-center rounded-[12px] border transition sm:h-[120px] sm:w-auto ${isToday
                                ? "border-[#5a45e8] bg-[#5a45e8] text-white shadow-[0_10px_24px_rgba(90,69,232,0.25)]"
                                : "border-[#e2ddf5] bg-white text-[#111018] hover:border-[#7865ff]"
                                }`}
                        >
                            <span className={`text-[12px] font-medium ${isToday ? "text-white/75" : isWeekend ? "text-[#3478ff]" : "text-[#777b8f]"}`}>
                                {weekday}
                            </span>
                            <span className={`mt-1 text-[20px] font-extrabold sm:text-[22px] ${!isToday && weekday === "Sun" ? "text-[#ff3d48]" : ""}`}>
                                {String(date.day).padStart(2, "0")}
                            </span>
                            {firstEvent ? (
                                <span className={`mt-2 max-w-[70px] truncate rounded-full px-2 py-1 text-[10px] font-bold sm:max-w-[86px] ${isToday ? "bg-white text-[#5a45e8]" : "bg-[#ede9ff] text-[#7865ff]"}`}>
                                    {firstEvent.label.slice(0, 10)}
                                </span>
                            ) : isToday ? (
                                <span className="mt-3 h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function CalendarModal({
    today,
    events,
    onClose,
}: {
    today: DateParts;
    events: CalendarEvent[];
    onClose: () => void;
}) {
    const [monthCursor, setMonthCursor] = useState({ year: today.year, month: today.month });
    const firstDate = new Date(monthCursor.year, monthCursor.month - 1, 1);
    const startOffset = firstDate.getDay();
    const daysInMonth = new Date(monthCursor.year, monthCursor.month, 0).getDate();
    const prevMonthDays = new Date(monthCursor.year, monthCursor.month - 1, 0).getDate();
    const cells = Array.from({ length: 42 }, (_, index) => {
        const rawDay = index - startOffset + 1;
        if (rawDay < 1) {
            const prev = new Date(monthCursor.year, monthCursor.month - 2, prevMonthDays + rawDay);
            return { year: prev.getFullYear(), month: prev.getMonth() + 1, day: prev.getDate(), muted: true };
        }
        if (rawDay > daysInMonth) {
            const next = new Date(monthCursor.year, monthCursor.month, rawDay - daysInMonth);
            return { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate(), muted: true };
        }
        return { year: monthCursor.year, month: monthCursor.month, day: rawDay, muted: false };
    });

    const moveMonth = (amount: number) => {
        const next = new Date(monthCursor.year, monthCursor.month - 1 + amount, 1);
        setMonthCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 px-2 py-2 sm:items-center sm:px-4 sm:py-8" onClick={onClose}>
            <div className="max-h-[calc(100dvh-16px)] w-full max-w-[920px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:max-h-[calc(100dvh-32px)] md:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-[#ebe8ff] px-4 py-4 md:min-h-[84px] md:items-center md:px-7">
                    <div className="min-w-0">
                        <h2 className="text-[18px] font-extrabold text-[#15121d] sm:text-[20px]">월간 출시 일정</h2>
                        <div className="mt-2 flex w-fit items-center rounded-full bg-[#f1eeff] px-2.5 py-1.5 text-[#7865ff] sm:px-3 md:mt-0">
                            <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className="flex h-6 w-6 items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <span className="min-w-[92px] text-center text-[13px] font-extrabold sm:min-w-[100px] sm:text-[15px]">
                                {monthCursor.year}년 {monthCursor.month}월
                            </span>
                            <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className="flex h-6 w-6 items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="닫기" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f1f4] text-[#4d5260]">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="max-h-[calc(100dvh-120px)] overflow-y-auto px-4 pb-5 pt-5 md:px-7 md:pb-6 md:pt-7">
                    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                        <div className="min-w-[560px] sm:min-w-0">
                            <div className="mb-4 grid grid-cols-7 text-center text-[11px] font-extrabold uppercase">
                                {WEEKDAYS.map((day) => (
                                    <span key={day} className={day === "Sun" ? "text-[#ff3d48]" : day === "Sat" ? "text-[#3478ff]" : "text-[#7a8193]"}>
                                        {day}
                                    </span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 overflow-hidden rounded-[10px] border border-[#e5e8ef]">
                                {cells.map((date) => {
                                    const isToday = toSerial(date) === toSerial(today);
                                    const cellEvents = events.filter((event) => toSerial(event.date) === toSerial(date)).slice(0, 2);

                                    return (
                                        <div
                                            key={`${date.year}-${date.month}-${date.day}`}
                                            className={`min-h-[74px] border-b border-r border-[#e5e8ef] p-1.5 last:border-r-0 sm:min-h-[82px] md:min-h-[96px] md:p-2 ${date.muted ? "bg-[#eef0f3] text-[#c0c5cf]" : isToday ? "bg-[#f1eeff]" : "bg-white text-[#141620]"}`}
                                        >
                                            <div className="flex justify-between">
                                                <span className={`flex h-7 w-7 items-center justify-center text-[12px] ${isToday ? "rounded-full bg-[#5a45e8] font-extrabold text-white" : ""}`}>
                                                    {date.day}
                                                </span>
                                            </div>
                                            <div className="mt-1 space-y-1">
                                                {cellEvents.map((event) => (
                                                    <Link key={event.product.productId} href={`/store/${event.product.productId}`} className="block">
                                                        <div
                                                            className="hidden h-8 rounded-[6px] bg-[#ede9ff] bg-cover bg-center sm:block md:h-10 md:rounded-[7px]"
                                                            style={{ backgroundImage: `url(${event.product.thumbnail})` }}
                                                            aria-label={event.label}
                                                        />
                                                        <span className="block truncate rounded-[5px] bg-[#ede9ff] px-1.5 py-1 text-[9px] font-bold leading-none text-[#7865ff] sm:hidden">
                                                            {event.label}
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#7a8193] sm:mt-5 sm:gap-x-6 sm:text-[12px]">

                        <span className="flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-[#5a45e8]" />오늘</span>
                        <span className="flex items-center gap-2"><i className="h-3.5 w-5 rounded bg-[#ede9ff]" />주요 이벤트 / 예약 마감일</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
    const groupIndex = Math.floor((current - 1) / PAGE_GROUP);
    const groupStart = groupIndex * PAGE_GROUP + 1;
    const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, total);
    const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, index) => groupStart + index);
    const hasPrevGroup = groupStart > 1;
    const hasNextGroup = groupEnd < total;

    return (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-1.5 sm:mt-16 sm:gap-2">
            <button
                type="button"
                onClick={() => onChange(Math.max(1, current - 1))}
                disabled={current === 1}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10"
                aria-label="이전 페이지"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {hasPrevGroup && (
                <button
                    type="button"
                    onClick={() => onChange(groupStart - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]"
                >
                    ···
                </button>
            )}
            {pages.map((page) => (
                <button
                    key={page}
                    type="button"
                    onClick={() => onChange(page)}
                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-medium transition sm:h-10 sm:w-10 sm:text-[14px] ${page === current
                        ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]"
                        : "border border-[#d8d4ee] bg-white text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"
                        }`}
                >
                    {page}
                </button>
            ))}
            {hasNextGroup && (
                <button
                    type="button"
                    onClick={() => onChange(groupEnd + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[13px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff] sm:h-10 sm:w-10 sm:text-[14px]"
                >
                    ···
                </button>
            )}
            <button
                type="button"
                onClick={() => onChange(Math.min(total, current + 1))}
                disabled={current === total}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10"
                aria-label="다음 페이지"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
}

export default function ReservePageClient({ products }: { products: Product[] }) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<ReserveSort>("마감 임박순");
    const [kind, setKind] = useState<ReserveKind>("전체 종류");
    const today = useMemo(() => getTodayParts(), []);
    const events = useMemo(() => buildEvents(products, today), [products, today]);
    const sortedProducts = useMemo(() => {
        const filteredByKind = products.filter((product) => {
            if (kind === "전체 종류") return true;
            return getReserveKind(product) === kind;
        });
        const filtered = sort === "예약 마감"
            ? filteredByKind.filter((product) => {
                const deadline = parseDeadlineDate(product, today.year);
                return Boolean(deadline && toSerial(deadline) < toSerial(today));
            })
            : filteredByKind;

        return [...filtered].sort((a, b) => {
            if (sort === "예약 마감") {
                const aDeadline = parseDeadlineDate(a, today.year);
                const bDeadline = parseDeadlineDate(b, today.year);
                return (bDeadline ? toSerial(bDeadline) : 0) - (aDeadline ? toSerial(aDeadline) : 0);
            }
            if (sort === "마감 임박순") {
                const aDeadline = parseDeadlineDate(a, today.year);
                const bDeadline = parseDeadlineDate(b, today.year);
                const todaySerial = toSerial(today);
                const aDeadlineSerial = aDeadline ? toSerial(aDeadline) : Number.MAX_SAFE_INTEGER;
                const bDeadlineSerial = bDeadline ? toSerial(bDeadline) : Number.MAX_SAFE_INTEGER;
                const aClosed = aDeadlineSerial < todaySerial;
                const bClosed = bDeadlineSerial < todaySerial;

                if (aClosed !== bClosed) return aClosed ? 1 : -1;
                return aDeadlineSerial - bDeadlineSerial;
            }
            if (sort === "신규 예약순") return Number(b.productId) - Number(a.productId);
            if (sort === "낮은 가격순") return parsePrice(a.price) - parsePrice(b.price);
            if (sort === "높은 가격순") return parsePrice(b.price) - parsePrice(a.price);
            return 0;
        });
    }, [kind, products, sort, today]);
    const totalPages = Math.ceil(sortedProducts.length / INITIAL_PRODUCT_COUNT);
    const visibleProducts = sortedProducts.slice((page - 1) * INITIAL_PRODUCT_COUNT, page * INITIAL_PRODUCT_COUNT);

    const handleSortChange = (nextSort: ReserveSort) => {
        setSort(nextSort);
        setPage(1);
    };

    const handleKindChange = (nextKind: ReserveKind) => {
        setKind(nextKind);
        setPage(1);
    };

    const handlePageChange = (nextPage: number) => {
        setPage(nextPage);
        document.getElementById("reserve-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="min-h-screen bg-white pb-24">
            <Inner className="pt-5 sm:pt-8 lg:pt-10">
                <ReleaseCalendar today={today} events={events} onOpenModal={() => setCalendarOpen(true)} />

                <section id="reserve-products" className="mt-10">
                    <div className="mb-6 flex items-center justify-between gap-3">
                        <p className="shrink-0 text-[14px] text-[#6b647a]">
                            총 <span className="font-semibold text-[#16121f]">{sortedProducts.length}</span>개의 상품
                        </p>
                        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                            <div className="relative">
                                <select
                                    value={kind}
                                    onChange={(event) => handleKindChange(event.target.value as ReserveKind)}
                                    className="h-[38px] max-w-[122px] appearance-none rounded-[8px] border border-[#ddd8f4] bg-white pl-3 pr-8 text-[13px] text-[#3d3755] outline-none focus:border-[#7865ff] cursor-pointer sm:max-w-none"
                                >
                                    {RESERVE_KIND_OPTIONS.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                            <div className="relative">
                                <select
                                    value={sort}
                                    onChange={(event) => handleSortChange(event.target.value as ReserveSort)}
                                    className="h-[38px] max-w-[122px] appearance-none rounded-[8px] border border-[#ddd8f4] bg-white pl-3 pr-8 text-[13px] text-[#3d3755] outline-none focus:border-[#7865ff] cursor-pointer sm:max-w-none"
                                >
                                    {RESERVE_SORT_OPTIONS.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b94b2]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {visibleProducts.length === 0 ? (
                        <div className="flex h-[300px] items-center justify-center rounded-[16px] bg-[#f8f6ff] text-[15px] text-[#9b94b2]">
                            예약 상품이 아직 없어요.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-10">
                            {visibleProducts.map((product) => (
                                <ProductCard key={product.productId} product={product} today={today} />
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={handlePageChange} />}
                </section>
            </Inner>

            {calendarOpen && <CalendarModal today={today} events={events} onClose={() => setCalendarOpen(false)} />}
        </div>
    );
}
