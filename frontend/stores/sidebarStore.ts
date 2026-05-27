import { create } from "zustand";

const SIDEBAR_OPEN_KEY = "healthier-sidebar-open";

interface SidebarStore {
  isOpen: boolean;
  isMobile: boolean;
  openMobile: boolean;
  
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  setIsMobile: (mobile: boolean) => void;
  setOpenMobile: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  isOpen: true,
  isMobile: false,
  openMobile: false,
  
  setIsOpen: (open) => {
    set({ isOpen: open });
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
    }
  },
  
  toggle: () => {
    const { isOpen, setIsOpen } = get();
    setIsOpen(!isOpen);
  },
  
  setIsMobile: (mobile) => {
    set({ isMobile: mobile });
  },
  
  setOpenMobile: (open) => {
    set({ openMobile: open });
  },
}));

if (typeof window !== "undefined") {
  const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
  if (saved === "false") {
    useSidebarStore.getState().setIsOpen(false);
  }
}
