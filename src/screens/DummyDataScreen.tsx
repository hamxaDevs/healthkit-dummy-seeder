import { useNavigation } from '@react-navigation/native'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { screenStyles } from './screenStyles'
import type { RootStackNavigationProp } from '../types'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { ImportSessionFooter } from '../components/import/ImportSessionFooter'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHealthImport } from '../features/health-import/HealthImportProvider'

export function DummyDataScreen() {
  const navigation = useNavigation<RootStackNavigationProp>()
  const insets = useSafeAreaInsets()
  const { loadBundled, pickFile, busy, sourceLabel, totalSamplesReady, iosOnly, appleExportNotes } = useHealthImport()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={screenStyles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: insets.top + 12, android: 0 })}
      >
        <ScrollView
          style={screenStyles.scroll}
          contentContainerStyle={screenStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
        >
          <ScreenHeader
            title="Dummy & file import"
            onBackPress={() => navigation.goBack()}
            description={
              <Text style={screenStyles.lead}>
                Use the bundled file from <Text style={styles.mono}>generate:sample</Text>, or choose any compatible import{' '}
                <Text style={styles.mono}>.json</Text> on disk.
              </Text>
            }
          />

          {iosOnly ? (
            <Text style={screenStyles.warn}>
              Open this app on an iOS dev build. HealthKit is not used on this platform.
            </Text>
          ) : null}

          <Text style={screenStyles.sectionTitle}>Load data</Text>

          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            onPress={loadBundled}
            disabled={busy}
          >
            <Text style={styles.btnText}>Load bundled sample JSON</Text>
          </Pressable>

          <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={pickFile} disabled={busy}>
            <Text style={styles.btnText}>Pick import file (.json)…</Text>
          </Pressable>

          <Text style={screenStyles.meta}>Source: {sourceLabel}</Text>
          {totalSamplesReady > 0 ? (
            <Text style={screenStyles.meta}>Samples ready: {totalSamplesReady}</Text>
          ) : null}
          {appleExportNotes.length ? (
            <Text style={[screenStyles.metaSmall, styles.metaMono]}>{appleExportNotes.join('\n')}</Text>
          ) : null}

          <Text style={[screenStyles.sectionTitle, { marginTop: spacing.lg }]}>Import</Text>
          <ImportSessionFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  btn: {
    backgroundColor: colors.secondaryBtn,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 16,
    color: colors.secondaryBtnText,
    fontWeight: '500',
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 13,
    color: '#475569',
  },
  metaMono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
})
