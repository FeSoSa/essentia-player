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
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!fastAction?.active) return null;

  async function handleVote(optionId: string) {
    if (!playerId || voted || loading) return;
    setLoading(true);
    try {
      await voteFastAction(playerId, optionId);
      if (fastAction?.lockOnePerPlayer) setVoted(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{fastAction.titulo}</Text>

        {voted ? (
          <Text style={styles.votedText}>Voto registrado</Text>
        ) : (
          <View style={styles.options}>
            {fastAction.options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionBtn, { backgroundColor: opt.color }]}
                onPress={() => handleVote(opt.id)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.optionText}>{opt.label}</Text>
                )}
              </TouchableOpacity>
            ))}
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
});
