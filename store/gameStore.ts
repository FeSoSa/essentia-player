import { create } from 'zustand';
import type { TabId, GameImage, FastAction, InitiativeEntry, EnemyInstance, BossInstance, CollectiveBar, DamageResultNotification, CombatAlly, Shop } from '@/types';

interface GameStore {
  activeTab: TabId;
  shops: Shop[];
  setShops: (shops: Shop[]) => void;
  images: GameImage[];
  hasNewImage: boolean;
  currentImageIndex: number;
  fastAction: FastAction | null;
  initiative: InitiativeEntry[];
  turnCount: number;
  enemies: EnemyInstance[];
  bosses: BossInstance[];
  collectiveBars: CollectiveBar[];
  cooldownsCleared: boolean;
  setCollectiveBars: (bars: CollectiveBar[]) => void;
  setActiveTab: (tab: TabId) => void;
  setImages: (imgs: GameImage[]) => void;
  nextImage: () => void;
  prevImage: () => void;
  clearNewImage: () => void;
  setFastAction: (fa: FastAction | null) => void;
  setInitiative: (entries: InitiativeEntry[]) => void;
  setTurnCount: (count: number) => void;
  incrementTurn: () => void;
  damageResult: DamageResultNotification | null;
  setDamageResult: (r: DamageResultNotification | null) => void;
  setEnemies: (enemies: EnemyInstance[]) => void;
  setBosses: (bosses: BossInstance[]) => void;
  allies: CombatAlly[];
  setAllies: (allies: CombatAlly[]) => void;
  setCooldownsCleared: (v: boolean) => void;
  mainActionUsed: boolean;
  bonusActionUsed: boolean;
  setMainActionUsed: (v: boolean) => void;
  setBonusActionUsed: (v: boolean) => void;
  resetTurnActions: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  activeTab: 'geral',
  shops: [],
  setShops: (shops) => set({ shops }),
  images: [],
  hasNewImage: false,
  currentImageIndex: 0,
  fastAction: null,
  initiative: [],
  turnCount: 0,
  enemies: [],
  bosses: [],
  collectiveBars: [],
  setCollectiveBars: (collectiveBars) => set({ collectiveBars }),

  cooldownsCleared: false,
  setCooldownsCleared: (v) => set({ cooldownsCleared: v }),

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
    turnCount: 0,
    mainActionUsed: false,
    bonusActionUsed: false,
  }),

  setTurnCount: (count: number) => set({ turnCount: count }),
  incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
  damageResult: null,
  setDamageResult: (damageResult) => set({ damageResult }),
  setEnemies: (enemies) => set({ enemies }),
  setBosses: (bosses) => set({ bosses }),
  allies: [],
  setAllies: (allies) => set({ allies }),
  mainActionUsed: false,
  bonusActionUsed: false,
  setMainActionUsed: (v) => set({ mainActionUsed: v }),
  setBonusActionUsed: (v) => set({ bonusActionUsed: v }),
  resetTurnActions: () => set({ mainActionUsed: false, bonusActionUsed: false }),
}));
