import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','←','0',''];

export function NumPad({ value, onChange, maxLength = 3 }: Props) {
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

  return (
    <View style={styles.pad}>
      {KEYS.map((key, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.key, key === '' && styles.keyInvisible, key === '⌫' && styles.keyBack]}
          onPress={() => press(key)}
          disabled={key === ''}
          activeOpacity={0.6}
        >
          <Text style={[styles.keyText, key === '⌫' && styles.keyBackText]}>{key}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 144,
  },
  key: {
    width: 44,
    height: 38,
    marginBottom: 4,
    marginRight: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 15,
    color: Colors.text,
  },
  keyBackText: {
    fontSize: 13,
    color: Colors.muted,
  },
});
