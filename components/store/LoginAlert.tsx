// components/store/LoginAlert.tsx
"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/hook/useBodyScrollLock";

export default function LoginAlert({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [count, setCount] = useState(3);
    useBodyScrollLock();

    useEffect(() => {
        const timer = setInterval(() => {
            setCount(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    router.push("/login");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/10" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-[560px] rounded-[24px] border border-[#c8bfff]/40 bg-[#E6E2FF]/60 backdrop-blur-[12px] shadow-[0_12px_48px_rgba(120,101,255,0.25)] px-10 py-10 flex flex-col items-center gap-5">
                <span className="rounded-full bg-[#7865ff] px-4 py-1.5 text-[13px] font-bold text-white">로그인이 필요합니다 !</span>
                <div className="text-center">
                    <p className="text-[26px] font-bold text-[#16121f]">해당 기능은 로그인 후 이용하실 수 있습니다</p>
                    <p className="mt-2 text-[14px] text-[#9b94b2]">{count}초 뒤에 로그인 페이지로 자동 이동합니다...</p>
                </div>
                <div className="flex w-full gap-3 mt-2">
                    <button onClick={onClose}
                        className="flex-1 h-[52px] rounded-full border-2 border-[#ddd8f4] text-[16px] font-semibold text-[#6b647a] transition hover:border-[#7865ff] hover:text-[#7865ff]">
                        취 소
                    </button>
                    <button onClick={() => { onClose(); router.push("/login"); }}
                        className="flex-1 h-[52px] rounded-full bg-[#7865ff] text-[16px] font-bold text-white transition hover:bg-[#6552ee]">
                        지금 로그인하기
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}