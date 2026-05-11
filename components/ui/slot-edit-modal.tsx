import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { updateSlot } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import type { Slot, SkillTreeEntry } from '@/types';

interface Props {
  visible: boolean;
  slot: Slot | null;
  skillTree: SkillTreeEntry[];
  preselectedSkillId?: string; // abre já com foco nessa skill
  onClose: () => void;
}

const SLOT_LABEL: Record<string, string> = {
  class:       'SLOT DE CLASSE',
  free:        'SLOT LIVRE',
  human_bonus: 'SLOT BÔNUS',
};

export function SlotEditModal({ visible, slot, skillTree, preselectedSkillId, onClose }: Props) {
  const player    = usePlayerStore((s) => s.player)!;
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const [catFilter, setCatFilter] = useState<string>('todas');

  const equippedIds  = new Set(player.slots.filter((s) => s.skillId).map((s) => s.skillId!));
  const currentSkill = slot?.skillId ? skillTree.find((s) => s.skillId === slot.skillId) : null;

  // Habilidades disponíveis: desbloqueadas, não em outro slot, e com tipo compatível com o slot
  const allAvailable = skillTree.filter((s) => {
    if (!s.unlocked || s.skillId === slot?.skillId || equippedIds.has(s.skillId)) return false;
    if (slot?.type === 'class') return s.skillType === 'class';
    return true; // free e human_bonus aceitam qualquer skill
  });

  const categories = ['todas', ...Array.from(new Set(allAvailable.map((s) => s.categoria).filter(Boolean)))];

  const available = allAvailable.filter((s) =>
    catFilter === 'todas' || s.categoria === catFilter
  );

  function handleClose() {
    setError(null);
    setCatFilter('todas');
    onClose();
  }

  async function handleEquip(skillId: string) {
    if (!slot) return;
    setLoading(skillId);
    setError(null);
    try {
      const updated = await updateSlot(player.id, slot.id, skillId);
      setPlayer(updated);
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao equipar habilidade.');
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove() {
    if (!slot) return;
    setLoading('remove');
    setError(null);
    try {
      const updated = await updateSlot(player.id, slot.id, null);
      setPlayer(updated);
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao remover habilidade.');
    } finally {
      setLoading(null);
    }
  }

  if (!slot) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={styles.header}>
            <Text style={styles.title}>{SLOT_LABEL[slot.type] ?? 'SLOT'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Habilidade atual */}
          {currentSkill ? (
            <View style={styles.currentBlock}>
              <Text style={styles.fieldLabel}>EQUIPADA</Text>
              <View style={styles.currentRow}>
                <View style={styles.currentInfo}>
                  <Text style={styles.currentName}>{currentSkill.nome}</Text>
                  <Text style={styles.currentCost}>{currentSkill.custo}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.removeBtn, !!loading && styles.disabled]}
                  onPress={handleRemove}
                  disabled={!!loading}
                  activeOpacity={0.7}
                >
                  {loading === 'remove'
                    ? <ActivityIndicator size="small" color={Colors.danger} />
                    : <Text style={styles.removeBtnText}>REMOVER</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.emptySlotHint}>Slot vazio</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            {currentSkill ? 'TROCAR POR' : 'ESCOLHER HABILIDADE'}
          </Text>

          {/* Filtros por categoria */}
          {categories.length > 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, catFilter === cat && styles.catBtnActive]}
                  onPress={() => setCatFilter(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catText, catFilter === cat && styles.catTextActive]}>
                    {cat === 'todas' ? 'TODAS' : cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {available.length === 0 && (
              <Text style={styles.emptyText}>Nenhuma habilidade disponível.</Text>
            )}
            {available.map((skill) => {
              const isLoading  = loading === skill.skillId;
              const isPresel   = skill.skillId === preselectedSkillId;
              return (
                <TouchableOpacity
                  key={skill.skillId}
                  style={[
                    styles.skillRow,
                    isPresel && styles.skillRowHighlight,
                    !!loading && styles.disabled,
                  ]}
                  onPress={() => handleEquip(skill.skillId)}
                  disabled={!!loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.skillInfo}>
                    <Text style={styles.skillName}>{skill.nome}</Text>
                    <Text style={styles.skillDesc} numberOfLines={1}>{skill.descricao}</Text>
                  </View>
                  <Text style={styles.skillCost}>{skill.custo}</Text>
                  {isLoading && (
                    <ActivityIndicator size="small" color={Colors.ember} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 4, padding: 20, width: 420, maxHeight: 540, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:  { fontFamily: Fonts.title, fontSize: 14, color: Colors.text, letterSpacing: 2 },
  closeBtn: { fontSize: 16, color: Colors.muted },

  fieldLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 6 },

  currentBlock: { gap: 6 },
  currentRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentInfo:  { flex: 1 },
  currentName:  { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.text },
  currentCost:  { fontFamily: Fonts.title, fontSize: 10, color: Colors.tealBright, marginTop: 2 },
  removeBtn: {
    borderWidth: 1, borderColor: Colors.danger, borderRadius: 2,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 84, alignItems: 'center',
  },
  removeBtnText: { fontFamily: Fonts.title, fontSize: 9, color: Colors.danger, letterSpacing: 1 },

  emptySlotHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: Colors.border },

  list: { maxHeight: 300 },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },

  skillRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 2,
    backgroundColor: Colors.surface, marginBottom: 6,
  },
  skillRowHighlight: { borderColor: Colors.ember },
  skillInfo: { flex: 1 },
  skillName: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.text },
  skillDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  skillCost: { fontFamily: Fonts.title, fontSize: 10, color: Colors.tealBright },

  catRow: { marginBottom: 8 },
  catBtn: {
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
    borderRadius: 2, borderWidth: 1, borderColor: Colors.border,
  },
  catBtnActive:  { borderColor: Colors.ember, backgroundColor: Colors.emberDim },
  catText:       { fontFamily: Fonts.title, fontSize: 8, color: Colors.muted, letterSpacing: 1 },
  catTextActive: { color: Colors.ember },
  disabled: { opacity: 0.6 },
  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
});
