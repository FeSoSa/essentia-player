import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { updateAttribute } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
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

export function AtributosScreen() {
  const player = usePlayerStore((s) => s.player)!;
  const expAvailable = player.exp.available;

  const handleDistribuir = async (key: AtribKey) => {
    if (expAvailable <= 0) return;
    await updateAttribute(player.id, key, 1);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cols}>
        {/* Coluna esquerda — tabela */}
        <View style={styles.tableCol}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 3 }]}>ATRIBUTO</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>VALOR</Text>
            <View style={{ flex: 1 }} />
          </View>

          {ATRIBUTOS.map(({ key, label }, idx) => (
            <View key={key} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
              <Text style={[styles.cell, { flex: 3 }, styles.atribName]}>{label}</Text>
              <Text style={[styles.cell, { flex: 1 }, styles.atribValue]}>
                {player.attributes[key] ?? 0}
              </Text>
              <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                <TouchableOpacity
                  style={[styles.plusBtn, expAvailable <= 0 && styles.plusBtnDisabled]}
                  onPress={() => handleDistribuir(key)}
                  disabled={expAvailable <= 0}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.plusText, expAvailable <= 0 && styles.plusTextDisabled]}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Coluna direita — exp */}
        <View style={styles.expCol}>
          <Text style={styles.expLabel}>EXP DISPONÍVEL</Text>
          <Text style={styles.expBig}>{expAvailable}</Text>
          <Text style={styles.expSub}>pontos disponíveis</Text>
          {expAvailable <= 0 && (
            <Text style={styles.expNote}>Aguardando o mestre liberar experiência</Text>
          )}
        </View>
      </View>
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
});
