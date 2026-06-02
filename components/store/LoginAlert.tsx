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
        <div className="fixed bottom-6 right-6 z-[200] w-[360px] rounded-[20px] border border-white/30 bg-white/80 backdrop-blur-[16px] shadow-[0_8px_32px_rgba(120,101,255,0.18)] p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] bg-[#f0eeff]">
                        {thumbnail && <img src={thumbnail} alt={title} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#16121f]">장바구니에 성공적으로 담겼습니다 !</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-[#9b94b2]">{title}</p>
                        {option && <p className="text-[11px] text-[#9b94b2]">옵션 : {option}</p>}
                    </div>
                </div>
                <button onClick={onClose} className="shrink-0 text-[#c0bcd0] hover:text-[#7865ff]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="mt-4 flex gap-2">
                <button onClick={onClose}
                    className="flex-1 h-[38px] rounded-[10px] border border-[#ddd8f4] text-[12px] text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                    쇼핑 계속하기
                </button>
                <button onClick={() => { onClose(); router.push("/store/cart"); }}
                    className="flex-1 h-[38px] rounded-[10px] bg-[#7865ff] text-[12px] font-semibold text-white transition hover:bg-[#6552ee]">
                    장바구니로 가기
                </button>
            </div>
        </div>
    );
}