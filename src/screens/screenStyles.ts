import { StyleSheet } from 'react-native'

import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'

export const screenStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.section,
    flexGrow: 1,
  },
  lead: {
    fontSize: 15,
    color: colors.textSubtle,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  warn: {
    color: colors.warn,
    marginBottom: spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  metaSmall: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
})
