import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { unlockSkill } from '@/lib/api';
import type { SkillTreeEntry, Slot } from '@/types';

interface Props {
  visible: boolean;
  skillTree: SkillTreeEntry[];
  slots: Slot[];
  onClose: () => void;
}

export function SkillTreeModal({ visible, skillTree, slots, onClose }: Props) {
  const playerId = usePlayerStore((s) => s.player?.id);
  const expAvailable = usePlayerStore((s) => s.player?.exp.available ?? 0);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cooldownIds = new Set(
    slots.filter((s) => s.skillId && s.cooldownRemaining > 0).map((s) => s.skillId!)
  );

  // Group by categoria
  const byCategory = skillTree.reduce<Record<string, SkillTreeEntry[]>>((acc, s) => {
    const cat = s.categoria ?? 'outro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});
  const categories = Object.keys(byCategory);
  const [activeCategory, setActiveCategory] = useState<string>(() => categories[0] ?? '');

  async function handleUnlock(skill: SkillTreeEntry) {
    if (!playerId) return;
    setUnlocking(skill.skillId);
    setError(null);
    try {
      await unlockSkill(playerId, skill.skillId);
    } catch {
      setError(`Não foi possível desbloquear ${skill.nome}.`);
    } finally {
      setUnlocking(null);
    }
  }

  function getStatus(skill: SkillTreeEntry) {
    if (!skill.unlocked) return 'locked';
    if (skill.equipped) return 'equipped';
    if (cooldownIds.has(skill.skillId)) return 'cooldown';
    return 'available';
  }

  const skills = byCategory[activeCategory] ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>ÁRVORE DE HABILIDADES</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {expAvailable > 0 && (
            <Text style={styles.expNote}>{expAvailable} pontos disponíveis para desbloquear</Text>
          )}

          <View style={styles.tabs}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.tab, activeCategory === cat && styles.tabActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {skills.map((skill) => {
              const status = getStatus(skill);
              return (
                <View key={skill.skillId} style={[styles.skillRow, status === 'locked' && styles.skillRowLocked]}>
                  <View style={styles.skillInfo}>
                    <Text style={[styles.skillNome, status === 'locked' && styles.textLocked]}>
                      {skill.nome}
                    </Text>
                    <Text style={styles.skillCusto}>{skill.custo}</Text>
                    {status === 'locked' && skill.requirementsText && (
                      <Text style={styles.reqText}>{skill.requirementsText}</Text>
                    )}
                    {status === 'equipped' && <Text style={styles.statusEquipped}>EQUIPADA</Text>}
                    {status === 'cooldown' && <Text style={styles.statusCooldown}>EM COOLDOWN</Text>}
                  </View>
                  {status === 'locked' && expAvailable > 0 && (
                    <TouchableOpacity
                      style={[styles.unlockBtn, unlocking === skill.skillId && styles.btnDisabled]}
                      onPress={() => handleUnlock(skill)}
                      disabled={unlocking === skill.skillId}
                      activeOpacity={0.7}
                    >
                      {unlocking === skill.skillId ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <Text style={styles.unlockText}>DESBLOQUEAR</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 4, padding: 24, width: 480, maxHeight: '80%', gap: 12,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: Fonts.title, fontSize: 16, color: Colors.text, letterSpacing: 3 },
  closeBtn: { fontFamily: Fonts.title, fontSize: 16, color: Colors.muted, padding: 4 },
  expNote: { fontFamily: Fonts.body, fontSize: 13, color: Colors.tealBright, fontStyle: 'italic' },
  tabs: { flexDirection: 'row', gap: 4, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 3 },
  tabActive: { backgroundColor: Colors.emberDim },
  tabText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.muted, letterSpacing: 1 },
  tabTextActive: { color: Colors.ember },
  list: { flex: 1 },
  skillRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12,
  },
  skillRowLocked: { opacity: 0.6 },
  skillInfo: { flex: 1, gap: 2 },
  skillNome: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.text },
  textLocked: { color: Colors.muted },
  skillCusto: { fontFamily: Fonts.title, fontSize: 10, color: Colors.tealBright, letterSpacing: 1 },
  reqText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.danger, fontStyle: 'italic' },
  statusEquipped: { fontFamily: Fonts.title, fontSize: 9, color: Colors.ember, letterSpacing: 2 },
  statusCooldown: { fontFamily: Fonts.title, fontSize: 9, color: Colors.danger, letterSpacing: 2 },
  unlockBtn: {
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.emberDim,
    borderWidth: 1, borderColor: Colors.ember, borderRadius: 3, alignItems: 'center', minWidth: 110,
  },
  btnDisabled: { opacity: 0.6 },
  unlockText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.ember, letterSpacing: 1 },
  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
});
