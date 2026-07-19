import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  compact?: boolean;
}

const DIGIT_KEYS = ['1','2','3','4','5','6','7','8','9'];
const SIDE_KEYS = ['0','←',''];

export function NumPad({ value, onChange, maxLength = 3, compact = false }: Props) {
  function press(key: string) {
    if (key === '←') {
      onChange(value.slice(0, -1));
    } else if (key === '') {
      return;
    } else {
      if (value.length >= maxLength) return;
      onChange(value + key);
    }
  }

  const keySize = compact ? 44 : 64;
  const keyHeight = compact ? 38 : 54;

  return (
    <View style={[styles.pad, compact && styles.padCompact]}>
      <View style={[styles.grid, compact && styles.gridCompact]}>
        {DIGIT_KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, { width: keySize, height: keyHeight }]}
            onPress={() => press(key)}
            activeOpacity={0.6}
          >
            <Text style={[styles.keyText, compact && styles.keyTextCompact]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.sideCol, { width: keySize }]}>
        {SIDE_KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, styles.keySide, { width: keySize, height: keyHeight }, key === '' && styles.keyInvisible, key === '←' && styles.keyBack]}
            onPress={() => press(key)}
            disabled={key === ''}
            activeOpacity={0.6}
          >
            <Text style={[styles.keyText, compact && styles.keyTextCompact, key === '←' && styles.keyBackText]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    width: 280,
  },
  padCompact: {
    width: 200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 210,
  },
  gridCompact: {
    width: 150,
  },
  sideCol: {
    width: 64,
  },
  key: {
    width: 64,
    height: 54,
    marginBottom: 6,
    marginRight: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keySide: {
    marginRight: 0,
  },
  keyInvisible: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyBack: {
    borderColor: Colors.muted,
  },
  keyText: {
    fontFamily: Fonts.title,
    fontSize: 21,
    color: Colors.text,
  },
  keyTextCompact: {
    fontSize: 16,
  },
  keyBackText: {
    fontSize: 18,
    color: Colors.muted,
  },
});
