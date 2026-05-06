import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { usePlayerStore } from '@/store/playerStore';
import { voteFastAction } from '@/lib/api';

export function FastActionOverlay() {
  const fastAction = useGameStore((s) => s.fastAction);
  const playerId = usePlayerStore((s) => s.player?.id);
  const [loading, setLoading] = useState(false);

  if (!fastAction?.active) return null;

  const voted = !!playerId && (fastAction.lockedPlayers ?? []).includes(playerId);
  const takenOptions = new Set(Object.values(fastAction.answers ?? {}));

  async function handleVote(optionId: string) {
    if (!playerId || voted || loading || takenOptions.has(optionId)) return;
    setLoading(true);
    try {
      await voteFastAction(playerId, optionId);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{fastAction.title}</Text>

        {voted ? (
          <Text style={styles.votedText}>Voto registrado</Text>
        ) : (
          <View style={styles.options}>
            {fastAction.options.map((opt) => {
              const taken = takenOptions.has(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: opt.color },
                    taken && styles.optionBtnTaken,
                  ]}
                  onPress={() => handleVote(opt.id)}
                  disabled={loading || taken}
                  activeOpacity={0.8}
                >
                  {loading && !taken ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.optionText, taken && styles.optionTextTaken]}>
                      {opt.text}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 6,
    padding: 32,
    minWidth: 360,
    maxWidth: 560,
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionBtn: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 4,
    minWidth: 120,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: Fonts.title,
    fontSize: 14,
    color: '#fff',
    letterSpacing: 1,
  },
  votedText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.tealBright,
    fontStyle: 'italic',
  },
  optionBtnTaken: {
    opacity: 0.35,
  },
  optionTextTaken: {
    textDecorationLine: 'line-through',
  },
});
