import { create } from "zustand";

type MobileState = {
  isMobile: boolean;
  setIsMobile: (value: boolean) => void;
};

export const useMobileStore = create<MobileState>((set) => ({
  isMobile: false,
  setIsMobile: (value) => set({ isMobile: value }),
}));

