
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SidebarState = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      toggleSidebar: () => set({ isCollapsed: !get().isCollapsed }),
    }),
    {
      name: 'sidebar-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
