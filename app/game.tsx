import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { connectStomp, disconnectStomp } from '@/lib/socket';
import { getPlayerId, getPlayerCode, clearSession } from '@/lib/storage';
import { login, getSkillTree, getEssencias, getCombatEnemies, getCombatBosses, getImages } from '@/lib/api';
import { GameLayout } from '@/components/layout/game-layout';
import { Colors } from '@/constants/theme';
import type { Player, GameImage, FastAction, InitiativeEntry, EnemyInstance, BossInstance } from '@/types';
// GameImage used in STOMP handler type annotation below

export default function GameScreen() {
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const setSkillTree = usePlayerStore((s) => s.setSkillTree);
  const setEssencias = usePlayerStore((s) => s.setEssencias);
  const setImages = useGameStore((s) => s.setImages);
  const setFastAction = useGameStore((s) => s.setFastAction);
  const setInitiative = useGameStore((s) => s.setInitiative);
  const incrementTurn = useGameStore((s) => s.incrementTurn);
  const setEnemies = useGameStore((s) => s.setEnemies);
  const setBosses = useGameStore((s) => s.setBosses);

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

      let stomp;
      try {
        stomp = await connectStomp();
        console.log('[game] STOMP connected, subscribing...');
      } catch (err) {
        console.error('[game] STOMP connection failed:', err);
        return;
      }

      // Backend pushes full Player on /topic/player/{id}
      stomp.subscribe(`/topic/player/${playerId}`, (msg) => {
        if (!mounted) return;
        const updated: Player = JSON.parse(msg.body);
        setPlayer(updated);
      });

      stomp.subscribe('/topic/images', (msg) => {
        if (mounted) setImages(JSON.parse(msg.body) as GameImage[]);
      });

      stomp.subscribe('/topic/fast-action', (msg) => {
        if (!mounted) return;
        const fa: FastAction = JSON.parse(msg.body);
        setFastAction(fa.active ? fa : null);
      });

      stomp.subscribe('/topic/initiative', (msg) => {
        if (!mounted) return;
        const entries: InitiativeEntry[] = JSON.parse(msg.body);
        setInitiative(entries);
      });

      stomp.subscribe('/topic/turn', (msg) => {
        if (!mounted) return;
        incrementTurn();
      });

      stomp.subscribe('/topic/combat/enemies', (msg) => {
        if (!mounted) return;
        setEnemies(JSON.parse(msg.body) as EnemyInstance[]);
      });

      stomp.subscribe('/topic/combat/bosses', (msg) => {
        if (!mounted) return;
        setBosses(JSON.parse(msg.body) as BossInstance[]);
      });

      // Fetch skill tree, essencias catalog, and current combat state
      try {
        const [tree, essencias, enemies, bosses, imgs] = await Promise.all([
          getSkillTree(playerId),
          getEssencias(),
          getCombatEnemies(),
          getCombatBosses(),
          getImages(),
        ]);
        if (mounted) {
          setSkillTree(tree);
          setEssencias(essencias);
          setEnemies(enemies);
          setBosses(bosses);
          setImages(imgs);
        }
      } catch {
        // non-critical — screens will show empty states
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
