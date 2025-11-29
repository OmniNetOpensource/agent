import { create } from "zustand";

type MobileUIState = {
  isSidebarOpen: boolean;
};

type MobileUIActions = {
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

export const useMobileUIStore = create<MobileUIState & MobileUIActions>(
  (set) => ({
    isSidebarOpen: false,
    openSidebar: () => set({ isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),
    toggleSidebar: () =>
      set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  })
);

