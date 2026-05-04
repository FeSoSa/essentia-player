import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

export function DocsScreen() {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="book-open-page-variant-outline" size={48} color={Colors.muted} />
      <Text style={styles.emptyTitle}>SEM DOCUMENTOS</Text>
      <Text style={styles.emptyText}>Nenhum link configurado pelo mestre.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  emptyTitle: { fontFamily: Fonts.title, fontSize: 13, color: Colors.muted, letterSpacing: 4 },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center' },
});
