import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { connectStomp, disconnectStomp } from '@/lib/socket';
import { getPlayerId, getPlayerCode, clearSession } from '@/lib/storage';
import { login, getSkillTree } from '@/lib/api';
import { GameLayout } from '@/components/layout/game-layout';
import { Colors } from '@/constants/theme';
import type { Player, GameImage, FastAction, Slot } from '@/types';

export default function GameScreen() {
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const setSkillTree = usePlayerStore((s) => s.setSkillTree);
  const updateSlotCooldowns = usePlayerStore((s) => s.updateSlotCooldowns);
  const setActiveImage = useGameStore((s) => s.setActiveImage);
  const setFastAction = useGameStore((s) => s.setFastAction);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const [playerId, playerCode] = await Promise.all([getPlayerId(), getPlayerCode()]);
      if (!playerId || !playerCode) {
        router.replace('/');
        return;
      }

      // Fetch current player state immediately — STOMP only pushes on changes
      try {
        const current = await login(playerCode);
        if (mounted) setPlayer(current);
      } catch {
        await clearSession();
        router.replace('/');
        return;
      }

      const stomp = await connectStomp();

      // Backend pushes full Player on /topic/player/{id}
      stomp.subscribe(`/topic/player/${playerId}`, (msg) => {
        if (!mounted) return;
        const updated: Player = JSON.parse(msg.body);
        setPlayer(updated);
      });

      stomp.subscribe('/topic/image', (msg) => {
        if (mounted) setActiveImage(JSON.parse(msg.body) as GameImage);
      });

      stomp.subscribe('/topic/fast-action', (msg) => {
        if (!mounted) return;
        const fa: FastAction = JSON.parse(msg.body);
        setFastAction(fa.active ? fa : null);
      });

      stomp.subscribe('/topic/turn', (msg) => {
        if (!mounted) return;
        // After turn advance, slots cooldowns are updated in the player broadcast
        // but also try to parse a slots array if the server sends one
        try {
          const data = JSON.parse(msg.body);
          if (Array.isArray(data?.slots)) {
            updateSlotCooldowns(data.slots as Slot[]);
          }
        } catch {
          // ignore — player:update will carry the updated slots anyway
        }
      });

      // Fetch skill tree after connecting
      try {
        const tree = await getSkillTree(playerId);
        if (mounted) setSkillTree(tree);
      } catch {
        // non-critical — screen will show empty state
      }
    }

    init();

    return () => {
      mounted = false;
      disconnectStomp();
    };
  }, []);

  if (!player) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.ember} size="large" />
      </View>
    );
  }

  return <GameLayout />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
