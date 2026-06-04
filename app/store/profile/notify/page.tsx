"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

type NotifySettings = {
    orderStatus: boolean;
    newProduct: boolean;
    coupon: boolean;
    point: boolean;
    event: boolean;
    marketing: boolean;
    sms: boolean;
    email: boolean;
};

const DEFAULT_SETTINGS: NotifySettings = {
    orderStatus: true,
    newProduct: true,
    coupon: true,
    point: true,
    event: false,
    marketing: false,
    sms: false,
    email: true,
};

const NOTIFY_GROUPS = [
    {
        title: "주문 · 배송",
        desc: "주문 및 배송 관련 알림은 중요 정보이므로 항상 발송됩니다.",
        locked: true,
        items: [
            { key: "orderStatus", label: "주문 · 배송 상태 알림", desc: "결제완료, 배송시작, 배송완료 등 상태 변경 시 알려드려요." },
        ],
    },
    {
        title: "굿즈 · 혜택",
        locked: false,
        items: [
            { key: "newProduct", label: "신상품 알림", desc: "새로운 굿즈가 등록되면 알려드려요." },
            { key: "coupon", label: "쿠폰 · 할인 알림", desc: "쿠폰 발급 및 만료 예정 시 알려드려요." },
            { key: "point", label: "포인트 알림", desc: "포인트 적립 · 사용 · 만료 시 알려드려요." },
            { key: "event", label: "이벤트 · 기획전 알림", desc: "라프텔 스토어의 이벤트 및 기획전을 알려드려요." },
        ],
    },
    {
        title: "마케팅 수신",
        locked: false,
        items: [
            { key: "marketing", label: "마케팅 정보 수신 동의", desc: "프로모션, 추천 콘텐츠 등 다양한 혜택 정보를 받아보세요." },
        ],
    },
    {
        title: "수신 채널",
        locked: false,
        items: [
            { key: "sms", label: "SMS · 카카오 알림톡", desc: "문자 및 카카오 알림톡으로 알림을 받아요." },
            { key: "email", label: "이메일 알림", desc: "이메일로 주요 알림을 받아요." },
        ],
    },
];

function Toggle({ on, locked, onChange }: { on: boolean; locked?: boolean; onChange?: () => void }) {
    return (
        <button
            onClick={locked ? undefined : onChange}
            disabled={locked}
            className="relative shrink-0 transition-all"
            style={{ width: 44, height: 24, borderRadius: 12, background: on ? '#7865ff' : '#e2ddf5', border: 'none', cursor: locked ? 'default' : 'pointer', outline: 'none' }}
        >
            <span
                className="absolute top-[3px] transition-all"
                style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    left: on ? 23 : 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    display: 'block',
                }}
            />
        </button>
    );
}

export default function NotifyPage() {
    const { user } = useAuthStore();
    const [settings, setSettings] = useState<NotifySettings>(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);
    const [savedKey, setSavedKey] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
            if (snap.exists() && snap.data().notifySettings) {
                setSettings({ ...DEFAULT_SETTINGS, ...snap.data().notifySettings });
            }
        });
        return () => unsub();
    }, [user?.uid]);

    const handleToggle = async (key: keyof NotifySettings) => {
        if (!user?.uid) return;
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        setSaving(true);
        setSavedKey(key);
        try {
            await setDoc(doc(db, "users", user.uid), { notifySettings: next }, { merge: true });
        } finally {
            setSaving(false);
            setTimeout(() => setSavedKey(null), 1500);
        }
    };

    return (
        <>
            <h2 className="mb-2 text-[20px] font-bold text-[#16121f]">알림 설정</h2>
            <p className="mb-7 text-[13px] text-[#9b94b2]">받고 싶은 알림을 선택해주세요. 설정은 즉시 저장돼요.</p>

            <div className="flex flex-col gap-6">
                {NOTIFY_GROUPS.map(group => (
                    <div key={group.title} className="rounded-[14px] border border-[#ebe8ff] overflow-hidden">
                        {/* 그룹 헤더 */}
                        <div className="flex items-center gap-2 bg-[#faf9ff] px-5 py-3 border-b border-[#ebe8ff]">
                            <p className="text-[13px] font-bold text-[#3d3755]">{group.title}</p>
                            {group.locked && (
                                <span className="flex items-center gap-1 rounded-full bg-[#f0eeff] px-2 py-0.5 text-[10px] font-semibold text-[#9b94b2]">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    필수
                                </span>
                            )}
                            {group.desc && (
                                <p className="ml-auto text-[11px] text-[#9b94b2]">{group.desc}</p>
                            )}
                        </div>

                        {/* 아이템 목록 */}
                        {group.items.map((item, idx) => {
                            const key = item.key as keyof NotifySettings;
                            const isOn = settings[key];
                            const isSavedNow = savedKey === key;

                            return (
                                <div key={item.key}
                                    className={`flex items-center gap-4 px-5 py-4 ${idx < group.items.length - 1 ? "border-b border-[#f0edf8]" : ""} transition hover:bg-[#fefefe]`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-semibold text-[#16121f]">{item.label}</p>
                                            {isSavedNow && (
                                                <span className="flex items-center gap-1 text-[11px] text-[#7865ff] font-semibold">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                                    저장됨
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-[#9b94b2]">{item.desc}</p>
                                    </div>
                                    <Toggle
                                        on={group.locked ? true : isOn}
                                        locked={group.locked}
                                        onChange={() => handleToggle(key)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* 하단 안내 */}
            <div className="mt-6 rounded-[12px] border border-[#ebe8ff] bg-[#faf9ff] px-5 py-4">
                <p className="mb-2 text-[12px] font-semibold text-[#7865ff]">알림 안내</p>
                <ul className="flex flex-col gap-1.5">
                    {[
                        "주문 · 배송 알림은 서비스 제공을 위해 항상 발송돼요.",
                        "마케팅 수신 동의는 언제든지 변경할 수 있어요.",
                        "알림 수신 채널은 중복 선택 가능해요.",
                        "설정 변경은 즉시 적용돼요.",
                    ].map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-[#9b94b2]">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#c4baff]" />
                            {t}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}