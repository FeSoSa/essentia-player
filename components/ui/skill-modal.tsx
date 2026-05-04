import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { useSkill } from '@/lib/api';
import type { Slot, SkillTreeEntry } from '@/types';

interface Props {
  visible: boolean;
  slot: Slot | null;
  skill: SkillTreeEntry | null;
  onClose: () => void;
}

export function SkillModal({ visible, slot, skill, onClose }: Props) {
  const playerId = usePlayerStore((s) => s.player?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUse() {
    if (!playerId || !slot) return;
    setLoading(true);
    setError(null);
    try {
      await useSkill(playerId, slot.id);
      onClose();
    } catch {
      setError('Não foi possível usar esta habilidade.');
    } finally {
      setLoading(false);
    }
  }

  if (!slot || !skill) return null;

  const hasCooldown = slot.cooldownRemaining > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.nome}>{skill.nome}</Text>
            <View style={styles.custoBadge}>
              <Text style={styles.custo}>{skill.custo}</Text>
            </View>
          </View>

          {hasCooldown && (
            <Text style={styles.cooldownText}>
              Em cooldown: {slot.cooldownRemaining} turno{slot.cooldownRemaining > 1 ? 's' : ''}
            </Text>
          )}

          <View style={styles.divider} />

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.descricao}>{skill.descricao}</Text>
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>FECHAR</Text>
            </TouchableOpacity>
            {!hasCooldown && (
              <TouchableOpacity
                style={[styles.confirmBtn, loading && styles.btnDisabled]}
                onPress={handleUse}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text} size="small" />
                ) : (
                  <Text style={styles.confirmText}>CONFIRMAR USO</Text>
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
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.ember,
    borderRadius: 4, padding: 24, width: 360, maxHeight: 480, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nome: { fontFamily: Fonts.title, fontSize: 18, color: Colors.text, flex: 1, letterSpacing: 1 },
  custoBadge: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.tealBright,
    borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3,
  },
  custo: { fontFamily: Fonts.title, fontSize: 11, color: Colors.tealBright, letterSpacing: 1 },
  cooldownText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: Colors.border },
  scroll: { maxHeight: 200 },
  descricao: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
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
