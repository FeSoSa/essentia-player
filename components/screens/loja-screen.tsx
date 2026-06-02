import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, RARITY_COLORS, RARITY_LABELS, type Rarity } from '@/constants/theme';
import { GameIcon } from '@/components/ui/game-icon';
import { weaponDamageFormula } from '@/lib/rules';
import { useGameStore } from '@/store/gameStore';
import { usePlayerStore } from '@/store/playerStore';
import { getItemCatalog } from '@/lib/api';
import type { ItemCatalogEntry, ShopItem } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  weapon: 'Arma',
  armor: 'Armadura',
  accessory: 'Acessório',
  normal: 'Item',
  chave: 'Chave',
};

const ATTR_LABELS: Record<string, string> = {
  strength: 'FOR', agility: 'AGI', intelligence: 'INT',
  resistance: 'RES', flow: 'FLX', wisdom: 'SAB', presence: 'PRE', defense: 'DEF',
};

export function LojaScreen() {
  const shops = useGameStore((s) => s.shops);
  const player = usePlayerStore((s) => s.player);
  const [catalog, setCatalog] = useState<Map<string, ItemCatalogEntry>>(new Map());

  useEffect(() => {
    getItemCatalog()
      .then((items) => setCatalog(new Map(items.map((i) => [i.id, i]))))
      .catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {player && (
        <View style={styles.goldRow}>
          <MaterialCommunityIcons name="gold" size={16} color={Colors.gold} />
          <Text style={styles.goldText}>{player.gold} Tyd</Text>
        </View>
      )}

      {shops.map((shop) => (
        <View key={shop.id} style={styles.shopBlock}>
          <View style={styles.shopHeader}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopCount}>
              {shop.items.length} {shop.items.length === 1 ? 'item' : 'itens'}
            </Text>
          </View>

          {shop.items.length === 0 ? (
            <Text style={styles.emptyShop}>Sem itens nesta loja</Text>
          ) : (
            <View style={styles.cardsGrid}>
              {shop.items.map((si) => {
                const cat = catalog.get(si.itemId);
                if (!cat) return null;
                return <ShopItemCard key={si.itemId} si={si} cat={cat} />;
              })}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

interface CardProps {
  si: ShopItem;
  cat: ItemCatalogEntry;
}

function ShopItemCard({ si, cat }: CardProps) {
  const rarityColor = cat.rarity
    ? (RARITY_COLORS[cat.rarity as Rarity] ?? Colors.muted)
    : Colors.muted;
  const rarityLabel = cat.rarity
    ? (RARITY_LABELS[cat.rarity as Rarity] ?? cat.rarity)
    : null;

  const isWeapon = cat.type === 'weapon';
  const isArmor = cat.type === 'armor';

  const damageFormula =
    isWeapon && (cat.damageBase || cat.damageAttribute)
      ? weaponDamageFormula({ damageBase: cat.damageBase, damageAttribute: cat.damageAttribute, equilibrio: cat.equilibrio })
      : null;

  const attrBonusEntries = cat.attributeBonus
    ? Object.entries(cat.attributeBonus).filter(([, v]) => v !== 0)
    : [];

  const subtitle: string[] = [];
  if (cat.weaponType) subtitle.push(cat.weaponType);
  else if (cat.armorWeight) subtitle.push(cat.armorWeight);
  else subtitle.push(TYPE_LABELS[cat.type] ?? cat.type);
  if (cat.twoHanded) subtitle.push('Duas mãos');

  return (
    <View style={[styles.card, { borderColor: rarityColor + '30' }]}>
      <View style={[styles.cardAccent, { backgroundColor: rarityColor }]} />

      {/* Icon + name */}
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { borderColor: rarityColor + '50' }]}>
          <GameIcon icon={cat.icon} size={22} color={rarityColor} />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={[styles.cardName, { color: rarityColor }]} numberOfLines={2}>
            {cat.name}
          </Text>
          <Text style={styles.cardSubtitle}>{subtitle.join(' · ')}</Text>
        </View>
      </View>

      {/* Rarity badge */}
      {rarityLabel && (
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '18' }]}>
          <Text style={[styles.rarityText, { color: rarityColor }]}>{rarityLabel}</Text>
        </View>
      )}

      {/* Stats block */}
      {(damageFormula || isArmor && cat.damageReduction != null || attrBonusEntries.length > 0 || cat.properties) && (
        <View style={styles.statsBlock}>
          {damageFormula && (
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="sword" size={11} color={Colors.faint} />
              <Text style={styles.statLabel}>Dano</Text>
              <Text style={styles.statValue}>{damageFormula}</Text>
            </View>
          )}
          {isArmor && cat.damageReduction != null && (
            <View style={styles.statRow}>
              <MaterialCommunityIcons name="shield" size={11} color={Colors.faint} />
              <Text style={styles.statLabel}>Redução</Text>
              <Text style={styles.statValue}>{cat.damageReduction}</Text>
            </View>
          )}
          {attrBonusEntries.map(([attr, val]) => (
            <View key={attr} style={styles.statRow}>
              <MaterialCommunityIcons name="chevron-up" size={11} color={Colors.tealBright} />
              <Text style={styles.statLabel}>{ATTR_LABELS[attr] ?? attr.toUpperCase().slice(0, 3)}</Text>
              <Text style={[styles.statValue, { color: Colors.tealBright }]}>
                {val > 0 ? `+${val}` : val}
              </Text>
            </View>
          ))}
          {cat.properties && (
            <Text style={styles.properties}>{cat.properties}</Text>
          )}
        </View>
      )}

      {/* Description */}
      {cat.desc ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{cat.desc}</Text>
      ) : null}

      {/* Footer: stock + price */}
      <View style={styles.cardFooter}>
        {si.stockLimit != null ? (
          <Text style={styles.stockText}>×{si.stockLimit}</Text>
        ) : (
          <View />
        )}

        {cat.goldValue != null ? (
          <View style={styles.priceTag}>
            <MaterialCommunityIcons name="gold" size={12} color={Colors.gold} />
            <Text style={styles.priceText}>{cat.goldValue} Tyd</Text>
          </View>
        ) : (
          <Text style={styles.noPrice}>—</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 12, paddingBottom: 32, gap: 16 },

  goldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  goldText: { fontFamily: Fonts.title, fontSize: 14, color: Colors.gold },

  shopBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shopName: { fontFamily: Fonts.title, fontSize: 13, color: Colors.text },
  shopCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.faint },
  emptyShop: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.faint,
    textAlign: 'center',
    paddingVertical: 20,
  },

  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
  },

  card: {
    width: '47.5%',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    gap: 8,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.7,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleArea: { flex: 1 },
  cardName: { fontFamily: Fonts.title, fontSize: 12, lineHeight: 16 },
  cardSubtitle: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 2 },

  rarityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rarityText: { fontFamily: Fonts.title, fontSize: 9 },

  statsBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.muted,
    flex: 1,
  },
  statValue: {
    fontFamily: Fonts.title,
    fontSize: 10,
    color: Colors.text,
  },
  properties: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.faint,
    fontStyle: 'italic',
    marginTop: 2,
  },

  cardDesc: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.muted,
    lineHeight: 14,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '50',
  },
  stockText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.faint },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  priceText: { fontFamily: Fonts.title, fontSize: 11, color: Colors.gold },
  noPrice: { fontFamily: Fonts.body, fontSize: 11, color: Colors.faint },
});
