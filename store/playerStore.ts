import { create } from 'zustand';
import type { Player, Slot, SkillTreeEntry } from '@/types';

interface PlayerStore {
  player: Player | null;
  skillTree: SkillTreeEntry[];
  setPlayer: (p: Player) => void;
  setSkillTree: (tree: SkillTreeEntry[]) => void;
  updateSlotCooldowns: (slots: Slot[]) => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  player: null,
  skillTree: [],
  setPlayer: (player) => set({ player }),
  setSkillTree: (skillTree) => set({ skillTree }),
  updateSlotCooldowns: (slots) =>
    set((state) =>
      state.player ? { player: { ...state.player, slots } } : {}
    ),
  clearPlayer: () => set({ player: null, skillTree: [] }),
}));
