"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import LoginAlert from "@/components/store/LoginAlert";
import RestockAlertModal from "@/components/store/RestockAlertModal";

export default function RestockAlertButton({
    productId,
    title,
    thumbnail,
}: {
    productId: string;
    title: string;
    thumbnail: string;
}) {
    const { user } = useAuthStore();
    const [enabled, setEnabled] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const uid = user.uid;
        let cancelled = false;

        (async () => {
            const snap = await getDoc(doc(db, "users", uid));
            const restockAlerts = snap.data()?.restockAlerts as unknown;
            const ids = Array.isArray(restockAlerts) ? restockAlerts : [];
            if (!cancelled) setEnabled(ids.includes(productId));
        })();

        return () => {
            cancelled = true;
        };
    }, [productId, user?.uid]);

    const stopCardNavigation = (event: React.SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleClick = (event: React.MouseEvent) => {
        stopCardNavigation(event);

        if (enabled) return;
        if (!user?.uid) {
            setShowLogin(true);
            return;
        }

        setModalOpen(true);
    };

    return (
        <>
            <button
                type="button"
                onPointerDown={stopCardNavigation}
                onClick={handleClick}
                disabled={enabled}
                aria-label={enabled ? "재입고 알림 설정됨" : "재입고 알림 설정"}
                title={enabled ? "재입고 알림 설정됨" : "재입고 알림 설정"}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${enabled
                    ? "bg-[#7865ff] text-white shadow-[0_4px_14px_rgba(120,101,255,0.28)]"
                    : "bg-white text-[#b0aabb] shadow-[0_4px_14px_rgba(30,24,70,0.16)] hover:text-[#7865ff]"
                    } disabled:cursor-not-allowed`}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={enabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            </button>
            {showLogin && <LoginAlert onClose={() => setShowLogin(false)} />}
            {modalOpen && user?.uid && (
                <RestockAlertModal
                    uid={user.uid}
                    productId={productId}
                    title={title}
                    thumbnail={thumbnail}
                    onClose={() => setModalOpen(false)}
                    onDone={() => {
                        setEnabled(true);
                        setModalOpen(false);
                    }}
                />
            )}
        </>
    );
}
