import { create } from 'zustand';
import type { Player, Slot, SkillTreeEntry, Essencia } from '@/types';

interface PlayerStore {
  player: Player | null;
  skillTree: SkillTreeEntry[];
  essencias: Essencia[];
  setPlayer: (p: Player) => void;
  setSkillTree: (tree: SkillTreeEntry[]) => void;
  setEssencias: (list: Essencia[]) => void;
  updateSlotCooldowns: (slots: Slot[]) => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  player: null,
  skillTree: [],
  essencias: [],
  setPlayer: (player) => set({ player }),
  setSkillTree: (skillTree) => set({ skillTree }),
  setEssencias: (essencias) => set({ essencias }),
  updateSlotCooldowns: (slots) =>
    set((state) =>
      state.player ? { player: { ...state.player, slots } } : {}
    ),
  clearPlayer: () => set({ player: null, skillTree: [], essencias: [] }),
}));
