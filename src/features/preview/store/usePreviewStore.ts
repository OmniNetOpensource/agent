import { create } from "zustand";

export type PreviewState = {
  isOpen: boolean;
  code: string;
  language: string;
  panelWidth: number;
};

export type PreviewActions = {
  openPreview: (code: string, language: string) => void;
  closePreview: () => void;
  setPanelWidth: (width: number) => void;
};

export const usePreviewStore = create<PreviewState & PreviewActions>((set) => ({
  isOpen: false,
  code: "",
  language: "",
  panelWidth: 480,
  openPreview: (code, language) => set({ isOpen: true, code, language }),
  closePreview: () => set({ isOpen: false }),
  setPanelWidth: (width) => set({ panelWidth: width }),
}));
