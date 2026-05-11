import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, TextInput,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { NumPad } from '@/components/ui/num-pad';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { unlockSkill, chooseMasteryPath, getSkillTree, useSkill, requestDamage, skillMiss } from '@/lib/api';
import { getModifier, formatMod } from '@/lib/rules';
import type { SkillTreeEntry, Slot, DamageResult, Attributes } from '@/types';

interface Props {
  visible: boolean;
  skill: SkillTreeEntry | null;
  slots: Slot[];
  activeSlot?: Slot | null;   // quando aberto da aba Geral para usar a habilidade
  onClose: () => void;
  onEquipPress: (skill: SkillTreeEntry) => void;
}

type TargetKind = 'enemy' | 'boss';

function getSkillMod(categoria: string, attributes: Attributes): { label: string; value: number } | null {
  const c = categoria.toLowerCase();
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

// Valores cumulativos da tabela do spec por nível (1-5)
const UPGRADE_EFFECTS: Record<number, { aumento: string; otimizacao: string }> = {
  1: { aumento: '+10% dano, +8% custo',  otimizacao: '-8% custo'  },
  2: { aumento: '+20% dano, +16% custo', otimizacao: '-16% custo' },
  3: { aumento: '+32% dano, +24% custo', otimizacao: '-24% custo' },
  4: { aumento: '+45% dano, +32% custo', otimizacao: '-32% custo' },
  5: { aumento: '+60% dano, +40% custo', otimizacao: '-40% custo' },
};

function skillStatus(s: SkillTreeEntry): 'desbloqueada' | 'disponivel' | 'bloqueada' {
  if (s.unlocked)          return 'desbloqueada';
  if (!s.requirementsText) return 'disponivel';
  return 'bloqueada';
}

const STATUS_COLOR: Record<string, string> = {
  desbloqueada: Colors.tealBright,
  disponivel:   Colors.gold,
  bloqueada:    Colors.muted,
};

const STATUS_LABEL: Record<string, string> = {
  desbloqueada: 'DESBLOQUEADA',
  disponivel:   'DISPONÍVEL',
  bloqueada:    'BLOQUEADA',
};

const MAESTRIA_THRESHOLDS = [0, 3, 8, 16, 28];

export function SkillInfoModal({ visible, skill, slots, activeSlot, onClose, onEquipPress }: Props) {
  const player       = usePlayerStore((s) => s.player)!;
  const setSkillTree = usePlayerStore((s) => s.setSkillTree);
  const enemies      = useGameStore((s) => s.enemies);
  const bosses       = useGameStore((s) => s.bosses);

  const [unlocking,     setUnlocking]     = useState(false);
  const [choosing,      setChoosing]      = useState<'aumento' | 'otimizacao' | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  // Use-skill state
  const [useStep, setUseStep] = useState<'target' | 'hit' | 'damage' | 'result'>('target');
  const [usageStarted, setUsageStarted] = useState(false); // ignora cooldown após iniciar o fluxo
  const [hitInput, setHitInput] = useState('');
  const [bonusInput, setBonusInput] = useState('');
  const [hitPadMode, setHitPadMode] = useState<'d20' | 'bonus'>('d20');
  const [pressaoInput, setPressaoInput] = useState('');
  const [diceInput,     setDiceInput]     = useState('');
  const [dmgPadMode, setDmgPadMode] = useState<'dice' | 'pressao'>('dice');
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; kind: TargetKind } | null>(null);
  const [useResult,       setUseResult]       = useState<DamageResult | null>(null);
  const [useLoading,      setUseLoading]      = useState(false);
  const [applyingDmg,     setApplyingDmg]     = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const damageResult = useGameStore((s) => s.damageResult);
  const setDamageResult = useGameStore((s) => s.setDamageResult);

  // useEffect ANTES do early return — regra dos hooks
  useEffect(() => {
    if (!skill) return;
    if (damageResult && pendingRequestId && damageResult.requestId === pendingRequestId) {
      setDamageResult(null);
      setPendingRequestId(null);
      if (damageResult.approved) onClose();
      else setError('Dano rejeitado pelo mestre.');
    }
  }, [damageResult]);

  if (!skill) return null;

  const status    = skillStatus(skill);
  const maestria  = skill.maestria;
  const equipped  = slots.some((s) => s.skillId === skill.skillId);
  const cooldown  = slots.find((s) => s.skillId === skill.skillId)?.cooldownRemaining ?? 0;
  const readyToLevelUp = maestria && maestria.choices.length < maestria.level - 1;
  const nextUpgradeLevel = maestria ? maestria.choices.length + 1 : 1;
  const upgradeEffects = UPGRADE_EFFECTS[nextUpgradeLevel];

  const diceValue    = parseInt(diceInput, 10);
  const validDice    = !isNaN(diceValue) && diceValue > 0;
  const skillMod     = skill ? getSkillMod(skill.categoria ?? '', player.attributes) : null;
  const agiMod       = getModifier((player.effectiveAttributes ?? player.attributes).agility);
  const bonusValue   = parseInt(bonusInput, 10) || 0;
  const hitValue     = parseInt(hitInput, 10);
  const validHit     = !isNaN(hitValue) && hitValue >= 1;
  const hitTotal     = validHit ? hitValue + agiMod + bonusValue : null;
  const diceFormula   = skill ? parseDice(skill.descricao) : null;
  const danoBase      = skill?.danoBase ?? 0;
  const pressaoValue  = parseInt(pressaoInput, 10) || 0;
  const baseDamage    = validDice
    ? danoBase + (skillMod ? Math.round((diceValue * skillMod.value) / 4) : diceValue)
    : null;
  const maestriaBonus = maestria?.bonusDano ?? 0;
  const damageWithMaestria = baseDamage !== null
    ? maestriaBonus > 0 ? Math.round(baseDamage * (1 + maestriaBonus)) : baseDamage
    : null;
  const damagePreview = damageWithMaestria !== null
    ? damageWithMaestria + pressaoValue
    : null;
  const hasCombat    = enemies.length > 0 || bosses.length > 0;

  function handleClose() {
    setError(null);
    setUseStep('target');
    setUsageStarted(false);
    setHitInput('');
    setBonusInput('');
    setHitPadMode('d20');
    setPressaoInput('');
    setDiceInput('');
    setDmgPadMode('dice');
    setSelectedTarget(null);
    setUseResult(null);
    onClose();
  }

  // Chamado ao avançar para o acerto — seta cooldown e obtém custo (sem dice roll)
  async function handleAdvanceToHit() {
    if (!activeSlot || !player.id || !selectedTarget) return;
    setUseLoading(true);
    setError(null);
    try {
      const res = await useSkill(player.id, activeSlot.id, {});
      setUseResult(res);
      setUsageStarted(true);
      setUseStep('hit');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = (typeof data === 'string' ? data : data?.message ?? data?.detail ?? data?.error)
        ?? err?.message
        ?? 'Erro ao usar habilidade.';
      setError(typeof msg === 'string' ? msg : 'Erro ao usar habilidade.');
    } finally {
      setUseLoading(false);
    }
  }

  // Chamado no passo de dano (sem combate) — chama API normalmente
  async function handleUseSkillNoCombat() {
    if (!activeSlot || !player.id) return;
    setUseLoading(true);
    setError(null);
    try {
      const res = await useSkill(player.id, activeSlot.id, {
        diceRoll: validDice ? diceValue : undefined,
      });
      setUseResult(res);
      setUseStep('result');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = (typeof data === 'string' ? data : data?.message ?? data?.detail ?? data?.error)
        ?? err?.message
        ?? 'Erro ao usar habilidade.';
      setError(typeof msg === 'string' ? msg : 'Erro ao usar habilidade.');
    } finally {
      setUseLoading(false);
    }
  }

  async function handleMiss() {
    if (useResult?.costPaid) {
      const costs = useResult.costPaid.reduce((acc, c) => {
        if (c.value != null) acc[c.type] = c.value;
        return acc;
      }, {} as Record<string, number>);
      try {
        const updated = await skillMiss(player.id, costs);
        setPlayer(updated);
      } catch { /* silent — custo pode não debitar se não tiver recursos */ }
    }
    handleClose();
  }

  async function handleRequestDamage() {
    if (!useResult || !selectedTarget) return;
    setApplyingDmg(true);
    setError(null);
    const reqId = `${player.id}-${Date.now()}`;
    try {
      const targetName = selectedTarget.kind === 'enemy'
        ? (enemies.find((e) => e.instanceId === selectedTarget.id)?.name ?? 'Inimigo')
        : (bosses.find((b) => b.instanceId === selectedTarget.id)?.name ?? 'Boss');
      const costs = (useResult.costPaid ?? []).reduce((acc, c) => {
        if (c.value != null) acc[c.type] = c.value;
        return acc;
      }, {} as Record<string, number>);
      // Usa o dano calculado pelo dado do jogador se disponível; senão, usa o do backend
      const finalDamage = damagePreview ?? useResult.damage ?? 0;
      await requestDamage(player.id, {
        requestId: reqId,
        targetId: selectedTarget.id,
        targetType: selectedTarget.kind,
        targetName,
        damage: finalDamage,
        costs,
      });
      setPendingRequestId(reqId);
      setDamageResult(null);
      setUseStep('result');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao solicitar dano.');
    } finally {
      setApplyingDmg(false);
    }
  }


  async function handleUnlock() {
    setUnlocking(true);
    setError(null);
    try {
      await unlockSkill(player.id, skill.skillId);
      const updated = await getSkillTree(player.id);
      setSkillTree(updated);
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao desbloquear.');
    } finally {
      setUnlocking(false);
    }
  }

  async function handleMaestriaChoice(choice: 'aumento' | 'otimizacao') {
    if (!maestria) return;
    setChoosing(choice);
    setError(null);
    try {
      await chooseMasteryPath(player.id, maestria.playerSkillId, choice);
      const updated = await getSkillTree(player.id);
      setSkillTree(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      setError(typeof msg === 'string' ? msg : 'Erro ao evoluir maestria.');
    } finally {
      setChoosing(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.nome}>{skill.nome}</Text>
              <View style={styles.headerMeta}>
                <Text style={styles.custo}>{skill.custo}</Text>
                {!activeSlot && (
                  <Text style={[styles.statusLabel, { color: STATUS_COLOR[status] }]}>
                    {STATUS_LABEL[status]}
                  </Text>
                )}
                {skill.isPassive && (
                  <Text style={styles.passivaBadge}>PASSIVA</Text>
                )}
                {skill.categoria ? (
                  <Text style={styles.categoria}>{skill.categoria}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Cooldown — visível em ambos os modos, fora do scroll */}
          {cooldown > 0 && (
            <Text style={styles.cooldownText}>
              Em cooldown: {cooldown} turno{cooldown > 1 ? 's' : ''}
            </Text>
          )}

          {/* ── Passiva (modo de uso) ── */}
          {activeSlot && skill.isPassive && (
            <View style={styles.passivaMsgBlock}>
              <Text style={styles.passivaMsgText}>Habilidade passiva — bônus aplicado automaticamente enquanto equipada.</Text>
            </View>
          )}

          {/* Conteúdo scrollável — só na aba de habilidades */}
          {!activeSlot && (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

            <Text style={styles.descricao}>{skill.descricao}</Text>

            {/* Bloco de detalhes — custo, dano, cooldown base */}
            <View style={styles.detailsBlock}>
                {/* Custo */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CUSTO</Text>
                  <Text style={styles.detailValue}>{skill.custo || '—'}</Text>
                </View>
                {/* Dano */}
                {skill.danoFormula && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>DANO</Text>
                    <Text style={styles.detailValue}>⚔ {skill.danoFormula}</Text>
                  </View>
                )}
                {/* Cooldown base */}
                {!!skill.cooldownTurns && skill.cooldownTurns > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>COOLDOWN</Text>
                    <Text style={styles.detailValue}>
                      {skill.cooldownTurns} turno{skill.cooldownTurns > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
            </View>

            {/* Requisitos */}
            {skill.requirementsText && (
              <View style={styles.reqBlock}>
                <Text style={styles.blockLabel}>REQUISITOS</Text>
                <Text style={styles.reqText}>{skill.requirementsText}</Text>
              </View>
            )}

            {/* Maestria */}
            {maestria && (
              <View style={styles.maestriaBlock}>
                <View style={styles.maestriaHeader}>
                  <Text style={styles.blockLabel}>MAESTRIA</Text>
                  <Text style={styles.maestriaLevel}>Nível {maestria.level}</Text>
                </View>

                {/* Barra de progresso */}
                {maestria.level < 5 && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min((maestria.totalUses / maestria.nextLevelUses) * 100, 100)}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {maestria.totalUses}/{maestria.nextLevelUses}
                    </Text>
                  </View>
                )}
                {maestria.level >= 5 && (
                  <Text style={styles.maestriaMaxText}>Maestria máxima</Text>
                )}

                {/* Escolhas feitas */}
                {maestria.choices && maestria.choices.length > 0 && (
                  <View style={styles.choicesMade}>
                    {maestria.choices.map((c, i) => {
                      const fx = UPGRADE_EFFECTS[i + 1];
                      return (
                        <View key={i} style={styles.choiceChip}>
                          <View style={[styles.chipDot, c === 'aumento' ? styles.chipDotA : styles.chipDotO]} />
                          <Text style={styles.chipText}>
                            N{i + 1} {c === 'aumento' ? 'Aumento' : 'Otimização'}
                            {fx ? `  ${c === 'aumento' ? fx.aumento : fx.otimizacao}` : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Totais acumulados */}
                {(maestria.bonusDano > 0 || maestria.reducaoCusto > 0 || maestria.custoAumento > 0) && (
                  <View style={styles.totaisRow}>
                    {maestria.bonusDano > 0 && (
                      <View style={styles.totalChip}>
                        <Text style={[styles.totalChipText, { color: Colors.danger }]}>
                          +{Math.round(maestria.bonusDano * 100)}% dano
                        </Text>
                      </View>
                    )}
                    {(() => {
                      const net = maestria.custoAumento - maestria.reducaoCusto;
                      if (Math.abs(net) < 0.001) return null;
                      const label = net > 0
                        ? `+${Math.round(net * 100)}% custo`
                        : `${Math.round(net * 100)}% custo`;
                      return (
                        <View style={styles.totalChip}>
                          <Text style={[styles.totalChipText, { color: net > 0 ? Colors.danger : Colors.tealBright }]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}

                {/* Evolução disponível */}
                {readyToLevelUp && (
                  <View style={styles.levelUpBlock}>
                    <Text style={styles.levelUpLabel}>ESCOLHA PARA NÍVEL {maestria.level + 1}</Text>
                    <View style={styles.levelUpBtns}>
                      <TouchableOpacity
                        style={[styles.levelUpBtn, styles.btnAumento, !!choosing && styles.btnDisabled]}
                        onPress={() => handleMaestriaChoice('aumento')}
                        disabled={!!choosing}
                        activeOpacity={0.7}
                      >
                        {choosing === 'aumento'
                          ? <ActivityIndicator size="small" color={Colors.danger} />
                          : <>
                              <Text style={[styles.levelUpBtnTitle, { color: Colors.danger }]}>AUMENTO</Text>
                              <Text style={styles.levelUpBtnSub}>{upgradeEffects?.aumento ?? ''}</Text>
                            </>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.levelUpBtn, styles.btnOtimizacao, !!choosing && styles.btnDisabled]}
                        onPress={() => handleMaestriaChoice('otimizacao')}
                        disabled={!!choosing}
                        activeOpacity={0.7}
                      >
                        {choosing === 'otimizacao'
                          ? <ActivityIndicator size="small" color={Colors.tealBright} />
                          : <>
                              <Text style={[styles.levelUpBtnTitle, { color: Colors.tealBright }]}>OTIMIZAÇÃO</Text>
                              <Text style={styles.levelUpBtnSub}>{upgradeEffects?.otimizacao ?? ''}</Text>
                            </>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

          </ScrollView>
          )}

          {/* ── Steps de uso (fora do ScrollView, sem scroll) ── */}
          {activeSlot && (cooldown === 0 || usageStarted) && !skill.isPassive && (
            <View style={styles.stepsContainer}>

              {/* PASSO 1 — ALVO */}
              {hasCombat && useStep === 'target' && (
                <View style={styles.stepInline}>
                  <View style={styles.targetRow}>
                    {[...enemies.map(e => ({ id: e.instanceId, kind: 'enemy' as TargetKind, icon: e.icon || '⚔', name: e.name, hp: `${e.hpCurrent}/${e.hpMax}` })),
                      ...bosses.map(b => ({ id: b.instanceId, kind: 'boss' as TargetKind, icon: '★', name: b.currentPhase > 0 && b.phases[b.currentPhase]?.name ? `${b.name} — ${b.phases[b.currentPhase]!.name}` : b.name, hp: `${b.hpCurrent}/${b.phases[b.currentPhase]?.hpMax ?? '?'}` }))
                    ].map(t => (
                      <TouchableOpacity key={t.id}
                        style={[styles.targetBtnCompact, selectedTarget?.id === t.id && styles.targetBtnSelected]}
                        onPress={() => setSelectedTarget(selectedTarget?.id === t.id ? null : { id: t.id, kind: t.kind })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.targetIcon}>{t.icon}</Text>
                        <Text style={styles.targetName} numberOfLines={1}>{t.name}</Text>
                        <Text style={styles.targetHp}>{t.hp}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => setUseStep('damage')} activeOpacity={0.7}>
                    <Text style={styles.skipLink}>Sem alvo →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASSO 2 — ACERTO */}
              {hasCombat && useStep === 'hit' && (
                <View style={styles.stepInline}>
                  <NumPad
                    value={hitPadMode === 'd20' ? hitInput : bonusInput}
                    onChange={hitPadMode === 'd20' ? setHitInput : setBonusInput}
                    maxLength={hitPadMode === 'd20' ? 2 : 3}
                  />
                  <View style={styles.stepSide}>
                    <Text style={styles.stepBig}>{hitInput || '—'}</Text>
                    <Text style={styles.stepSub}>
                      1d20 + AGI {formatMod(agiMod)}{bonusValue !== 0 ? `  bônus ${formatMod(bonusValue)}` : ''}
                    </Text>
                    <View style={styles.bonusRow}>
                      <TouchableOpacity
                        style={[styles.padModeBtn, hitPadMode === 'bonus' && styles.padModeBtnActive]}
                        onPress={() => setHitPadMode(m => m === 'd20' ? 'bonus' : 'd20')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.padModeBtnText, hitPadMode === 'bonus' && styles.padModeBtnTextActive]}>
                          PAD
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.bonusLabel}>BÔNUS</Text>
                      {hitPadMode === 'bonus' ? (
                        <Text style={[styles.bonusField, styles.bonusFieldDisplay]}>
                          {bonusInput || '0'}
                        </Text>
                      ) : (
                        <TextInput
                          style={styles.bonusField}
                          value={bonusInput}
                          onChangeText={setBonusInput}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={Colors.muted}
                        />
                      )}
                    </View>
                    {hitTotal !== null && (
                      <Text style={[styles.stepBig, { fontSize: 32, color: Colors.tealBright }]}>{hitTotal}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* PASSO 3 — DANO */}
              {((hasCombat && useStep === 'damage') || (!hasCombat && useStep === 'target')) && (
                <View style={styles.stepCol}>
                  {/* Linha superior: numpad + info */}
                  <View style={styles.stepInline}>
                    {skill.danoFormula ? (
                      <NumPad
                        value={dmgPadMode === 'dice' ? diceInput : pressaoInput}
                        onChange={dmgPadMode === 'dice' ? setDiceInput : setPressaoInput}
                        maxLength={3}
                      />
                    ) : null}
                    <View style={styles.stepSide}>
                      {(skill?.danoFormula || diceFormula) && (
                        <Text style={styles.formulaHint}>⚔ {skill?.danoFormula ?? diceFormula}</Text>
                      )}
                      {skill.custo && skill.custo !== '—' && (
                        <Text style={styles.stepSub}>CUSTO  {skill.custo}</Text>
                      )}
                      {skill.danoFormula ? (
                        <>
                          <Text style={styles.stepBig}>{diceInput || '—'}</Text>

                          {/* Sem pressão: mostra intermediário + maestria */}
                          {(!skill.pressaoDice || !player.pressao) && damageWithMaestria !== null && (
                            <>
                              <Text style={[styles.stepBig, { fontSize: 32, color: Colors.ember }]}>
                                {damageWithMaestria}
                              </Text>
                              {maestriaBonus > 0 && (
                                <Text style={styles.stepSub}>+{Math.round(maestriaBonus * 100)}% maestria</Text>
                              )}
                            </>
                          )}

                          {/* Com pressão: campo de input + total final */}
                          {skill.pressaoDice && player.pressao && (
                            <>
                              <View style={styles.bonusRow}>
                                <TouchableOpacity
                                  style={[styles.padModeBtn, dmgPadMode === 'pressao' && styles.padModeBtnActive]}
                                  onPress={() => setDmgPadMode(m => m === 'dice' ? 'pressao' : 'dice')}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.padModeBtnText, dmgPadMode === 'pressao' && styles.padModeBtnTextActive]}>
                                    PAD
                                  </Text>
                                </TouchableOpacity>
                                <Text style={styles.bonusLabel}>P {player.pressao.current}d6</Text>
                                {dmgPadMode === 'pressao' ? (
                                  <Text style={[styles.bonusField, styles.bonusFieldDisplay]}>
                                    {pressaoInput || '0'}
                                  </Text>
                                ) : (
                                  <TextInput
                                    style={styles.bonusField}
                                    value={pressaoInput}
                                    onChangeText={setPressaoInput}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor={Colors.muted}
                                  />
                                )}
                              </View>
                              {damagePreview !== null && (
                                <Text style={[styles.stepBig, { fontSize: 32, color: Colors.danger }]}>
                                  {damagePreview}
                                </Text>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <Text style={[styles.stepSub, { marginTop: 4 }]}>Sem dado de dano</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* RESULTADO / AGUARDANDO */}
              {useStep === 'result' && (
                <View style={styles.stepResult}>
                  {pendingRequestId ? (
                    <>
                      <ActivityIndicator color={Colors.ember} size="large" />
                      <Text style={styles.waitingText}>Aguardando aprovação do mestre…</Text>
                    </>
                  ) : useResult ? (
                    <>
                      <Text style={styles.resultLabel}>DANO TOTAL</Text>
                      <Text style={styles.resultDamage}>{useResult.damage ?? '—'}</Text>
                      {useResult.costPaid?.length > 0 && (
                        <Text style={styles.resultCost}>Custo: {useResult.costPaid.map(c => `${c.value} ${c.type}`).join(', ')}</Text>
                      )}
                    </>
                  ) : null}
                </View>
              )}

            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{useStep === 'result' ? 'FECHAR' : 'CANCELAR'}</Text>
            </TouchableOpacity>

            {status === 'disponivel' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnUnlock, unlocking && styles.btnDisabled]}
                onPress={handleUnlock}
                disabled={unlocking}
                activeOpacity={0.7}
              >
                {unlocking
                  ? <ActivityIndicator size="small" color={Colors.bg} />
                  : <Text style={styles.actionBtnText}>DESBLOQUEAR</Text>
                }
              </TouchableOpacity>
            )}

            {status === 'desbloqueada' && !equipped && !activeSlot && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnEquip]}
                onPress={() => { handleClose(); onEquipPress(skill); }}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>EQUIPAR</Text>
              </TouchableOpacity>
            )}

            {/* Passo 1: alvo → acerto (chama useSkill ao avançar) */}
            {activeSlot && (cooldown === 0 || usageStarted) && !useResult && !skill.isPassive && hasCombat && useStep === 'target' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnUse, (!selectedTarget || useLoading) && styles.btnDisabled]}
                onPress={handleAdvanceToHit}
                disabled={!selectedTarget || useLoading}
                activeOpacity={0.7}
              >
                {useLoading
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Text style={styles.actionBtnText}>ROLAR ACERTO →</Text>
                }
              </TouchableOpacity>
            )}

            {/* Passo 2: hit → errou debita custo, acertou vai para dano */}
            {activeSlot && (cooldown === 0 || usageStarted) && !skill.isPassive && hasCombat && useStep === 'hit' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.danger }]}
                  onPress={handleMiss}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnText}>ERROU ✗</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#16a34a' }, !validHit && styles.btnDisabled]}
                  onPress={() => validHit && setUseStep('damage')}
                  disabled={!validHit}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnText}>ACERTOU ✓</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Passo 3: dano → solicitar dano ou usar sem combate */}
            {activeSlot && (cooldown === 0 || usageStarted) && !skill.isPassive && useStep === 'damage' && (
              hasCombat && selectedTarget ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnUse, applyingDmg && styles.btnDisabled]}
                  onPress={handleRequestDamage}
                  disabled={applyingDmg}
                  activeOpacity={0.7}
                >
                  {applyingDmg
                    ? <ActivityIndicator size="small" color={Colors.text} />
                    : <Text style={styles.actionBtnText}>SOLICITAR DANO →</Text>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnUse, (useLoading || (!hasCombat && usageStarted)) && styles.btnDisabled]}
                  onPress={!hasCombat ? handleUseSkillNoCombat : handleUseSkillNoCombat}
                  disabled={useLoading || (!hasCombat && usageStarted)}
                  activeOpacity={0.7}
                >
                  {useLoading
                    ? <ActivityIndicator size="small" color={Colors.text} />
                    : <Text style={styles.actionBtnText}>USAR HABILIDADE</Text>
                  }
                </TouchableOpacity>
              )
            )}

          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 4, padding: 16, width: 420, maxWidth: '100%', maxHeight: '92%', gap: 10,
    overflow: 'hidden',
  },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerLeft: { flex: 1, gap: 4 },
  nome:       { fontFamily: Fonts.title, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  custo:      { fontFamily: Fonts.title, fontSize: 11, color: Colors.tealBright, letterSpacing: 1 },
  statusLabel: { fontFamily: Fonts.title, fontSize: 9, letterSpacing: 2 },
  categoria:  { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  closeBtn:   { fontSize: 16, color: Colors.muted },

  divider: { height: 1, backgroundColor: Colors.border },
  scroll:  { maxHeight: 340, flexShrink: 1 },

  descricao: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 14 },

  blockLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 6 },

  detailsBlock: {
    backgroundColor: Colors.surface, borderRadius: 4, padding: 10,
    gap: 6, marginBottom: 14,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 1.5 },
  detailValue: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text },

  reqBlock: { borderLeftWidth: 2, borderLeftColor: Colors.danger, paddingLeft: 10, marginBottom: 14 },
  reqText:  { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },

  cooldownText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger, fontStyle: 'italic', marginBottom: 10 },

  maestriaBlock:  { borderWidth: 1, borderColor: Colors.gold, borderRadius: 3, padding: 12, gap: 10 },
  maestriaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  maestriaLevel:  { fontFamily: Fonts.title, fontSize: 11, color: Colors.gold, letterSpacing: 1 },
  maestriaMaxText:{ fontFamily: Fonts.body, fontSize: 12, color: Colors.gold, fontStyle: 'italic' },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack:{ flex: 1, height: 4, backgroundColor: Colors.surface, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' as any, backgroundColor: Colors.gold, borderRadius: 2 },
  progressText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.muted, minWidth: 40, textAlign: 'right' },

  choicesMade: { gap: 4 },
  choiceChip:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipDot:     { width: 8, height: 8, borderRadius: 4 },
  chipDotA:    { backgroundColor: Colors.danger },
  chipDotO:    { backgroundColor: Colors.tealBright },
  chipText:    { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  totaisRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  totalChip:      { borderWidth: 1, borderColor: Colors.border, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: Colors.surface },
  totalChipText:  { fontFamily: Fonts.title, fontSize: 10, letterSpacing: 1 },

  levelUpBlock: { gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  levelUpLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.gold, letterSpacing: 2 },
  levelUpBtns:  { flexDirection: 'row', gap: 8 },
  levelUpBtn:   { flex: 1, padding: 10, borderRadius: 3, borderWidth: 1, gap: 2, alignItems: 'center' },
  btnAumento:   { borderColor: Colors.danger,     backgroundColor: 'rgba(239,68,68,0.07)'   },
  btnOtimizacao:{ borderColor: Colors.tealBright, backgroundColor: 'rgba(74,222,128,0.07)'  },
  levelUpBtnTitle: { fontFamily: Fonts.title, fontSize: 10, letterSpacing: 1 },
  levelUpBtnSub:   { fontFamily: Fonts.body,  fontSize: 11, color: Colors.muted },

  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },

  actions:   { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 2 },
  cancelText:{ fontFamily: Fonts.title, fontSize: 10, color: Colors.muted, letterSpacing: 2 },
  actionBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 2, minWidth: 130, alignItems: 'center' },
  actionBtnUnlock: { backgroundColor: Colors.gold },
  actionBtnEquip:  { backgroundColor: Colors.ember },
  actionBtnText:   { fontFamily: Fonts.title, fontSize: 10, color: Colors.bg, letterSpacing: 2 },
  btnDisabled: { opacity: 0.6 },

  passivaBadge:    { fontFamily: Fonts.title, fontSize: 8, color: Colors.tealBright, letterSpacing: 2, borderWidth: 1, borderColor: Colors.tealBright, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 },
  passivaMsgBlock: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  passivaMsgText:  { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, fontStyle: 'italic' },

  useSection:   { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 8, gap: 10 },
  formulaHint:  { fontFamily: Fonts.title, fontSize: 10, color: Colors.muted, letterSpacing: 1 },

  custoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  custoLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  custoValue: { fontFamily: Fonts.title, fontSize: 14, color: Colors.tealBright, letterSpacing: 1 },

  diceBlock:      { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  diceInputWrap:  { alignItems: 'center', gap: 4 },
  diceModWrap:    { alignItems: 'center', gap: 4 },
  diceResultWrap: { alignItems: 'center', gap: 4, flex: 1 },
  diceLabel:      { fontFamily: Fonts.title, fontSize: 8, color: Colors.muted, letterSpacing: 2 },
  diceInput: {
    width: 64, height: 52, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 3, backgroundColor: Colors.surface,
    fontFamily: Fonts.title, fontSize: 26, color: Colors.ember, textAlign: 'center',
  },
  diceModValue:   { fontFamily: Fonts.title, fontSize: 22, color: Colors.muted },
  diceResult:     { fontFamily: Fonts.title, fontSize: 36, color: Colors.tealBright },
  diceRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diceInput: {
    width: 60, height: 40, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 3, backgroundColor: Colors.surface,
    fontFamily: Fonts.title, fontSize: 20, color: Colors.ember, textAlign: 'center',
  },
  modText:     { fontFamily: Fonts.title, fontSize: 13, color: Colors.muted },
  previewText: { fontFamily: Fonts.title, fontSize: 20, color: Colors.tealBright },

  waitingBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  waitingText:  { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, fontStyle: 'italic' },
  numPadRow:    { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  numPadResult: { flex: 1, gap: 4, justifyContent: 'flex-start' },
  stepsContainer: { gap: 8 },
  stepCol:      { gap: 8 },
  bonusRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bonusLabel:   { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  bonusField:   {
    width: 52, height: 30, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 3, backgroundColor: Colors.surface,
    fontFamily: Fonts.title, fontSize: 15, color: Colors.text, textAlign: 'center',
    paddingVertical: 0,
  },
  bonusFieldDisplay: {
    lineHeight: 30, borderColor: Colors.ember,
  },
  padModeBtn: {
    paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 3,
    backgroundColor: Colors.surface,
  },
  padModeBtnActive: { borderColor: Colors.ember, backgroundColor: 'rgba(251,146,60,0.12)' },
  padModeBtnText:   { fontFamily: Fonts.title, fontSize: 8, color: Colors.muted, letterSpacing: 1 },
  padModeBtnTextActive: { color: Colors.ember },
  stepInline:   { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  stepSide:     { flex: 1, gap: 4, justifyContent: 'center' },
  stepBig:      { fontFamily: Fonts.title, fontSize: 24, color: Colors.text },
  stepSub:      { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  stepResult:   { alignItems: 'center', gap: 6, paddingVertical: 8 },
  targetRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  targetBtnCompact: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 3,
  },
  stepLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 4 },
  skipLink:  { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textDecorationLine: 'underline', marginTop: 6, alignSelf: 'flex-end' },
  entityHpDot: { backgroundColor: Colors.tealBright },
  targetList: { gap: 4, marginTop: 8 },
  targetListLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 2 },
  targetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 3,
    backgroundColor: Colors.surface,
  },
  targetBtnSelected: { borderColor: Colors.danger, backgroundColor: 'rgba(239,68,68,0.08)' },
  targetIcon:  { fontSize: 11, width: 14, textAlign: 'center' as const },
  targetName:  { flex: 1, fontFamily: Fonts.body, fontSize: 12, color: Colors.text },
  targetHp:    { fontFamily: Fonts.title, fontSize: 10, color: Colors.muted },

  resultBlock:  { alignItems: 'center', gap: 6, paddingVertical: 8 },
  resultLabel:  { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  resultDamage: { fontFamily: Fonts.title, fontSize: 52, color: Colors.danger, lineHeight: 60 },
  resultCost:   { fontFamily: Fonts.body, fontSize: 12, color: Colors.tealBright },
  applyBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.danger, borderRadius: 3, alignItems: 'center',
  },
  applyBtnText: { fontFamily: Fonts.title, fontSize: 10, color: '#fff', letterSpacing: 2 },

  actionBtnUse: { backgroundColor: Colors.ember },
});
