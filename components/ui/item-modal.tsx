import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { requestItem } from '@/lib/api';
import type { Item } from '@/types';

interface Props {
  visible: boolean;
  item: Item | null;
  mode: 'details' | 'use';
  onClose: () => void;
}

export function ItemModal({ visible, item, mode, onClose }: Props) {
  const playerId = usePlayerStore((s) => s.player?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleRequest() {
    if (!playerId || !item) return;
    setLoading(true);
    setError(null);
    try {
      await requestItem(playerId, item.id);
      setSent(true);
    } catch {
      setError('Não foi possível enviar o pedido.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSent(false);
    setError(null);
    onClose();
  }

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.nome}>{item.name}</Text>
            <Text style={styles.tipo}>{item.type.toUpperCase()}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.descricao}>{item.desc}</Text>
          <Text style={styles.qtd}>Quantidade: {item.qty}</Text>

          {mode === 'use' && !sent && (
            <Text style={styles.warning}>Usar este item requer aprovação do mestre.</Text>
          )}
          {sent && (
            <Text style={styles.sentText}>Pedido enviado! Aguardando aprovação do mestre.</Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{sent ? 'FECHAR' : 'CANCELAR'}</Text>
            </TouchableOpacity>
            {mode === 'use' && !sent && (
              <TouchableOpacity
                style={[styles.confirmBtn, loading && styles.btnDisabled]}
                onPress={handleRequest}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text} size="small" />
                ) : (
                  <Text style={styles.confirmText}>SOLICITAR USO</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 4, padding: 24, width: 360, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nome: { fontFamily: Fonts.title, fontSize: 18, color: Colors.text, flex: 1, letterSpacing: 1 },
  tipo: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2 },
  divider: { height: 1, backgroundColor: Colors.border },
  descricao: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  qtd: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  warning: { fontFamily: Fonts.body, fontSize: 13, color: Colors.gold, fontStyle: 'italic' },
  sentText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.tealBright, fontStyle: 'italic' },
  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 2 },
  cancelText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.muted, letterSpacing: 2 },
  confirmBtn: {
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.ember,
    borderRadius: 2, minWidth: 140, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  confirmText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.text, letterSpacing: 2 },
});
