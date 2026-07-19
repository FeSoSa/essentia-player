import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { getServerIp, setServerIp, clearSession } from '@/lib/storage';
import { usePlayerStore } from '@/store/playerStore';
import { disconnectStomp } from '@/lib/socket';

export function ConfigScreen() {
  const player = usePlayerStore((s) => s.player);
  const clearPlayer = usePlayerStore((s) => s.clearPlayer);
  const [ip, setIp] = useState('');

  useEffect(() => {
    getServerIp().then(setIp);
  }, []);

  async function handleIpBlur() {
    if (ip.trim()) await setServerIp(ip.trim());
  }

  async function handleSair() {
    disconnectStomp();
    await clearSession();
    clearPlayer();
    router.replace('/');
  }

  function handleReload() {
    disconnectStomp();
    router.replace('/game');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CONFIGURAÇÕES</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>IP DO SERVIDOR</Text>
        <TextInput
          style={styles.ipInput}
          value={ip}
          onChangeText={setIp}
          onBlur={handleIpBlur}
          keyboardType="decimal-pad"
          placeholder="192.168.1.100"
          placeholderTextColor={Colors.muted}
        />
        <Text style={styles.ipHint}>Alterações serão usadas na próxima conexão.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CONEXÃO</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={handleReload} activeOpacity={0.8}>
          <Text style={styles.reloadText}>RECARREGAR APP</Text>
        </TouchableOpacity>
        <Text style={styles.ipHint}>Use se algo não estiver atualizando (itens, status, combate…).</Text>
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity style={styles.sairBtn} onPress={handleSair} activeOpacity={0.8}>
        <Text style={styles.sairText}>SAIR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 16 },
  header: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 12, marginBottom: 24 },
  title: { fontFamily: Fonts.title, fontSize: 18, color: Colors.text, letterSpacing: 4 },
  section: { marginBottom: 24 },
  sectionLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 3, marginBottom: 8 },
  codeBox: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 3, padding: 14, alignSelf: 'flex-start', minWidth: 140,
  },
  code: { fontFamily: Fonts.title, fontSize: 24, color: Colors.ember, letterSpacing: 4 },
  charBox: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 3, padding: 14, alignSelf: 'flex-start', minWidth: 200,
  },
  charNome: { fontFamily: Fonts.title, fontSize: 18, color: Colors.text, letterSpacing: 2 },
  charSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 4 },
  ipInput: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 3, padding: 12, color: Colors.text, fontFamily: Fonts.body, fontSize: 15, width: 240,
  },
  ipHint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 6, fontStyle: 'italic' },
  spacer: { flex: 1 },
  reloadBtn: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, alignItems: 'center', borderRadius: 3, width: 240,
  },
  reloadText: { fontFamily: Fonts.title, fontSize: 13, color: Colors.text, letterSpacing: 3 },
  sairBtn: { backgroundColor: Colors.danger, paddingVertical: 14, alignItems: 'center', borderRadius: 3 },
  sairText: { fontFamily: Fonts.title, fontSize: 13, color: Colors.text, letterSpacing: 3 },
});
