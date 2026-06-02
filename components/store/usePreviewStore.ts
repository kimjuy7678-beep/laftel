import { create } from 'zustand'

interface PreviewStore {
    previewId: number | null
    setPreviewId: (id: number | null) => void
}

export const usePreviewStore = create<PreviewStore>((set) => ({
    previewId: null,
    setPreviewId: (id) => set({ previewId: id }),
})) 