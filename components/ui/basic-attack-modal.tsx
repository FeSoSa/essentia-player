import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { NumPad } from '@/components/ui/num-pad';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { requestDamage } from '@/lib/api';
import { getModifier, formatMod, resolveAtributeMod, weaponDamageFormula, unarmedDamageFormula } from '@/lib/rules';
import type { EnemyInstance, BossInstance } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = 'target' | 'hit' | 'damage' | 'result';

export function BasicAttackModal({ visible, onClose }: Props) {
  const player  = usePlayerStore((s) => s.player)!;
  const enemies = useGameStore((s) => s.enemies);
  const bosses  = useGameStore((s) => s.bosses);
  const damageResult   = useGameStore((s) => s.damageResult);
  const setDamageResult = useGameStore((s) => s.setDamageResult);

  const [step, setStep]       = useState<Step>('target');
  const [hitInput, setHitInput]   = useState('');
  const [dmgInput, setDmgInput]   = useState('');
  const [isCrit, setIsCrit]       = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; type: 'enemy' | 'boss'; name: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (damageResult && pendingId && damageResult.requestId === pendingId) {
      setDamageResult(null);
      setPendingId(null);
      if (damageResult.approved) handleClose();
      else setError('Dano rejeitado pelo mestre.');
    }
  }, [damageResult]);

  function handleClose() {
    setStep('target');
    setHitInput('');
    setDmgInput('');
    setIsCrit(false);
    setSelectedTarget(null);
    setPendingId(null);
    setSending(false);
    setError(null);
    onClose();
  }

  const attrs    = player.effectiveAttributes ?? player.attributes;
  const agiMod   = getModifier(attrs.agility);
  const weapon   = player.equipment.mainHand;
  const unarmed  = player.char.unarmedAttack;

  const attackLabel = weapon ? weapon.name : 'Desarmado';
  const damageFormula = weapon
    ? weaponDamageFormula({ damageBase: weapon.damageBase, damageAttribute: weapon.damageAttribute, equilibrio: weapon.equilibrio ?? 4 })
    : unarmed
    ? unarmedDamageFormula(unarmed)
    : '—';

  const attrStr  = weapon ? weapon.damageAttribute : unarmed?.attribute;
  const attrMod  = resolveAtributeMod(attrStr, attrs);
  const equil    = weapon ? (weapon.equilibrio ?? 4) : 4;
  const dmgBase  = weapon ? (weapon.damageBase ?? 0) : (unarmed?.damageBase ?? 0);

  const hitBonusTotal    = player.statusEffects.reduce((s, e) => s + (e.hitBonus    ?? 0), 0);
  const damageBonusTotal = player.statusEffects.reduce((s, e) => s + (e.damageBonus ?? 0), 0);

  // Hit calculation
  const hitRoll   = parseInt(hitInput, 10);
  const validHit  = !isNaN(hitRoll) && hitRoll >= 1;
  const hitTotal  = validHit ? hitRoll + agiMod + hitBonusTotal : null;

  // Damage calculation
  const dmgRoll          = parseInt(dmgInput, 10);
  const validDmg         = !isNaN(dmgRoll) && dmgRoll >= 1;
  const dmgTotal = validDmg ? Math.max(0, Math.round((isCrit ? dmgBase * 2 : dmgBase) + (dmgRoll * attrMod) / equil) + damageBonusTotal) : null;

  async function handleSendDamage() {
    if (!selectedTarget || dmgTotal == null || !player.id) return;
    setSending(true);
    setError(null);
    const reqId = `basic-${player.id}-${Date.now()}`;
    try {
      await requestDamage(player.id, {
        requestId: reqId,
        targetId: selectedTarget.id,
        targetType: selectedTarget.type,
        targetName: selectedTarget.name,
        damage: dmgTotal,
      });
      setPendingId(reqId);
      setDamageResult(null);
      setStep('result');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao enviar dano.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>ATAQUE BÁSICO</Text>
              <Text style={styles.subtitle}>{attackLabel} · {damageFormula}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* STEP: target */}
          {step === 'target' && (
            <View style={styles.stepBlock}>
              <Text style={styles.stepLabel}>SELECIONAR ALVO</Text>
              {enemies.length === 0 && bosses.length === 0 && (
                <Text style={styles.emptyText}>Nenhum inimigo em campo.</Text>
              )}
              {enemies.map((e: EnemyInstance) => (
                <TouchableOpacity
                  key={e.instanceId}
                  style={[styles.targetBtn, selectedTarget?.id === e.instanceId && styles.targetBtnSelected]}
                  onPress={() => setSelectedTarget(selectedTarget?.id === e.instanceId ? null : { id: e.instanceId, type: 'enemy', name: e.name })}
                  activeOpacity={0.75}
                >
                  <Text style={styles.targetIcon}>{e.icon || '⚔'}</Text>
                  <Text style={styles.targetName}>{e.name}</Text>
                </TouchableOpacity>
              ))}
              {bosses.map((b: BossInstance) => (
                <TouchableOpacity
                  key={b.instanceId}
                  style={[styles.targetBtn, selectedTarget?.id === b.instanceId && styles.targetBtnSelected]}
                  onPress={() => setSelectedTarget(selectedTarget?.id === b.instanceId ? null : { id: b.instanceId, type: 'boss', name: b.name })}
                  activeOpacity={0.75}
                >
                  <Text style={styles.targetIcon}>{b.icon || '★'}</Text>
                  <Text style={styles.targetName}>{b.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, !selectedTarget && styles.actionBtnDisabled]}
                  onPress={() => selectedTarget && setStep('hit')}
                  disabled={!selectedTarget}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnText}>AVANÇAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP: hit */}
          {step === 'hit' && (
            <View style={styles.stepBlock}>
              <Text style={styles.stepLabel}>ROLAR ACERTO</Text>
              <Text style={styles.hintText}>
                d20 {agiMod >= 0 ? `+${agiMod}` : agiMod} (AGI){hitBonusTotal !== 0 ? ` +${hitBonusTotal} (efeito)` : ''} vs DEF do alvo
              </Text>
              <View style={styles.numpadRow}>
                <NumPad value={hitInput} onChange={setHitInput} />
                <View style={styles.numpadInfo}>
                  {hitTotal !== null && (
                    <>
                      <Text style={styles.rollLabel}>TOTAL</Text>
                      <Text style={styles.rollValue}>{hitTotal}</Text>
                      <Text style={styles.rollBreak}>
                        {hitRoll} {agiMod >= 0 ? `+${agiMod}` : agiMod}{hitBonusTotal !== 0 ? ` +${hitBonusTotal}` : ''}
                      </Text>
                      {hitRoll >= (weapon?.critThreshold ?? 20) && (
                        <Text style={styles.critBadge}>CRÍTICO!</Text>
                      )}
                    </>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('target')} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>VOLTAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, !validHit && styles.actionBtnDisabled]}
                  onPress={() => {
                    if (!validHit) return;
                    setIsCrit(hitRoll >= (weapon?.critThreshold ?? 20));
                    setStep('damage');
                  }}
                  disabled={!validHit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionBtnText}>ACERTOU →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP: damage */}
          {step === 'damage' && (
            <View style={styles.stepBlock}>
              <Text style={styles.stepLabel}>ROLAR DANO</Text>
              <Text style={styles.hintText}>{damageFormula}</Text>
              {isCrit && <Text style={styles.critHint}>⚡ Crítico — dado dobrado</Text>}
              <View style={styles.numpadRow}>
                <NumPad value={dmgInput} onChange={setDmgInput} />
                <View style={styles.numpadInfo}>
                  {dmgTotal !== null && (
                    <>
                      <Text style={styles.rollLabel}>DANO</Text>
                      <Text style={[styles.rollValue, { color: Colors.danger }]}>{dmgTotal}</Text>
                      {attrMod > 0 && (
                        <Text style={styles.rollBreak}>
                          {isCrit ? `${dmgBase}×2 + ${dmgRoll}×${attrMod}/${equil}` : `${dmgBase} + ${dmgRoll}×${attrMod}/${equil}`}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('hit')} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>VOLTAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, (!validDmg || sending) && styles.actionBtnDisabled]}
                  onPress={handleSendDamage}
                  disabled={!validDmg || sending}
                  activeOpacity={0.8}
                >
                  {sending
                    ? <ActivityIndicator color={Colors.bg} size="small" />
                    : <Text style={styles.actionBtnText}>ENVIAR DANO</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP: result */}
          {step === 'result' && (
            <View style={styles.stepBlock}>
              {pendingId ? (
                <>
                  <ActivityIndicator color={Colors.ember} size="large" />
                  <Text style={styles.waitingText}>Aguardando aprovação do mestre…</Text>
                </>
              ) : (
                <Text style={styles.waitingText}>Processando…</Text>
              )}
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 6,
    width: 360,
    maxWidth: '100%',
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8,
  },
  headerLeft: { flex: 1, gap: 2 },
  title: {
    fontFamily: Fonts.title,
    fontSize: 16,
    color: Colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },
  closeBtn: {
    fontFamily: Fonts.title,
    fontSize: 14,
    color: Colors.muted,
    paddingTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  stepBlock: {
    padding: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  stepLabel: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.faint,
    fontStyle: 'italic',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  targetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  targetBtnSelected: {
    borderColor: Colors.ember,
    backgroundColor: Colors.emberDim,
  },
  targetIcon: { fontSize: 16 },
  targetName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.text,
  },
  numpadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  numpadInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 2,
    paddingTop: 4,
  },
  rollLabel: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  rollValue: {
    fontFamily: Fonts.title,
    fontSize: 36,
    color: Colors.ember,
  },
  rollBreak: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.faint,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
  },
  cancelText: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 2,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.ember,
    borderRadius: 2,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.bg,
    letterSpacing: 2,
  },
  waitingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
    paddingHorizontal: 16,
    paddingBottom: 12,
    textAlign: 'center',
  },
  critBadge: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 2,
  },
  critHint: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 1,
  },
});
