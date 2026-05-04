import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

export function MapaScreen() {
  const activeImage = useGameStore((s) => s.activeImage);
  const hasNewImage = useGameStore((s) => s.hasNewImage);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!hasNewImage) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [hasNewImage]);

  if (!activeImage?.active) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="map-outline" size={48} color={Colors.muted} />
        <Text style={styles.emptyText}>Nenhuma imagem enviada ainda</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: activeImage.url }}
        style={styles.image}
        contentFit="contain"
        transition={300}
      />
      {hasNewImage && activeImage.titulo && (
        <Animated.View style={[styles.badge, { opacity }]}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{activeImage.titulo}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    flex: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.muted,
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: Colors.ember,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ember,
  },
  badgeText: {
    fontFamily: Fonts.title,
    fontSize: 12,
    color: Colors.ember,
    letterSpacing: 1,
  },
});
