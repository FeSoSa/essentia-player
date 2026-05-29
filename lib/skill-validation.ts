import type { Player, Slot, SkillTreeEntry, Essencia, EssenciaObtida, Equipment } from '@/types';

export function computeAccessibleEssenciaSkills(
  essenciasObtidas: EssenciaObtida[],
  essencias: Essencia[]
): Set<string> {
  const set = new Set<string>();
  // Skills explicitamente desbloqueadas pelo jogador (fonte mais confiável)
  for (const obtained of essenciasObtidas) {
    obtained.unlockedSkillIds.forEach((id) => set.add(id));
  }
  // Skills acessíveis via catálogo (inclui as ainda não desbloqueadas mas disponíveis)
  const playerEssenciaIds = new Set(essenciasObtidas.map((o) => o.essenciaId));
  for (const ess of essencias) {
    const playerHas = playerEssenciaIds.has(ess.id);
    const parentOwned = ess.type === 'Derivada' && !!ess.parentId && playerEssenciaIds.has(ess.parentId);
    if (playerHas || parentOwned) {
      ess.skillIds.forEach((id) => set.add(id));
    }
  }
  return set;
}

export function isSkillEquippable(
  skill: SkillTreeEntry,
  equipment: Equipment,
  accessibleEssenciaSkills: Set<string>
): boolean {
  if (skill.skillType === 'weapon') {
    const { mainHand, offHand } = equipment;
    const weaponTypes = skill.categoria.split('/');
    return weaponTypes.some((t) => mainHand?.weaponType === t || offHand?.weaponType === t);
  }
  if (skill.skillType === 'essencia') {
    return skill.unlocked || accessibleEssenciaSkills.has(skill.skillId);
  }
  return true;
}

export function findInvalidEquippedSlots(
  player: Player,
  skillTree: SkillTreeEntry[],
  essencias: Essencia[]
): Slot[] {
  if (player.slots.every((s) => !s.skillId)) return [];
  const skillMap = new Map(skillTree.map((s) => [s.skillId, s]));
  const accessibleEssenciaSkills = computeAccessibleEssenciaSkills(player.essenciasObtidas, essencias);
  return player.slots.filter((slot) => {
    if (!slot.skillId) return false;
    const skill = skillMap.get(slot.skillId);
    if (!skill) return false;
    return !isSkillEquippable(skill, player.equipment, accessibleEssenciaSkills);
  });
}
