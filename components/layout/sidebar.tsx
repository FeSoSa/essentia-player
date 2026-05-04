import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { usePlayerStore } from '@/store/playerStore';
import type { TabId } from '@/types';

type TabConfig = {
  id: TabId;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
};

const TABS: TabConfig[] = [
  { id: 'mapa',        icon: 'map-outline',                    label: 'Mapa'   },
  { id: 'geral',       icon: 'shield-account',                 label: 'Geral'  },
  { id: 'atributos',   icon: 'chart-bar',                      label: 'Atribs' },
  { id: 'inventario',  icon: 'bag-personal-outline',           label: 'Inv.'   },
  { id: 'habilidades', icon: 'lightning-bolt',                 label: 'Hab.'   },
  { id: 'docs',        icon: 'book-open-page-variant-outline', label: 'Docs'   },
  { id: 'config',      icon: 'cog-outline',                    label: 'Config' },
];

export function Sidebar() {
  const activeTab    = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const hasNewImage  = useGameStore((s) => s.hasNewImage);
  const expAvailable = usePlayerStore((s) => s.player?.exp.available ?? 0);
  const codigo       = usePlayerStore((s) => s.player?.code);

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <Text style={styles.logo}>E</Text>
        <View style={styles.logoSep} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasBadge =
            (tab.id === 'mapa'      && hasNewImage)     ||
            (tab.id === 'atributos' && expAvailable > 0);

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={20}
                  color={isActive ? Colors.ember : Colors.muted}
                />
                {hasBadge && <View style={styles.badge} />}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      {codigo && (
        <View style={styles.footer}>
          <Text style={styles.footerCode} numberOfLines={2}>
            {codigo.replace('-', '\n')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 68,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    alignItems: 'center',
  },

  logoArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  logo: {
    fontFamily: Fonts.title,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.ember,
    lineHeight: 28,
  },
  logoSep: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 8,
  },

  tabs: {
    flex: 1,
    width: '100%',
    paddingTop: 4,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  tabActive: {
    borderLeftColor: Colors.ember,
    backgroundColor: Colors.emberDim,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.ember,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.muted,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: Colors.ember,
  },

  footer: {
    paddingBottom: 12,
    alignItems: 'center',
  },
  footerCode: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.faint,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 13,
  },
});
