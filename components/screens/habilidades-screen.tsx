import { useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { SlotGrid } from '@/components/ui/slot-grid';
import { SkillCard } from '@/components/ui/skill-card';
import { SkillModal } from '@/components/ui/skill-modal';
import { SkillTreeModal } from '@/components/ui/skill-tree-modal';
import { usePlayerStore } from '@/store/playerStore';
import type { Slot, SkillTreeEntry } from '@/types';

export function HabilidadesScreen() {
  const player = usePlayerStore((s) => s.player)!;
  const skillTree = usePlayerStore((s) => s.skillTree);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillTreeEntry | null>(null);
  const [treeVisible, setTreeVisible] = useState(false);

  const skillMap = new Map(skillTree.map((s) => [s.skillId, s]));

  function handleSlotPress(slot: Slot) {
    if (!slot.skillId) return;
    const skill = skillMap.get(slot.skillId);
    if (!skill) return;
    setSelectedSlot(slot);
    setSelectedSkill(skill);
  }

  function handleSkillPress(skill: SkillTreeEntry) {
    const slot = player.slots.find((s) => s.skillId === skill.skillId);
    if (!slot) return;
    setSelectedSlot(slot);
    setSelectedSkill(skill);
  }

  const cooldownMap = new Map(
    player.slots
      .filter((s) => s.skillId && s.cooldownRemaining > 0)
      .map((s) => [s.skillId!, s.cooldownRemaining])
  );
  const equippedIds = new Set(player.slots.filter((s) => s.skillId).map((s) => s.skillId!));

  const byCategory = skillTree.reduce<Record<string, SkillTreeEntry[]>>((acc, s) => {
    const cat = s.categoria ?? 'outro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const sections = Object.entries(byCategory).map(([title, data]) => ({ title: title.toUpperCase(), data }));

  return (
    <View style={styles.container}>
      <View style={styles.slotsSection}>
        <Text style={styles.sectionLabel}>HABILIDADES EQUIPADAS</Text>
        <SlotGrid slots={player.slots} skillMap={skillMap} onSlotPress={handleSlotPress} />
      </View>

      <View style={styles.divider} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.skillId}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <TouchableOpacity style={styles.treeBtn} onPress={() => setTreeVisible(true)} activeOpacity={0.7}>
            <Text style={styles.treeBtnText}>Ver árvore de habilidades</Text>
          </TouchableOpacity>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <View style={styles.sectionLine} />
          </View>
        )}
        renderItem={({ item }) => (
          <SkillCard
            skill={item}
            equipped={equippedIds.has(item.skillId)}
            cooldown={cooldownMap.get(item.skillId) ?? 0}
            onPress={
              item.unlocked && !cooldownMap.has(item.skillId) && equippedIds.has(item.skillId)
                ? () => handleSkillPress(item)
                : undefined
            }
          />
        )}
      />

      <SkillModal
        visible={!!(selectedSlot && selectedSkill)}
        slot={selectedSlot}
        skill={selectedSkill}
        onClose={() => { setSelectedSlot(null); setSelectedSkill(null); }}
      />

      <SkillTreeModal
        visible={treeVisible}
        skillTree={skillTree}
        slots={player.slots}
        onClose={() => setTreeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  slotsSection: { padding: 12, paddingBottom: 8 },
  sectionLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 2, marginBottom: 8 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 12 },
  listContent: { padding: 12, paddingTop: 8 },
  treeBtn: {
    borderWidth: 1, borderColor: Colors.ember, borderRadius: 3,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-end', marginBottom: 12,
  },
  treeBtnText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.ember, letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 8 },
  sectionHeaderText: { fontFamily: Fonts.title, fontSize: 10, color: Colors.ember, letterSpacing: 3 },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.border },
});
