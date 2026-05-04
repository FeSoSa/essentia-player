import { create } from 'zustand';
import type { TabId, GameImage, FastAction } from '@/types';

interface GameStore {
  activeTab: TabId;
  activeImage: GameImage | null;
  fastAction: FastAction | null;
  hasNewImage: boolean;
  setActiveTab: (tab: TabId) => void;
  setActiveImage: (img: GameImage) => void;
  setFastAction: (fa: FastAction | null) => void;
  clearNewImage: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeTab: 'geral',
  activeImage: null,
  fastAction: null,
  hasNewImage: false,
  setActiveTab: (tab) =>
    set({ activeTab: tab, hasNewImage: tab === 'mapa' ? false : get().hasNewImage }),
  setActiveImage: (img) =>
    set((state) => ({
      activeImage: img,
      hasNewImage: state.activeTab !== 'mapa' && img.active,
    })),
  setFastAction: (fa) => set({ fastAction: fa }),
  clearNewImage: () => set({ hasNewImage: false }),
}));
