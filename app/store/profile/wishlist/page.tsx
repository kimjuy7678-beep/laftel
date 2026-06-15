// app/store/profile/wishlist/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { db } from "@/firebase/firebase";
import { doc, getDoc, setDoc, arrayRemove } from "firebase/firestore";
import Link from "next/link";
import products from "@/data/store.json";

type StoreProduct = { productId: string; category: string; title: string; price: string; thumbnail: string; soldout: boolean; };
type WishFolder = { id: string; name: string; productIds: string[]; };

const ALL_PRODUCTS = products as StoreProduct[];
const PAGE_SIZE = 12;
const ALL_FOLDER_ID = "__all__";

export default function WishlistPage() {
    const { user } = useAuthStore();
    const [wishlist, setWishlist] = useState<StoreProduct[]>([]);
    const [folders, setFolders] = useState<WishFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState(ALL_FOLDER_ID);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // 폴더 관련 UI state
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [folderTarget, setFolderTarget] = useState<string | null>(null); // 상품 → 폴더 이동 모달
    const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");

    useEffect(() => {
        if (!user?.uid) { setLoading(false); return; }
        (async () => {
            const snap = await getDoc(doc(db, "users", user.uid!));
            const data = snap.data() ?? {};
            const ids: string[] = data.wishlist || [];
            const savedFolders: WishFolder[] = data.wishlistFolders || [];
            setWishlist(ALL_PRODUCTS.filter(p => ids.includes(p.productId)));
            setFolders(savedFolders);
            setLoading(false);
        })();
    }, [user?.uid]);

    const saveFolders = async (next: WishFolder[]) => {
        if (!user?.uid) return;
        await setDoc(doc(db, "users", user.uid), { wishlistFolders: next }, { merge: true });
        setFolders(next);
    };

    const removeWish = async (productId: string) => {
        if (!user?.uid) return;
        await setDoc(doc(db, "users", user.uid), { wishlist: arrayRemove(productId) }, { merge: true });
        setWishlist(prev => prev.filter(p => p.productId !== productId));
        // 폴더에서도 제거
        const next = folders.map(f => ({ ...f, productIds: f.productIds.filter(id => id !== productId) }));
        await saveFolders(next);
    };

    const createFolder = async () => {
        const name = newFolderName.trim();
        if (!name) return;
        const next = [...folders, { id: Date.now().toString(), name, productIds: [] }];
        await saveFolders(next);
        setNewFolderName("");
        setShowNewFolder(false);
    };

    const deleteFolder = async (folderId: string) => {
        if (!confirm("폴더를 삭제할까요? 상품은 전체 목록에 유지돼요.")) return;
        await saveFolders(folders.filter(f => f.id !== folderId));
        if (activeFolderId === folderId) setActiveFolderId(ALL_FOLDER_ID);
    };

    const renameFolder = async (folderId: string) => {
        const name = renameValue.trim();
        if (!name) return;
        await saveFolders(folders.map(f => f.id === folderId ? { ...f, name } : f));
        setRenameFolderId(null);
    };

    const addToFolder = async (folderId: string, productId: string) => {
        const next = folders.map(f =>
            f.id === folderId
                ? { ...f, productIds: f.productIds.includes(productId) ? f.productIds : [...f.productIds, productId] }
                : f
        );
        await saveFolders(next);
        setFolderTarget(null);
    };

    const removeFromFolder = async (folderId: string, productId: string) => {
        const next = folders.map(f =>
            f.id === folderId ? { ...f, productIds: f.productIds.filter(id => id !== productId) } : f
        );
        await saveFolders(next);
    };

    // 현재 폴더 기준 필터링
    const filtered = useMemo(() => {
        if (activeFolderId === ALL_FOLDER_ID) return wishlist;
        const folder = folders.find(f => f.id === activeFolderId);
        if (!folder) return [];
        return wishlist.filter(p => folder.productIds.includes(p.productId));
    }, [wishlist, folders, activeFolderId]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const activeFolder = folders.find(f => f.id === activeFolderId);

    return (
        <>
            {/* 헤더 */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-[20px] font-bold text-[#16121f]">위시 리스트</h2>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7865ff] text-[12px] font-bold text-white">{wishlist.length}</span>
                </div>
                <button onClick={() => setShowNewFolder(true)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-[#e2ddf5] text-[12px] font-semibold text-[#7865ff] hover:bg-[#f0eeff] transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
                    새 폴더
                </button>
            </div>

            {/* 새 폴더 입력 */}
            {showNewFolder && (
                <div className="mb-4 flex items-center gap-2">
                    <input
                        autoFocus
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                        placeholder="폴더 이름 입력"
                        className="flex-1 h-9 rounded-[8px] border border-[#e2ddf5] px-3 text-[13px] text-[#16121f] outline-none focus:border-[#7865ff] transition"
                    />
                    <button onClick={createFolder} className="h-9 px-4 rounded-[8px] bg-[#7865ff] text-[12px] font-bold text-white hover:bg-[#6b55f0] transition">만들기</button>
                    <button onClick={() => setShowNewFolder(false)} className="h-9 px-3 rounded-[8px] border border-[#e2ddf5] text-[12px] text-[#9b94b2] hover:border-[#7865ff] transition">취소</button>
                </div>
            )}

            {/* 폴더 탭 */}
            <div className="mb-5 flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => { setActiveFolderId(ALL_FOLDER_ID); setPage(1); }}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition ${activeFolderId === ALL_FOLDER_ID ? "bg-[#7865ff] text-white" : "border border-[#e2ddf5] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                    전체 <span className="text-[11px]">{wishlist.length}</span>
                </button>
                {folders.map(f => (
                    <div key={f.id} className="relative flex items-center gap-1">
                        {renameFolderId === f.id ? (
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") renameFolder(f.id); if (e.key === "Escape") setRenameFolderId(null); }}
                                onBlur={() => renameFolder(f.id)}
                                className="h-8 w-[100px] rounded-full border-2 border-[#7865ff] px-3 text-[12px] outline-none"
                            />
                        ) : (
                            <button
                                onClick={() => { setActiveFolderId(f.id); setPage(1); }}
                                onDoubleClick={() => { setRenameFolderId(f.id); setRenameValue(f.name); }}
                                title="더블클릭으로 이름 변경"
                                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition ${activeFolderId === f.id ? "bg-[#7865ff] text-white" : "border border-[#e2ddf5] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff]"}`}>
                                📁 {f.name} <span className="text-[11px]">{f.productIds.length}</span>
                            </button>
                        )}
                        <button onClick={() => deleteFolder(f.id)}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0eeff] text-[#9b94b2] hover:bg-[#ffecec] hover:text-[#ff4d6d] transition">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* 상품 폴더 추가 모달 */}
            {folderTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFolderTarget(null)}>
                    <div className="w-[300px] bg-white rounded-[16px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-[#f0edf8]">
                            <p className="text-[14px] font-bold text-[#16121f]">폴더에 추가</p>
                        </div>
                        <div className="px-5 py-3 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                            {folders.length === 0 ? (
                                <p className="text-[13px] text-[#9b94b2] py-4 text-center">폴더가 없어요. 먼저 폴더를 만들어주세요.</p>
                            ) : folders.map(f => {
                                const isIn = f.productIds.includes(folderTarget);
                                return (
                                    <button key={f.id}
                                        onClick={() => isIn ? removeFromFolder(f.id, folderTarget) : addToFolder(f.id, folderTarget)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[13px] transition ${isIn ? "bg-[#f0eeff] text-[#7865ff] font-semibold" : "hover:bg-[#faf9ff] text-[#3d3755]"}`}>
                                        <span>📁 {f.name}</span>
                                        {isIn
                                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        }
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-5 py-3 border-t border-[#f0edf8]">
                            <button onClick={() => setFolderTarget(null)} className="w-full h-9 rounded-[8px] border border-[#e2ddf5] text-[13px] text-[#6b647a] hover:border-[#7865ff] hover:text-[#7865ff] transition">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 상품 목록 */}
            {loading ? (
                <div className="flex h-[300px] items-center justify-center text-[14px] text-[#9b94b2]">불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-[14px] text-[#9b94b2]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    {activeFolderId === ALL_FOLDER_ID ? "찜한 상품이 없어요." : "이 폴더에 상품이 없어요."}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-5">
                        {paginated.map(p => {
                            const inFolders = folders.filter(f => f.productIds.includes(p.productId));
                            return (
                                <div key={p.productId} className="group relative">
                                    <Link href={`/store/${p.productId}`}>
                                        <div className="relative overflow-hidden rounded-[12px] bg-[#f0eeff]">
                                            {p.thumbnail
                                                ? <img src={p.thumbnail} alt={p.title} className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                                : <div className="aspect-square w-full bg-[#e8e4f8]" />
                                            }
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-[11px] text-[#8a8494]">{p.category}</p>
                                            <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-[#17151f]">{p.title}</p>
                                            {/* 폴더 뱃지 */}
                                            {inFolders.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {inFolders.map(f => (
                                                        <span key={f.id} className="text-[10px] bg-[#f0eeff] text-[#7865ff] px-1.5 py-0.5 rounded-full font-medium">📁 {f.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mt-1.5 flex items-center justify-between">
                                                <p className="text-[14px] font-bold text-[#111018]">{p.price}</p>
                                                <div className="flex items-center gap-1">
                                                    {/* 폴더 추가 버튼 */}
                                                    <button onClick={(e) => { e.preventDefault(); setFolderTarget(p.productId); }}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0eeff] text-[#7865ff] shadow hover:bg-[#e0d8ff] transition">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                                    </button>
                                                    {/* 위시 제거 버튼 */}
                                                    <button onClick={(e) => { e.preventDefault(); removeWish(p.productId); }}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff4d6d] text-white shadow hover:bg-[#e03558] transition">
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>

                            {(() => {
                                const PAGE_GROUP = 6;
                                const groupIndex = Math.floor((page - 1) / PAGE_GROUP);
                                const groupStart = groupIndex * PAGE_GROUP + 1;
                                const groupEnd = Math.min(groupStart + PAGE_GROUP - 1, totalPages);
                                const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
                                return (
                                    <>
                                        {groupStart > 1 && (
                                            <button onClick={() => setPage(groupStart - 1)}
                                                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">
                                                ···
                                            </button>
                                        )}
                                        {pages.map(n => (
                                            <button key={n} onClick={() => setPage(n)}
                                                className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-[14px] font-medium transition ${page === n ? "bg-[#7865ff] text-white shadow-[0_2px_10px_rgba(120,101,255,0.35)]" : "border border-[#d8d4ee] bg-white text-[#6b647a] hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]"}`}>
                                                {n}
                                            </button>
                                        ))}
                                        {groupEnd < totalPages && (
                                            <button onClick={() => setPage(groupEnd + 1)}
                                                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[14px] text-[#6b647a] transition hover:border-[#7865ff] hover:bg-[#f0eeff] hover:text-[#7865ff]">
                                                ···
                                            </button>
                                        )}
                                    </>
                                );
                            })()}

                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#d8d4ee] bg-white text-[#7865ff] transition hover:border-[#7865ff] hover:bg-[#f0eeff] disabled:opacity-30 disabled:cursor-not-allowed">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </div>
                    )}
                </>
            )}
        </>
    );
}