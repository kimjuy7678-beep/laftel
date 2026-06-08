"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useStoreNotificationStore } from "@/store/useStoreNotificationStore";


export default function NotificationGNB() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const {
        notifications,
        unreadCount,
        subscribeNotifications,
        markAllRead
    } = useStoreNotificationStore();

    // 로그인 시 구독 시작
    useEffect(() => {
        if (user?.uid) {
            subscribeNotifications(user.uid);
        }
    }, [user?.uid]);

    // 외부 클릭 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // 로그아웃 시 닫기
    useEffect(() => {
        if (!user) setOpen(false);
    }, [user]);

    const handleOpen = () => {
        if (!user) { router.push("/login"); return; }
        setOpen(v => !v);
    };

    const handleMarkAllRead = () => {
        if (user?.uid) markAllRead(user.uid);
    };

    return (
        <div className="relative" ref={ref}>
            {/* 종 버튼 */}
            <button
                aria-label="알림"
                onClick={handleOpen}
                className="relative flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-white/15 transition-colors duration-200 cursor-pointer text-white"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {user && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* 드롭다운 */}
            {open && user && (
                <div className="absolute right-0 top-[calc(100%+4px)] w-[300px] bg-white border border-[#e2ddf5] rounded-xl shadow-[0_8px_32px_rgba(30,24,70,0.12)] overflow-hidden z-50">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#ebe8ff]">
                        <span className="text-[13px] font-bold text-[#16121f]">알림</span>
                        <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-[#9b94b2] hover:text-[#7865ff] transition"
                        >
                            전체 읽음
                        </button>
                    </div>

                    {/* 알림 목록 */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="py-8 text-center text-[13px] text-[#9b94b2]">알림이 없어요</p>
                        ) : notifications.slice(0, 5).map((n) => (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 px-4 py-3 border-b border-[#f0edf8] transition hover:bg-[#f8f6ff] ${!n.read ? "bg-[#faf9ff]" : "bg-white"}`}
                            >
                                {/* 타입 아이콘 */}
                                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.type === "point" ? "bg-[#ede9ff]" :
                                    n.type === "cancel" ? "bg-[#fff0f0]" :
                                        "bg-[#e6faf4]"
                                    }`}>
                                    <NotifIcon type={n.type} />
                                </div>

                                {/* 텍스트 */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-semibold text-[#16121f]">{n.title}</p>
                                    <p className="text-[11px] text-[#6b647a] mt-0.5 truncate">{n.body}</p>
                                    <p className="text-[10px] text-[#b0aabb] mt-1">{formatTime(n.createdAt)}</p>
                                </div>

                                {/* 미읽음 dot */}
                                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7865ff]" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function NotifIcon({ type }: { type: string }) {
    if (type === "point") return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7865ff" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
    if (type === "cancel") return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
    );
}

function formatTime(createdAt: any): string {
    if (!createdAt) return "";
    const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    return `${Math.floor(hr / 24)}일 전`;
}