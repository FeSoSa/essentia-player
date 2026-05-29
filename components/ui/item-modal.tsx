'use client';
import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView,
} from 'react-native';
import { Colors, Fonts, RARITY_COLORS, RARITY_LABELS, type Rarity } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { requestItem } from '@/lib/api';
import { weaponDamageFormula } from '@/lib/rules';
import type { Item } from '@/types';

const ATTR_ABBREV: Record<string, string> = {
  strength: 'FOR', agility: 'AGI', intelligence: 'INT',
  resistance: 'RES', flow: 'FLX', wisdom: 'SAB', presence: 'PRE', defense: 'DEF',
};

const WEAPON_TYPE_LABEL: Record<string, string> = {
  curta: 'Arma curta', média: 'Arma média', pesada: 'Arma pesada',
  ranged: 'Ranged', unarmed: 'Desarmado',
  espadas: 'Espadas', rapieiras: 'Rapieiras', alabardas: 'Alabardas',
  lancas: 'Lanças', 'machados-de-guerra': 'Machados de guerra', martelos: 'Martelos',
  'armas-colossais': 'Armas colossais', adagas: 'Adagas', garras: 'Garras',
  'a-distancia': 'À distância', 'luvas-manoplas': 'Luvas & manoplas', escudos: 'Escudos',
};

const ARMOR_WEIGHT_LABEL: Record<string, string> = {
  leve: 'Leve · Desvio sem bônus',
  média: 'Média · Desvio com desvantagem',
  pesada: 'Pesada · Sem desvio',
};

const SLOT_LABEL: Record<string, string> = {
  mainHand: 'Mão principal', offHand: 'Offhand', armor: 'Armadura',
  amulet: 'Amuleto', ring: 'Anel', utility: 'Utilitário',
};

interface Props {
  visible: boolean;
  item: Item | null;
  mode: 'details' | 'use';
  onClose: () => void;
}

export function ItemModal({ visible, item, mode, onClose }: Props) {
  const player = usePlayerStore((s) => s.player);
  const playerId = player?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleRequest() {
    if (!playerId || !item) return;
    setLoading(true);
    setError(null);
    try {
      await requestItem(playerId, item.id);
      setSent(true);
    } catch {
      setError('Não foi possível enviar o pedido.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSent(false);
    setError(null);
    onClose();
  }

  if (!item) return null;

  const rColor = item.rarity ? (RARITY_COLORS[item.rarity as Rarity] ?? Colors.text) : Colors.text;
  const isWeapon = item.type === 'weapon';
  const isArmor  = item.type === 'armor';
  const hasBonus = item.attributeBonus && Object.keys(item.attributeBonus).length > 0;

  const effectiveAttrs = player?.effectiveAttributes ?? player?.attributes;
  const reqsMet = !item.requirements || (() => {
    const req = item.requirements;
    if (req.level && (player?.char.level ?? 0) < req.level) return false;
    if (req.attributes && effectiveAttrs) {
      const ABBREV_TO_KEY: Record<string, keyof typeof effectiveAttrs> = {
        FOR: 'strength', AGI: 'agility', INT: 'intelligence',
        RES: 'resistance', FLX: 'flow', SAB: 'wisdom', PRE: 'presence', DEF: 'defense',
        strength: 'strength', agility: 'agility', intelligence: 'intelligence',
        resistance: 'resistance', flow: 'flow', wisdom: 'wisdom', presence: 'presence', defense: 'defense',
      };
      for (const [attr, needed] of Object.entries(req.attributes)) {
        const key = ABBREV_TO_KEY[attr] ?? ABBREV_TO_KEY[attr.toUpperCase()];
        const have = key ? (effectiveAttrs[key] ?? 0) : 0;
        if (have < needed) return false;
      }
    }
    return true;
  })();

  const dmg      = isWeapon && (item.damageBase || item.damageAttribute)
    ? weaponDamageFormula({ damageBase: item.damageBase, damageAttribute: item.damageAttribute, equilibrio: item.equilibrio })
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nome, { color: rColor }]}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.tipo}>{item.type.toUpperCase()}</Text>
                {item.rarity && (
                  <Text style={[styles.raridade, { color: rColor }]}>
                    {RARITY_LABELS[item.rarity as Rarity] ?? item.rarity}
                  </Text>
                )}
                {item.equipSlot && (
                  <Text style={styles.slotBadge}>{SLOT_LABEL[item.equipSlot] ?? item.equipSlot}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>

            {/* Dano — arma */}
            {dmg && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>DANO</Text>
                <Text style={styles.statValue}>{dmg}</Text>
              </View>
            )}

            {/* Tipo de arma */}
            {isWeapon && item.weaponType && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>TIPO</Text>
                <Text style={styles.statValue}>{WEAPON_TYPE_LABEL[item.weaponType] ?? item.weaponType}</Text>
              </View>
            )}

            {/* 2 mãos */}
            {item.twoHanded && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>EMPUNHADURA</Text>
                <Text style={styles.statValue}>Duas mãos</Text>
              </View>
            )}

            {/* Redução de dano — armadura */}
            {isArmor && item.damageReduction != null && item.damageReduction > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>REDUÇÃO DE DANO</Text>
                <Text style={styles.statValue}>−{item.damageReduction}</Text>
              </View>
            )}

            {/* Peso da armadura */}
            {isArmor && item.armorWeight && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>PESO</Text>
                <Text style={styles.statValue}>{ARMOR_WEIGHT_LABEL[item.armorWeight] ?? item.armorWeight}</Text>
              </View>
            )}

            {/* Bônus de atributo */}
            {hasBonus && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>BÔNUS</Text>
                <View style={styles.bonusList}>
                  {Object.entries(item.attributeBonus!).map(([attr, val]) => (
                    <View key={attr} style={styles.bonusPill}>
                      <Text style={styles.bonusPillText}>
                        {ATTR_ABBREV[attr] ?? attr.toUpperCase()} {val > 0 ? `+${val}` : val}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Propriedades */}
            {item.properties && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>PROPRIEDADES</Text>
                <Text style={styles.statValue}>{item.properties}</Text>
              </View>
            )}

            {/* Pré-requisitos */}
            {item.requirements && (
              <View style={[styles.statRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.statLabel}>REQUER</Text>
                <View style={styles.bonusList}>
                  {item.requirements.level != null && (
                    <View style={[styles.bonusPill, { backgroundColor: (!player || player.char.level < item.requirements.level) ? Colors.danger + '33' : Colors.surface }]}>
                      <Text style={[styles.bonusPillText, { color: (!player || player.char.level < item.requirements.level) ? Colors.danger : Colors.muted }]}>
                        Nível {item.requirements.level}
                      </Text>
                    </View>
                  )}
                  {item.requirements.attributes && Object.entries(item.requirements.attributes).map(([attr, val]) => {
                    const ABBREV_TO_KEY: Record<string, keyof NonNullable<typeof effectiveAttrs>> = {
                      FOR: 'strength', AGI: 'agility', INT: 'intelligence',
                      RES: 'resistance', FLX: 'flow', SAB: 'wisdom', PRE: 'presence', DEF: 'defense',
                      strength: 'strength', agility: 'agility', intelligence: 'intelligence',
                      resistance: 'resistance', flow: 'flow', wisdom: 'wisdom', presence: 'presence', defense: 'defense',
                    };
                    const key = ABBREV_TO_KEY[attr] ?? ABBREV_TO_KEY[attr.toUpperCase()];
                    const have = key ? ((effectiveAttrs?.[key] ?? 0) as number) : 0;
                    const unmet = have < val;
                    return (
                      <View key={attr} style={[styles.bonusPill, { backgroundColor: unmet ? Colors.danger + '33' : Colors.surface }]}>
                        <Text style={[styles.bonusPillText, { color: unmet ? Colors.danger : Colors.muted }]}>
                          {ATTR_ABBREV[attr] ?? attr.toUpperCase()} {val}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {(dmg || isArmor || hasBonus || item.properties || item.requirements) && <View style={styles.divider} />}

            {/* Descrição */}
            {item.desc ? (
              <Text style={styles.descricao}>{item.desc}</Text>
            ) : (
              <Text style={styles.descricaoMuted}>Sem descrição.</Text>
            )}

            {/* Efeito ao usar */}
            {item.onUseEffect && (() => {
              const e = item.onUseEffect!;
              const effectColor = e.color ?? '#a855f7';
              const regenHp = e.effects?.find(x => x.trigger === 'on_turn_start' && x.type === 'heal_hp')?.value;
              const regenFlow = e.effects?.find(x => x.trigger === 'on_turn_start' && x.type === 'heal_flow')?.value;
              const hasEffectBonus = e.attributeBonus && Object.keys(e.attributeBonus).length > 0;
              const hasExpire = !!e.onExpire;
              return (
                <View style={[styles.effectBox, { borderColor: effectColor + '55' }]}>
                  <View style={styles.effectHeader}>
                    <View style={[styles.effectDot, { backgroundColor: effectColor }]} />
                    <Text style={[styles.effectTitle, { color: effectColor }]}>
                      {e.name || 'Efeito ao usar'}
                    </Text>
                    <Text style={[styles.effectDuration, { color: effectColor + 'aa' }]}>
                      {e.durationTurns === -1 ? '∞' : `${e.durationTurns}t`}
                    </Text>
                  </View>
                  {e.desc ? <Text style={styles.effectDesc}>{e.desc}</Text> : null}
                  {(e.instantHealHp || e.instantHealFlow || regenHp || regenFlow || hasEffectBonus) && (
                    <View style={styles.effectStats}>
                      {e.instantHealHp != null && e.instantHealHp > 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>+{e.instantHealHp} HP</Text>
                        </View>
                      )}
                      {e.instantHealFlow != null && e.instantHealFlow > 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>+{e.instantHealFlow} Flow</Text>
                        </View>
                      )}
                      {regenHp != null && regenHp > 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>+{regenHp} HP/turno</Text>
                        </View>
                      )}
                      {regenFlow != null && regenFlow > 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>+{regenFlow} Flow/turno</Text>
                        </View>
                      )}
                      {hasEffectBonus && Object.entries(e.attributeBonus!).map(([attr, val]) => (
                        <View key={attr} style={styles.effectPill}>
                          <Text style={styles.effectPillText}>
                            {ATTR_ABBREV[attr] ?? attr.toUpperCase()} {val > 0 ? `+${val}` : val}
                          </Text>
                        </View>
                      ))}
                      {e.hitBonus != null && e.hitBonus !== 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>Acerto {e.hitBonus > 0 ? `+${e.hitBonus}` : e.hitBonus}</Text>
                        </View>
                      )}
                      {e.attackBonus != null && e.attackBonus !== 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>Ataque {e.attackBonus > 0 ? `+${e.attackBonus}` : e.attackBonus}</Text>
                        </View>
                      )}
                      {e.damageBonus != null && e.damageBonus !== 0 && (
                        <View style={styles.effectPill}>
                          <Text style={styles.effectPillText}>Dano {e.damageBonus > 0 ? `+${e.damageBonus}` : e.damageBonus}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {hasExpire && e.onExpire && (
                    <View style={[styles.effectExpire, { borderColor: (e.onExpire.color ?? '#71717a') + '66' }]}>
                      <Text style={[styles.effectExpireLabel, { color: e.onExpire.color ?? '#71717a' }]}>
                        Ao expirar: {e.onExpire.name || 'efeito'}
                        {e.onExpire.durationTurns === -1 ? ' · ∞' : ` · ${e.onExpire.durationTurns}t`}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            <Text style={styles.qtd}>Quantidade: {item.qty}</Text>

          </ScrollView>

          {mode === 'use' && !sent && (
            <Text style={styles.warning}>Usar este item requer aprovação do mestre.</Text>
          )}
          {sent && (
            <Text style={styles.sentText}>Pedido enviado! Aguardando aprovação do mestre.</Text>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{sent ? 'FECHAR' : 'CANCELAR'}</Text>
            </TouchableOpacity>
            {mode === 'use' && !sent && (
              <TouchableOpacity
                style={[styles.confirmBtn, loading && styles.btnDisabled]}
                onPress={handleRequest}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading
                  ? <ActivityIndicator color={Colors.text} size="small" />
                  : <Text style={styles.confirmText}>SOLICITAR USO</Text>}
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
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, padding: 20, width: 360, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  nome: { fontFamily: Fonts.title, fontSize: 18, letterSpacing: 0.5, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tipo: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  raridade: { fontFamily: Fonts.title, fontSize: 9, letterSpacing: 1 },
  slotBadge: { fontFamily: Fonts.title, fontSize: 9, color: Colors.faint, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: Colors.border },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  statLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  statValue: { fontFamily: Fonts.title, fontSize: 13, color: Colors.text, flexShrink: 1, textAlign: 'right' },
  bonusList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  bonusPill: {
    backgroundColor: Colors.surface, borderRadius: 3,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  bonusPillText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.ember },
  descricao: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 19, paddingVertical: 4 },
  descricaoMuted: { fontFamily: Fonts.body, fontSize: 13, color: Colors.faint, fontStyle: 'italic', paddingVertical: 4 },
  qtd: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  warning: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gold, fontStyle: 'italic' },
  sentText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.tealBright, fontStyle: 'italic' },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 2 },
  cancelText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.muted, letterSpacing: 2 },
  confirmBtn: {
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.ember,
    borderRadius: 2, minWidth: 140, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  confirmText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.text, letterSpacing: 2 },
  effectBox: {
    marginTop: 8, borderWidth: 1, borderRadius: 6,
    padding: 10, gap: 6,
  },
  effectHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  effectDot: { width: 6, height: 6, borderRadius: 3 },
  effectTitle: { fontFamily: Fonts.title, fontSize: 11, letterSpacing: 1, flex: 1 },
  effectDuration: { fontFamily: Fonts.title, fontSize: 10 },
  effectDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 17 },
  effectStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  effectPill: { backgroundColor: Colors.surface, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  effectPillText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.text },
  effectExpire: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  effectExpireLabel: { fontFamily: Fonts.title, fontSize: 9, letterSpacing: 1 },
});
