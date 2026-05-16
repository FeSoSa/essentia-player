import { useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { getModifier, formatMod, initiativeBonus, getArmorWeight, xpProgress, weaponDamageFormula, type ArmorWeight } from '@/lib/rules';
import { ResourceBar } from '@/components/ui/resource-bar';
import { SobrecargaModal } from '@/components/ui/sobrecarga-modal';
import { NumPad } from '@/components/ui/num-pad';
import { SkillInfoModal } from '@/components/ui/skill-info-modal';
import { GameIcon } from '@/components/ui/game-icon';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { adjustHp, adjustFlow, adjustEther, adjustPressao, executeDesvio } from '@/lib/api';
import { SOBRECARGA_LEVELS, type Essencia, type EssenciaObtida, type StatusEffect, type Slot, type SkillTreeEntry } from '@/types';

const ATTR_LABELS: Record<string, string> = {
  strength: 'FOR',
  agility: 'AGI',
  intelligence: 'INT',
  resistance: 'RES',
  flow: 'FLX',
  wisdom: 'SAB',
  presence: 'PRE',
  defense: 'DEF',
};

const ATTR_ORDER = ['strength', 'agility', 'intelligence', 'resistance', 'flow', 'wisdom', 'presence', 'defense'];

function bonus(val: number): string {
  return formatMod(getModifier(val));
}

function hpColor(current: number, max: number): string {
  if (max <= 0) return Colors.faint;
  const pct = current / max;
  if (pct > 0.66) return '#4ade80'; // verde
  if (pct > 0.33) return '#facc15'; // amarelo
  if (pct > 0.10) return '#f97316'; // laranja
  return Colors.danger;             // vermelho
}

function normalizePortraitUrl(url: string): string {
  const fileId =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
  return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : url;
}

function essenciaColor(type: string, customColor?: string): string {
  if (customColor) return customColor;
  switch (type) {
    case 'Grande': return Colors.gold;
    case 'Mitica': return '#a855f7';
    case 'Derivada': return Colors.tealBright;
    default: return Colors.ember;
  }
}

export function GeralScreen() {
  const player = usePlayerStore((s) => s.player)!;
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const skillTree = usePlayerStore((s) => s.skillTree);
  const essencias = usePlayerStore((s) => s.essencias);
  const initiative = useGameStore((s) => s.initiative);
  const collectiveBars = useGameStore((s) => s.collectiveBars);
  const turnCount = useGameStore((s) => s.turnCount);

  const [selectedEssencia, setSelectedEssencia] = useState<(EssenciaObtida & { catalog?: Essencia }) | null>(null);
  const [selectedEfeito, setSelectedEfeito] = useState<StatusEffect | null>(null);
  const [skillModalSlot,  setSkillModalSlot]  = useState<Slot | null>(null);
  const [skillModalSkill, setSkillModalSkill] = useState<SkillTreeEntry | null>(null);
  const [sobrecargaOpen,    setSobrecargaOpen]    = useState(false);
  const [enemyDetailOpen,   setEnemyDetailOpen]   = useState(false);
  const [selectedEnemy,     setSelectedEnemy]     = useState<{
    icon?: string; name: string; type: string;
    desc?: string; notes?: string;
    hpCurrent?: number; hpMax?: number;
    portraitUrl?: string; isAlly?: boolean;
  } | null>(null);
  const [desvioModalOpen, setDesvioModalOpen] = useState(false);
  const [desvioInput,     setDesvioInput]     = useState('');
  const [desvioLoading,   setDesvioLoading]   = useState(false);
  const [desvioResult,    setDesvioResult]    = useState<{ roll: number; bonus: number; total: number; success: boolean; weight: ArmorWeight } | null>(null);

  const sobrecargaAtiva = player.sobrecargaAtiva === true;
  const sobrecargaBonus = sobrecargaAtiva
    ? (SOBRECARGA_LEVELS.find((l) => l.nivel === player.sobrecargaNivel)?.bonus ?? 0)
    : 0;

  const enemies = useGameStore((s) => s.enemies);
  const bosses  = useGameStore((s) => s.bosses);
  const allies  = useGameStore((s) => s.allies);

  const skillMap = new Map(skillTree.map((s) => [s.skillId, s]));
  const combatActive = initiative.length > 0;
  const currentPlayer = initiative.length > 0 ? initiative[turnCount % initiative.length] : null;

  const attrs = player.effectiveAttributes ?? player.attributes;
  const agiMod = getModifier(attrs.agility);
  const initBonus = initiativeBonus(agiMod);
  const armorWeight = getArmorWeight(player.equipment.armor?.armorWeight);
  const canDesviar = combatActive && armorWeight !== 'heavy' && player.desviosRestantes > 0;

  async function confirmDesvio() {
    const roll = parseInt(desvioInput, 10);
    if (isNaN(roll) || roll < 1) return;
    setDesvioLoading(true);
    try {
      const bonus = armorWeight === 'none' ? getModifier(attrs.agility) : 0;
      const total = roll + bonus;
      const updated = await executeDesvio(player.id);
      setPlayer(updated);
      setDesvioResult({ roll, bonus, total, success: total >= 12, weight: armorWeight });
      setDesvioModalOpen(false);
      setDesvioInput('');
    } catch { /* silent */ }
    finally { setDesvioLoading(false); }
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>

      {/* ─── LEFT PANEL ─── */}
      <View style={styles.leftPanel}>

        {/* Portrait — edge to edge, sem padding */}
        <View style={styles.portraitWrap}>
          {player.char.portraitUrl ? (
            <>
              {/* Fundo borrado para preencher sobras quando a imagem é mais estreita */}
              <Image
                source={{ uri: normalizePortraitUrl(player.char.portraitUrl), headers: { Referer: '' } }}
                style={[styles.portraitImage, { position: 'absolute', opacity: 0.5 }]}
                resizeMode="cover"
                blurRadius={12}
              />
              {/* Imagem principal — contain para não cortar */}
              <Image
                source={{ uri: normalizePortraitUrl(player.char.portraitUrl), headers: { Referer: '' } }}
                style={styles.portraitImage}
                resizeMode="contain"
              />
            </>
          ) : (
            <View style={styles.portraitPlaceholder}>
              <Text style={styles.portraitInitial}>
                {player.char.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Nome e raça sobrepostos na parte inferior do portrait */}
          <View style={styles.portraitOverlay}>
            <Text style={styles.charName}>{player.char.name}</Text>
            <Text style={styles.charSub}>
              {player.char.race} · {player.char.skillClass}
            </Text>
          </View>
        </View>

        {/* Conteúdo com padding */}
        <ScrollView style={styles.leftScroll} contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>
          {/* Level + XP */}
          {(() => {
            const { xpInLevel, xpNeeded } = xpProgress(player.exp.total, player.char.level);
            const fillPct = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;
            return (
              <>
                <View style={styles.levelRow}>
                  <Text style={styles.levelLabel}>NÍVEL {player.char.level}</Text>
                  <Text style={styles.xpText}>{xpInLevel} / {xpNeeded} XP</Text>
                </View>
                <View style={styles.xpTrack}>
                  <View style={[styles.xpFill, { width: `${fillPct}%` as any }]} />
                </View>
                {player.exp.available > 0 && (
                  <Text style={styles.ptsAmber}>{player.exp.available} pontos de atributo</Text>
                )}
              </>
            );
          })()}

          {/* Attributes grid */}
          <View style={styles.attrGrid}>
            {ATTR_ORDER.map((key) => {
              const base = ((player.effectiveAttributes ?? player.attributes) as any)[key] as number;
              const displayed = base + sobrecargaBonus;
              return (
                <View key={key} style={[styles.attrCell, sobrecargaAtiva && key !== 'defense' && styles.attrCellOverload]}>
                  <Text style={styles.attrLabel}>{ATTR_LABELS[key]}</Text>
                  <Text style={[styles.attrVal, sobrecargaAtiva && key !== 'defense' && styles.attrValOverload]}>
                    {displayed}
                  </Text>
                  <Text style={styles.attrBonus}>{bonus(displayed)}</Text>
                </View>
              );
            })}
          </View>

        </ScrollView>
      </View>

      {/* ─── BARS PANEL ─── */}
      <ScrollView style={styles.barsPanel} contentContainerStyle={styles.barsPanelContent} showsVerticalScrollIndicator={false}>
        <ResourceBar
          label="VIDA"
          current={player.hp.current}
          max={player.hp.max}
          color={Colors.tealBright}
          onDecrement={() => adjustHp(player.id, -1)}
          onIncrement={() => adjustHp(player.id, 1)}
        />
        <ResourceBar
          label="FLUXO"
          current={player.flow.current}
          max={player.flow.max}
          color="#4a9fd4"
          onDecrement={() => adjustFlow(player.id, -1)}
          onIncrement={() => adjustFlow(player.id, 1)}
        />
        {player.ether.unlocked && (
          <ResourceBar
            label="ÉTER"
            current={player.ether.current}
            max={player.ether.max}
            color="#a855f7"
            onDecrement={() => adjustEther(player.id, -1)}
            onIncrement={() => adjustEther(player.id, 1)}
          />
        )}
        {player.pressao && (
          <ResourceBar
            label="PRESSÃO"
            current={player.pressao.current}
            max={player.pressao.max}
            color="#f97316"
            onDecrement={() => adjustPressao(player.id, -1)}
            onIncrement={() => adjustPressao(player.id, 1)}
          />
        )}
        {(player.customBars ?? []).map((bar) => (
          <ResourceBar key={bar.id} label={bar.name.toUpperCase()} current={bar.current} max={bar.max} color={bar.color} />
        ))}
        {collectiveBars.map((bar) => (
          <ResourceBar key={bar.id} label={bar.name.toUpperCase()} current={bar.current} max={bar.max} color={bar.color} />
        ))}
      </ScrollView>

      {/* ─── COMBAT PANEL ─── */}
      <View style={styles.combatPanel}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.combatScroll}>

          {/* Badge + round na mesma linha */}
          <View style={styles.combatHeader}>
            <View style={[styles.combatBadge, !combatActive && styles.combatBadgeInactive]}>
              <Text style={[styles.combatBadgeText, !combatActive && styles.combatBadgeTextMuted]}>
                {combatActive ? 'COMBATE ATIVO' : 'SEM COMBATE'}
              </Text>
            </View>
            {combatActive && (
              <View style={styles.roundPill}>
                <Text style={styles.roundText}>R{turnCount + 1}</Text>
              </View>
            )}
          </View>

          {/* Turno atual */}
          {combatActive && currentPlayer && (
            <View style={styles.turnRow}>
              <View style={styles.turnDot} />
              <Text style={styles.turnText} numberOfLines={1}>{currentPlayer.name}</Text>
            </View>
          )}

          {/* Inimigos e bosses — só durante combate */}
          {combatActive && (enemies.length > 0 || bosses.length > 0) && (
            <View style={styles.entityList}>
              <Text style={styles.entitySectionLabel}>INIMIGOS</Text>
              {enemies.map((e) => {
                const pct = e.hpMax > 0 ? Math.max(0, Math.min(e.hpCurrent / e.hpMax, 1)) : 0;
                return (
                  <TouchableOpacity key={e.instanceId} style={styles.entityRow}
                    onPress={() => { setSelectedEnemy({ icon: e.icon, name: e.name, type: e.type, desc: e.desc, notes: e.notes, hpCurrent: e.hpCurrent, hpMax: e.hpMax }); setEnemyDetailOpen(true); }}
                    activeOpacity={0.7}>
                    <Text style={styles.entityIcon}>{e.icon || '⚔'}</Text>
                    <View style={styles.entityInfo}>
                      <Text style={styles.enemyName} numberOfLines={1}>{e.name}</Text>
                      <View style={styles.entityHpTrack}>
                        <View style={[styles.entityHpFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: hpColor(e.hpCurrent, e.hpMax) }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {bosses.map((b) => {
                const phase = b.phases[b.currentPhase];
                const hpMax = phase?.hpMax ?? 1;
                const pct = hpMax > 0 ? Math.max(0, Math.min(b.hpCurrent / hpMax, 1)) : 0;
                return (
                  <TouchableOpacity key={b.instanceId} style={styles.entityRow}
                    onPress={() => { setSelectedEnemy({ icon: b.icon, name: b.name, type: 'Boss', notes: b.notes, hpCurrent: b.hpCurrent, hpMax }); setEnemyDetailOpen(true); }}
                    activeOpacity={0.7}>
                    <Text style={styles.entityIcon}>{b.icon || '★'}</Text>
                    <View style={styles.entityInfo}>
                      <Text style={styles.bossName} numberOfLines={1}>
                        {b.currentPhase > 0 && phase?.name ? `${b.name} — ${phase.name}` : b.name}
                      </Text>
                      <View style={styles.entityHpTrack}>
                        <View style={[styles.entityHpFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: hpColor(b.hpCurrent, hpMax) }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Aliados — visíveis sempre que existirem */}
          {allies.length > 0 && (
            <View style={styles.entityList}>
              <Text style={styles.entitySectionLabelAlly}>ALIADOS</Text>
              {allies.map((a) => {
                const pct = a.hpMax > 0 ? Math.max(0, Math.min(a.hpCurrent / a.hpMax, 1)) : 0;
                return (
                  <TouchableOpacity key={a.id} style={styles.entityRow}
                    onPress={() => { setSelectedEnemy({ icon: a.icon, name: a.name, type: a.type, desc: a.desc, hpCurrent: a.hpCurrent, hpMax: a.hpMax, portraitUrl: a.portraitUrl, isAlly: true }); setEnemyDetailOpen(true); }}
                    activeOpacity={0.7}>
                    {a.portraitUrl
                      ? <Image source={{ uri: normalizePortraitUrl(a.portraitUrl) }} style={styles.allyThumb} />
                      : <Text style={styles.entityIcon}>{a.icon || '🛡'}</Text>
                    }
                    <View style={styles.entityInfo}>
                      <Text style={styles.allyName} numberOfLines={1}>{a.name}</Text>
                      <View style={styles.entityHpTrack}>
                        <View style={[styles.entityHpFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: hpColor(a.hpCurrent, a.hpMax) }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.initiativeRow}>
            <Text style={styles.combatStatLabel}>INICIATIVA</Text>
            <Text style={styles.combatStatValue}>
              {`1d20 ${initBonus >= 0 ? `+${initBonus}` : initBonus}`}
            </Text>
          </View>

          {(() => {
            const weapon = player.equipment.mainHand;
            const dmg = weapon ? weaponDamageFormula(weapon) : (player.char.unarmedDamage ?? '—');
            const hasData = !!(weapon?.damageDice || weapon?.damageBase || player.char.unarmedDamage);
            return (
              <View style={styles.initiativeRow}>
                <Text style={styles.combatStatLabel}>DANO BASE</Text>
                <Text style={hasData ? styles.combatStatValue : styles.combatStatMuted}>{dmg}</Text>
              </View>
            );
          })()}

        </ScrollView>
      </View>

      </View>{/* end topRow */}

      {/* ─── ESSÊNCIAS / EFEITOS ROW ─── */}
      {(() => {
        const obtidas = player.essenciasObtidas.map((o) => ({
          ...o,
          catalog: essencias.find((e) => e.id === o.essenciaId),
        }));
        const effects = player.statusEffects;

        return (
          <View style={styles.middleRow}>
            <View style={styles.midSection}>
              <Text style={styles.midLabel}>ESSÊNCIAS</Text>
              <View style={styles.midGrid}>
                {Array.from({ length: Math.max(obtidas.length, 5) }, (_, i) => {
                  const o = obtidas[i];
                  if (!o) return <View key={i} style={[styles.midSlot, styles.midSlotEmpty]} />;
                  const color = essenciaColor(o.catalog?.type ?? '', o.catalog?.color);
                  return (
                    <TouchableOpacity key={o.essenciaId} style={[styles.midSlot, { borderColor: color + '88' }]} onPress={() => setSelectedEssencia(o)} activeOpacity={0.7}>
                      {o.catalog?.icon
                        ? <GameIcon icon={o.catalog.icon} size={11} color={color} />
                        : <View style={[styles.midDot, { backgroundColor: color }]} />
                      }
                      <Text style={styles.midSlotText} numberOfLines={1}>{o.catalog?.name ?? '?'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.midDivider} />
            <View style={styles.midSection}>
              <Text style={styles.midLabel}>EFEITOS</Text>
              <View style={styles.midGrid}>
                {Array.from({ length: Math.max(effects.length, 5) }, (_, i) => {
                  const ef = effects[i];
                  if (!ef) return <View key={i} style={[styles.midSlot, styles.midSlotEmpty]} />;
                  return (
                    <TouchableOpacity key={ef.id}
                      style={[styles.midSlot, ef.color ? { borderColor: ef.color + '88' } : undefined]}
                      onPress={() => setSelectedEfeito(ef)} activeOpacity={0.7}>
                      <GameIcon icon={ef.icon} size={12} color={ef.color || Colors.muted} />
                      <Text style={styles.midSlotText} numberOfLines={1}>{ef.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.midDivider} />
            <TouchableOpacity
              style={[styles.desvioMidSection, !canDesviar && styles.desvioMidDisabled]}
              onPress={() => canDesviar && setDesvioModalOpen(true)}
              disabled={!canDesviar}
              activeOpacity={0.75}
            >
              <View style={styles.desvioDotsRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[
                    styles.desvioDot,
                    i < player.desviosRestantes ? styles.desvioDotFull : styles.desvioDotEmpty,
                  ]} />
                ))}
              </View>
              <Text style={styles.desvioMidLabel}>DESVIAR</Text>
            </TouchableOpacity>
            {player.sobrecargaDesbloqueada && (
              <>
                <View style={styles.midDivider} />
                <TouchableOpacity
                  style={[styles.sobrecargaMidSection, sobrecargaAtiva && styles.sobrecargaMidAtiva]}
                  onPress={() => setSobrecargaOpen(true)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sobrecargaMidLabel, sobrecargaAtiva && styles.sobrecargaMidLabelAtiva]}>
                    {sobrecargaAtiva ? `N${player.sobrecargaNivel}` : '⚡'}
                  </Text>
                  <Text style={[styles.sobrecargaMidSub, sobrecargaAtiva && styles.sobrecargaMidLabelAtiva]}>
                    {sobrecargaAtiva ? 'ATIVO' : 'SOBREC.'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })()}

      {/* ─── SLOT ROW ─── */}
      {(() => {
        const classSlots = player.slots.filter((s) => s.type === 'class');
        const bonusSlots = player.slots.filter((s) => s.type !== 'class');
        const classCount = player.char.slotsClass;
        const bonusCount = player.char.slotsTotal - classCount;
        const classGrid = Array.from({ length: classCount }, (_, i) => classSlots[i] ?? null);
        const bonusGrid = Array.from({ length: bonusCount }, (_, i) => bonusSlots[i] ?? null);

        function renderSlot(slot: typeof player.slots[0] | null, key: string) {
          if (!slot) return <View key={key} style={[styles.slotBox, styles.slotEmpty]} />;
          const skill = slot.skillId ? skillMap.get(slot.skillId) : undefined;
          const onCd = slot.cooldownRemaining > 0;
          const pressable = !!skill && !onCd;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.slotBox, onCd && styles.slotOnCd, !skill && styles.slotEmpty]}
              onPress={pressable ? () => { setSkillModalSlot(slot); setSkillModalSkill(skill!); } : undefined}
              activeOpacity={pressable ? 0.7 : 1}
              disabled={!pressable}
            >
              <Text style={styles.slotText}>{skill ? skill.nome : ''}</Text>
              {onCd && <Text style={styles.slotCdBadge}>{slot.cooldownRemaining}t</Text>}
            </TouchableOpacity>
          );
        }

        return (
          <View style={styles.bottomRow}>
            {classGrid.map((s, i) => renderSlot(s, `c-${i}`))}
            <View style={styles.slotDivider} />
            {bonusGrid.map((s, i) => renderSlot(s, `b-${i}`))}
          </View>
        );
      })()}

      {/* Detalhe de essência */}
      <Modal visible={!!selectedEssencia} transparent animationType="fade" onRequestClose={() => setSelectedEssencia(null)}>
        <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={() => setSelectedEssencia(null)}>
          <View style={detailStyles.card}>
            {selectedEssencia && (() => {
              const ess = selectedEssencia.catalog;
              const color = essenciaColor(ess?.type ?? '', ess?.color);
              const bonuses = Object.entries(ess?.attributeBonus ?? {}).filter(([, v]) => v !== 0);
              return (
                <>
                  <View style={[detailStyles.colorBar, { backgroundColor: color }]} />
                  <View style={detailStyles.body}>
                    <View style={detailStyles.titleRow}>
                      {ess?.icon && <GameIcon icon={ess.icon} size={18} color={color} />}
                      <Text style={detailStyles.name}>{ess?.name ?? '?'}</Text>
                      <Text style={[detailStyles.typeBadge, { color }]}>{ess?.type ?? '—'}</Text>
                    </View>
                    {ess?.desc ? <Text style={detailStyles.desc}>{ess.desc}</Text> : <Text style={detailStyles.desc}>—</Text>}
                    {bonuses.length > 0 && (
                      <View style={detailStyles.bonusRow}>
                        {bonuses.map(([attr, val]) => (
                          <View key={attr} style={detailStyles.bonusPill}>
                            <Text style={detailStyles.bonusText}>{attr.slice(0,3).toUpperCase()} {val > 0 ? '+' : ''}{val}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {selectedEssencia.unlockedSkillIds.length > 0 && (
                      <Text style={detailStyles.skillCount}>
                        {selectedEssencia.unlockedSkillIds.length} habilidade{selectedEssencia.unlockedSkillIds.length !== 1 ? 's' : ''} desbloqueada{selectedEssencia.unlockedSkillIds.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {selectedEssencia.attributeBonusActive && (
                      <View style={detailStyles.activeBadge}>
                        <Text style={detailStyles.activeBadgeText}>BÔNUS ATIVO</Text>
                      </View>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detalhe de efeito */}
      <Modal visible={!!selectedEfeito} transparent animationType="fade" onRequestClose={() => setSelectedEfeito(null)}>
        <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={() => setSelectedEfeito(null)}>
          <View style={detailStyles.card}>
            {selectedEfeito && (() => {
              const accent = selectedEfeito.color || Colors.danger;
              return (
                <>
                  <View style={[detailStyles.colorBar, { backgroundColor: accent }]} />
                  <View style={detailStyles.body}>
                    <View style={detailStyles.titleRow}>
                      <GameIcon icon={selectedEfeito.icon} size={16} color={accent} />
                      <Text style={detailStyles.name}>{selectedEfeito.name}</Text>
                      <View style={[detailStyles.durationBadge, { borderColor: accent + '66' }]}>
                        <Text style={[detailStyles.durationText, { color: accent }]}>
                          {selectedEfeito.durationTurns === -1 ? '∞' : `${selectedEfeito.durationTurns}t`}
                        </Text>
                      </View>
                    </View>
                    {selectedEfeito.desc
                      ? <Text style={detailStyles.desc}>{selectedEfeito.desc}</Text>
                      : <Text style={detailStyles.desc}>—</Text>}
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Resultado do desvio */}
      <Modal visible={!!desvioResult} transparent animationType="fade" onRequestClose={() => setDesvioResult(null)}>
        <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={() => setDesvioResult(null)}>
          {desvioResult && (
            <View style={[desvioResultStyles.card, { borderColor: desvioResult.success ? Colors.tealBright : Colors.danger }]}>
              <View style={[desvioResultStyles.bar, { backgroundColor: desvioResult.success ? Colors.tealBright : Colors.danger }]} />
              <View style={desvioResultStyles.body}>
                <Text style={[desvioResultStyles.verdict, { color: desvioResult.success ? Colors.tealBright : Colors.danger }]}>
                  {desvioResult.success ? 'DESVIOU' : 'FALHOU'}
                </Text>
                <Text style={desvioResultStyles.rollLine}>
                  {desvioResult.weight === 'medium' ? '1d20 desvantagem' : desvioResult.weight === 'none' ? `1d20 + AGI` : '1d20'}
                </Text>
                <View style={desvioResultStyles.totalRow}>
                  <Text style={desvioResultStyles.rollNum}>{desvioResult.roll}</Text>
                  {desvioResult.bonus !== 0 && (
                    <Text style={desvioResultStyles.bonusNum}>{desvioResult.bonus >= 0 ? `+${desvioResult.bonus}` : desvioResult.bonus}</Text>
                  )}
                  <Text style={desvioResultStyles.equals}>=</Text>
                  <Text style={[desvioResultStyles.total, { color: desvioResult.success ? Colors.tealBright : Colors.danger }]}>
                    {desvioResult.total}
                  </Text>
                  <Text style={desvioResultStyles.cdLabel}>vs CD 12</Text>
                </View>
                <View style={desvioResultStyles.usesRow}>
                  {[0,1,2].map((i) => (
                    <View key={i} style={[
                      desvioResultStyles.useDot,
                      i < (player.desviosRestantes) ? desvioResultStyles.useDotFull : desvioResultStyles.useDotEmpty,
                    ]} />
                  ))}
                  <Text style={desvioResultStyles.usesLabel}>{player.desviosRestantes} restante{player.desviosRestantes !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de desvio ── */}
      <Modal visible={desvioModalOpen} transparent animationType="fade" onRequestClose={() => setDesvioModalOpen(false)}>
        <View style={desvioStyles.overlay}>
          <View style={desvioStyles.card}>
            <Text style={desvioStyles.title}>DESVIO</Text>

            <Text style={desvioStyles.hint}>
              {armorWeight === 'none' && `1d20 + AGI ${formatMod(getModifier(attrs.agility))} vs 12`}
              {armorWeight === 'light' && '1d20 vs 12 (sem bônus)'}
              {armorWeight === 'medium' && '1d20 com desvantagem vs 12 — insira o menor dos dois dados'}
            </Text>

            <View style={desvioStyles.numPadRow}>
              <NumPad value={desvioInput} onChange={setDesvioInput} maxLength={2} />
              <View style={desvioStyles.numPadPreview}>
                <Text style={desvioStyles.numPadValue}>{desvioInput || '—'}</Text>
                {desvioInput !== '' && !isNaN(parseInt(desvioInput)) && (
                  <Text style={desvioStyles.previewText}>
                    {armorWeight === 'none' && `${formatMod(getModifier(attrs.agility))} = `}
                    <Text style={{
                      color: (parseInt(desvioInput) + (armorWeight === 'none' ? getModifier(attrs.agility) : 0)) >= 12
                        ? Colors.tealBright : Colors.danger,
                      fontWeight: 'bold',
                    }}>
                      {parseInt(desvioInput) + (armorWeight === 'none' ? getModifier(attrs.agility) : 0)}
                    </Text>
                    {' vs 12'}
                  </Text>
                )}
              </View>
            </View>

            <View style={desvioStyles.actions}>
              <TouchableOpacity style={desvioStyles.cancelBtn} onPress={() => { setDesvioModalOpen(false); setDesvioInput(''); }}>
                <Text style={desvioStyles.cancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[desvioStyles.confirmBtn, (desvioLoading || !desvioInput) && desvioStyles.confirmDisabled]}
                onPress={confirmDesvio}
                disabled={desvioLoading || !desvioInput}
              >
                {desvioLoading
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Text style={desvioStyles.confirmText}>CONFIRMAR</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SobrecargaModal visible={sobrecargaOpen} onClose={() => setSobrecargaOpen(false)} />

      <Modal transparent animationType="fade" visible={enemyDetailOpen} onRequestClose={() => setEnemyDetailOpen(false)}>
        <TouchableOpacity style={entityDetailStyles.overlay} activeOpacity={1} onPress={() => setEnemyDetailOpen(false)}>
          <View style={entityDetailStyles.card}>
            {selectedEnemy && (() => {
              const accent = selectedEnemy.isAlly ? '#4ade80' : Colors.danger;
              const hpPct = (selectedEnemy.hpMax ?? 0) > 0
                ? Math.max(0, Math.min((selectedEnemy.hpCurrent ?? 0) / selectedEnemy.hpMax!, 1))
                : null;
              return (
                <>
                  <View style={[entityDetailStyles.accentBar, { backgroundColor: accent }]} />
                  <View style={entityDetailStyles.body}>
                    {/* Header: portrait/icon + name + type */}
                    <View style={entityDetailStyles.headerRow}>
                      {selectedEnemy.portraitUrl
                        ? <Image
                            source={{ uri: normalizePortraitUrl(selectedEnemy.portraitUrl) }}
                            style={entityDetailStyles.portrait}
                            resizeMode="cover"
                          />
                        : <Text style={entityDetailStyles.iconText}>
                            {selectedEnemy.icon || (selectedEnemy.isAlly ? '🛡' : '⚔')}
                          </Text>
                      }
                      <View style={entityDetailStyles.headerText}>
                        <Text style={entityDetailStyles.name}>{selectedEnemy.name}</Text>
                        {!!selectedEnemy.type && (
                          <Text style={[entityDetailStyles.typeBadge, { color: accent }]}>{selectedEnemy.type.toUpperCase()}</Text>
                        )}
                      </View>
                    </View>

                    {/* HP bar */}
                    {hpPct !== null && (
                      <View style={entityDetailStyles.hpSection}>
                        <View style={entityDetailStyles.hpBarTrack}>
                          <View style={[entityDetailStyles.hpBarFill, { width: `${Math.round(hpPct * 100)}%` as any, backgroundColor: accent }]} />
                        </View>
                        <Text style={[entityDetailStyles.hpLabel, { color: accent }]}>
                          {selectedEnemy.hpCurrent} / {selectedEnemy.hpMax}
                        </Text>
                      </View>
                    )}

                    {/* Description */}
                    {(selectedEnemy.desc || selectedEnemy.notes) && (
                      <View style={entityDetailStyles.descSection}>
                        {!!selectedEnemy.desc && (
                          <Text style={entityDetailStyles.desc}>{selectedEnemy.desc}</Text>
                        )}
                        {!!selectedEnemy.notes && (
                          <Text style={entityDetailStyles.notes}>{selectedEnemy.notes}</Text>
                        )}
                      </View>
                    )}
                    {!selectedEnemy.desc && !selectedEnemy.notes && (
                      <Text style={entityDetailStyles.descMuted}>Sem descrição.</Text>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      <SkillInfoModal
        visible={!!(skillModalSlot && skillModalSkill)}
        skill={skillModalSkill}
        slots={player.slots}
        activeSlot={skillModalSlot}
        onClose={() => { setSkillModalSlot(null); setSkillModalSkill(null); }}
        onEquipPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.bg,
  },
  topRow: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Left panel ──
  leftPanel: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    overflow: 'hidden',
  },

  // Portrait — edge to edge, nome sobreposto
  portraitWrap: {
    width: '100%',
    height: 72,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portraitInitial: {
    fontFamily: Fonts.title,
    fontSize: 56,
    color: Colors.faint,
  },
  portraitOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9,9,11,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 1,
  },
  charName: {
    fontFamily: Fonts.title,
    fontSize: 15,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  charSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },

  // Content below portrait
  leftScroll: {
    flex: 1,
  },
  leftContent: {
    padding: 8,
    gap: 4,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  levelLabel: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.ember,
    letterSpacing: 1,
  },
  xpText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.muted,
  },
  xpTrack: {
    height: 3,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.ember,
    borderRadius: 2,
  },
  ptsMuted: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.faint,
  },
  ptsAmber: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.ember,
  },
  attrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  attrCell: {
    width: '23%',
    backgroundColor: Colors.surface,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  attrLabel: {
    fontFamily: Fonts.title,
    fontSize: 7,
    color: Colors.muted,
    letterSpacing: 1,
  },
  attrVal: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.text,
  },
  attrBonus: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.ember,
  },
  attrCellOverload: {
    borderColor: '#f97316',
    borderWidth: 1,
  },
  attrValOverload: {
    color: '#f97316',
  },

  // Slots — faixa horizontal abaixo das colunas
  bottomRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  slotBox: {
    flex: 1,
    minWidth: 60,
    minHeight: 40,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: Colors.emberDim,
  },
  slotEmpty: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  slotDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  slotOnCd: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(239,68,68,0.08)',
    opacity: 1,
  },
  slotText: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.text,
    textAlign: 'center',
  },
  slotCdBadge: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.danger,
  },

  // ── Bars panel (centro, flex) ──
  barsPanel: {
    flex: 1,
  },
  barsPanelContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
    justifyContent: 'center',
  },

  // ── Combat panel (direita, largura fixa) ──
  combatPanel: {
    width: 190,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  combatScroll: {
    padding: 10,
    gap: 6,
  },

  combatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  combatBadge: {
    flex: 1,
    backgroundColor: Colors.danger,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  combatBadgeInactive: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  combatBadgeText: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 1,
  },
  combatBadgeTextMuted: {
    color: Colors.muted,
  },
  roundPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 36,
  },
  roundText: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1,
  },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.ember,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.ember,
  },
  turnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.text,
    flex: 1,
  },

  entityList: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 4,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 1,
  },
  entityIcon: {
    fontSize: 10,
    width: 14,
    textAlign: 'center',
  },
  entityInfo: {
    flex: 1,
    gap: 2,
  },
  entityName: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.text,
  },
  entityHpTrack: {
    height: 3,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  entityHpFill: {
    height: '100%',
    borderRadius: 2,
  },
  entityDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  entitySectionLabel: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.danger,
    letterSpacing: 2,
    marginBottom: 2,
    opacity: 0.8,
  },
  entitySectionLabelAlly: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: '#4ade80',
    letterSpacing: 2,
    marginBottom: 2,
    opacity: 0.8,
  },
  enemyName: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.danger,
  },
  bossName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.danger,
  },
  allyList: {
    borderTopColor: '#4ade8044',
  },
  allyThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
  },
  allyName: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: '#4ade80',
  },
  faPanel: {
    gap: 6,
  },
  faPanelInactive: {
    opacity: 0.4,
  },
  faLabel: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  faTitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.text,
  },
  faOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  faCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faVoted: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.tealBright,
    fontStyle: 'italic',
  },
  faInactive: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.faint,
  },

  // ── Middle row (essências / efeitos) ──
  middleRow: {
    flexDirection: 'row',
    height: 68,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  midSection: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  midLabel: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 2,
  },
  midGrid: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  midSlot: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 3,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    gap: 2,
  },
  midSlotEmpty: {
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  midDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  midSlotText: {
    fontFamily: Fonts.body,
    fontSize: 7,
    color: Colors.text,
    textAlign: 'center',
  },
  midDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  initiativeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  combatStatLabel: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  combatStatValue: {
    fontFamily: Fonts.title,
    fontSize: 13,
    color: Colors.text,
  },
  combatStatMuted: {
    fontFamily: Fonts.title,
    fontSize: 13,
    color: Colors.faint,
  },
  desvioMidSection: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  desvioMidDisabled: {
    opacity: 0.35,
  },
  desvioMidLabel: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.danger,
    letterSpacing: 1,
  },
  desvioDotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  desvioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  desvioDotFull: {
    backgroundColor: Colors.danger,
  },
  desvioDotEmpty: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sobrecargaMidSection: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  sobrecargaMidAtiva: {
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  sobrecargaMidLabel: {
    fontFamily: Fonts.title,
    fontSize: 16,
    color: Colors.muted,
  },
  sobrecargaMidLabelAtiva: {
    color: '#f97316',
  },
  sobrecargaMidSub: {
    fontFamily: Fonts.title,
    fontSize: 7,
    color: Colors.muted,
    letterSpacing: 1,
  },
});

const desvioStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 4, padding: 24, width: 320, gap: 14,
  },
  title:   { fontFamily: Fonts.title, fontSize: 16, color: Colors.text, letterSpacing: 3, textAlign: 'center' },
  hint:    { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'center', fontStyle: 'italic' },
  input: {
    height: 56, borderWidth: 1, borderColor: Colors.ember, borderRadius: 3,
    backgroundColor: Colors.surface, fontFamily: Fonts.title, fontSize: 28,
    color: Colors.ember, textAlign: 'center',
  },
  numPadRow:     { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  numPadPreview: { flex: 1, gap: 6, justifyContent: 'center' },
  numPadValue:   { fontFamily: Fonts.title, fontSize: 32, color: Colors.ember },
  previewRow:    { alignItems: 'center' },
  previewText:   { fontFamily: Fonts.title, fontSize: 16, color: Colors.text },
  actions:    { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn:  { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 2 },
  cancelText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.muted, letterSpacing: 2 },
  confirmBtn: { flex: 1, paddingVertical: 10, backgroundColor: Colors.ember, borderRadius: 2, alignItems: 'center' },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.text, letterSpacing: 2 },
});

const detailStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    width: 280,
    overflow: 'hidden',
  },
  colorBar: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: 16,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: Fonts.title,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  typeBadge: {
    fontFamily: Fonts.title,
    fontSize: 10,
    letterSpacing: 1,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  bonusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bonusPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bonusText: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.text,
  },
  skillCount: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.faint,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(163,230,53,0.1)',
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.ember,
    letterSpacing: 1,
  },
  durationBadge: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 1,
  },
});

const desvioResultStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderRadius: 8,
    width: 260,
    overflow: 'hidden',
  },
  bar: { height: 3 },
  body: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  verdict: {
    fontFamily: Fonts.title,
    fontSize: 22,
    letterSpacing: 3,
  },
  rollLine: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.faint,
    letterSpacing: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  rollNum: {
    fontFamily: Fonts.title,
    fontSize: 32,
    color: Colors.text,
  },
  bonusNum: {
    fontFamily: Fonts.title,
    fontSize: 18,
    color: Colors.muted,
  },
  equals: {
    fontFamily: Fonts.title,
    fontSize: 18,
    color: Colors.faint,
  },
  total: {
    fontFamily: Fonts.title,
    fontSize: 32,
  },
  cdLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.faint,
    marginLeft: 4,
  },
  usesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  useDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  useDotFull: { backgroundColor: Colors.danger },
  useDotEmpty: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  usesLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.faint,
    marginLeft: 4,
  },
});

const entityDetailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    width: 300,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portrait: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
  },
  iconText: {
    fontSize: 32,
    width: 52,
    textAlign: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.title,
    fontSize: 16,
    color: Colors.text,
  },
  typeBadge: {
    fontFamily: Fonts.title,
    fontSize: 9,
    letterSpacing: 1,
  },
  hpSection: {
    gap: 4,
  },
  hpBarTrack: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  hpLabel: {
    fontFamily: Fonts.title,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  descSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  notes: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.faint,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  descMuted: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.faint,
    fontStyle: 'italic',
  },
});
