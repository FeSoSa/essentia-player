import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  label: string;
  current: number;
  max: number;
  color: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

export function ResourceBar({ label, current, max, color, onIncrement, onDecrement }: Props) {
  const pct = max > 0 ? Math.min(Math.max(current / max, 0), 1) : 0;
  const showControls = onIncrement !== undefined || onDecrement !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          <Text style={{ color }}>{current}</Text>
          <Text style={styles.maxVal}>/{max}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.btn, current <= 0 && styles.btnDisabled]}
            onPress={onDecrement}
            disabled={current <= 0}
            activeOpacity={0.7}
          >
            <Text style={styles.btnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { borderColor: color }, current >= max && styles.btnDisabled]}
            onPress={onIncrement}
            disabled={current >= max}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnText, { color }]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  label: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 2,
  },
  value: {
    fontFamily: Fonts.title,
    fontSize: 18,
    color: Colors.text,
  },
  maxVal: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  track: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    width: 32,
    height: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    fontFamily: Fonts.title,
    fontSize: 16,
    color: Colors.muted,
    lineHeight: 20,
  },
});
