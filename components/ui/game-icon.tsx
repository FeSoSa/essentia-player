import { Image, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

// Maps Lucide icon names (used by essentia-mestre) → MaterialCommunityIcons names
export const LUCIDE_TO_MCI: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Sword:             'sword',
  Shield:            'shield',
  Axe:               'axe',
  Wand:              'magic-staff',
  Crosshair:         'crosshairs',
  Wrench:            'wrench',
  Gem:               'diamond-stone',
  Circle:            'circle-outline',
  Package:           'package-variant',
  FlaskConical:      'flask',
  Flame:             'fire',
  Link:              'link',
  CircleDollarSign:  'cash-multiple',
  Key:               'key',
  Zap:               'lightning-bolt',
  Star:              'star',
  Sparkles:          'creation',
  BookOpen:          'book-open-variant',
  Shirt:             'tshirt-crew',
  Scroll:            'text-box-outline',
  Snowflake:         'snowflake',
  Skull:             'skull',
  Wind:              'weather-windy',
  Droplets:          'water',
  Moon:              'moon-waning-crescent',
  Sun:               'weather-sunny',
  HeartCrack:        'heart-broken',
  Eye:               'eye',
  EyeOff:            'eye-off',
  Footprints:        'foot-print',
  Swords:            'sword-cross',
  Dices:             'dice-multiple',
  Leaf:              'leaf',
  Mountain:          'image-filter-hdr',
  Stone:             'earth',
  Waves:             'waves',
  Tornado:           'weather-tornado',
  CloudLightning:    'weather-lightning',
  TreePine:          'pine-tree',
  TreeDeciduous:     'tree',
  Hourglass:         'timer-sand',
  Target:            'target',
  LensConcave:       'magnify',
  CircleStar:        'star-circle',
  AudioLines:        'waveform',
  Cog:               'cog',
};

export function resolveIcon(icon?: string | null): keyof typeof MaterialCommunityIcons.glyphMap {
  if (!icon || icon.startsWith('img:')) return 'cube-outline';
  return LUCIDE_TO_MCI[icon] ?? 'cube-outline';
}

interface Props {
  icon?: string | null;
  size?: number;
  color?: string;
}

export function GameIcon({ icon, size = 16, color = Colors.muted }: Props) {
  if (!icon) return null;

  if (icon.startsWith('img:')) {
    return (
      <Image
        source={{ uri: icon.slice(4) }}
        style={{ width: size, height: size, borderRadius: 2 }}
        resizeMode="cover"
      />
    );
  }

  const mciName = LUCIDE_TO_MCI[icon];
  if (mciName) {
    return <MaterialCommunityIcons name={mciName} size={size} color={color} />;
  }

  // fallback: emoji ou string desconhecida
  return <Text style={{ fontSize: size * 0.8, color, lineHeight: size }}>{icon}</Text>;
}
