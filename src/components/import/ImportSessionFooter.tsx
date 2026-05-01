import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useHealthImport } from '../../features/health-import/HealthImportProvider'
import { colors } from '../../theme/colors'
import { spacing } from '../../theme/spacing'

/** Shared resume field, primary import action, and log output (same session across flows). */
export function ImportSessionFooter() {
  const {
    busy,
    progress,
    lastLog,
    resumeFromGlobalText,
    setResumeFromGlobalText,
    runImport,
    canImport,
  } = useHealthImport()

  return (
    <>
      <Text style={styles.resumeLabel}>Resume from global index (0 = full run)</Text>
      <Text style={styles.resumeHint}>
        If the app stopped mid-import, use the last <Text style={styles.hintMono}>done</Text> number from the Metro log
        (it matches the 0-based index in the combined chunk list). Example:{' '}
        <Text style={styles.hintMono}>338650</Text>.
      </Text>
      <TextInput
        style={styles.resumeInput}
        value={resumeFromGlobalText}
        onChangeText={setResumeFromGlobalText}
        keyboardType="number-pad"
        editable={!busy}
        placeholder="0"
        autoCorrect={false}
        autoCapitalize="none"
        selectTextOnFocus
        {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
      />

      <Pressable
        style={[styles.btnPrimary, (!canImport || busy) && styles.btnDisabled]}
        onPress={runImport}
        disabled={!canImport || busy}
      >
        {busy ? (
          <View style={styles.row}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.btnTextLight}> Importing…</Text>
          </View>
        ) : (
          <Text style={styles.btnTextLight}>Import to Health</Text>
        )}
      </Pressable>

      {!busy && progress ? <Text style={styles.progress}>{progress}</Text> : null}

      <View style={styles.logBox}>
        <Text style={styles.logText}>{lastLog || 'Logs appear here.'}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  resumeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  resumeHint: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  hintMono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
    color: '#475569',
  },
  resumeInput: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextLight: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  logBox: {
    minHeight: 200,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: colors.logText,
  },
})
