"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/store";
import StoreSidebar from "@/components/store/StoreSliaebar";

const INITIAL_PRODUCT_COUNT = 20;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const KOREA_TIME_ZONE = "Asia/Seoul";

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

    return (
        <Link href={`/store/${product.productId}`} className="group block min-w-0">
            <div className="relative overflow-hidden rounded-[12px] bg-[#f3f1ff]">
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
                {product.soldout && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-4 py-1.5 text-[13px] font-bold text-[#555]">품절</span>
                    </div>
                )}
                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7865ff] shadow-[0_4px_14px_rgba(30,24,70,0.16)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                </span>
            </div>
            <div className="mt-3">
                <p className="text-[11px] text-[#8a8494]">{product.category}</p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[#17151f]">
                    [예약] {cleanReserveTitle(product.title)}
                </p>
                <p className={`mt-1.5 text-[17px] font-extrabold ${product.soldout ? "text-[#aaa]" : "text-[#111018]"}`}>
                    {product.soldout ? "품절" : product.price}
                </p>
            </div>
        </Link>
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
        <section className="rounded-[20px] bg-[#f6f3ff] px-4 py-6 md:rounded-[24px] md:px-6 md:py-7">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[#7865ff] text-white">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v4M16 2v4M3 10h18" />
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                        </svg>
                    </span>
                    <h1 className="text-[20px] font-extrabold text-[#15121d]">굿즈 출시 캘린더</h1>
                    <span className="ml-3 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-[#7865ff]">
                        {today.year}년 {today.month}월
                    </span>
                </div>
                <button type="button" onClick={onOpenModal} className="text-[13px] font-semibold text-[#7865ff]">
                    일정 전체보기
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10 lg:gap-4">
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
                            className={`flex h-[104px] flex-col items-center justify-center rounded-[12px] border transition md:h-[120px] ${isToday
                                ? "border-[#5a45e8] bg-[#5a45e8] text-white shadow-[0_10px_24px_rgba(90,69,232,0.25)]"
                                : "border-[#e2ddf5] bg-white text-[#111018] hover:border-[#7865ff]"
                                }`}
                        >
                            <span className={`text-[12px] font-medium ${isToday ? "text-white/75" : isWeekend ? "text-[#3478ff]" : "text-[#777b8f]"}`}>
                                {weekday}
                            </span>
                            <span className={`mt-1 text-[22px] font-extrabold ${!isToday && weekday === "Sun" ? "text-[#ff3d48]" : ""}`}>
                                {String(date.day).padStart(2, "0")}
                            </span>
                            {firstEvent ? (
                                <span className={`mt-2 max-w-[86px] truncate rounded-full px-2 py-1 text-[10px] font-bold ${isToday ? "bg-white text-[#5a45e8]" : "bg-[#ede9ff] text-[#7865ff]"}`}>
                                    {firstEvent.label.slice(0, 12)}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-3 py-4 md:px-4 md:py-8" onClick={onClose}>
            <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:max-h-[calc(100dvh-64px)] md:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#ebe8ff] px-4 py-4 md:h-[84px] md:px-7 md:py-0">
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-5">
                        <h2 className="text-[20px] font-extrabold text-[#15121d]">월간 출시 일정</h2>
                        <div className="flex w-fit items-center rounded-full bg-[#f1eeff] px-3 py-1.5 text-[#7865ff]">
                            <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className="flex h-6 w-6 items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <span className="min-w-[100px] text-center text-[15px] font-extrabold">
                                {monthCursor.year}년 {monthCursor.month}월
                            </span>
                            <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className="flex h-6 w-6 items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="닫기" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f1f4] text-[#4d5260]">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto px-4 pb-5 pt-5 md:px-7 md:pb-6 md:pt-7">
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
                                    className={`min-h-[64px] border-b border-r border-[#e5e8ef] p-1.5 sm:min-h-[76px] md:min-h-[86px] md:p-2 ${date.muted ? "bg-[#eef0f3] text-[#c0c5cf]" : isToday ? "bg-[#f1eeff]" : "bg-white text-[#141620]"}`}
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
                                                    className="h-7 rounded-[7px] bg-[#ede9ff] bg-cover bg-center sm:h-8 md:h-10"
                                                    style={{ backgroundImage: `url(${event.product.thumbnail})` }}
                                                    aria-label={event.label}
                                                />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] text-[#7a8193] md:gap-6">
                        <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-[#7865ff]" />출시 및 예약 시작일</span>
                        <span className="flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-[#5a45e8]" />오늘</span>
                        <span className="flex items-center gap-2"><i className="h-3.5 w-5 rounded bg-[#ede9ff]" />주요 이벤트</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ReservePageClient({
    products,
    productLimit,
}: {
    products: Product[];
    productLimit: number;
}) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const today = useMemo(() => getTodayParts(), []);
    const events = useMemo(() => buildEvents(products, today), [products, today]);
    const visibleProducts = products.slice(0, productLimit);
    const hiddenCount = Math.max(0, products.length - visibleProducts.length);
    const nextLimit = Math.min(productLimit + INITIAL_PRODUCT_COUNT, products.length);

    return (
        <div className="min-h-screen bg-white pb-24">
            <Inner className="pt-6 md:pt-10">
            <StoreSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* 햄버거 메뉴 바 */}
            <div className="border-b border-[#ebe8ff] bg-white py-3">
                <Inner>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex items-center gap-2 text-[14px] text-[#3d3755] transition hover:text-[#7865ff]"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                        전체 카테고리
                    </button>
                </Inner>
            </div>

            <Inner className="pt-10">
                <ReleaseCalendar today={today} events={events} onOpenModal={() => setCalendarOpen(true)} />

                <section id="reserve-products" className="mt-10">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
                        <div>
                            <p className="mb-3 text-[12px] text-[#9b94b2]">
                                <Link href="/store" className="hover:text-[#7865ff]">스토어메인</Link>
                                <span className="mx-1.5">›</span>
                                <span className="font-medium text-[#7865ff]">예약 굿즈</span>
                            </p>
                            <h2 className="text-[30px] font-extrabold text-[#111018]">예약 구매 굿즈</h2>
                            <p className="mt-2 text-[15px] text-[#8a8494]">
                                누구보다 빠르게 한정판 피규어와 공식 굿즈를 만나보세요.
                            </p>
                        </div>
                        <div className="flex h-[38px] w-fit items-center gap-2 rounded-full border border-[#ddd8f4] bg-white px-4 text-[13px] font-semibold text-[#6b647a]">
                            인기순
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    {visibleProducts.length === 0 ? (
                        <div className="flex h-[300px] items-center justify-center rounded-[16px] bg-[#f8f6ff] text-[15px] text-[#9b94b2]">
                            예약 상품이 아직 없어요.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6 md:gap-y-10 xl:grid-cols-5">
                            {visibleProducts.map((product) => (
                                <ProductCard key={product.productId} product={product} today={today} />
                            ))}
                        </div>
                    )}

                    {hiddenCount > 0 && (
                        <div className="mt-14 flex justify-center">
                            <Link
                                href={`/store/reserve?limit=${nextLimit}#reserve-products`}
                                className="flex h-[46px] items-center gap-3 rounded-full bg-[#f0eeff] px-10 text-[14px] font-bold text-[#7865ff] transition hover:bg-[#e4dfff]"
                            >
                                더 많은 상품 보기
                                <span className="text-[18px] leading-none">+</span>
                            </Link>
                        </div>
                    )}
                </section>
            </Inner>

            {calendarOpen && <CalendarModal today={today} events={events} onClose={() => setCalendarOpen(false)} />}
        </div>
    );
}