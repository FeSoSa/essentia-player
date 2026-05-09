import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView,
  TextInput, StyleSheet,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { useSkill, applyEnemyDamage, applyBossDamage } from '@/lib/api';
import { getModifier, formatMod } from '@/lib/rules';
import type { Slot, SkillTreeEntry, DamageResult, Attributes } from '@/types';

interface Props {
  visible: boolean;
  slot: Slot | null;
  skill: SkillTreeEntry | null;
  onClose: () => void;
}

function getSkillMod(categoria: string, attributes: Attributes): { label: string; value: number } | null {
  const c = (categoria ?? '').toLowerCase();
  if (c.includes('físic') || c.includes('fisic') || c.includes('força') || c.includes('corpo'))
    return { label: 'FOR', value: getModifier(attributes.strength) };
  if (c.includes('mági') || c.includes('magi') || c.includes('intel') || c.includes('éter') || c.includes('eter'))
    return { label: 'INT', value: getModifier(attributes.intelligence) };
  if (c.includes('agil') || c.includes('precis'))
    return { label: 'AGI', value: getModifier(attributes.agility) };
  if (c.includes('fluxo') || c.includes('flux'))
    return { label: 'FLX', value: getModifier(attributes.flow) };
  return null;
}

function parseDice(text: string): string | null {
  const m = text.match(/\d+[dD]\d+(\s*[+\-]\s*\w+)*/);
  return m?.[0] ?? null;
}

type TargetKind = 'enemy' | 'boss';

export function SkillModal({ visible, slot, skill, onClose }: Props) {
  const player = usePlayerStore((s) => s.player)!;
  const enemies = useGameStore((s) => s.enemies);
  const bosses = useGameStore((s) => s.bosses);

  const [diceInput, setDiceInput] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; kind: TargetKind } | null>(null);
  const [result, setResult] = useState<DamageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingDamage, setApplyingDamage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCombat = enemies.length > 0 || bosses.length > 0;
  const diceValue = parseInt(diceInput, 10);
  const validDice = !isNaN(diceValue) && diceValue > 0;

  const skillMod = skill ? getSkillMod(skill.categoria ?? '', player.attributes) : null;
  const diceFormula = skill ? parseDice(skill.descricao) : null;
  const damagePreview = validDice && skillMod ? diceValue + skillMod.value : validDice ? diceValue : null;

  function handleClose() {
    setDiceInput('');
    setSelectedTarget(null);
    setResult(null);
    setError(null);
    onClose();
  }

  async function handleUse() {
    if (!player.id || !slot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await useSkill(player.id, slot.id, {
        diceRoll: validDice ? diceValue : undefined,
        targetId: selectedTarget?.id,
        targetType: selectedTarget?.kind,
      });
      setResult(res);
    } catch {
      setError('Não foi possível usar esta habilidade.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyDamage() {
    if (!result || !selectedTarget) return;
    setApplyingDamage(true);
    try {
      if (selectedTarget.kind === 'enemy') {
        await applyEnemyDamage(selectedTarget.id, result.damage ?? 0);
      } else {
        await applyBossDamage(selectedTarget.id, result.damage ?? 0);
      }
      handleClose();
    } catch {
      setError('Erro ao aplicar dano ao alvo.');
    } finally {
      setApplyingDamage(false);
    }
  }

  if (!slot || !skill) return null;

  const hasCooldown = slot.cooldownRemaining > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.nome}>{skill.nome}</Text>
            <View style={styles.custoBadge}>
              <Text style={styles.custo}>{skill.custo}</Text>
            </View>
          </View>

          {hasCooldown && (
            <Text style={styles.cooldownText}>
              Em cooldown: {slot.cooldownRemaining} turno{slot.cooldownRemaining > 1 ? 's' : ''}
            </Text>
          )}

          <View style={styles.divider} />

          {result ? (
            /* ── Resultado ── */
            <View style={styles.resultBlock}>
              <Text style={styles.resultLabel}>DANO TOTAL</Text>
              <Text style={styles.resultDamage}>{result.damage ?? '—'}</Text>
              {result.costPaid.length > 0 && (
                <Text style={styles.resultCost}>
                  Custo: {result.costPaid.map((c) => `${c.value ?? c.percentual ?? 0} ${c.type}`).join(', ')}
                </Text>
              )}
              {selectedTarget && (
                <TouchableOpacity
                  style={[styles.applyBtn, applyingDamage && styles.btnDisabled]}
                  onPress={handleApplyDamage}
                  disabled={applyingDamage}
                  activeOpacity={0.7}
                >
                  {applyingDamage
                    ? <ActivityIndicator color={Colors.text} size="small" />
                    : <Text style={styles.applyBtnText}>APLICAR DANO AO ALVO</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* ── Formulário ── */
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.descricao}>{skill.descricao}</Text>

              {/* Dice input */}
              <View style={styles.diceSection}>
                <Text style={styles.fieldLabel}>VALOR DO DADO</Text>
                {diceFormula && (
                  <Text style={styles.formulaHint}>Fórmula: {diceFormula}</Text>
                )}
                <View style={styles.diceRow}>
                  <TextInput
                    style={styles.diceInput}
                    value={diceInput}
                    onChangeText={setDiceInput}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.border}
                    maxLength={3}
                  />
                  {skillMod && (
                    <Text style={styles.modText}>
                      + {skillMod.label} {formatMod(skillMod.value)}
                    </Text>
                  )}
                  {damagePreview !== null && (
                    <Text style={styles.previewText}>= {damagePreview}</Text>
                  )}
                </View>
              </View>

              {/* Seletor de inimigo */}
              {hasCombat && (
                <View style={styles.targetSection}>
                  <Text style={styles.fieldLabel}>ALVO (opcional)</Text>
                  <View style={styles.targetList}>
                    {enemies.map((e) => (
                      <TouchableOpacity
                        key={e.instanceId}
                        style={[
                          styles.targetBtn,
                          selectedTarget?.id === e.instanceId && styles.targetBtnSelected,
                        ]}
                        onPress={() =>
                          setSelectedTarget(
                            selectedTarget?.id === e.instanceId ? null : { id: e.instanceId, kind: 'enemy' }
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.targetIcon}>{e.icon || '⚔'}</Text>
                        <Text style={styles.targetName} numberOfLines={1}>{e.name}</Text>
                        <Text style={styles.targetHp}>{e.hpCurrent}/{e.hpMax}</Text>
                      </TouchableOpacity>
                    ))}
                    {bosses.map((b) => {
                      const phase = b.phases[b.currentPhase];
                      return (
                        <TouchableOpacity
                          key={b.instanceId}
                          style={[
                            styles.targetBtn,
                            selectedTarget?.id === b.instanceId && styles.targetBtnSelected,
                          ]}
                          onPress={() =>
                            setSelectedTarget(
                              selectedTarget?.id === b.instanceId ? null : { id: b.instanceId, kind: 'boss' }
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.targetIcon}>{b.icon || '★'}</Text>
                          <Text style={styles.targetName} numberOfLines={1}>{b.name} (Boss)</Text>
                          <Text style={styles.targetHp}>{b.hpCurrent}/{phase?.hpMax ?? '?'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{result ? 'FECHAR' : 'CANCELAR'}</Text>
            </TouchableOpacity>
            {!hasCooldown && !result && (
              <TouchableOpacity
                style={[styles.confirmBtn, loading && styles.btnDisabled]}
                onPress={handleUse}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading
                  ? <ActivityIndicator color={Colors.text} size="small" />
                  : <Text style={styles.confirmText}>USAR HABILIDADE</Text>
                }
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 4, padding: 24, width: 400, maxHeight: 560, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nome: { fontFamily: Fonts.title, fontSize: 18, color: Colors.text, flex: 1, letterSpacing: 1 },
  custoBadge: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.tealBright,
    borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3,
  },
  custo: { fontFamily: Fonts.title, fontSize: 11, color: Colors.tealBright, letterSpacing: 1 },
  cooldownText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: Colors.border },
  scroll: { maxHeight: 280 },
  descricao: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 16 },

  fieldLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 6 },

  diceSection: { marginBottom: 16 },
  formulaHint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, fontStyle: 'italic', marginBottom: 6 },
  diceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diceInput: {
    width: 64, height: 40, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 3, backgroundColor: Colors.surface,
    fontFamily: Fonts.title, fontSize: 22, color: Colors.ember,
    textAlign: 'center',
  },
  modText: { fontFamily: Fonts.title, fontSize: 14, color: Colors.muted },
  previewText: { fontFamily: Fonts.title, fontSize: 22, color: Colors.tealBright },

  targetSection: { marginBottom: 8 },
  targetList: { gap: 4 },
  targetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 3,
    backgroundColor: Colors.surface,
  },
  targetBtnSelected: { borderColor: Colors.danger, backgroundColor: 'rgba(239,68,68,0.08)' },
  targetIcon: { fontSize: 12, width: 16, textAlign: 'center' },
  targetName: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  targetHp: { fontFamily: Fonts.title, fontSize: 11, color: Colors.muted },

  resultBlock: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  resultLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  resultDamage: { fontFamily: Fonts.title, fontSize: 56, color: Colors.danger, lineHeight: 64 },
  resultFormula: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, fontStyle: 'italic' },
  resultCost: { fontFamily: Fonts.body, fontSize: 13, color: Colors.tealBright },
  applyBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.danger, borderRadius: 3, alignItems: 'center',
  },
  applyBtnText: { fontFamily: Fonts.title, fontSize: 11, color: '#fff', letterSpacing: 2 },

  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 2 },
  cancelText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.muted, letterSpacing: 2 },
  confirmBtn: {
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.ember,
    borderRadius: 2, minWidth: 160, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  confirmText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.text, letterSpacing: 2 },

  maestriaBlock: {
    borderWidth: 1, borderColor: Colors.gold, borderRadius: 3,
    padding: 10, marginBottom: 16, gap: 8,
  },
  maestriaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  maestriaLevel: { fontFamily: Fonts.title, fontSize: 11, color: Colors.gold, letterSpacing: 1 },
  maestriaLevels: { flexDirection: 'row', gap: 6 },
  maestriaDot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  maestriaDotEmpty: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  maestriaDotAumento: { backgroundColor: Colors.gold },
  maestriaDotOtimizacao: { backgroundColor: Colors.tealBright },
  maestriaDotLabel: { fontFamily: Fonts.title, fontSize: 10, color: Colors.bg },
  maestriaProgress: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, fontStyle: 'italic' },
  maestriaEffects: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  maestriaTag: {
    borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  maestriaTagAumento: { fontFamily: Fonts.title, fontSize: 9, color: Colors.gold, letterSpacing: 1 },
  maestriaTagOtimizacao: { fontFamily: Fonts.title, fontSize: 9, color: Colors.tealBright, letterSpacing: 1 },
  maestriaTagCustoExtra: { fontFamily: Fonts.title, fontSize: 9, color: Colors.danger, letterSpacing: 1 },
});
