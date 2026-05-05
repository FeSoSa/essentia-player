import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function colorForType(type: string): string {
  switch (type) {
    case 'Grande': return Colors.gold;
    case 'Mitica': return '#a855f7';
    case 'Derivada': return Colors.tealBright;
    default: return Colors.ember;
  }
}

export function EssenciasPopup({ visible, onClose }: Props) {
  const player = usePlayerStore((s) => s.player);
  const essencias = usePlayerStore((s) => s.essencias);

  if (!player) return null;

  const obtained = player.essenciasObtidas.map((o) => ({
    ...o,
    catalog: essencias.find((e) => e.id === o.essenciaId),
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>ESSÊNCIAS OBTIDAS</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {Array.from({ length: Math.max(obtained.length, 6) }, (_, i) => {
                const o = obtained[i];
                if (!o) return <View key={i} style={[styles.slotBox, styles.slotEmpty]} />;
                const color = colorForType(o.catalog?.type ?? '');
                return (
                  <View key={o.essenciaId} style={styles.slotBox}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={styles.name} numberOfLines={2}>{o.catalog?.name ?? o.essenciaId}</Text>
                    <Text style={styles.type}>{o.catalog?.type ?? '—'}</Text>
                    {o.attributeBonusActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>BÔNUS</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 20,
    width: 320,
    maxHeight: '70%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 2,
  },
  close: {
    fontFamily: Fonts.title,
    fontSize: 14,
    color: Colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotBox: {
    width: '47%',
    minHeight: 70,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 4,
    padding: 8,
    gap: 3,
    justifyContent: 'center',
  },
  slotEmpty: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.text,
  },
  type: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },
  activeBadge: {
    backgroundColor: Colors.emberDim,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: Fonts.title,
    fontSize: 8,
    color: Colors.ember,
    letterSpacing: 1,
  },
});
