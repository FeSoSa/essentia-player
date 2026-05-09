import { create } from 'zustand';

export interface SobrecargaResult {
  approved: boolean;
  nivel: number;
  roll?: number;
  cd?: number;
  damageTaken?: number;
}

interface SobrecargaStore {
  result: SobrecargaResult | null;
  setResult: (r: SobrecargaResult) => void;
  clearResult: () => void;
}

export const useSobrecargaStore = create<SobrecargaStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));
