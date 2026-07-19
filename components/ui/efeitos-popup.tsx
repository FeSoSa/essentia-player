import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { GameIcon } from '@/components/ui/game-icon';
import { describeAutoEffect } from '@/lib/rules';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function EfeitosPopup({ visible, onClose }: Props) {
  const player = usePlayerStore((s) => s.player);

  if (!player) return null;

  const effects = player.statusEffects;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>EFEITOS ATIVOS</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {Array.from({ length: Math.max(effects.length, 6) }, (_, i) => {
                const effect = effects[i];
                if (!effect) return <View key={i} style={[styles.slotBox, styles.slotEmpty]} />;
                return (
                  <View key={effect.id} style={styles.slotBox}>
                    <View style={styles.slotHeader}>
                      <GameIcon icon={effect.icon} size={14} color={Colors.muted} />
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>
                          {effect.durationTurns === -1 ? '∞' : `${effect.durationTurns}t`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.name} numberOfLines={2}>{effect.name}</Text>
                    <Text style={styles.desc} numberOfLines={2}>{effect.desc}</Text>
                    {effect.effects && effect.effects.length > 0 && (
                      <Text style={styles.mods} numberOfLines={2}>
                        {effect.effects.map(describeAutoEffect).join(' · ')}
                      </Text>
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
    width: 340,
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
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 8,
    gap: 4,
  },
  slotEmpty: {
    backgroundColor: Colors.surface,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.text,
  },
  durationBadge: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: Fonts.title,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 16,
  },
  mods: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.ember,
    lineHeight: 14,
  },
});
