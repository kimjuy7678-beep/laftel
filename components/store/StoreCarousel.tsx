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
        <div className="w-full pt-[80px]">
            <div className="max-w-[1600px] mx-auto px-4">  {/* 가운데 정렬 */}
                <div className="relative flex items-center gap-4">

                    {/* 커스텀 prev 버튼 */}
                    <button className="store-swiper-prev flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-400 hover:bg-gray-500 transition-colors shadow-md z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* 슬라이더 */}
                    <div className="flex-1 rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
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
                                    <div className="relative w-full">
                                        <img src={m.url} alt={m.title} className="w-full object-cover" />

                                        {/* 어두운 그라디언트 오버레이 */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

                                        {/* 텍스트 영역 */}
                                        <div className="absolute inset-0 flex flex-col justify-center px-10 gap-3">
                                            <h1 className="text-white text-4xl font-bold drop-shadow-lg">
                                                {m.title}
                                            </h1>
                                            <p className="text-white/90 text-base whitespace-pre-line drop-shadow">
                                                {m.content}
                                            </p>
                                            <button className="mt-2 w-fit px-5 py-2 bg-[#826cff] hover:bg-violet-600 text-white text-sm font-medium rounded-full transition-colors shadow-md">
                                                {m.button}
                                            </button>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    {/* 커스텀 next 버튼 */}
                    <button className="store-swiper-next flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-400 hover:bg-gray-500 transition-colors shadow-md z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                </div>
            </div>
        </div>
    )
}