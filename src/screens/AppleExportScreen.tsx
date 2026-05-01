import { useNavigation } from '@react-navigation/native'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ScreenHeader } from '../components/layout/ScreenHeader'
import { ImportSessionFooter } from '../components/import/ImportSessionFooter'
import { useHealthImport } from '../features/health-import/HealthImportProvider'
import type { RootStackNavigationProp } from '../types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'

import { screenStyles } from './screenStyles'

export function AppleExportScreen() {
  const navigation = useNavigation<RootStackNavigationProp>()
  const insets = useSafeAreaInsets()
  const {
    loadBundledAppleChunks,
    busy,
    sourceLabel,
    totalSamplesReady,
    iosOnly,
    appleExportNotes,
  } = useHealthImport()

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
            title="Apple Health export"
            onBackPress={() => navigation.goBack()}
            description={
              <Text style={screenStyles.lead}>
                Unzip Apple’s export, copy <Text style={styles.mono}>export.xml</Text> (and related files) into{' '}
                <Text style={styles.mono}>assets/apple_health_export/</Text>, then run the npm script on your machine to
                produce <Text style={styles.mono}>.hkchunk</Text> files and sync Metro assets.
              </Text>
            }
          />

          {iosOnly ? (
            <Text style={screenStyles.warn}>
              Open this app on an iOS dev build. HealthKit is not used on this platform.
            </Text>
          ) : null}

          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>On your computer</Text>
            <Text style={styles.calloutBody}>
              <Text style={styles.mono}>npm run import:from-apple-export</Text>
              {'\n\n'}
              Writes <Text style={styles.mono}>chunk-00001.hkchunk</Text>, … (UTF-8 JSON with the same{' '}
              <Text style={styles.mono}>{'{ version, samples }'}</Text> as sample JSON). Sync updates{' '}
              <Text style={styles.mono}>src/generated/bundledChunkAssets.ts</Text>. Then start Metro with a clean cache:{' '}
              <Text style={styles.mono}>npx expo start -c</Text>.
            </Text>
          </View>

          <Text style={screenStyles.sectionTitle}>Load bundled chunks</Text>

          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            onPress={loadBundledAppleChunks}
            disabled={busy}
          >
            <Text style={styles.btnText}>Load bundled apple_health_import.chunks</Text>
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
  callout: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutBody: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
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
    fontSize: 12,
    color: '#475569',
  },
  metaMono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
})
