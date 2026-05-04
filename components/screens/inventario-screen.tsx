import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { ItemModal } from '@/components/ui/item-modal';
import { usePlayerStore } from '@/store/playerStore';
import type { Item, WeaponEquip } from '@/types';

type EquipSlotKey = 'mainHand' | 'offHand' | 'armor' | 'amulet' | 'ring' | 'utility';

const EQUIPMENT_SLOTS: { key: EquipSlotKey; label: string; icon: string }[] = [
  { key: 'mainHand', label: 'Mão principal', icon: 'sword' },
  { key: 'offHand', label: 'Offhand', icon: 'shield-outline' },
  { key: 'armor', label: 'Armadura', icon: 'shield-account' },
  { key: 'amulet', label: 'Amuleto', icon: 'necklace' },
  { key: 'ring', label: 'Anel', icon: 'ring' },
  { key: 'utility', label: 'Utilitário', icon: 'bag-personal-outline' },
];

type MenuState = { item: Item } | null;
type ModalState = { item: Item; mode: 'details' | 'use' } | null;

export function InventarioScreen() {
  const player = usePlayerStore((s) => s.player)!;
  const [menu, setMenu] = useState<MenuState>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const pendentesCount = player.pendingRequests.filter((p) => p.status === 'pendente').length;

  return (
    <View style={styles.container}>
      {pendentesCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {pendentesCount} pedido{pendentesCount > 1 ? 's' : ''} aguardando aprovação do mestre
          </Text>
        </View>
      )}

      <View style={styles.cols}>
        {/* Coluna esquerda — equipamento */}
        <View style={styles.equipCol}>
          <Text style={styles.colLabel}>EQUIPAMENTO</Text>
          {EQUIPMENT_SLOTS.map(({ key, label, icon }) => {
            const equipped = player.equipment[key] as WeaponEquip | undefined;
            return (
              <View key={key} style={styles.equipSlot}>
                <MaterialCommunityIcons
                  name={(equipped?.icon ?? icon) as any}
                  size={18}
                  color={equipped ? Colors.ember : Colors.muted}
                  style={{ opacity: equipped ? 1 : 0.4 }}
                />
                <View style={styles.equipInfo}>
                  <Text style={styles.equipLabel}>{label}</Text>
                  {equipped ? (
                    <Text style={styles.equipItemName}>{equipped.name}</Text>
                  ) : (
                    <Text style={styles.textMuted}>— vazio</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Coluna direita — inventário */}
        <View style={styles.inventCol}>
          <View style={styles.inventHeader}>
            <Text style={styles.colLabel}>INVENTÁRIO</Text>
            <View style={styles.ouroBadge}>
              <MaterialCommunityIcons name="gold" size={12} color={Colors.gold} />
              <Text style={styles.ouroText}>{player.gold}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {/* Filled item slots */}
            {player.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridSlotFilled}
                onPress={() => setMenu({ item })}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={(item.icon as any) ?? 'cube-outline'}
                  size={16}
                  color={Colors.ember}
                />
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name.slice(0, 12)}
                </Text>
                <View style={styles.qtdBadge}>
                  <Text style={styles.qtdText}>{item.qty}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* Empty slots to fill to 16 */}
            {Array.from({ length: Math.max(0, 16 - player.items.length) }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.gridSlotEmpty}>
                <Text style={styles.slotNumber}>{player.items.length + i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Mini menu de item */}
      {menu && (
        <View style={styles.menuOverlay}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{menu.item.name}</Text>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => { setModal({ item: menu.item, mode: 'details' }); setMenu(null); }}
            >
              <Text style={styles.menuOptionText}>Ver detalhes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => { setModal({ item: menu.item, mode: 'use' }); setMenu(null); }}
            >
              <Text style={styles.menuOptionText}>Usar item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuOption, styles.menuCancel]} onPress={() => setMenu(null)}>
              <Text style={styles.menuCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ItemModal
        visible={!!modal}
        item={modal?.item ?? null}
        mode={modal?.mode ?? 'details'}
        onClose={() => setModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  banner: {
    backgroundColor: Colors.emberDim, borderBottomWidth: 1,
    borderBottomColor: Colors.danger, paddingHorizontal: 16, paddingVertical: 7,
  },
  bannerText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.danger },
  cols: { flex: 1, flexDirection: 'row', gap: 1 },
  equipCol: {
    width: 200, backgroundColor: Colors.card, borderRightWidth: 1,
    borderRightColor: Colors.border, padding: 12, gap: 6,
  },
  colLabel: { fontFamily: Fonts.title, fontSize: 8, color: Colors.muted, letterSpacing: 2, marginBottom: 4 },
  equipSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  equipInfo: { flex: 1, gap: 2 },
  equipLabel: { fontFamily: Fonts.title, fontSize: 9, color: Colors.muted, letterSpacing: 1 },
  equipItemName: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  textMuted: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, fontStyle: 'italic' },
  inventCol: { flex: 1, padding: 12 },
  inventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ouroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.gold,
    borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3,
  },
  ouroText: { fontFamily: Fonts.title, fontSize: 13, color: Colors.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridSlotFilled: {
    width: 68, height: 68, backgroundColor: Colors.card, borderWidth: 1,
    borderColor: Colors.ember, borderRadius: 3, justifyContent: 'center',
    alignItems: 'center', padding: 4, position: 'relative',
  },
  gridSlotEmpty: {
    width: 68, height: 68, backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 3, justifyContent: 'center', alignItems: 'center',
  },
  itemName: { fontFamily: Fonts.body, fontSize: 11, color: Colors.text, textAlign: 'center' },
  qtdBadge: {
    position: 'absolute', bottom: 3, right: 4,
    backgroundColor: Colors.emberDim, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1,
  },
  qtdText: { fontFamily: Fonts.title, fontSize: 9, color: Colors.ember },
  slotNumber: { fontFamily: Fonts.title, fontSize: 12, color: Colors.border },
  menuOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 50,
  },
  menuCard: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 4, padding: 20, minWidth: 220, gap: 4,
  },
  menuTitle: { fontFamily: Fonts.title, fontSize: 14, color: Colors.ember, letterSpacing: 1, marginBottom: 8 },
  menuOption: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuOptionText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
  menuCancel: { borderBottomWidth: 0, marginTop: 4 },
  menuCancelText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center' },
});
