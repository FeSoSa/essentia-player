import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from './sidebar';
import { useGameStore } from '@/store/gameStore';
import { Colors } from '@/constants/theme';
import { MapaScreen } from '@/components/screens/mapa-screen';
import { GeralScreen } from '@/components/screens/geral-screen';
import { AtributosScreen } from '@/components/screens/atributos-screen';
import { InventarioScreen } from '@/components/screens/inventario-screen';
import { HabilidadesScreen } from '@/components/screens/habilidades-screen';
import { DocsScreen } from '@/components/screens/docs-screen';
import { ConfigScreen } from '@/components/screens/config-screen';
import { FastActionOverlay } from '@/components/ui/fast-action-overlay';

export function GameLayout() {
  const insets = useSafeAreaInsets();
  const activeTab = useGameStore((s) => s.activeTab);
  const fastAction = useGameStore((s) => s.fastAction);

  const screen = {
    mapa: <MapaScreen />,
    geral: <GeralScreen />,
    atributos: <AtributosScreen />,
    inventario: <InventarioScreen />,
    habilidades: <HabilidadesScreen />,
    docs: <DocsScreen />,
    config: <ConfigScreen />,
  }[activeTab];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Sidebar />
      <View style={styles.content}>{screen}</View>
      {fastAction?.active && <FastActionOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
  },
});
