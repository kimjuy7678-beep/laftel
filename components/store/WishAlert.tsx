// components/store/WishAlert.tsx
"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/hook/useBodyScrollLock";

export default function WishAlert({
    title,
    thumbnail,
    onClose,
}: {
    title: string;
    thumbnail?: string;
    onClose: () => void;
}) {
    const router = useRouter();
    useBodyScrollLock();

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/10" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-[480px] rounded-[20px] bg-white shadow-[0_12px_48px_rgba(0,0,0,0.25)] overflow-hidden">
                {/* 상단 */}
                <div className="relative px-8 pt-7 pb-5 flex flex-col items-center gap-3">
                    <button onClick={onClose} className="absolute right-5 top-5 text-[#c0bcd0] hover:text-[#ff4d6d]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                    <span className="rounded-full bg-[#ff4d6d] px-3 py-1 text-[12px] font-bold text-white">위시리스트 담기 완료</span>
                    {thumbnail && (
                        <div
                            className="h-[64px] w-[64px] rounded-[12px] bg-[#f3f1ff] bg-cover bg-center"
                            style={{ backgroundImage: `url(${thumbnail})` }}
                            aria-label={title}
                        />
                    )}
                    <p className="text-[22px] font-bold text-[#16121f] text-center">위시리스트에 상품이 담겼습니다 !</p>
                    <p className="text-[13px] text-[#9b94b2] text-center line-clamp-1">{title}</p>
                </div>

                {/* 버튼 */}
                <div className="flex border-t border-[#f0edf8]">
                    <button onClick={onClose}
                        className="flex-1 h-[56px] text-[15px] font-semibold text-[#6b647a] transition hover:bg-[#f8f6ff] border-r border-[#f0edf8]">
                        쇼핑 계속하기
                    </button>
                    <button onClick={() => { onClose(); router.push("/store/profile/wishlist"); }}
                        className="flex-1 h-[56px] text-[15px] font-bold text-white bg-[#ff4d6d] transition hover:bg-[#e8395a]">
                        위시리스트 보기
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
