import { create } from "zustand";

export type SidebarState = {
  isOpen: boolean;
};

export type SidebarActions = {
  toggle: () => void;
  setOpen: (isOpen: boolean) => void;
};

export const useSidebarStore = create<SidebarState & SidebarActions>((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
}));
