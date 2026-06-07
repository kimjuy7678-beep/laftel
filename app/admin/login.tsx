"use client";

// app/store/admin/login/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/firebase";

const ADMIN_EMAIL = "cky0u0@gmail.com";

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setError("");
        if (!email || !password) { setError("이메일과 비밀번호를 입력해주세요."); return; }
        if (email !== ADMIN_EMAIL) { setError("관리자 계정이 아닙니다."); return; }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace("/store/admin");
        } catch {
            setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f3ff] flex items-center justify-center px-4">
            <div className="w-full max-w-[400px] bg-white rounded-[24px] border border-[#ebe8ff] shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="bg-[#7865ff] px-8 py-8 text-center">
                    <span className="inline-block text-[11px] font-bold bg-white/20 text-white px-3 py-1 rounded-full mb-3">ADMIN</span>
                    <h1 className="text-[22px] font-extrabold text-white">라프텔 스토어</h1>
                    <p className="text-[13px] text-white/70 mt-1">관리자 전용 로그인</p>
                </div>

                {/* 폼 */}
                <div className="px-8 py-8 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-[#6b647a]">이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLogin()}
                            placeholder="admin@example.com"
                            className="h-11 rounded-[10px] border border-[#e2ddf5] px-4 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-[#6b647a]">비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLogin()}
                            placeholder="••••••••"
                            className="h-11 rounded-[10px] border border-[#e2ddf5] px-4 text-[13px] text-[#16121f] outline-none placeholder:text-[#c0bcd0] focus:border-[#7865ff] transition"
                        />
                    </div>

                    {error && (
                        <p className="text-[12px] text-[#ff4d6d] flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </p>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="mt-2 h-12 rounded-[12px] bg-[#7865ff] text-[14px] font-bold text-white hover:bg-[#6b55f0] disabled:opacity-50 transition"
                    >
                        {loading ? "로그인 중..." : "관리자 로그인"}
                    </button>
                </div>
            </div>
        </div>
    );
}