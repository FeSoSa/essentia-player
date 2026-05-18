import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  clamp,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

export function MapaScreen() {
  const images       = useGameStore((s) => s.images);
  const currentIndex = useGameStore((s) => s.currentImageIndex);
  const nextImage    = useGameStore((s) => s.nextImage);
  const clearNew     = useGameStore((s) => s.clearNewImage);

  const activeImages = images.filter((i) => i.active);
  const current      = activeImages[currentIndex] ?? null;

  const [fullscreen, setFullscreen] = useState(false);

  // ── Zoom / pan state ──
  const scale      = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX    = useSharedValue(0);
  const offsetY    = useSharedValue(0);
  const savedX     = useSharedValue(0);
  const savedY     = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 1, 6);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      offsetX.value = savedX.value + e.translationX;
      offsetY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = offsetX.value;
      savedY.value = offsetY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  // Reset zoom when image changes
  function resetZoom() {
    scale.value      = withSpring(1);
    savedScale.value = 1;
    offsetX.value    = withSpring(0);
    offsetY.value    = withSpring(0);
    savedX.value     = 0;
    savedY.value     = 0;
  }

  if (!current) {
    return (
      <View style={styles.empty} onLayout={() => clearNew()}>
        <MaterialCommunityIcons name="map-outline" size={48} color={Colors.muted} />
        <Text style={styles.emptyText}>Nenhuma imagem enviada ainda</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={() => clearNew()}>
      {/* Fundo blur */}
      <Image
        source={{ uri: current.url }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        blurRadius={28}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

      {/* Imagem com zoom e pan */}
      <GestureDetector gesture={composed}>
        <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]}>
          <Image
            source={{ uri: current.url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
      </GestureDetector>

      {/* Botão expandir fullscreen */}
      <TouchableOpacity style={styles.expandBtn} onPress={() => setFullscreen(true)} activeOpacity={0.75}>
        <MaterialCommunityIcons name="fullscreen" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Botão próxima — só aparece com mais de 1 ativa */}
      {activeImages.length > 1 && (
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => { nextImage(); resetZoom(); }}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
          <Text style={styles.nextLabel}>
            {currentIndex + 1}/{activeImages.length}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal fullscreen */}
      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)} statusBarTranslucent>
        <View style={styles.fullscreenContainer}>
          <Image
            source={{ uri: current.url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            blurRadius={28}
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          <Image
            source={{ uri: current.url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setFullscreen(false)} activeOpacity={0.75}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  empty: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  emptyText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted },
  expandBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 8,
  },
  nextBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextLabel: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 10,
  },
});
