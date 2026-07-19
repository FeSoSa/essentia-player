import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, useWindowDimensions,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { updateSlot } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { computeAccessibleEssenciaSkills, isSkillEquippable } from '@/lib/skill-validation';
import type { Slot, SkillTreeEntry } from '@/types';

interface Props {
  visible: boolean;
  slot: Slot | null;
  skillTree: SkillTreeEntry[];
  preselectedSkillId?: string;
  onClose: () => void;
}

const SLOT_LABEL: Record<string, string> = {
  class:       'SLOT DE CLASSE',
  free:        'SLOT LIVRE',
  human_bonus: 'SLOT BÔNUS',
};

type TypeFilter = 'todas' | 'geral' | 'classe' | 'essencia' | 'arma';

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'todas',    label: 'TODAS'    },
  { id: 'geral',    label: 'GERAL'    },
  { id: 'classe',   label: 'CLASSE'   },
  { id: 'essencia', label: 'ESSÊNCIA' },
  { id: 'arma',     label: 'ARMA'     },
];

function skillTypeGroup(s: SkillTreeEntry): TypeFilter {
  if (s.skillType === 'essencia') return 'essencia';
  if (s.skillType === 'weapon')   return 'arma';
  if (s.skillType === 'class' && s.categoria !== 'Geral') return 'classe' as TypeFilter;
  return 'geral';
}

function ActionFlag({ type }: { type?: string }) {
  if (!type) return null;
  const t = (label: string) => <Text style={[styles.flagText, { color: Colors.ember }]}>{label}</Text>;
  if (type === 'main')  return <View style={[styles.flag, styles.flagAction]}>{t('PRINCIPAL')}</View>;
  if (type === 'bonus') return <View style={[styles.flag, styles.flagAction]}>{t('BÔNUS')}</View>;
  if (type === 'both')  return (
    <>
      <View style={[styles.flag, styles.flagAction]}>{t('PRINCIPAL')}</View>
      <View style={[styles.flag, styles.flagAction]}>{t('BÔNUS')}</View>
    </>
  );
  return null;
}

export function SlotEditModal({ visible, slot, skillTree, preselectedSkillId, onClose }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const player    = usePlayerStore((s) => s.player)!;
  const essencias = usePlayerStore((s) => s.essencias);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todas');

  const equippedIds  = new Set(player.slots.filter((s) => s.skillId).map((s) => s.skillId!));
  const currentSkill = slot?.skillId ? skillTree.find((s) => s.skillId === slot.skillId) : null;
  const accessibleEssenciaSkills = computeAccessibleEssenciaSkills(player.essenciasObtidas, essencias);

  const allAvailable = skillTree.filter((s) => {
    // Only show skills the player has actually unlocked
    if (!s.unlocked) return false;
    if (s.skillId === slot?.skillId || equippedIds.has(s.skillId)) return false;
    if (slot?.type === 'class') return s.skillType === 'class' && s.categoria === player.char.skillClass;
    if (!isSkillEquippable(s, player.equipment, accessibleEssenciaSkills)) return false;
    return true;
  });

  const available = allAvailable.filter((s) => {
    if (typeFilter !== 'todas' && skillTypeGroup(s) !== typeFilter) return false;
    return true;
  });

  const countByType: Record<TypeFilter, number> = {
    todas:    allAvailable.length,
    geral:    allAvailable.filter((s) => skillTypeGroup(s) === 'geral').length,
    classe:   allAvailable.filter((s) => skillTypeGroup(s) === 'classe').length,
    essencia: allAvailable.filter((s) => skillTypeGroup(s) === 'essencia').length,
    arma:     allAvailable.filter((s) => skillTypeGroup(s) === 'arma').length,
  };

  function handleClose() {
    setError(null);
    setTypeFilter('todas');
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

  const listMaxHeight = Math.max(160, screenHeight * 0.88 - 240);
  const showTypeFilter = slot.type !== 'class';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── Cabeçalho ── */}
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
            <Text style={styles.emptySlotHint}>Slot vazio — escolha uma habilidade</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            {currentSkill ? 'TROCAR POR' : 'ESCOLHER HABILIDADE'}
          </Text>

          {/* Filtros por tipo — só em slots livres */}
          {showTypeFilter && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFiltersRow}>
              {TYPE_FILTERS.map((f) => {
                const count = countByType[f.id];
                const active = typeFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.typeBtn, active && styles.typeBtnActive]}
                    onPress={() => setTypeFilter(f.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeBtnLabel, active && styles.typeBtnLabelActive]}>
                      {f.label}
                    </Text>
                    <Text style={[styles.typeBtnCount, active && styles.typeBtnCountActive]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Lista de habilidades */}
          <ScrollView
            style={[styles.list, { maxHeight: listMaxHeight }]}
            showsVerticalScrollIndicator={false}
          >
            {available.length === 0 ? (
              <Text style={styles.emptyText}>
                {typeFilter !== 'todas'
                  ? 'Nenhuma habilidade com esse filtro.'
                  : 'Nenhuma habilidade disponível.'}
              </Text>
            ) : (
              available.map((skill) => {
                const isLoading = loading === skill.skillId;
                const isPresel  = skill.skillId === preselectedSkillId;
                const group     = skillTypeGroup(skill);
                const hasFlags  = skill.isPassive || skill.actionType || skill.pressaoDice || skill.multiTarget;
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
                      {/* Nome + pill de tipo */}
                      <View style={styles.skillNameRow}>
                        <Text style={styles.skillName}>{skill.nome}</Text>
                        <View style={[styles.typePill, styles[`typePill_${group}`] as any]}>
                          <Text style={[styles.typePillText, styles[`typePillText_${group}`] as any]}>
                            {group === 'essencia' ? 'ESS' : group === 'arma' ? 'ARMA' : group === 'classe' ? 'CLASSE' : 'GERAL'}
                          </Text>
                        </View>
                      </View>

                      {/* Fórmula de dano */}
                      {skill.danoFormula ? (
                        <Text style={styles.formula}>⚔ {skill.danoFormula}</Text>
                      ) : null}

                      {/* Descrição */}
                      {skill.descricao ? (
                        <Text style={styles.skillDesc} numberOfLines={2}>{skill.descricao}</Text>
                      ) : null}

                      {/* Flags */}
                      {hasFlags && (
                        <View style={styles.flagsRow}>
                          {skill.isPassive && (
                            <View style={[styles.flag, styles.flagPassiva]}>
                              <Text style={[styles.flagText, { color: Colors.tealBright }]}>PASSIVA</Text>
                            </View>
                          )}
                          <ActionFlag type={skill.actionType} />
                          {skill.pressaoDice && (
                            <View style={[styles.flag, styles.flagPressao]}>
                              <Text style={[styles.flagText, { color: '#a855f7' }]}>PRESSÃO</Text>
                            </View>
                          )}
                          {skill.multiTarget && (
                            <View style={[styles.flag, styles.flagMulti]}>
                              <Text style={[styles.flagText, { color: '#60a5fa' }]}>MULTI-ALVO</Text>
                            </View>
                          )}
                          {!!skill.cooldownTurns && skill.cooldownTurns > 0 && (
                            <View style={[styles.flag, styles.flagCd]}>
                              <Text style={[styles.flagText, { color: Colors.muted }]}>CD:{skill.cooldownTurns}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.skillRight}>
                      <Text style={styles.skillCost}>{skill.custo}</Text>
                      {isLoading && <ActivityIndicator size="small" color={Colors.ember} />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 4, width: '100%', maxWidth: 480,
    padding: 20, gap: 12,
  },

  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontFamily: Fonts.title, fontSize: 14, color: Colors.text, letterSpacing: 2 },
  closeBtn: { fontSize: 16, color: Colors.muted },

  fieldLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },

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

  // Filtros de tipo
  typeFiltersRow: { gap: 6, paddingVertical: 2 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 3, borderWidth: 1, borderColor: Colors.border,
  },
  typeBtnActive:      { borderColor: Colors.ember, backgroundColor: Colors.emberDim },
  typeBtnLabel:       { fontFamily: Fonts.title, fontSize: 8, color: Colors.muted, letterSpacing: 1 },
  typeBtnLabelActive: { color: Colors.ember },
  typeBtnCount:       { fontFamily: Fonts.title, fontSize: 8, color: Colors.border },
  typeBtnCountActive: { color: Colors.ember },

  // Lista
  list:      { /* maxHeight via prop inline */ },
  emptyText: {
    fontFamily: Fonts.body, fontSize: 13, color: Colors.muted,
    fontStyle: 'italic', textAlign: 'center', paddingVertical: 20,
  },

  skillRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 2,
    backgroundColor: Colors.surface, marginBottom: 6,
  },
  skillRowHighlight: { borderColor: Colors.ember },
  skillInfo:    { flex: 1, gap: 4 },
  skillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skillName:    { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.text, flexShrink: 1 },
  formula:      { fontFamily: Fonts.title, fontSize: 10, color: Colors.ember, letterSpacing: 0.5 },
  skillDesc:    { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  skillRight:   { alignItems: 'flex-end', gap: 4, paddingTop: 2 },
  skillCost:    { fontFamily: Fonts.title, fontSize: 10, color: Colors.tealBright },

  // Flags row
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  flag:     { borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1 },
  flagText: { fontFamily: Fonts.title, fontSize: 7, letterSpacing: 0.8 },

  flagPassiva: { borderColor: Colors.tealBright + '80', backgroundColor: Colors.tealBright + '15' },
  flagAction:  { borderColor: Colors.ember + '80',      backgroundColor: Colors.emberDim },
  flagPressao: { borderColor: '#a855f780',              backgroundColor: 'rgba(168,85,247,0.12)' },
  flagMulti:   { borderColor: '#60a5fa80',              backgroundColor: 'rgba(96,165,250,0.12)' },
  flagCd:      { borderColor: Colors.muted + '80',      backgroundColor: 'transparent' },

  // Pills de tipo por linha de skill
  typePill:     { borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1 },
  typePillText: { fontFamily: Fonts.title, fontSize: 7, letterSpacing: 1 },

  typePill_geral:        { borderColor: Colors.border,                 backgroundColor: 'transparent' },
  typePillText_geral:    { color: Colors.muted },
  typePill_classe:       { borderColor: Colors.ember + '80',           backgroundColor: Colors.emberDim },
  typePillText_classe:   { color: Colors.ember },
  typePill_essencia:     { borderColor: Colors.gold + '80',            backgroundColor: Colors.gold + '18' },
  typePillText_essencia: { color: Colors.gold },
  typePill_arma:         { borderColor: Colors.tealBright + '80',      backgroundColor: Colors.tealBright + '18' },
  typePillText_arma:     { color: Colors.tealBright },

  disabled: { opacity: 0.6 },
  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
});
