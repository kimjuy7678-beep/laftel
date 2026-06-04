// components/store/CartAlert.tsx
"use client";

import { useRouter } from "next/navigation";

export default function CartAlert({
    title,
    thumbnail,
    option,
    onClose,
}: {
    title: string;
    thumbnail?: string;
    option?: string;
    onClose: () => void;
}) {
    const router = useRouter();
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-[480px] rounded-[20px] bg-[#ede9ff]/80 backdrop-blur-[12px] shadow-[0_12px_48px_rgba(0,0,0,0.15)] overflow-hidden">
                {/* 상단 */}
                <div className="relative px-8 pt-7 pb-5 flex flex-col items-center gap-3">
                    <button onClick={onClose} className="absolute right-5 top-5 text-[#c0bcd0] hover:text-[#7865ff]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                    <span className="rounded-full bg-[#7865ff] px-3 py-1 text-[12px] font-bold text-white">장바구니 담기 완료</span>
                    <p className="text-[22px] font-bold text-[#16121f] text-center">장바구니에 상품을 성공적으로 담았습니다 !</p>
                    <p className="text-[13px] text-[#9b94b2] text-center line-clamp-1">{title}</p>
                    {option && <p className="text-[12px] text-[#b0aabb]">옵션 : {option}</p>}
                </div>

                {/* 버튼 */}
                <div className="flex border-t border-[#f0edf8]">
                    <button onClick={onClose}
                        className="flex-1 h-[56px] text-[15px] font-semibold text-[#6b647a] transition hover:bg-[#f8f6ff] border-r border-[#f0edf8]">
                        쇼핑 계속하기
                    </button>
                    <button onClick={() => { onClose(); router.push("/store/cart"); }}
                        className="flex-1 h-[56px] text-[15px] font-bold text-white bg-[#7865ff] transition hover:bg-[#6552ee]">
                        장바구니로 가기
                    </button>
                </div>
            </div>
        </div>
    );
}