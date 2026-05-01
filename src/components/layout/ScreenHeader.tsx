import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import type { ScreenHeaderProps } from '../../types'
import { colors } from '../../theme/colors'
import { spacing } from '../../theme/spacing'

export function ScreenHeader({ title, description, onBackPress }: ScreenHeaderProps) {
  const hasTitle = Boolean(title?.length)
  const hasDesc =
    typeof description === 'string'
      ? description.length > 0
      : description != null && description !== false && description !== true

  if (!hasTitle && !hasDesc) {
    return null
  }

  return (
    <View style={styles.root}>
      {onBackPress ? (
        <Pressable
          onPress={onBackPress}
          style={({ pressed }) => [styles.backRow, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <Text style={styles.backChevron} allowFontScaling>
            ‹
          </Text>
          <Text style={styles.backLabel} allowFontScaling>
            Back
          </Text>
        </Pressable>
      ) : null}

      {hasTitle ? (
        <Text style={styles.largeTitle} allowFontScaling>
          {title}
        </Text>
      ) : null}

      {typeof description === 'string' ? (
        <Text style={styles.lead}>{description}</Text>
      ) : hasDesc ? (
        <>{description}</>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backPressed: {
    opacity: 0.55,
  },
  backChevron: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.primary,
    marginRight: 2,
    marginTop: -2,
    lineHeight: 28,
  },
  backLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.primary,
  },
  largeTitle: {
    fontSize: Platform.select({ ios: 34, default: 28 }),
    fontWeight: '700',
    color: colors.text,
    letterSpacing: Platform.select({ ios: 0.37, default: -0.5 }),
    marginBottom: spacing.sm,
    lineHeight: Platform.select({ ios: 41, default: 34 }),
  },
  lead: {
    fontSize: 15,
    color: colors.textSubtle,
    lineHeight: 22,
  },
})
