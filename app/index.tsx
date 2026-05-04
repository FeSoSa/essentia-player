import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import {
  getPlayerId,
  getServerIp,
  setPlayerId,
  setPlayerCode,
  setServerIp,
} from '@/lib/storage';
import { login } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';

export default function IndexScreen() {
  const insets = useSafeAreaInsets();
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [code, setCode] = useState('');
  const [serverIp, setServerIpState] = useState('192.168.1.100');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const [savedId, savedIp] = await Promise.all([getPlayerId(), getServerIp()]);
      setServerIpState(savedIp);
      if (savedId) {
        router.replace('/game');
      } else {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  async function handleLogin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await setServerIp(serverIp.trim());
      const player = await login(trimmed);
      await Promise.all([setPlayerId(player.id), setPlayerCode(trimmed)]);
      setPlayer(player);
      router.replace('/game');
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        setError(`Servidor inacessível em ${serverIp.trim()}:8080. Verifique o IP.`);
      } else if (err?.response?.status === 401 || err?.response?.status === 404) {
        setError('Código inválido. Verifique o código do personagem.');
      } else {
        setError(`Erro: ${err?.response?.data?.message || err?.message || 'desconhecido'}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={Colors.ember} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }]}
      behavior="padding"
    >
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>ESSENTIA</Text>
          <Text style={styles.sub}>Portal do Jogador</Text>
        </View>

        <View style={styles.divider} />

        {/* Fields — side by side in landscape */}
        <View style={styles.fields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CÓDIGO DO PERSONAGEM</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: VALDRIS-1"
              placeholderTextColor={Colors.faint}
              value={code}
              onChangeText={(v) => { setCode(v); setError(null); }}
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>IP DO SERVIDOR</Text>
            <TextInput
              style={styles.input}
              placeholder="192.168.1.100"
              placeholderTextColor={Colors.faint}
              value={serverIp}
              onChangeText={setServerIpState}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.buttonText}>ENTRAR</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: 440,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 28,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  wordmark: {
    fontFamily: Fonts.title,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 6,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  fields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Fonts.title,
    fontWeight: '600',
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  errorBox: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.danger,
    paddingLeft: 10,
    paddingVertical: 2,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
  },
  button: {
    backgroundColor: Colors.ember,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: Fonts.title,
    fontWeight: '700',
    fontSize: 13,
    color: '#000',
    letterSpacing: 2,
  },
});
