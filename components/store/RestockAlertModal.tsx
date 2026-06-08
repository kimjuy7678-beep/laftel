"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { saveStoreNotification } from "@/utils/storeNotification";
import { useBodyScrollLock } from "@/hook/useBodyScrollLock";

const ALERT_METHODS = [
    { key: "app", label: "앱 알림", desc: "스토어 알림함으로 알려드려요." },
    { key: "sms", label: "SMS · 카카오 알림톡", desc: "등록된 연락처로 알려드려요." },
    { key: "email", label: "이메일", desc: "등록된 이메일로 알려드려요." },
] as const;

type AlertMethod = (typeof ALERT_METHODS)[number]["key"];

export default function RestockAlertModal({
    uid,
    productId,
    title,
    thumbnail,
    onClose,
    onDone,
}: {
    uid: string;
    productId: string;
    title: string;
    thumbnail: string;
    onClose: () => void;
    onDone: () => void;
}) {
    const [methods, setMethods] = useState<AlertMethod[]>(["app"]);
    const [saving, setSaving] = useState(false);
    useBodyScrollLock();

    const toggleMethod = (method: AlertMethod) => {
        setMethods((prev) => {
            if (prev.includes(method)) return prev.filter((item) => item !== method);
            return [...prev, method];
        });
    };

    const handleSave = async () => {
        if (methods.length === 0) return;

        setSaving(true);
        try {
            await setDoc(doc(db, "users", uid), {
                restockAlerts: arrayUnion(productId),
                restockAlertMethods: {
                    [productId]: methods,
                },
            }, { merge: true });
            await saveStoreNotification(uid, {
                type: "restock",
                title: "재입고 알림설정 완료",
                body: `${title} 재입고 알림을 설정했어요.`,
                link: `/store/${productId}`,
            });
            onDone();
        } finally {
            setSaving(false);
        }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
            <div className="w-full max-w-[430px] rounded-[18px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[13px] font-bold text-[#826CFF]">재입고 알림설정</p>
                        <h3 className="mt-1 line-clamp-2 text-[18px] font-black text-[#222]">{title}</h3>
                    </div>
                    <button type="button" onClick={onClose} aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f1f4] text-[#666]">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mt-5 flex gap-3 rounded-[14px] bg-[#faf9ff] p-3">
                    <div
                        className="h-[58px] w-[58px] shrink-0 rounded-[10px] bg-[#f3f1ff] bg-cover bg-center"
                        style={{ backgroundImage: `url(${thumbnail})` }}
                        aria-label={title}
                    />
                    <p className="min-w-0 flex-1 text-[13px] leading-[1.6] text-[#6b647a]">
                        상품이 다시 구매 가능해지면 선택한 방법으로 알려드릴게요.
                    </p>
                </div>

                <div className="mt-5">
                    <p className="mb-3 text-[13px] font-bold text-[#16121f]">알림 방법</p>
                    <div className="space-y-2">
                        {ALERT_METHODS.map((method) => {
                            const checked = methods.includes(method.key);
                            return (
                                <button
                                    key={method.key}
                                    type="button"
                                    onClick={() => toggleMethod(method.key)}
                                    className={`flex w-full items-center justify-between rounded-[12px] border px-4 py-3 text-left transition ${checked
                                        ? "border-[#826CFF] bg-[#f5f3ff]"
                                        : "border-[#e2ddf5] bg-white hover:border-[#bdb4ff]"
                                        }`}
                                >
                                    <span>
                                        <span className="block text-[13px] font-bold text-[#222]">{method.label}</span>
                                        <span className="mt-0.5 block text-[11px] text-[#9b94b2]">{method.desc}</span>
                                    </span>
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${checked ? "border-[#826CFF] bg-[#826CFF]" : "border-[#c9c4df]"}`}>
                                        {checked && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                <path d="M20 6 9 17l-5-5" />
                                            </svg>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <button type="button" onClick={onClose} className="h-[46px] flex-1 rounded-[12px] border border-[#ddd8f4] text-[14px] font-bold text-[#777]">
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || methods.length === 0}
                        className="h-[46px] flex-1 rounded-[12px] bg-[#826CFF] text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d8d5ee]"
                    >
                        {saving ? "저장 중" : "알림받기"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
