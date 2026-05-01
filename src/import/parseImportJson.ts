import { debugError, debugLog, debugWarn } from '../lib/debugLog'
import type { HealthImportFile, HealthSampleRow } from '../types'
import { IMPORT_VERSION, isHealthImportFile } from '../types'

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportParseError'
  }
}

function parseIsoDate(label: string, raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ImportParseError(`${label} must be a non-empty ISO date string`)
  }
  const d = Date.parse(raw)
  if (Number.isNaN(d)) {
    throw new ImportParseError(`${label} is not a valid date: ${raw}`)
  }
  return new Date(d).toISOString()
}

function parseSteps(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value) || obj.value < 0) {
    throw new ImportParseError('steps.value must be a non-negative number')
  }
  return {
    type: 'steps',
    value: obj.value,
    startDate: parseIsoDate('steps.startDate', obj.startDate),
    endDate: parseIsoDate('steps.endDate', obj.endDate),
  }
}

function parseHeartRate(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value) || obj.value < 0) {
    throw new ImportParseError('heart_rate.value must be a non-negative number (BPM)')
  }
  const dateRaw = obj.date ?? obj.startDate
  const date = parseIsoDate('heart_rate.date', dateRaw)
  return { type: 'heart_rate', value: obj.value, date }
}

function parseWalkingDistance(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value) || obj.value < 0) {
    throw new ImportParseError('walking_distance.value must be a non-negative number (meters by default)')
  }
  const unit = obj.unit
  if (unit !== undefined && typeof unit !== 'string') {
    throw new ImportParseError('walking_distance.unit must be a string if set')
  }
  return {
    type: 'walking_distance',
    value: obj.value,
    startDate: parseIsoDate('walking_distance.startDate', obj.startDate),
    endDate: parseIsoDate('walking_distance.endDate', obj.endDate),
    unit,
  }
}

function parseWeight(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value) || obj.value <= 0) {
    throw new ImportParseError('weight.value must be a positive number')
  }
  const dateRaw = obj.startDate ?? obj.date
  const startDate = parseIsoDate('weight.startDate', dateRaw)
  const unit = obj.unit
  if (unit !== undefined && typeof unit !== 'string') {
    throw new ImportParseError('weight.unit must be a string if set')
  }
  return { type: 'weight', value: obj.value, startDate, unit }
}

function parseWater(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value) || obj.value < 0) {
    throw new ImportParseError('water.value must be a non-negative number (liters)')
  }
  const dateRaw = obj.date ?? obj.startDate
  const date = parseIsoDate('water.date', dateRaw)
  return { type: 'water', value: obj.value, date }
}

function parseMindful(obj: Record<string, unknown>): HealthSampleRow {
  return {
    type: 'mindful_session',
    startDate: parseIsoDate('mindful_session.startDate', obj.startDate),
    endDate: parseIsoDate('mindful_session.endDate', obj.endDate),
  }
}

function parseWorkout(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.activity !== 'string' || !obj.activity.trim()) {
    throw new ImportParseError('workout.activity must be a non-empty string (e.g. Walking, Running)')
  }
  const energyBurned = obj.energyBurned
  const distance = obj.distance
  if (energyBurned !== undefined && (typeof energyBurned !== 'number' || !Number.isFinite(energyBurned))) {
    throw new ImportParseError('workout.energyBurned must be a number if set')
  }
  if (distance !== undefined && (typeof distance !== 'number' || !Number.isFinite(distance))) {
    throw new ImportParseError('workout.distance must be a number if set')
  }
  return {
    type: 'workout',
    activity: obj.activity.trim(),
    startDate: parseIsoDate('workout.startDate', obj.startDate),
    endDate: parseIsoDate('workout.endDate', obj.endDate),
    energyBurned: energyBurned as number | undefined,
    energyBurnedUnit: typeof obj.energyBurnedUnit === 'string' ? obj.energyBurnedUnit : undefined,
    distance: distance as number | undefined,
    distanceUnit: typeof obj.distanceUnit === 'string' ? obj.distanceUnit : undefined,
  }
}

function parseBodyTemperature(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value)) {
    throw new ImportParseError('body_temperature.value must be a number')
  }
  const dateRaw = obj.date ?? obj.startDate
  const date = parseIsoDate('body_temperature.date', dateRaw)
  const unit = typeof obj.unit === 'string' ? obj.unit : undefined
  return { type: 'body_temperature', value: obj.value, date, unit }
}

function parseHeight(obj: Record<string, unknown>): HealthSampleRow {
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value) || obj.value <= 0) {
    throw new ImportParseError('height.value must be a positive number')
  }
  const dateRaw = obj.startDate ?? obj.date
  const startDate = parseIsoDate('height.startDate', dateRaw)
  const unit = typeof obj.unit === 'string' ? obj.unit : undefined
  return { type: 'height', value: obj.value, startDate, unit }
}

function countByType(samples: HealthSampleRow[]): Record<string, number> {
  const c: Record<string, number> = {}
  for (const s of samples) {
    c[s.type] = (c[s.type] ?? 0) + 1
  }
  return c
}

/** Same rules as {@link parseImportJsonText}, for values already parsed (e.g. Metro `require('*.json')`). */
export function parseImportJsonValue(parsed: unknown): HealthImportFile {
  debugLog('Parse', 'parseImportJsonValue start', {
    isObject: parsed != null && typeof parsed === 'object',
  })

  if (!isHealthImportFile(parsed)) {
    debugWarn('Parse', 'root validation failed', {
      hasVersion: parsed && typeof parsed === 'object' && 'version' in (parsed as object),
      version: (parsed as { version?: unknown })?.version,
      samplesIsArray:
        parsed && typeof parsed === 'object' && Array.isArray((parsed as { samples?: unknown }).samples),
    })
    throw new ImportParseError(
      `Expected { "version": ${IMPORT_VERSION}, "samples": [...] } at the root`,
    )
  }

  const samples: HealthSampleRow[] = []
  const rawSamples = parsed.samples as unknown[]
  for (let i = 0; i < rawSamples.length; i++) {
    const row = rawSamples[i]
    if (!row || typeof row !== 'object') {
      throw new ImportParseError(`samples[${i}] must be an object`)
    }
    const o = row as Record<string, unknown>
    const t = o.type
    switch (t) {
      case 'steps':
        samples.push(parseSteps(o))
        break
      case 'heart_rate':
        samples.push(parseHeartRate(o))
        break
      case 'walking_distance':
        samples.push(parseWalkingDistance(o))
        break
      case 'weight':
        samples.push(parseWeight(o))
        break
      case 'water':
        samples.push(parseWater(o))
        break
      case 'mindful_session':
        samples.push(parseMindful(o))
        break
      case 'workout':
        samples.push(parseWorkout(o))
        break
      case 'body_temperature':
        samples.push(parseBodyTemperature(o))
        break
      case 'height':
        samples.push(parseHeight(o))
        break
      default:
        throw new ImportParseError(
          `samples[${i}].type "${String(t)}" is not supported (see README / types.ts)`,
        )
    }
  }

  debugLog('Parse', 'parseImportJsonValue OK', {
    total: samples.length,
    byType: countByType(samples),
  })
  return { version: IMPORT_VERSION, samples, meta: parsed.meta }
}

export function parseImportJsonText(text: string): HealthImportFile {
  debugLog('Parse', 'parseImportJsonText start', { charLength: text.length })
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch (e) {
    debugError('Parse', 'JSON.parse failed', e)
    throw new ImportParseError('File is not valid JSON')
  }
  return parseImportJsonValue(parsed)
}
