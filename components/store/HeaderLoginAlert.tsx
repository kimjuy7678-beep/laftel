"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderLoginAlert({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [count, setCount] = useState(3);

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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className="w-[480px] rounded-[28px] border border-[#c8bfff]/40 bg-[#eeeaff]/80 backdrop-blur-[20px] shadow-[0_12px_48px_rgba(120,101,255,0.18)] px-10 py-10 flex flex-col items-center gap-5"
            >
                {/* 배지 */}
                <span className="rounded-full bg-[#7865ff] px-4 py-1.5 text-[13px] font-bold text-white tracking-wide">
                    로그인이 필요합니다 !
                </span>

                {/* 텍스트 */}
                <div className="text-center">
                    <p className="text-[22px] font-bold text-[#16121f] leading-snug">
                        해당 기능은 로그인 후<br />이용하실 수 있습니다
                    </p>
                    <p className="mt-2.5 text-[13px] text-[#9b94b2]">
                        {count}초 뒤에 로그인 페이지로 자동 이동합니다...
                    </p>
                </div>


            </div>
        </div>
    );
}