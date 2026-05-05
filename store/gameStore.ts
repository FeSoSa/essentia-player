import { create } from 'zustand';
import type { TabId, GameImage, FastAction, InitiativeEntry, EnemyInstance, BossInstance } from '@/types';

interface GameStore {
  activeTab: TabId;
  activeImage: GameImage | null;
  fastAction: FastAction | null;
  hasNewImage: boolean;
  initiative: InitiativeEntry[];
  turnCount: number;
  enemies: EnemyInstance[];
  bosses: BossInstance[];
  setActiveTab: (tab: TabId) => void;
  setActiveImage: (img: GameImage) => void;
  setFastAction: (fa: FastAction | null) => void;
  clearNewImage: () => void;
  setInitiative: (entries: InitiativeEntry[]) => void;
  incrementTurn: () => void;
  setEnemies: (enemies: EnemyInstance[]) => void;
  setBosses: (bosses: BossInstance[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeTab: 'geral',
  activeImage: null,
  fastAction: null,
  hasNewImage: false,
  initiative: [],
  turnCount: 0,
  enemies: [],
  bosses: [],
  setActiveTab: (tab) =>
    set({ activeTab: tab, hasNewImage: tab === 'mapa' ? false : get().hasNewImage }),
  setActiveImage: (img) =>
    set((state) => ({
      activeImage: img,
      hasNewImage: state.activeTab !== 'mapa' && img.active,
    })),
  setFastAction: (fa) => set({ fastAction: fa }),
  clearNewImage: () => set({ hasNewImage: false }),
  setInitiative: (entries) => set({
    initiative: entries,
    // reset round counter when master clears initiative (end of combat)
    turnCount: entries.length === 0 ? 0 : get().turnCount,
  }),
  incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
  setEnemies: (enemies) => set({ enemies }),
  setBosses: (bosses) => set({ bosses }),
}));
