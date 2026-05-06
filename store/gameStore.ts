import { create } from 'zustand';
import type { TabId, GameImage, FastAction, InitiativeEntry, EnemyInstance, BossInstance } from '@/types';

interface GameStore {
  activeTab: TabId;
  images: GameImage[];
  hasNewImage: boolean;
  currentImageIndex: number;
  fastAction: FastAction | null;
  initiative: InitiativeEntry[];
  turnCount: number;
  enemies: EnemyInstance[];
  bosses: BossInstance[];
  setActiveTab: (tab: TabId) => void;
  setImages: (imgs: GameImage[]) => void;
  nextImage: () => void;
  prevImage: () => void;
  clearNewImage: () => void;
  setFastAction: (fa: FastAction | null) => void;
  setInitiative: (entries: InitiativeEntry[]) => void;
  incrementTurn: () => void;
  setEnemies: (enemies: EnemyInstance[]) => void;
  setBosses: (bosses: BossInstance[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeTab: 'geral',
  images: [],
  hasNewImage: false,
  currentImageIndex: 0,
  fastAction: null,
  initiative: [],
  turnCount: 0,
  enemies: [],
  bosses: [],

  setActiveTab: (tab) =>
    set({ activeTab: tab, hasNewImage: tab === 'mapa' ? false : get().hasNewImage }),

  setImages: (imgs) => {
    const prev = get().images;
    const prevActiveIds = new Set(prev.filter(i => i.active).map(i => i.id));
    const newActiveIds  = imgs.filter(i => i.active).map(i => i.id);
    const hasNew = newActiveIds.some(id => !prevActiveIds.has(id));
    const wasOnMapa = get().activeTab === 'mapa';
    // clamp index to new active count
    const activeCount = newActiveIds.length;
    const idx = Math.min(get().currentImageIndex, Math.max(0, activeCount - 1));
    set({ images: imgs, currentImageIndex: idx, hasNewImage: hasNew && !wasOnMapa });
  },

  nextImage: () => {
    const active = get().images.filter(i => i.active);
    if (active.length < 2) return;
    set((s) => ({ currentImageIndex: (s.currentImageIndex + 1) % active.length }));
  },

  prevImage: () => {
    const active = get().images.filter(i => i.active);
    if (active.length < 2) return;
    set((s) => ({ currentImageIndex: (s.currentImageIndex - 1 + active.length) % active.length }));
  },

  clearNewImage: () => set({ hasNewImage: false }),

  setFastAction: (fa) => set({ fastAction: fa }),

  setInitiative: (entries) => set({
    initiative: entries,
    turnCount: entries.length === 0 ? 0 : get().turnCount,
  }),

  incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
  setEnemies: (enemies) => set({ enemies }),
  setBosses: (bosses) => set({ bosses }),
}));
