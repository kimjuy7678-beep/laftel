import { db } from "@/firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type NotificationType =
    | "point"
    | "coupon"
    | "membership"
    | "event"
    | "live"
    | "order"
    | "cancel";

export interface NotificationPayload {
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
}

export async function saveNotification(
    uid: string,
    payload: NotificationPayload
): Promise<void> {
    await addDoc(collection(db, "users", uid, "notifications"), {
        ...payload,
        source: 'store',
        read: false,
        createdAt: serverTimestamp(),
    });
}