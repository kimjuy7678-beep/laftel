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
    { url: "./images/store/StoreBanner1.png", title: "굿즈 컬렉션 OPEN", content: "코트의 열기를 그대로 ⚡\n하이큐 공식 굿즈 지금 만나보세요", button: "지금 바로 확인하기" },
    { url: "./images/store/StoreBanner2.png", title: "저주급 인기 주술회전 굿즈 컬렉션", content: "품절 전에 꼭 챙겨야 할 주술회전 인기 MD🔥", button: "지금 바로 확인하기" },
    { url: "./images/store/StoreBanner1.png", title: "굿즈 컬렉션 OPEN", content: "코트의 열기를 그대로 ⚡\n하이큐 공식 굿즈 지금 만나보세요", button: "지금 바로 확인하기" },
    { url: "./images/store/StoreBanner1.png", title: "굿즈 컬렉션 OPEN", content: "코트의 열기를 그대로 ⚡\n하이큐 공식 굿즈 지금 만나보세요", button: "지금 바로 확인하기" },
]

export default function StoreCarousel() {
    return (
        <div className="w-full pt-[80px]">
            <div className="max-w-7xl mx-auto px-4">  {/* 가운데 정렬 */}
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
                                            <h1 className="text-white text-3xl font-bold drop-shadow-lg">
                                                {m.title}
                                            </h1>
                                            <p className="text-white/90 text-base whitespace-pre-line drop-shadow">
                                                {m.content}
                                            </p>
                                            <button className="mt-2 w-fit px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-full transition-colors shadow-md">
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