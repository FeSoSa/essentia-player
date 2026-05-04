import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import type { Slot, SkillTreeEntry } from '@/types';

interface Props {
  slots: Slot[];
  skillMap?: Map<string, SkillTreeEntry>;
  onSlotPress?: (slot: Slot) => void;
}

const SLOT_BORDER_COLORS: Record<string, string> = {
  class: Colors.ember,
  free: Colors.border,
  human_bonus: Colors.gold,
};

export function SlotGrid({ slots, skillMap, onSlotPress }: Props) {
  const classeSlots = slots.filter((s) => s.type === 'class');
  const livreSlots = slots.filter((s) => s.type === 'free');
  const bonusSlots = slots.filter((s) => s.type === 'human_bonus');

  const groups = [
    { label: 'CLASSE', slots: classeSlots },
    { label: 'LIVRES', slots: livreSlots },
    ...(bonusSlots.length > 0 ? [{ label: 'BÔNUS', slots: bonusSlots }] : []),
  ].filter((g) => g.slots.length > 0);

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.row}>
            {group.slots.map((slot) => {
              const filled = !!slot.skillId;
              const hasCooldown = slot.cooldownRemaining > 0;
              const skill = slot.skillId ? skillMap?.get(slot.skillId) : undefined;
              const borderColor = hasCooldown
                ? Colors.danger
                : SLOT_BORDER_COLORS[slot.type] ?? Colors.border;

              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slot, filled && styles.slotFilled, { borderColor }]}
                  onPress={() => onSlotPress?.(slot)}
                  activeOpacity={onSlotPress ? 0.7 : 1}
                  disabled={!onSlotPress}
                >
                  {filled ? (
                    <>
                      <Text style={styles.slotName} numberOfLines={2}>
                        {skill?.nome ?? '...'}
                      </Text>
                      {skill?.custo && (
                        <Text style={styles.slotCost}>{skill.custo}</Text>
                      )}
                      {hasCooldown && (
                        <Text style={styles.cooldownText}>{slot.cooldownRemaining}</Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.slotEmpty}>—</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  group: { gap: 4 },
  groupLabel: { fontFamily: Fonts.title, fontSize: 8, color: Colors.muted, letterSpacing: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: {
    width: 80, height: 56, borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 2, justifyContent: 'center', alignItems: 'center',
    padding: 4, position: 'relative',
  },
  slotFilled: { backgroundColor: Colors.surface, borderStyle: 'solid' },
  slotName: { fontFamily: Fonts.body, fontSize: 11, color: Colors.text, textAlign: 'center' },
  slotCost: { fontFamily: Fonts.title, fontSize: 8, color: Colors.tealBright, marginTop: 2 },
  slotEmpty: { color: Colors.border, fontSize: 18 },
  cooldownText: {
    position: 'absolute', top: 3, right: 5,
    fontFamily: Fonts.title, fontSize: 10, color: Colors.danger,
  },
});
