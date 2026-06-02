// app/store/profile/layout.tsx
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/firebase";

const MENU_TOP = [
    { label: "구매목록", path: "/store/profile", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
    { label: "좋아요", path: "/store/profile/wishlist", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
    { label: "문의 내역", path: "/store/profile/inquiry", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { label: "쿠폰함", path: "/store/profile/coupon", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    { label: "포인트 내역", path: "/store/profile/points", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg> },
];

const MENU_BOTTOM = [
    { label: "배송지 관리", path: "/store/profile/address", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> },
    { label: "결제 수단 관리", path: "/store/profile/payment", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
    { label: "회원 정보 관리", path: "/store/profile/account", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { label: "알림 설정", path: "/store/profile/notify", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
];

const MEMBERSHIP_LABEL: Record<string, string> = {
    none: "Basic Plan", anime: "Anime Plan", ost: "OST Plan", allinone: "All-in-One Plan",
};

export default function ProfileStoreLayout({ children }: { children: React.ReactNode }) {
    const { user, onLogin } = useAuthStore();
    const pathname = usePathname();
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [wishCount, setWishCount] = useState(0);

    const isActive = (path: string) =>
        path === "/store/profile" ? pathname === "/store/profile" : pathname.startsWith(path);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.uid) return;
        setUploading(true);
        try {
            const storageRef = ref(storage, `avatars/${user.uid}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await setDoc(doc(db, "users", user.uid), { avatarUrl: url }, { merge: true });
            onLogin({ ...user, photoURL: url });
        } catch (err) { console.error(err); }
        finally { setUploading(false); }
    };

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-[1200px] px-6 py-10">

                {/* 인사말 */}
                <div className="mb-6">
                    <h1 className="text-[26px] font-bold text-[#16121f]">
                        <span className="text-[#7865ff]">{user?.name ?? "회원"}</span>님, 반가워요!
                    </h1>
                    <p className="mt-1 text-[13px] text-[#9b94b2]">오늘도 라프텔과 함께 덕질 라이프를 즐겨보세요💜</p>
                </div>

                {/* 프로필 카드 */}
                <div className="mb-6 rounded-[16px] bg-[#ede9ff] px-8 py-6">
                    <div className="flex items-center gap-6">
                        <div className="relative shrink-0">
                            <div className="h-[80px] w-[80px] overflow-hidden rounded-full bg-[#c8c0f0]">
                                {user?.photoURL
                                    ? <img src={user.photoURL} alt="프로필" className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full items-center justify-center text-[28px] font-bold text-[#7865ff]">{user?.name?.[0] ?? "?"}</div>
                                }
                            </div>
                            <button onClick={() => fileRef.current?.click()} disabled={uploading}
                                className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#7865ff] text-white shadow">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[17px] font-bold text-[#16121f]">{user?.name}</span>
                                <span className="rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[11px] font-bold text-[#16121f]">
                                    {MEMBERSHIP_LABEL[user?.membership ?? "none"]}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-6">
                                <div>
                                    <p className="text-[12px] text-[#9b94b2]">포인트</p>
                                    <p className="text-[15px] font-bold text-[#7865ff]">{(user?.points ?? 0).toLocaleString()}P</p>
                                </div>
                                <div className="h-7 w-px bg-[#d0caee]" />
                                <div>
                                    <p className="text-[12px] text-[#9b94b2]">쿠폰</p>
                                    <p className="text-[15px] font-bold text-[#7865ff]">2장</p>
                                </div>
                                <div className="h-7 w-px bg-[#d0caee]" />
                                <div>
                                    <p className="text-[12px] text-[#9b94b2]">좋아요</p>
                                    <p className="text-[15px] font-bold text-[#7865ff]">6개</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="flex gap-5">
                    {/* 사이드바 */}
                    <div className="w-[200px] shrink-0">
                        <div className="rounded-[16px] border border-[#ebe8ff] bg-white p-3">
                            {MENU_TOP.map((m) => (
                                <Link key={m.path} href={m.path}
                                    className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition ${isActive(m.path) ? "bg-[#7865ff] text-white font-semibold" : "text-[#3d3755] hover:bg-[#f0eeff]"}`}>
                                    {m.icon}{m.label}
                                </Link>
                            ))}
                            <div className="my-3 border-t border-[#f0edf8]" />
                            {MENU_BOTTOM.map((m) => (
                                <Link key={m.path} href={m.path}
                                    className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition ${isActive(m.path) ? "bg-[#7865ff] text-white font-semibold" : "text-[#3d3755] hover:bg-[#f0eeff]"}`}>
                                    {m.icon}{m.label}
                                </Link>
                            ))}
                            <div className="my-3 border-t border-[#f0edf8]" />
                            <div className="rounded-[10px] bg-[#f0eeff] p-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7865ff]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-[#7865ff]">마이 혜택</p>
                                        <p className="text-[10px] text-[#9b94b2]">등급별 혜택 확인하기 ›</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="flex-1 min-w-0 rounded-[16px] border border-[#ebe8ff] bg-white p-7">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}