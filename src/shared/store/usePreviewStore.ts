import { create } from "zustand";

export type PreviewState = {
  isOpen: boolean;
  code: string;
  language: string;
};

export type PreviewActions = {
  openPreview: (code: string, language: string) => void;
  closePreview: () => void;
};

export const usePreviewStore = create<PreviewState & PreviewActions>((set) => ({
  isOpen: false,
  code: "",
  language: "",
  openPreview: (code, language) => set({ isOpen: true, code, language }),
  closePreview: () => set({ isOpen: false }),
}));
