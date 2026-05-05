import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { ResourceBar } from '@/components/ui/resource-bar';
import { EssenciasPopup } from '@/components/ui/essencias-popup';
import { EfeitosPopup } from '@/components/ui/efeitos-popup';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { adjustHp, adjustFlow, adjustEther, voteFastAction } from '@/lib/api';

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
  const b = Math.floor(val / 5);
  return b > 0 ? `+${b}` : b === 0 ? '+0' : `${b}`;
}

function hpColor(current: number, max: number): string {
  if (max <= 0) return Colors.faint;
  const pct = current / max;
  if (pct > 0.66) return '#4ade80'; // verde
  if (pct > 0.33) return '#facc15'; // amarelo
  if (pct > 0.10) return '#f97316'; // laranja
  return Colors.danger;             // vermelho
}

function essenciaColor(type: string): string {
  switch (type) {
    case 'Grande': return Colors.gold;
    case 'Mitica': return '#a855f7';
    case 'Derivada': return Colors.tealBright;
    default: return Colors.ember;
  }
}

export function GeralScreen() {
  const player = usePlayerStore((s) => s.player)!;
  const skillTree = usePlayerStore((s) => s.skillTree);
  const essencias = usePlayerStore((s) => s.essencias);
  const initiative = useGameStore((s) => s.initiative);
  const turnCount = useGameStore((s) => s.turnCount);
  const fastAction = useGameStore((s) => s.fastAction);

  const [essenciasOpen, setEssenciasOpen] = useState(false);
  const [efeitosOpen, setEfeitosOpen] = useState(false);
  const [faVoted, setFaVoted] = useState(false);
  const [faLoading, setFaLoading] = useState(false);

  const enemies = useGameStore((s) => s.enemies);
  const bosses = useGameStore((s) => s.bosses);

  const skillMap = new Map(skillTree.map((s) => [s.skillId, s]));
  const combatActive = enemies.length > 0 || bosses.length > 0 || initiative.length > 0;
  const currentPlayer = initiative.length > 0 ? initiative[turnCount % initiative.length] : null;

  async function handleVote(optionId: string) {
    if (!player.id || faVoted || faLoading) return;
    setFaLoading(true);
    try {
      await voteFastAction(player.id, optionId);
      if (fastAction?.lockOnePerPlayer) setFaVoted(true);
    } catch {
      // silent
    } finally {
      setFaLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>

      {/* ─── LEFT PANEL ─── */}
      <View style={styles.leftPanel}>

        {/* Portrait — edge to edge, sem padding */}
        <View style={styles.portraitWrap}>
          {player.char.portraitUrl ? (
            <Image
              source={{ uri: player.char.portraitUrl }}
              style={styles.portraitImage}
              resizeMode="cover"
            />
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
              {player.char.subClass ? ` · ${player.char.subClass}` : ''}
            </Text>
          </View>
        </View>

        {/* Conteúdo com padding */}
        <View style={styles.leftContent}>
          {/* Level + XP */}
          {(() => {
            const xpPerLevel = 100;
            const xpInLevel = player.exp.total % xpPerLevel;
            const fillPct = (xpInLevel / xpPerLevel) * 100;
            return (
              <>
                <View style={styles.levelRow}>
                  <Text style={styles.levelLabel}>NÍVEL {player.char.level}</Text>
                  <Text style={styles.xpText}>{xpInLevel} / {xpPerLevel} XP</Text>
                </View>
                <View style={styles.xpTrack}>
                  <View style={[styles.xpFill, { width: `${fillPct}%` as any }]} />
                </View>
                {player.exp.available > 0 ? (
                  <Text style={styles.ptsAmber}>{player.exp.available} pts disponíveis</Text>
                ) : (
                  <Text style={styles.ptsMuted}>0 pts disponíveis</Text>
                )}
              </>
            );
          })()}

          {/* Attributes grid */}
          <View style={styles.attrGrid}>
            {ATTR_ORDER.map((key) => {
              const val = (player.attributes as any)[key] as number;
              return (
                <View key={key} style={styles.attrCell}>
                  <Text style={styles.attrLabel}>{ATTR_LABELS[key]}</Text>
                  <Text style={styles.attrVal}>{val}</Text>
                  <Text style={styles.attrBonus}>{bonus(val)}</Text>
                </View>
              );
            })}
          </View>

        </View>
      </View>

      {/* ─── BARS PANEL ─── */}
      <View style={styles.barsPanel}>
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
      </View>

      {/* ─── COMBAT PANEL ─── */}
      <View style={styles.combatPanel}>
        <View style={combatActive ? styles.combatBadge : styles.combatBadgeInactive}>
          <Text style={[styles.combatBadgeText, !combatActive && styles.combatBadgeTextMuted]}>
            {combatActive ? 'COMBATE ATIVO' : 'SEM COMBATE'}
          </Text>
        </View>

        {/* Inimigos e bosses ativos */}
        {(enemies.length > 0 || bosses.length > 0) && (
          <View style={styles.entityList}>
            {enemies.map((e) => (
              <View key={e.instanceId} style={styles.entityRow}>
                <Text style={styles.entityIcon}>{e.icon || '⚔'}</Text>
                <Text style={styles.entityName} numberOfLines={1}>{e.name}</Text>
                <View style={[styles.entityHpDot, { backgroundColor: hpColor(e.hpCurrent, e.hpMax) }]} />
              </View>
            ))}
            {bosses.map((b) => {
              const phase = b.phases[b.currentPhase];
              return (
                <View key={b.instanceId} style={styles.entityRow}>
                  <Text style={styles.entityIcon}>{b.icon || '★'}</Text>
                  <Text style={styles.entityName} numberOfLines={1}>{b.name}</Text>
                  <View style={[styles.entityHpDot, { backgroundColor: hpColor(b.hpCurrent, phase?.hpMax ?? 1) }]} />
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.roundPill}>
          <Text style={styles.roundText}>
            {combatActive ? `ROUND ${turnCount + 1}` : 'ROUND —'}
          </Text>
        </View>
        <Text style={[styles.turnText, !combatActive && styles.turnTextMuted]}>
          {combatActive && currentPlayer ? `${currentPlayer.name} está jogando` : '—'}
        </Text>

        <View style={[styles.faPanel, !fastAction?.active && styles.faPanelInactive]}>
          <Text style={styles.faLabel}>AÇÃO RÁPIDA</Text>
          {fastAction?.active ? (
            <>
              <Text style={styles.faTitle}>{fastAction.title}</Text>
              {faVoted ? (
                <Text style={styles.faVoted}>Voto registrado</Text>
              ) : (
                <View style={styles.faOptions}>
                  {fastAction.options.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.faCircle, { backgroundColor: opt.color }]}
                      onPress={() => handleVote(opt.id)}
                      disabled={faLoading}
                      activeOpacity={0.75}
                    >
                      {faLoading && <ActivityIndicator color="#fff" size="small" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.faInactive}>—</Text>
          )}
        </View>
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
            <TouchableOpacity style={styles.midSection} onPress={() => setEssenciasOpen(true)} activeOpacity={0.85}>
              <Text style={styles.midLabel}>ESSÊNCIAS</Text>
              <View style={styles.midGrid}>
                {Array.from({ length: Math.max(obtidas.length, 5) }, (_, i) => {
                  const o = obtidas[i];
                  if (!o) return <View key={i} style={[styles.midSlot, styles.midSlotEmpty]} />;
                  const color = essenciaColor(o.catalog?.type ?? '');
                  return (
                    <View key={o.essenciaId} style={styles.midSlot}>
                      <View style={[styles.midDot, { backgroundColor: color }]} />
                      <Text style={styles.midSlotText} numberOfLines={1}>{o.catalog?.name ?? '?'}</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
            <View style={styles.midDivider} />
            <TouchableOpacity style={styles.midSection} onPress={() => setEfeitosOpen(true)} activeOpacity={0.85}>
              <Text style={styles.midLabel}>EFEITOS</Text>
              <View style={styles.midGrid}>
                {Array.from({ length: Math.max(effects.length, 5) }, (_, i) => {
                  const ef = effects[i];
                  if (!ef) return <View key={i} style={[styles.midSlot, styles.midSlotEmpty]} />;
                  return (
                    <View key={ef.id} style={styles.midSlot}>
                      {ef.icon ? <Text style={styles.midIcon}>{ef.icon}</Text> : null}
                      <Text style={styles.midSlotText} numberOfLines={1}>{ef.name}</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ─── SLOT ROW ─── */}
      {(() => {
        const classSlots = player.slots.filter((s) => s.type === 'class');
        const bonusSlots = player.slots.filter((s) => s.type !== 'class');
        const classCount = player.char.slotsClass;
        const bonusCount = 10 - classCount;
        const classGrid = Array.from({ length: classCount }, (_, i) => classSlots[i] ?? null);
        const bonusGrid = Array.from({ length: bonusCount }, (_, i) => bonusSlots[i] ?? null);

        function renderSlot(slot: typeof player.slots[0] | null, key: string) {
          if (!slot) return <View key={key} style={[styles.slotBox, styles.slotEmpty]} />;
          const skill = slot.skillId ? skillMap.get(slot.skillId) : undefined;
          const onCd = slot.cooldownRemaining > 0;
          return (
            <View key={key} style={[styles.slotBox, onCd && styles.slotOnCd, !skill && styles.slotEmpty]}>
              <Text style={styles.slotText} numberOfLines={1}>{skill ? skill.nome : ''}</Text>
              {onCd && <Text style={styles.slotCdBadge}>{slot.cooldownRemaining}t</Text>}
            </View>
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

      <EssenciasPopup visible={essenciasOpen} onClose={() => setEssenciasOpen(false)} />
      <EfeitosPopup visible={efeitosOpen} onClose={() => setEfeitosOpen(false)} />
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
    height: 110,
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
  leftContent: {
    flex: 1,
    padding: 10,
    gap: 5,
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
    gap: 3,
  },
  attrCell: {
    width: '23%',
    backgroundColor: Colors.surface,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  attrLabel: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1,
  },
  attrVal: {
    fontFamily: Fonts.title,
    fontSize: 13,
    color: Colors.text,
  },
  attrBonus: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.ember,
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
    height: 40,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
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
    padding: 14,
    gap: 4,
    justifyContent: 'center',
  },

  // ── Combat panel (direita, largura fixa) ──
  combatPanel: {
    width: 190,
    padding: 10,
    gap: 6,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },

  combatBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  combatBadgeInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  combatBadgeText: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 1,
  },
  combatBadgeTextMuted: {
    color: Colors.muted,
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
  },
  entityIcon: {
    fontSize: 10,
    width: 14,
    textAlign: 'center',
  },
  entityName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.text,
  },
  entityHpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roundPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roundText: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1,
  },
  turnText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  turnTextMuted: {
    color: Colors.faint,
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
  midIcon: {
    fontSize: 10,
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
});
