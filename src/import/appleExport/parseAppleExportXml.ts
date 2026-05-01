import { XMLParser } from 'fast-xml-parser'

import type { AppleExportParseResult, HealthImportFile, HealthSampleRow } from '../../types'
import { IMPORT_VERSION } from '../../types'
import { workoutActivityStringFromExport } from './workoutActivityMap'

export class AppleExportParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppleExportParseError'
  }
}

function ensureArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return []
  return Array.isArray(x) ? x : [x]
}

function parseAppleHealthDate(raw: string | undefined, ctx: string): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new AppleExportParseError(`${ctx}: missing date`)
  }
  const d = new Date(raw.trim())
  if (Number.isNaN(d.getTime())) {
    throw new AppleExportParseError(`${ctx}: invalid date "${raw}"`)
  }
  return d.toISOString()
}

function num(raw: string | undefined, ctx: string): number {
  if (raw == null || raw === '') throw new AppleExportParseError(`${ctx}: missing number`)
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new AppleExportParseError(`${ctx}: not a number "${raw}"`)
  return n
}

function optNum(raw: string | undefined): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/** Water export units vary; our importer expects liters (see saveWater). */
function waterLitersFromRecord(value: number, unitRaw: string | undefined): number {
  const u = (unitRaw ?? 'L').trim().toLowerCase()
  if (u === 'l' || u === 'liter' || u === 'liters') return value
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return value / 1000
  if (u === 'cup' || u === 'cups') return value * 0.236588
  if (u === 'floz' || u === 'fl oz' || u === 'us_fl_oz') return value * 0.0295735
  return value
}

const SUPPORTED_RECORD_TYPES: Record<string, (attrs: Record<string, string>) => HealthSampleRow | null> = {
  HKQuantityTypeIdentifierStepCount: (a) => ({
    type: 'steps',
    value: num(a.value, 'steps.value'),
    startDate: parseAppleHealthDate(a.startDate, 'steps.startDate'),
    endDate: parseAppleHealthDate(a.endDate, 'steps.endDate'),
  }),
  HKQuantityTypeIdentifierHeartRate: (a) => ({
    type: 'heart_rate',
    value: num(a.value, 'heart_rate.value'),
    date: parseAppleHealthDate(a.startDate ?? a.endDate, 'heart_rate.date'),
  }),
  HKQuantityTypeIdentifierDistanceWalkingRunning: (a) => ({
    type: 'walking_distance',
    value: num(a.value, 'walking_distance.value'),
    startDate: parseAppleHealthDate(a.startDate, 'walking_distance.startDate'),
    endDate: parseAppleHealthDate(a.endDate, 'walking_distance.endDate'),
    unit: a.unit?.trim() || 'meter',
  }),
  HKQuantityTypeIdentifierBodyMass: (a) => ({
    type: 'weight',
    value: num(a.value, 'weight.value'),
    startDate: parseAppleHealthDate(a.startDate ?? a.endDate, 'weight.startDate'),
    unit: a.unit?.trim() || 'pound',
  }),
  HKQuantityTypeIdentifierDietaryWater: (a) => {
    const rawVal = num(a.value, 'water.value')
    const liters = waterLitersFromRecord(rawVal, a.unit)
    return {
      type: 'water',
      value: liters,
      date: parseAppleHealthDate(a.startDate ?? a.endDate, 'water.date'),
    }
  },
  HKQuantityTypeIdentifierBodyTemperature: (a) => ({
    type: 'body_temperature',
    value: num(a.value, 'body_temperature.value'),
    date: parseAppleHealthDate(a.startDate ?? a.endDate, 'body_temperature.date'),
    unit: a.unit?.trim() || 'degC',
  }),
  HKQuantityTypeIdentifierHeight: (a) => ({
    type: 'height',
    value: num(a.value, 'height.value'),
    startDate: parseAppleHealthDate(a.startDate ?? a.endDate, 'height.startDate'),
    unit: a.unit?.trim() || 'meter',
  }),
  HKCategoryTypeIdentifierMindfulSession: (a) => ({
    type: 'mindful_session',
    startDate: parseAppleHealthDate(a.startDate, 'mindful_session.startDate'),
    endDate: parseAppleHealthDate(a.endDate, 'mindful_session.endDate'),
  }),
}

function attrsToRecord(el: unknown): Record<string, string> {
  if (!el || typeof el !== 'object') return {}
  const o = el as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('#')) continue
    if (typeof v === 'string') out[k] = v
  }
  return out
}

function parseWorkout(el: unknown, idx: number): HealthSampleRow | null {
  const a = attrsToRecord(el)
  const startDate = parseAppleHealthDate(a.startDate, `workout[${idx}].startDate`)
  const endDate = parseAppleHealthDate(a.endDate, `workout[${idx}].endDate`)
  const activity = workoutActivityStringFromExport(a.workoutActivityType)

  const energy = optNum(a.totalEnergyBurned)
  const distance = optNum(a.totalDistance)

  return {
    type: 'workout',
    activity,
    startDate,
    endDate,
    ...(energy != null && energy >= 0
      ? { energyBurned: energy, energyBurnedUnit: (a.totalEnergyBurnedUnit ?? 'kilocalorie').trim() }
      : {}),
    ...(distance != null && distance >= 0
      ? { distance, distanceUnit: (a.totalDistanceUnit ?? 'meter').trim() }
      : {}),
  }
}

/**
 * Parses Apple Health `export.xml` (from the official export bundle) into the same
 * JSON-shaped samples this app already writes via HealthKit.
 */
export function parseAppleExportXml(xml: string): AppleExportParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
  })

  let root: unknown
  try {
    root = parser.parse(xml)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new AppleExportParseError(`XML parse failed: ${msg}`)
  }

  const healthData =
    (root as { HealthData?: unknown; healthData?: unknown }).HealthData ??
    (root as { healthData?: unknown }).healthData

  if (!healthData || typeof healthData !== 'object') {
    throw new AppleExportParseError('Expected a <HealthData> root element')
  }

  const hd = healthData as Record<string, unknown>
  const records = ensureArray(hd.Record) as unknown[]
  const workouts = ensureArray(hd.Workout) as unknown[]

  const samples: HealthSampleRow[] = []
  const skippedUnsupportedTypes: Record<string, number> = {}
  const parseWarnings: string[] = []

  let recordsSeen = 0
  for (let i = 0; i < records.length; i++) {
    const el = records[i]
    const a = attrsToRecord(el)
    const t = a.type
    if (!t) {
      parseWarnings.push(`Record[${i}] has no type attribute — skipped`)
      continue
    }
    recordsSeen++

    const fn = SUPPORTED_RECORD_TYPES[t]
    if (!fn) {
      skippedUnsupportedTypes[t] = (skippedUnsupportedTypes[t] ?? 0) + 1
      continue
    }

    try {
      const row = fn(a)
      if (row) samples.push(row)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      parseWarnings.push(`Record[${i}] (${t}): ${msg}`)
    }
  }

  let workoutsSeen = 0
  for (let i = 0; i < workouts.length; i++) {
    workoutsSeen++
    try {
      const row = parseWorkout(workouts[i], i)
      if (row) samples.push(row)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      parseWarnings.push(`Workout[${i}]: ${msg}`)
    }
  }

  const skippedTotal = Object.values(skippedUnsupportedTypes).reduce((s, n) => s + n, 0)
  if (skippedTotal > 0) {
    parseWarnings.push(
      `Skipped ${skippedTotal} record(s) whose HK types are not mapped to this app (only a subset of Health data can be re-imported).`,
    )
  }

  return {
    file: {
      version: IMPORT_VERSION,
      samples,
      meta: {
        notes: 'Parsed from Apple Health export.xml',
      },
    },
    skippedUnsupportedTypes,
    parseWarnings,
    stats: {
      recordsSeen,
      workoutsSeen,
      samplesEmitted: samples.length,
    },
  }
}
