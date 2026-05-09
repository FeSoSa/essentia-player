import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { updateAttribute } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { getModifier, formatMod, getAttrCost, initiativeBonus } from '@/lib/rules';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import type { Attributes } from '@/types';

type AtribKey = keyof Attributes;

const ATRIBUTOS: { key: AtribKey; label: string }[] = [
  { key: 'strength', label: 'Força' },
  { key: 'agility', label: 'Agilidade' },
  { key: 'intelligence', label: 'Intelecto' },
  { key: 'resistance', label: 'Resiliência' },
  { key: 'flow', label: 'Fluxo' },
  { key: 'wisdom', label: 'Sabedoria' },
  { key: 'presence', label: 'Presença' },
];

type Pending = { key: AtribKey; label: string; cost: number };

export function AtributosScreen() {
  const player = usePlayerStore((s) => s.player)!;
  const expAvailable = player.exp.available;
  const [pending, setPending] = useState<Pending | null>(null);

  const agiMod = getModifier(player.attributes.agility);
  const initBonus = initiativeBonus(agiMod);
  const pvMax = 20 + player.attributes.resistance * 10;
  const esMax = 20 + player.attributes.flow * 20;

  const handleConfirm = async () => {
    if (!pending) return;
    setPending(null);
    await updateAttribute(player.id, pending.key, 1);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cols}>
        {/* Coluna esquerda — tabela */}
        <View style={styles.tableCol}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 3 }]}>ATRIBUTO</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>VALOR</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>MOD</Text>
            <View style={{ flex: 1 }} />
          </View>

          {ATRIBUTOS.map(({ key, label }, idx) => {
            const val = player.attributes[key] ?? 0;
            const mod = getModifier(val);
            const cost = getAttrCost(val);
            const canAfford = expAvailable >= cost;
            const atCap = val >= 40;
            return (
              <View key={key} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
                <Text style={[styles.cell, { flex: 3 }, styles.atribName]}>{label}</Text>
                <Text style={[styles.cell, { flex: 1 }, styles.atribValue]}>
                  {val}
                </Text>
                <Text style={[styles.cell, { flex: 1 }, styles.atribMod]}>
                  {formatMod(mod)}
                </Text>
                <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                  <TouchableOpacity
                    style={[styles.plusBtn, (!canAfford || atCap) && styles.plusBtnDisabled]}
                    onPress={() => setPending({ key, label, cost })}
                    disabled={!canAfford || atCap}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.plusText, (!canAfford || atCap) && styles.plusTextDisabled]}>
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* DEF — somente leitura */}
          {(() => {
            const val = player.attributes.defense ?? 0;
            const mod = getModifier(val);
            return (
              <View style={[styles.row, ATRIBUTOS.length % 2 === 1 && styles.rowAlt]}>
                <Text style={[styles.cell, { flex: 3 }, styles.atribName]}>Defesa</Text>
                <Text style={[styles.cell, { flex: 1 }, styles.atribValue]}>{val}</Text>
                <Text style={[styles.cell, { flex: 1 }, styles.atribMod]}>{formatMod(mod)}</Text>
                <View style={[styles.cell, { flex: 1 }]} />
              </View>
            );
          })()}
        </View>

        {/* Coluna direita — exp + derivados */}
        <View style={styles.expCol}>
          <Text style={styles.expLabel}>EXP DISPONÍVEL</Text>
          <Text style={styles.expBig}>{expAvailable}</Text>
          <Text style={styles.expSub}>pontos disponíveis</Text>
          {expAvailable <= 0 && (
            <Text style={styles.expNote}>Aguardando o mestre liberar experiência</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.expLabel}>DERIVADOS</Text>
          <View style={styles.derivedRow}>
            <Text style={styles.derivedKey}>PV máx</Text>
            <Text style={styles.derivedVal}>{pvMax}</Text>
          </View>
          <View style={styles.derivedRow}>
            <Text style={styles.derivedKey}>ES máx</Text>
            <Text style={styles.derivedVal}>{esMax}</Text>
          </View>
          <View style={styles.derivedRow}>
            <Text style={styles.derivedKey}>Iniciativa</Text>
            <Text style={styles.derivedVal}>{formatMod(initBonus)}</Text>
          </View>
        </View>
      </View>
      <ConfirmModal
        visible={pending !== null}
        title="DISTRIBUIR PONTO"
        message={
          pending
            ? `Investir 1 ponto em ${pending.label}?\n\nCusto: ${pending.cost} EXP (restará ${expAvailable - pending.cost})`
            : ''
        }
        confirmLabel="CONFIRMAR"
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 14 },
  cols: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  tableCol: { flex: 2, borderWidth: 1, borderColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCell: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt: { backgroundColor: Colors.surface },
  cell: { paddingVertical: 10, paddingHorizontal: 10 },
  atribName: { fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.text },
  atribValue: { fontFamily: Fonts.title, fontSize: 22, color: Colors.ember, textAlign: 'center' },
  atribMod: { fontFamily: Fonts.title, fontSize: 16, color: Colors.muted, textAlign: 'center' },
  plusBtn: {
    width: 30, height: 30, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 3, justifyContent: 'center', alignItems: 'center',
  },
  plusBtnDisabled: { borderColor: Colors.border },
  plusText: { fontFamily: Fonts.title, fontSize: 20, color: Colors.ember, lineHeight: 24 },
  plusTextDisabled: { color: Colors.border },
  expCol: {
    flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 4, padding: 20, alignItems: 'center', gap: 6,
  },
  expLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  expBig: { fontFamily: Fonts.title, fontSize: 64, color: Colors.gold, lineHeight: 72 },
  expSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  expNote: {
    fontFamily: Fonts.body, fontSize: 12, color: Colors.muted,
    textAlign: 'center', fontStyle: 'italic', marginTop: 8,
  },
  divider: { width: '100%', height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  derivedRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 },
  derivedKey: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  derivedVal: { fontFamily: Fonts.title, fontSize: 14, color: Colors.ember },
});
