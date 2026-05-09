import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { unlockSkill, chooseMasteryPath, getSkillTree } from '@/lib/api';
import type { SkillTreeEntry, Slot } from '@/types';

const MASTERY_USES = [0, 3, 8, 16, 28];

const MASTERY_BONUSES: Record<number, { aumento: string; otimizacao: string }> = {
  1: { aumento: '+1 dano / +2 ES',   otimizacao: '-3 ES custo' },
  2: { aumento: '+2 dano / +3 ES',   otimizacao: '-5 ES custo' },
  3: { aumento: '+1d4 dano / +3 ES', otimizacao: '-1 turno recarga' },
  4: { aumento: '+2 dano / +4 ES',   otimizacao: '-8 ES custo' },
  5: { aumento: '+1d6 dano / +4 ES', otimizacao: '2x por turno' },
};

function MaestrySection({
  maestria, playerId, skillId,
}: {
  maestria: NonNullable<SkillTreeEntry['maestria']>;
  playerId: string;
  skillId: string;
}) {
  const { level, totalUses, nextLevelUses, choices } = maestria;
  const [choosing, setChoosing] = useState<'aumento' | 'otimizacao' | null>(null);

  const readyToLevelUp = level < 5 && totalUses >= nextLevelUses;
  const nextBonus = MASTERY_BONUSES[level + 1];
  const fillPct = level < 5 ? Math.min((totalUses / nextLevelUses) * 100, 100) : 100;

  async function handleChoice(choice: 'aumento' | 'otimizacao') {
    setChoosing(choice);
    try {
      await chooseMasteryPath(playerId, skillId, choice);
    } finally {
      setChoosing(null);
    }
  }

  return (
    <View style={ms.wrap}>
      <View style={ms.badgeRow}>
        <View style={ms.badge}><Text style={ms.badgeText}>M{level}</Text></View>
        <Text style={ms.usesText}>
          {level < 5 ? `${totalUses} / ${nextLevelUses} usos` : 'MAESTRIA MÁXIMA'}
        </Text>
      </View>

      {level < 5 && (
        <View style={ms.track}>
          <View style={[ms.fill, { width: `${fillPct}%` as any }]} />
        </View>
      )}

      {/* Escolhas feitas em níveis anteriores */}
      {choices && choices.map((choice, i) => {
        const bonus = MASTERY_BONUSES[i + 1];
        if (!bonus) return null;
        const isAumento = choice === 'aumento';
        return (
          <View key={i} style={ms.choiceRow}>
            <Text style={[ms.tag, isAumento ? ms.tagA : ms.tagO]}>
              {isAumento ? 'AUM' : 'OTI'}
            </Text>
            <Text style={ms.choiceLabel}>{isAumento ? bonus.aumento : bonus.otimizacao}</Text>
          </View>
        );
      })}

      {/* Escolha pendente — pronta para evoluir */}
      {readyToLevelUp && nextBonus && (
        <View style={ms.choicePrompt}>
          <Text style={ms.choicePromptLabel}>ESCOLHA M{level + 1}:</Text>
          <View style={ms.choiceBtns}>
            <TouchableOpacity
              style={[ms.choiceBtn, ms.btnAumento, choosing && ms.btnDisabled]}
              onPress={() => handleChoice('aumento')}
              disabled={!!choosing}
              activeOpacity={0.7}
            >
              {choosing === 'aumento'
                ? <ActivityIndicator color={Colors.danger} size="small" />
                : <>
                    <Text style={[ms.choiceBtnTag, ms.tagA]}>AUMENTO</Text>
                    <Text style={ms.choiceBtnDesc}>{nextBonus.aumento}</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.choiceBtn, ms.btnOtimizacao, choosing && ms.btnDisabled]}
              onPress={() => handleChoice('otimizacao')}
              disabled={!!choosing}
              activeOpacity={0.7}
            >
              {choosing === 'otimizacao'
                ? <ActivityIndicator color={Colors.tealBright} size="small" />
                : <>
                    <Text style={[ms.choiceBtnTag, ms.tagO]}>OTIMIZAÇÃO</Text>
                    <Text style={ms.choiceBtnDesc}>{nextBonus.otimizacao}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

interface Props {
  visible: boolean;
  skillTree: SkillTreeEntry[];
  slots: Slot[];
  onClose: () => void;
}

export function SkillTreeModal({ visible, skillTree, slots, onClose }: Props) {
  const playerId    = usePlayerStore((s) => s.player?.id);
  const setSkillTree = usePlayerStore((s) => s.setSkillTree);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
      const updated = await getSkillTree(playerId);
      setSkillTree(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      setError(typeof msg === 'string' ? msg : `Não foi possível desbloquear ${skill.nome}.`);
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

          <View style={styles.tabs}>
            {categories.map((cat, i) => (
              <TouchableOpacity
                key={cat || String(i)}
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
            {skills.map((skill, idx) => {
              const status = getStatus(skill);
              return (
                <TouchableOpacity
                  key={skill.skillId ?? String(idx)}
                  style={[styles.skillRow, status === 'locked' && styles.skillRowLocked]}
                  onPress={() => setExpanded(expanded === skill.skillId ? null : skill.skillId)}
                  activeOpacity={0.7}
                >
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
                    {skill.unlocked && skill.maestria && expanded === skill.skillId && (
                      <MaestrySection maestria={skill.maestria} playerId={playerId!} skillId={skill.skillId} />
                    )}
                  </View>
                  {status === 'locked' && !skill.requirementsText && (
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
                </TouchableOpacity>
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

const ms = StyleSheet.create({
  wrap:        { marginTop: 6, gap: 3 },
  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge:       { backgroundColor: Colors.gold, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText:   { fontFamily: Fonts.title, fontSize: 9, color: Colors.bg, letterSpacing: 1 },
  usesText:    { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  track:       { height: 3, backgroundColor: Colors.surface, borderRadius: 2, overflow: 'hidden' },
  fill:        { height: '100%' as any, backgroundColor: Colors.gold },
  choiceRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  tag:         { fontFamily: Fonts.title, fontSize: 8, letterSpacing: 1, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 },
  tagA:        { backgroundColor: 'rgba(239,68,68,0.15)', color: Colors.danger },
  tagO:        { backgroundColor: 'rgba(74,222,128,0.12)', color: Colors.tealBright },
  choiceLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  choicePrompt:     { marginTop: 8, gap: 6 },
  choicePromptLabel:{ fontFamily: Fonts.title, fontSize: 9, color: Colors.gold, letterSpacing: 2 },
  choiceBtns:       { flexDirection: 'row', gap: 8 },
  choiceBtn:        { flex: 1, padding: 8, borderRadius: 3, borderWidth: 1, gap: 2 },
  btnAumento:       { borderColor: Colors.danger, backgroundColor: 'rgba(239,68,68,0.06)' },
  btnOtimizacao:    { borderColor: Colors.tealBright, backgroundColor: 'rgba(74,222,128,0.06)' },
  btnDisabled:      { opacity: 0.5 },
  choiceBtnTag:     { fontFamily: Fonts.title, fontSize: 9, letterSpacing: 1 },
  choiceBtnDesc:    { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
});
