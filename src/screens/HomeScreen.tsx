import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ScreenHeader } from '../components/layout/ScreenHeader'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { RootStackNavigationProp } from '../types'

export function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader
          title="HealthKit seeder"
          description="Load generated or file-based JSON, or import from a built Apple Health export. Use a physical iPhone with the
          dev build for HealthKit writes."
        />

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('DummyData')}
        >
          <View style={styles.cardIconWrap}>
            <Text style={styles.cardIcon}>◇</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Dummy & file import</Text>
            <Text style={styles.cardDesc}>
              Load bundled sample JSON from <Text style={styles.mono}>npm run generate:sample</Text>, pick a{' '}
              <Text style={styles.mono}>.json</Text> file, then import into Health.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('AppleExport')}
        >
          <View style={[styles.cardIconWrap, styles.cardIconWrapAlt]}>
            <Text style={[styles.cardIcon, styles.cardIconAlt]}>⌁</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Apple Health export</Text>
            <Text style={styles.cardDesc}>
              Place <Text style={styles.mono}>export.xml</Text> under <Text style={styles.mono}>assets/apple_health_export/</Text>, run{' '}
              <Text style={styles.mono}>npm run import:from-apple-export</Text>, then load bundled chunks and import.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    backgroundColor: '#fafafa',
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardIconWrapAlt: {
    backgroundColor: '#dcfce7',
  },
  cardIcon: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  cardIconAlt: {
    color: '#15803d',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 19,
  },
  mono: {
    fontFamily: undefined,
    fontSize: 12,
    color: '#475569',
  },
  chevron: {
    fontSize: 28,
    color: colors.textSubtle,
    fontWeight: '300',
    marginLeft: spacing.xs,
  },
})
