import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import type { SkillTreeEntry } from '@/types';

const ESSENCIA_BORDER: Record<string, string> = {
  Grande:  '#d4a84e',
  Mitica:  '#a855f7',
  Derivada: '#4ade80',
};

interface Props {
  skill: SkillTreeEntry;
  equipped?: boolean;
  cooldown?: number;
  onPress?: () => void;
  essenciaType?: string;
}

export function SkillCard({ skill, equipped = false, cooldown = 0, onPress, essenciaType }: Props) {
  const locked = !skill.unlocked;
  const hasCooldown = cooldown > 0;
  const essenciaBorderColor = essenciaType ? ESSENCIA_BORDER[essenciaType] : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        essenciaBorderColor ? { borderLeftColor: essenciaBorderColor, borderLeftWidth: 3 } : undefined,
        equipped && styles.cardEquipped,
        hasCooldown && styles.cardCooldown,
        locked && styles.cardLocked,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress || locked || hasCooldown}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {locked && (
            <MaterialCommunityIcons name="lock" size={12} color={Colors.muted} style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.nome, locked && styles.textLocked]} numberOfLines={1}>
            {skill.nome}
          </Text>
          {!locked && skill.maestria && skill.maestria.level > 0 && (
            <View style={styles.maestriaBadge}>
              <Text style={styles.maestriaBadgeText}>M{skill.maestria.level}</Text>
            </View>
          )}
        </View>
        <Text style={styles.custo}>{skill.custo}</Text>
      </View>

      <Text style={[styles.descricao, locked && styles.textLocked]} numberOfLines={2}>
        {skill.descricao}
      </Text>

      {hasCooldown && (
        <Text style={styles.cooldownLabel}>{cooldown} TURNO{cooldown > 1 ? 'S' : ''}</Text>
      )}
      {locked && skill.requirementsText && (
        <Text style={styles.requirementsText}>{skill.requirementsText}</Text>
      )}
      {equipped && !hasCooldown && (
        <Text style={styles.equippedLabel}>EQUIPADA</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 2, padding: 10, marginBottom: 6,
  },
  cardEquipped: { borderColor: Colors.ember, borderLeftWidth: 3 },
  cardCooldown: { opacity: 0.55, borderColor: Colors.danger },
  cardLocked: { opacity: 0.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nome: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.text, flex: 1 },
  textLocked: { color: Colors.muted },
  custo: { fontFamily: Fonts.title, fontSize: 10, color: Colors.tealBright, letterSpacing: 1 },
  descricao: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 16 },
  cooldownLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.danger, letterSpacing: 2, marginTop: 4 },
  equippedLabel: { fontFamily: Fonts.title, fontSize: 8, color: Colors.ember, letterSpacing: 2, marginTop: 4 },
  requirementsText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.danger, marginTop: 4, fontStyle: 'italic' },
  maestriaBadge: {
    backgroundColor: Colors.gold, borderRadius: 2,
    paddingHorizontal: 4, paddingVertical: 1, marginLeft: 6,
  },
  maestriaBadgeText: { fontFamily: Fonts.title, fontSize: 8, color: Colors.bg, letterSpacing: 1 },
});
