/**
 * Central definitions for shared types, interfaces, and related constants.
 */

import type { ReactNode } from 'react'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

// --- Navigation ----------------------------------------------------------------

export type RootStackParamList = {
  Home: undefined
  DummyData: undefined
  AppleExport: undefined
}

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>

// --- Health import JSON --------------------------------------------------------

/** Versioned JSON import format. Add new `type` values as we extend writers. */
export const IMPORT_VERSION = 1 as const

export type SampleType =
  | 'steps'
  | 'heart_rate'
  | 'walking_distance'
  | 'weight'
  | 'water'
  | 'mindful_session'
  | 'workout'
  | 'body_temperature'
  | 'height'

export interface StepsSample {
  type: 'steps'
  value: number
  startDate: string
  endDate: string
}

export interface HeartRateSample {
  type: 'heart_rate'
  value: number
  date?: string
  startDate?: string
}

/** Walking + running distance; `value` is meters unless `unit` set */
export interface WalkingDistanceSample {
  type: 'walking_distance'
  value: number
  startDate: string
  endDate: string
  /** Default meters */
  unit?: string
}

/** Body mass; `value` in pounds unless `unit` is `gram` (value in grams) */
export interface WeightSample {
  type: 'weight'
  value: number
  startDate?: string
  date?: string
  unit?: string
}

/** Water consumed; `value` in liters */
export interface WaterSample {
  type: 'water'
  value: number
  date?: string
  startDate?: string
}

export interface MindfulSessionSample {
  type: 'mindful_session'
  startDate: string
  endDate: string
}

/** Matches react-native-health Activities strings, e.g. Walking, Running */
export interface WorkoutSample {
  type: 'workout'
  activity: string
  startDate: string
  endDate: string
  energyBurned?: number
  energyBurnedUnit?: string
  distance?: number
  distanceUnit?: string
}

export interface BodyTemperatureSample {
  type: 'body_temperature'
  value: number
  date?: string
  startDate?: string
  unit?: string
}

export interface HeightSample {
  type: 'height'
  value: number
  startDate?: string
  date?: string
  unit?: string
}

export type HealthSampleRow =
  | StepsSample
  | HeartRateSample
  | WalkingDistanceSample
  | WeightSample
  | WaterSample
  | MindfulSessionSample
  | WorkoutSample
  | BodyTemperatureSample
  | HeightSample

export interface HealthImportFile {
  version: typeof IMPORT_VERSION
  samples: HealthSampleRow[]
  meta?: {
    notes?: string
    rangeUtc?: string
    generated?: string
    /** Present when JSON was built by scripts/build-from-apple-export.mjs */
    appleExport?: {
      inputDir?: string
      exportXml?: Record<string, unknown>
      exportCdaXml?: Record<string, unknown> | null
      skippedFolders?: Record<string, string>
    }
  }
}

export function isHealthImportFile(value: unknown): value is HealthImportFile {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.version === IMPORT_VERSION && Array.isArray(v.samples)
}

// --- Apple export parsing ------------------------------------------------------

export interface AppleExportParseResult {
  file: HealthImportFile
  skippedUnsupportedTypes: Record<string, number>
  parseWarnings: string[]
  stats: {
    recordsSeen: number
    workoutsSeen: number
    samplesEmitted: number
  }
}

export interface LoadAppleExportResult extends AppleExportParseResult {
  archiveNotes: string[]
  sourceLabel: string
}

// --- HealthKit import session --------------------------------------------------

export type ImportStats = {
  done: number
  total: number
  label: string
}

export type HealthImportContextValue = {
  loaded: HealthImportFile | null
  loadedChunks: HealthImportFile[] | null
  sourceLabel: string
  busy: boolean
  progress: string
  lastLog: string
  importStats: ImportStats | null
  appleExportNotes: string[]
  resumeFromGlobalText: string
  setResumeFromGlobalText: (v: string) => void
  loadBundled: () => void
  loadBundledAppleChunks: () => Promise<void>
  pickFile: () => Promise<void>
  runImport: () => Promise<void>
  iosOnly: boolean
  totalSamplesReady: number
  canImport: boolean
  elapsedSec: number
  pct: number
}

// --- HealthKit import progress (native writes) --------------------------------

export interface ImportProgress {
  done: number
  total: number
  currentLabel: string
}

export type ProgressCallback = (p: ImportProgress) => void

export type ImportSamplesOptions = {
  /** When importing several chunk files in one session, init once and pass `true` for parts 2+. */
  skipHealthKitInit?: boolean
  /** Skip samples with local index `< startSampleIndex` (0-based). Used for resuming a long import. */
  startSampleIndex?: number
}

export type ImportChunksSequentialOptions = {
  /**
   * Global 0-based sample index to start saving at (same ordering as chunked import: part order, then row order).
   * Samples before this index are skipped (not written). Use the last `done` value from logs after a crash.
   */
  startGlobalIndex?: number
}

// --- UI -----------------------------------------------------------------------

export type ScreenHeaderProps = {
  title?: string
  description?: ReactNode
  onBackPress?: () => void
}

export type ImportBusyModalProps = {
  visible: boolean
  pct: number
  importStats: ImportStats | null
  elapsedSec: number
}
