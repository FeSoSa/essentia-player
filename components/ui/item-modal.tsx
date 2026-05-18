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
  const playerId = usePlayerStore((s) => s.player?.id);
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

            {(dmg || isArmor || hasBonus || item.properties) && <View style={styles.divider} />}

            {/* Descrição */}
            {item.desc ? (
              <Text style={styles.descricao}>{item.desc}</Text>
            ) : (
              <Text style={styles.descricaoMuted}>Sem descrição.</Text>
            )}

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
});
