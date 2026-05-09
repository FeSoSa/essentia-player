import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { requestSobrecarga, deactivateSobrecarga } from '@/lib/api';
import { useSobrecargaStore } from '@/store/sobrecargaStore';
import { SOBRECARGA_LEVELS } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SobrecargaModal({ visible, onClose }: Props) {
  const player = usePlayerStore((s) => s.player)!;
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const result = useSobrecargaStore((s) => s.result);
  const clearResult = useSobrecargaStore((s) => s.clearResult);

  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [sent, setSent] = useState(false);

  const sobrecargaAtiva = player.sobrecargaAtiva === true;
  const nivel = player.sobrecargaNivel;
  const nivelAtual = nivel ? SOBRECARGA_LEVELS.find((l) => l.nivel === nivel) : null;

  async function handleRequest(n: number) {
    if (loading) return;
    setLoading(true);
    try {
      await requestSobrecarga(player.id, n);
      setSent(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (deactivating) return;
    setDeactivating(true);
    try {
      const updated = await deactivateSobrecarga(player.id);
      setPlayer(updated);
      handleClose();
    } catch {
      // silent
    } finally {
      setDeactivating(false);
    }
  }

  function handleClose() {
    setSent(false);
    clearResult();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={styles.header}>
            <Text style={styles.title}>SOBRECARGA</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

            {/* Resultado do teste */}
            {result && (
              <View style={[styles.resultBanner, result.approved ? styles.resultApproved : styles.resultRejected]}>
                {result.approved ? (
                  <Text style={styles.resultText}>
                    Aprovado — Nível {result.nivel} ativo! ({result.roll ?? '?'} ≥ CD {result.cd ?? '?'})
                  </Text>
                ) : (
                  <Text style={styles.resultText}>
                    Reprovado — {result.roll ?? '?'} &lt; CD {result.cd ?? '?'}.
                    {result.damageTaken ? ` ${result.damageTaken} de dano sofrido.` : ''}
                  </Text>
                )}
              </View>
            )}

            {sobrecargaAtiva ? (
              <View style={styles.ativoBlock}>
                <Text style={styles.ativoLabel}>NÍVEL {nivel} ATIVO</Text>
                {nivelAtual && (
                  <>
                    <Text style={styles.ativoStat}>+{nivelAtual.bonus} em todos os atributos</Text>
                    <Text style={styles.ativoCusto}>{nivelAtual.custo} ES / rodada</Text>
                  </>
                )}
                <Text style={styles.flowCurrent}>
                  ES atual: {player.flow.current}/{player.flow.max}
                </Text>
                <TouchableOpacity
                  style={[styles.deactivateBtn, deactivating && styles.btnDisabled]}
                  onPress={handleDeactivate}
                  disabled={deactivating}
                  activeOpacity={0.7}
                >
                  {deactivating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.deactivateBtnText}>DESATIVAR SOBRECARGA</Text>
                  }
                </TouchableOpacity>
              </View>
            ) : sent ? (
              <View style={styles.waitBlock}>
                <ActivityIndicator color={Colors.ember} />
                <Text style={styles.waitText}>Aguardando o mestre rolar {'\n'}1d20 + SAB…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.hint}>Selecione o nível de sobrecarga:</Text>
                {SOBRECARGA_LEVELS.map((lvl) => {
                  const canAfford = player.flow.current >= lvl.custo;
                  return (
                    <TouchableOpacity
                      key={lvl.nivel}
                      style={[styles.levelRow, !canAfford && styles.levelRowDisabled]}
                      onPress={() => handleRequest(lvl.nivel)}
                      disabled={loading || !canAfford}
                      activeOpacity={0.75}
                    >
                      <View style={styles.levelNum}>
                        <Text style={styles.levelNumText}>{lvl.nivel}</Text>
                      </View>
                      <View style={styles.levelInfo}>
                        <Text style={styles.levelBonus}>+{lvl.bonus} atributos</Text>
                        <Text style={styles.levelDetail}>
                          {lvl.custo} ES · CD {lvl.cd} · falha: {lvl.danoDado}
                        </Text>
                      </View>
                      {!canAfford && (
                        <Text style={styles.levelInsuf}>insuf.</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: '#f97316',
    borderRadius: 4, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    width: '100%', maxWidth: 360, maxHeight: '85%', gap: 10,
  },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: 10, paddingBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: Fonts.title, fontSize: 16, color: '#f97316', letterSpacing: 2 },
  closeBtn: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted },

  resultBanner: { borderRadius: 3, padding: 10 },
  resultApproved: { backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: Colors.tealBright },
  resultRejected: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: Colors.danger },
  resultText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },

  hint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  levelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#f97316', borderRadius: 3,
    padding: 10, backgroundColor: 'rgba(249,115,22,0.06)',
  },
  levelRowDisabled: { borderColor: Colors.border, backgroundColor: Colors.surface, opacity: 0.5 },
  levelNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center',
  },
  levelNumText: { fontFamily: Fonts.title, fontSize: 16, color: '#fff' },
  levelInfo: { flex: 1, gap: 2 },
  levelBonus: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.text },
  levelDetail: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  levelInsuf: { fontFamily: Fonts.title, fontSize: 9, color: Colors.danger, letterSpacing: 1 },

  ativoBlock: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  ativoLabel: { fontFamily: Fonts.title, fontSize: 18, color: '#f97316', letterSpacing: 2 },
  ativoStat: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
  ativoCusto: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  flowCurrent: { fontFamily: Fonts.title, fontSize: 13, color: '#4a9fd4' },
  deactivateBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#f97316', borderRadius: 3, alignItems: 'center',
  },
  deactivateBtnText: { fontFamily: Fonts.title, fontSize: 11, color: '#f97316', letterSpacing: 2 },

  waitBlock: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  waitText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  btnDisabled: { opacity: 0.6 },
});
