'use client'
import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css';
import 'swiper/css/navigation';

import { Navigation, Autoplay } from 'swiper/modules';

type Banner = {
    url: string;
    title: string;
    content: string;
    button: string;
}

const Banners: Banner[] = [
    {
        url: "./images/store/StoreBanner1.png",
        title: "하이큐 굿즈 컬렉션 OPEN",
        content: "코트의 열기를 그대로 ⚡\n최애 선수와 함께하는 공식 굿즈",
        button: "하이큐 굿즈 보러가기",
    },
    {
        url: "./images/store/StoreBanner2.png",
        title: "주술회전 인기 굿즈 기획전",
        content: "품절 전에 챙겨야 할 필수 MD 🔥\n지금 가장 인기 있는 주술회전 굿즈",
        button: "주술회전 굿즈 보러가기",
    },
    {
        url: "./images/store/StoreBanner4.png",
        title: "하츠네 미쿠 스페셜 컬렉션",
        content: "전 세계를 사로잡은 버추얼 디바 🎵\n한정판 미쿠 굿즈를 만나보세요",
        button: "미쿠 굿즈 보러가기",
    },
    {
        url: "./images/store/StoreBanner3.png",
        title: "귀멸의 칼날 BEST COLLECTION",
        content: "탄지로부터 무이치로까지 ⚔️\n인기 캐릭터 굿즈 총집합",
        button: "귀멸 굿즈 보러가기",
    },
];
export default function StoreCarousel() {
    return (
        <div className="w-full pt-4 sm:pt-8 lg:pt-[80px]">
            <div className="mx-auto max-w-[1770px] px-4 sm:px-6 lg:px-4">  {/* 가운데 정렬 */}
                <div className="relative flex items-center gap-2 sm:gap-4">

                    {/* 커스텀 prev 버튼 */}
                    <button className="store-swiper-prev absolute bottom-3 right-14 z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur transition-colors hover:bg-black/45 sm:static sm:h-10 sm:w-10 sm:bg-gray-400 sm:hover:bg-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* 슬라이더 */}
                    <div className="min-w-0 flex-1 overflow-hidden rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] sm:rounded-xl">
                        <Swiper
                            slidesPerView={1}
                            loop={true}
                            autoplay={{
                                delay: 3000,
                                disableOnInteraction: false,
                            }}
                            navigation={{
                                prevEl: '.store-swiper-prev',
                                nextEl: '.store-swiper-next',
                            }}
                            modules={[Navigation, Autoplay]}
                            className="mySwiper w-full"
                        >
                            {Banners.map((m, id) => (
                                <SwiperSlide key={id}>
                                    {/* 이미지 + 텍스트 오버레이 */}
                                    <div className="relative h-[240px] w-full sm:h-[320px] lg:h-auto">
                                        <img src={m.url} alt={m.title} className="h-full w-full object-cover" />

                                        {/* 어두운 그라디언트 오버레이 */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10 sm:from-black/60 sm:via-black/30 sm:to-transparent" />

                                        {/* 텍스트 영역 */}
                                        <div className="absolute inset-0 flex max-w-[92%] flex-col justify-center gap-2 px-6 pb-10 sm:max-w-[620px] sm:gap-3 sm:px-10 sm:pb-0">
                                            <h1 className="text-[24px] font-bold leading-tight text-white drop-shadow-lg sm:text-[32px] lg:text-4xl">
                                                {m.title}
                                            </h1>
                                            <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/90 drop-shadow sm:text-base">
                                                {m.content}
                                            </p>
                                            <button className="mt-2 w-fit rounded-full bg-[#826cff] px-4 py-2 text-[12px] font-medium text-white shadow-md transition-colors hover:bg-violet-600 sm:px-5 sm:text-sm">
                                                {m.button}
                                            </button>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    {/* 커스텀 next 버튼 */}
                    <button className="store-swiper-next absolute bottom-3 right-3 z-20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/35 text-white shadow-md backdrop-blur transition-colors hover:bg-black/45 sm:static sm:h-10 sm:w-10 sm:bg-gray-400 sm:hover:bg-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                </div>
            </div>
        </div>
    )
}
