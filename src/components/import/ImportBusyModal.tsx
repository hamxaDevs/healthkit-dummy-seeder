import { ActivityIndicator, Modal, Platform, StyleSheet, Text, View } from 'react-native'

import type { ImportBusyModalProps } from '../../types'
import { colors } from '../../theme/colors'
import { spacing } from '../../theme/spacing'

export function ImportBusyModal({ visible, pct, importStats, elapsedSec }: ImportBusyModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalBackdrop} pointerEvents="box-none">
        <View style={styles.modalCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.modalTitle}>Importing to Health</Text>
          <Text style={styles.modalStatus}>
            {importStats
              ? `${pct}% · ${importStats.done} / ${importStats.total} samples`
              : 'Preparing…'}
          </Text>
          {importStats ? (
            <Text style={styles.modalLabel} numberOfLines={2}>
              {importStats.label}
            </Text>
          ) : null}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.modalElapsed}>
            Elapsed {elapsedSec}s
            {elapsedSec > 45 ? ' — still working, please wait' : ''}
          </Text>
          <Text style={styles.modalHint}>
            Do not leave this screen or close the app until the import finishes.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalStatus: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  modalLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  progressTrack: {
    marginTop: spacing.lg,
    height: 8,
    width: '100%',
    backgroundColor: colors.progressTrack,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  modalElapsed: {
    marginTop: spacing.md,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
  modalHint: {
    marginTop: 14,
    fontSize: 12,
    color: colors.modalHint,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'System', default: undefined }),
  },
})
