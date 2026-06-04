"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
// TODO: Firestore 연동 시 아래 주석 해제
// import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
// import { db } from "@/firebase/firebase";

type NotificationType = "point" | "payment";

interface Notification {
    id: number;
    type: NotificationType;
    label: string;
    desc: string;
    time: string;
    read: boolean;
}

// 더미 데이터 — Firestore 연동 시 제거
const DUMMY_NOTIFICATIONS: Notification[] = [
    { id: 1, type: "point", label: "포인트 충전 완료", desc: "5,000P가 충전되었습니다.", time: "방금 전", read: false },
    { id: 2, type: "payment", label: "결제 알림", desc: "주문 #20240601 결제가 완료되었습니다.", time: "1시간 전", read: false },
    { id: 3, type: "point", label: "포인트 적립", desc: "구매 적립 300P가 추가되었습니다.", time: "어제", read: true },
];

export default function NotificationGNB() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(DUMMY_NOTIFICATIONS);
    const ref = useRef<HTMLDivElement>(null);

    // 외부 클릭 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // TODO: Firestore 실시간 구독으로 교체
    // useEffect(() => {
    //     if (!user?.uid) return;
    //     const q = query(
    //         collection(db, "notifications"),
    //         where("uid", "==", user.uid),
    //         orderBy("createdAt", "desc")
    //     );
    //     const unsub = onSnapshot(q, (snap) => {
    //         setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    //     });
    //     return () => unsub();
    // }, [user?.uid]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleOpen = () => {
        if (!user) { router.push("/login"); return; }
        setOpen(v => !v);
    };

    // 로그아웃 시 드롭다운 강제 닫기
    useEffect(() => {
        if (!user) setOpen(false);
    }, [user]);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        // TODO: Firestore 일괄 업데이트
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
                        {unreadCount}
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
                            onClick={markAllRead}
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
                                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.type === "point" ? "bg-[#ede9ff]" : "bg-[#e6faf4]"}`}>
                                    {n.type === "point" ? (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7865ff" strokeWidth="2.5">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="16" />
                                            <line x1="8" y1="12" x2="16" y2="12" />
                                        </svg>
                                    ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                                            <rect x="1" y="4" width="22" height="16" rx="2" />
                                            <line x1="1" y1="10" x2="23" y2="10" />
                                        </svg>
                                    )}
                                </div>

                                {/* 텍스트 */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-semibold text-[#16121f]">{n.label}</p>
                                    <p className="text-[11px] text-[#6b647a] mt-0.5 truncate">{n.desc}</p>
                                    <p className="text-[10px] text-[#b0aabb] mt-1">{n.time}</p>
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