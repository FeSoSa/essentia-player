import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { ResourceBar } from '@/components/ui/resource-bar';
import { usePlayerStore } from '@/store/playerStore';

export function GeralScreen() {
  const player = usePlayerStore((s) => s.player)!;

  const equippedSlots = player.slots.filter((s) => s.skillId);
  const emptySlotCount = player.slots.length - equippedSlots.length;
  const skillTree = usePlayerStore((s) => s.skillTree);
  const skillMap = new Map(skillTree.map((s) => [s.skillId, s]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {/* Card 1 — Personagem */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PERSONAGEM</Text>
          <Text style={styles.nome}>{player.char.name}</Text>
          <Text style={styles.sub}>{player.char.race} · {player.char.skillClass}</Text>
          {player.char.subClass && <Text style={styles.sub}>{player.char.subClass}</Text>}
          <Text style={styles.sub}>Nível {player.char.level}</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{player.code}</Text>
          </View>
        </View>

        {/* Card 2 — Estado atual */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ESTADO ATUAL</Text>
          <ResourceBar
            label="HP"
            current={player.hp.current}
            max={player.hp.max}
            color={Colors.tealBright}
          />
          <ResourceBar
            label="FLOW"
            current={player.flow.current}
            max={player.flow.max}
            color="#4a9fd4"
          />
          {player.ether.unlocked && (
            <ResourceBar
              label="ÉTER"
              current={player.ether.current}
              max={player.ether.max}
              color={Colors.gold}
            />
          )}
          <Text style={styles.expLabel}>
            <Text style={styles.expValue}>{player.exp.available}</Text>
            {' '}pontos de exp disponíveis
          </Text>
        </View>

        {/* Card 3 — Slots equipados */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SLOTS EQUIPADOS</Text>
          {equippedSlots.map((s) => {
            const skill = s.skillId ? skillMap.get(s.skillId) : undefined;
            return (
              <View key={s.id} style={styles.slotRow}>
                <View style={[styles.slotDot, { backgroundColor: Colors.ember }]} />
                <Text style={styles.slotNome}>{skill?.nome ?? s.skillId ?? '—'}</Text>
                {s.cooldownRemaining > 0 && (
                  <Text style={styles.slotCooldown}>{s.cooldownRemaining}t</Text>
                )}
              </View>
            );
          })}
          {Array.from({ length: emptySlotCount }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.slotRow}>
              <View style={[styles.slotDot, { backgroundColor: Colors.border }]} />
              <Text style={styles.slotEmpty}>— vazio</Text>
            </View>
          ))}
          {equippedSlots.length === 0 && emptySlotCount === 0 && (
            <Text style={styles.slotEmpty}>Nenhum slot disponível</Text>
          )}
        </View>

        {/* Card 4 — Essências ativas */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ESSÊNCIAS ATIVAS</Text>
          {player.essenciasObtidas.length === 0 ? (
            <Text style={styles.slotEmpty}>Nenhuma essência</Text>
          ) : (
            <View style={styles.essenciasWrap}>
              {player.essenciasObtidas.map((e, i) => (
                <View
                  key={i}
                  style={[styles.essenciaChip, { borderColor: e.color ?? Colors.ember }]}
                >
                  <View style={[styles.essenciaIcon, { backgroundColor: e.color ?? Colors.ember }]} />
                  <Text style={styles.essenciaNome}>{e.nome}</Text>
                  <Text style={styles.essenciaTipo}>{e.tipo}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 14,
    width: '48%',
    gap: 6,
  },
  cardLabel: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  nome: { fontFamily: Fonts.title, fontSize: 20, color: Colors.text, letterSpacing: 1 },
  sub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.emberDim,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  codeText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.ember, letterSpacing: 2 },
  expLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 4 },
  expValue: { fontFamily: Fonts.title, fontSize: 16, color: Colors.gold },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotDot: { width: 6, height: 6, borderRadius: 3 },
  slotNome: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, flex: 1 },
  slotCooldown: { fontFamily: Fonts.title, fontSize: 10, color: Colors.danger },
  slotEmpty: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, fontStyle: 'italic' },
  essenciasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  essenciaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  essenciaIcon: { width: 8, height: 8, borderRadius: 4 },
  essenciaNome: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.text },
  essenciaTipo: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
});
