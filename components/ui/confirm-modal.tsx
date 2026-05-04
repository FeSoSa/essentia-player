import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'CONFIRMAR',
  onConfirm,
  onCancel,
  dangerous = false,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.divider} />
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, dangerous && styles.confirmDanger]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 28,
    minWidth: 320,
    maxWidth: 420,
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: 16,
    color: Colors.ember,
    letterSpacing: 3,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
  },
  cancelText: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 2,
  },
  confirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.ember,
    borderRadius: 2,
  },
  confirmDanger: {
    backgroundColor: Colors.danger,
  },
  confirmText: {
    fontFamily: Fonts.title,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 2,
  },
});
