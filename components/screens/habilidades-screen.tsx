'use client';

import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { SlotGrid } from '@/components/ui/slot-grid';
import { SlotEditModal } from '@/components/ui/slot-edit-modal';
import { SkillInfoModal } from '@/components/ui/skill-info-modal';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { updateSlot } from '@/lib/api';
import type { Slot, SkillTreeEntry } from '@/types';

type Filter = 'todas' | 'disponivel' | 'desbloqueada' | 'bloqueada';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todas',        label: 'TODAS'        },
  { id: 'disponivel',   label: 'DISPONÍVEL'   },
  { id: 'desbloqueada', label: 'DESBLOQUEADA' },
  { id: 'bloqueada',    label: 'BLOQUEADA'    },
];

function skillStatus(s: SkillTreeEntry, accessibleByEssencia: Set<string>): 'desbloqueada' | 'disponivel' | 'bloqueada' {
  if (s.unlocked) return 'desbloqueada';
  if (!s.requirementsText || accessibleByEssencia.has(s.skillId)) return 'disponivel';
  return 'bloqueada';
}

const BORDER_COLOR: Record<string, string> = {
  desbloqueada: Colors.tealBright,
  disponivel:   Colors.gold,
  bloqueada:    Colors.border,
};

const STATUS_COLOR: Record<string, string> = {
  desbloqueada: Colors.tealBright,
  disponivel:   Colors.gold,
  bloqueada:    Colors.muted,
};

export function HabilidadesScreen() {
  const player      = usePlayerStore((s) => s.player)!;
  const skillTree   = usePlayerStore((s) => s.skillTree);
  const essencias   = usePlayerStore((s) => s.essencias);
  const initiative  = useGameStore((s) => s.initiative);
  const combatActive = initiative.length > 0;

  const accessibleByEssencia = useMemo(() => {
    const set = new Set<string>();
    const playerEssenciaIds = new Set(player.essenciasObtidas.map((o) => o.essenciaId));
    for (const ess of essencias) {
      const playerHas = playerEssenciaIds.has(ess.id);
      const parentOwned = ess.type === 'Derivada' && !!ess.parentId && playerEssenciaIds.has(ess.parentId);
      if (playerHas || parentOwned) {
        ess.skillIds.forEach((id) => set.add(id));
      }
    }
    return set;
  }, [player.essenciasObtidas, essencias]);

  const [filter, setFilter] = useState<Filter>('todas');

  // Slot edit (equipar — só para slots vazios)
  const [editSlot, setEditSlot]           = useState<Slot | null>(null);
  const [editPreselect, setEditPreselect] = useState<string | undefined>();

  // Skill info/detail modal
  const [infoSkill,    setInfoSkill]    = useState<SkillTreeEntry | null>(null);
  const [infoFromSlot, setInfoFromSlot] = useState<Slot | null>(null);

  const skillMap    = new Map(skillTree.map((s) => [s.skillId, s]));
  const equippedIds = new Set(player.slots.filter((s) => s.skillId).map((s) => s.skillId!));
  const cooldownMap = new Map(
    player.slots
      .filter((s) => combatActive && s.skillId && s.cooldownRemaining > 0)
      .map((s) => [s.skillId!, s.cooldownRemaining])
  );

  // Filter + sort: disponivel first, then desbloqueada, then bloqueada
  const STATUS_ORDER = { disponivel: 0, desbloqueada: 1, bloqueada: 2 };
  const visible = skillTree
    .filter((s) => filter === 'todas' || skillStatus(s, accessibleByEssencia) === filter)
    .sort((a, b) => STATUS_ORDER[skillStatus(a, accessibleByEssencia)] - STATUS_ORDER[skillStatus(b, accessibleByEssencia)]);

  function handleSlotEdit(slot: Slot) {
    if (slot.skillId) {
      const skill = skillMap.get(slot.skillId);
      if (skill) {
        setInfoSkill(skill);
        setInfoFromSlot(slot);
        return;
      }
    }
    setEditPreselect(undefined);
    setEditSlot(slot);
  }

  async function handleRemoveFromSlot() {
    if (!infoFromSlot) return;
    try {
      const updated = await updateSlot(player.id, infoFromSlot.id, null);
      usePlayerStore.getState().setPlayer(updated);
    } catch { /* silent */ }
    setInfoFromSlot(null);
  }

  function handleEquipFromInfo(skill: SkillTreeEntry) {
    const freeSlot = player.slots.find((s) => !s.skillId) ?? player.slots[0];
    setEditPreselect(skill.skillId);
    setEditSlot(freeSlot ?? null);
  }

  function renderSkill({ item: skill }: { item: SkillTreeEntry }) {
    const status    = skillStatus(skill, accessibleByEssencia);
    const border    = BORDER_COLOR[status];
    const isLocked  = status === 'bloqueada';
    const hasCooldown = cooldownMap.has(skill.skillId);
    const equipped  = equippedIds.has(skill.skillId);
    const maestria  = skill.maestria;
    const readyLevelUp = maestria && maestria.choices.length < maestria.level - 1;

    return (
      <TouchableOpacity
        style={[styles.row, { borderLeftColor: border }, isLocked && styles.rowLocked]}
        onPress={() => setInfoSkill(skill)}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.nome, isLocked && styles.textDim]} numberOfLines={1}>
              {skill.nome}
            </Text>
            {maestria && maestria.level > 0 && (
              <View style={[styles.maestriaBadge, readyLevelUp && styles.maestriaBadgeReady]}>
                <Text style={styles.maestriaBadgeText}>M{maestria.level}{readyLevelUp ? ' ↑' : ''}</Text>
              </View>
            )}
            {equipped && !hasCooldown && (
              <View style={styles.equippedBadge}>
                <Text style={styles.equippedBadgeText}>SLOT</Text>
              </View>
            )}
            {hasCooldown && (
              <View style={styles.cooldownBadge}>
                <Text style={styles.cooldownBadgeText}>{cooldownMap.get(skill.skillId)}T</Text>
              </View>
            )}
            {skill.pressaoDice && (
              <View style={styles.pressaoBadge}>
                <Text style={styles.pressaoBadgeText}>PRESSÃO</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.custo, isLocked && styles.textDim]}>{skill.custo}</Text>
            <Text style={[styles.statusLabel, { color: STATUS_COLOR[status] }]}>
              {status.toUpperCase()}
            </Text>
          </View>

          {maestria && maestria.level > 0 && (
            <View style={styles.maestriaBar}>
              {maestria.level < 5 && (
                <Text style={styles.maestriaUsos}>
                  {maestria.totalUses}/{maestria.nextLevelUses} usos
                </Text>
              )}
              <View style={styles.maestriaDots}>
                {Array.from({ length: 5 }, (_, i) => (
                  <View key={i} style={[styles.dot, i < maestria.level ? styles.dotFilled : styles.dotEmpty]} />
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Slots */}
      <View style={styles.slotsSection}>
        <Text style={styles.sectionLabel}>SLOTS</Text>
        <SlotGrid
          slots={player.slots}
          classCount={player.char.slotsClass}
          freeCount={player.char.slotsTotal - player.char.slotsClass}
          skillMap={skillMap}
          onSlotPress={handleSlotEdit}
        />
      </View>

      <View style={styles.divider} />

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Skill list */}
      <FlatList
        data={visible}
        keyExtractor={(s) => s.skillId}
        renderItem={renderSkill}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <SkillInfoModal
        visible={!!infoSkill}
        skill={infoSkill}
        slots={player.slots}
        onClose={() => { setInfoSkill(null); setInfoFromSlot(null); }}
        onEquipPress={handleEquipFromInfo}
        onRemovePress={infoFromSlot ? handleRemoveFromSlot : undefined}
      />

      <SlotEditModal
        visible={!!editSlot}
        slot={editSlot}
        skillTree={skillTree}
        preselectedSkillId={editPreselect}
        onClose={() => { setEditSlot(null); setEditPreselect(undefined); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  slotsSection: { padding: 12, paddingBottom: 8 },
  sectionLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 8 },
  divider:      { height: 1, backgroundColor: Colors.border },

  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 2, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive:  { borderColor: Colors.ember, backgroundColor: Colors.emberDim },
  filterText:       { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 1 },
  filterTextActive: { color: Colors.ember },

  errorText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.danger, paddingHorizontal: 12, paddingBottom: 4 },

  listContent: { paddingHorizontal: 12, paddingBottom: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLocked: { opacity: 0.45 },
  rowInfo:   { flex: 1, gap: 3 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  nome:    { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.text, flexShrink: 1 },
  textDim: { color: Colors.muted },

  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  custo:       { fontFamily: Fonts.title, fontSize: 10, color: Colors.tealBright, letterSpacing: 1 },
  statusLabel: { fontFamily: Fonts.title, fontSize: 8, letterSpacing: 2 },

  reqText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.danger, fontStyle: 'italic' },

  maestriaBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  maestriaUsos: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  maestriaDots: { flexDirection: 'row', gap: 3 },
  dot:          { width: 6, height: 6, borderRadius: 3 },
  dotFilled:    { backgroundColor: Colors.gold },
  dotEmpty:     { backgroundColor: Colors.border },

  maestriaBadge:     { backgroundColor: Colors.gold, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  maestriaBadgeText: { fontFamily: Fonts.title, fontSize: 8, color: Colors.bg, letterSpacing: 1 },
  equippedBadge:     { backgroundColor: Colors.emberDim, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  equippedBadgeText: { fontFamily: Fonts.title, fontSize: 8, color: Colors.ember, letterSpacing: 1 },
  cooldownBadge:     { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  cooldownBadgeText: { fontFamily: Fonts.title, fontSize: 8, color: Colors.danger, letterSpacing: 1 },

  maestriaBadgeReady: { backgroundColor: Colors.danger },
  pressaoBadge:     { backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: '#a855f7' },
  pressaoBadgeText: { fontFamily: Fonts.title, fontSize: 8, color: '#a855f7', letterSpacing: 1 },
  chevron: { fontSize: 18, color: Colors.muted, lineHeight: 22 },
});
