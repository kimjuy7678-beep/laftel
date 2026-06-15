'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from "next/link";

type Banner = {
    url: string;
    title: string;
    content: string;
    button: string;
    textAlign: "left" | "right";
    bg?: string;
    link: string;
}

const BANNERS_BASE: Banner[] = [
    {
        url: "./images/store/StoreBanner1.png", link: "/store/series?series=하이큐",
        title: "하이큐 굿즈 컬렉션 OPEN",
        content: "코트의 열기를 그대로 ⚡\n최애 선수와 함께하는 공식 굿즈",
        button: "하이큐 굿즈 보러가기",
        textAlign: "left",
    },
    {
        url: "./images/store/StoreBanner2.png", link: "/store/series?series=주술회전",
        title: "주술회전 인기 굿즈 기획전",
        content: "품절 전에 챙겨야 할 필수 MD 🔥\n지금 가장 인기 있는 주술회전 굿즈",
        button: "주술회전 굿즈 보러가기",
        textAlign: "left",
    },
    {
        url: "./images/store/StoreBanner4.png", link: "/store/series?series=하츠네미쿠",
        title: "하츠네 미쿠 스페셜 컬렉션",
        content: "전 세계를 사로잡은 버추얼 디바 🎵\n한정판 미쿠 굿즈를 만나보세요",
        button: "미쿠 굿즈 보러가기",
        textAlign: "left",
    },
    {
        url: "./images/store/StoreBanner3.png", link: "/store/series?series=귀멸의 칼날",
        title: "귀멸의 칼날 BEST COLLECTION",
        content: "탄지로부터 무이치로까지 ⚔️\n인기 캐릭터 굿즈 총집합",
        button: "귀멸 굿즈 보러가기",
        textAlign: "left",
    },
    {
        url: "./images/store/storebanner8.png", link: "/store/series?series=마루는 강쥐",
        title: "마루의 무해함으로 일상치유",
        content: "마루는 강쥐 공식 굿즈 대거 출시\n귀여운 마루와 함께라면 일주일은 두렵지 않아",
        button: "시리즈 페이지 가기",
        textAlign: "right",
    },
    {
        url: "./images/store/storebanner9.png", link: "/store/best",
        title: "체인소맨 불변의 선호커플 1위",
        content: "2025년 액션애니메이션 최고 흥행작 체인소맨 -레제편-\n레제 x 덴지 x 빔 피규어 업데이트",
        button: "인기상품 보러가기",
        textAlign: "right",
    }
];

export default function StoreCarousel() {
    const banners = BANNERS_BASE;
    const [current, setCurrent] = useState(0);
    const [startX, setStartX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setCurrent((v) => (v + 1) % banners.length), 3000);
    }, [banners.length]);

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startTimer]);

    const goTo = (idx: number) => { setCurrent(idx); startTimer(); };

    const onMouseDown = (e: React.MouseEvent) => { setIsDragging(false); setStartX(e.clientX); };
    const onMouseMove = (e: React.MouseEvent) => { if (Math.abs(e.clientX - startX) > 5) setIsDragging(true); };
    const onMouseUp = (e: React.MouseEvent) => {
        const diff = e.clientX - startX;
        if (isDragging && Math.abs(diff) > 50) {
            if (diff < 0) goTo((current + 1) % banners.length);
            else goTo((current - 1 + banners.length) % banners.length);
        }
        setIsDragging(false);
    };
    const onTouchStart = (e: React.TouchEvent) => setStartX(e.touches[0].clientX);
    const onTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (diff < -50) goTo((current + 1) % banners.length);
        else if (diff > 50) goTo((current - 1 + banners.length) % banners.length);
    };

    return (
        <div className="w-full pt-4 sm:pt-8 lg:pt-[80px]">
            <div className="mx-auto max-w-[1770px] px-4 sm:px-6 lg:px-4">
                <div className="relative flex items-center gap-2 sm:gap-4">

                    {/* prev 버튼 */}
                    <button
                        onClick={() => goTo((current - 1 + banners.length) % banners.length)}
                        className="store-swiper-prev absolute bottom-3 right-14 z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur transition-colors hover:bg-black/45 sm:static sm:h-10 sm:w-10 sm:bg-gray-400 sm:hover:bg-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* 슬라이더 — 1400×590 비율 강제 고정, 이미지 크기 무관 */}
                    <div
                        className="relative min-w-0 flex-1 cursor-grab select-none overflow-hidden rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] active:cursor-grabbing sm:rounded-xl"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={() => setIsDragging(false)}
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                    >
                        {/* 1400:590 비율 유지 spacer — 이미지 로딩·크기와 완전히 무관 */}
                        <div style={{ paddingBottom: `${(590 / 1400) * 100}%` }} />

                        {/* 실제 콘텐츠 레이어 */}
                        <div className="absolute inset-0">
                            {banners.map((b, i) => (
                                <div
                                    key={i}
                                    className="absolute inset-0 transition-opacity duration-700"
                                    style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
                                >
                                    {/* 이미지: 컨테이너 꽉 채우기 */}
                                    <img
                                        src={b.url}
                                        alt={b.title}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        draggable={false}
                                    />
                                    {/* 그라디언트 오버레이 */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: b.textAlign === "left"
                                                ? "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)"
                                                : "linear-gradient(to left, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)"
                                        }}
                                    />
                                    {/* 텍스트 */}
                                    <div
                                        className="absolute inset-0 flex flex-col justify-center gap-1 px-5 pb-8 sm:gap-3 sm:px-12 sm:pb-0"
                                        style={{
                                            alignItems: b.textAlign === "left" ? "flex-start" : "flex-end",
                                            textAlign: b.textAlign,
                                            zIndex: 2,
                                        }}
                                    >
                                        <h1 className="max-w-[58%] text-[15px] font-bold leading-tight text-white drop-shadow-lg sm:max-w-[62%] sm:text-[32px] lg:text-[42px]">
                                            {b.title}
                                        </h1>
                                        <p className="hidden max-w-[62%] whitespace-pre-line text-white/90 drop-shadow sm:block sm:text-[16px] sm:leading-relaxed lg:text-[18px]">
                                            {b.content}
                                        </p>
                                        <Link href={b.link} className="mt-1 w-fit rounded-full border border-white/70 px-3 py-1 text-[10px] font-medium text-white shadow-md transition-colors hover:bg-white/20 sm:mt-4 sm:px-7 sm:py-2.5 sm:text-[15px] lg:text-[16px]">
                                            {b.button}
                                        </Link>
                                    </div>
                                </div>
                            ))}

                            {/* 도트 인디케이터 */}
                            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                                {banners.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goTo(i)}
                                        className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2.5 bg-[#7865ff]" : "w-2.5 h-2.5 bg-white/50"}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* next 버튼 */}
                    <button
                        onClick={() => goTo((current + 1) % banners.length)}
                        className="store-swiper-next absolute bottom-3 right-3 z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur transition-colors hover:bg-black/45 sm:static sm:h-10 sm:w-10 sm:bg-gray-400 sm:hover:bg-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                </div>
            </div>
        </div>
    )
}
