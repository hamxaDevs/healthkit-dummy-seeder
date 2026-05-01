import { NativeModules, Platform } from 'react-native'
import type {
  HealthActivityOptions,
  HealthKitPermissions,
  HealthValueOptions,
} from 'react-native-health'

import { debugError, debugLog, debugWarn } from '../lib/debugLog'
import type {
  HealthImportFile,
  HealthSampleRow,
  ImportChunksSequentialOptions,
  ImportProgress,
  ImportSamplesOptions,
  ProgressCallback,
} from '../types'
import { getRnHealthApiCached } from './resolveRnHealth'

const BATCH_SIZE = 64

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function initHealthKit(): Promise<void> {
  const hk = getRnHealthApiCached()
  const permissions: HealthKitPermissions = {
    permissions: {
      read: [],
      write: [
        hk.Constants.Permissions.Steps,
        hk.Constants.Permissions.HeartRate,
        hk.Constants.Permissions.DistanceWalkingRunning,
        hk.Constants.Permissions.Weight,
        hk.Constants.Permissions.Water,
        hk.Constants.Permissions.MindfulSession,
        hk.Constants.Permissions.Workout,
        hk.Constants.Permissions.BodyTemperature,
        hk.Constants.Permissions.Height,
      ],
    },
  }

  debugLog('HealthKit', 'initHealthKit requesting permissions', {
    write: permissions.permissions.write,
    read: permissions.permissions.read,
  })

  return new Promise((resolve, reject) => {
    hk.initHealthKit(permissions, (err: string | null, result?: unknown) => {
      debugLog('HealthKit', 'initHealthKit callback raw', {
        err,
        errType: typeof err,
        result,
        resultType: typeof result,
      })
      if (err != null && err !== '') {
        const message = typeof err === 'string' ? err : JSON.stringify(err)
        reject(new Error(message))
        return
      }
      resolve()
    })
  })
}

function saveSteps(row: Extract<HealthSampleRow, { type: 'steps' }>): Promise<void> {
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload = {
      value: row.value,
      startDate: row.startDate,
      endDate: row.endDate,
    }
    hk.saveSteps(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveSteps error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveHeartRate(row: Extract<HealthSampleRow, { type: 'heart_rate' }>): Promise<void> {
  const date = row.date
  if (!date) {
    return Promise.reject(new Error('heart_rate missing date'))
  }
  if (row.value <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const opts = { value: row.value, date } as unknown as HealthValueOptions
    hk.saveHeartRateSample(opts, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveHeartRateSample error', err, { value: row.value, date })
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveWalkingDistance(row: Extract<HealthSampleRow, { type: 'walking_distance' }>): Promise<void> {
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload = {
      value: row.value,
      startDate: row.startDate,
      endDate: row.endDate,
      ...(row.unit ? { unit: row.unit } : {}),
    } as HealthValueOptions
    hk.saveWalkingRunningDistance(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveWalkingRunningDistance error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveWeight(row: Extract<HealthSampleRow, { type: 'weight' }>): Promise<void> {
  const startDate = row.startDate
  if (!startDate) {
    return Promise.reject(new Error('weight missing startDate'))
  }
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload = {
      value: row.value,
      startDate,
      ...(row.unit ? { unit: row.unit } : {}),
    } as HealthValueOptions
    hk.saveWeight(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveWeight error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveWater(row: Extract<HealthSampleRow, { type: 'water' }>): Promise<void> {
  const date = row.date
  if (!date) {
    return Promise.reject(new Error('water missing date'))
  }
  if (row.value <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload = { value: row.value, date } as unknown as HealthValueOptions
    hk.saveWater(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveWater error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveMindful(row: Extract<HealthSampleRow, { type: 'mindful_session' }>): Promise<void> {
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload: HealthValueOptions = {
      value: 0,
      startDate: row.startDate,
      endDate: row.endDate,
    }
    hk.saveMindfulSession(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveMindfulSession error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveWorkout(row: Extract<HealthSampleRow, { type: 'workout' }>): Promise<void> {
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    // Native reads energyBurned/distance; HealthActivityOptions typings are minimal.
    const options = {
      type: row.activity,
      startDate: row.startDate,
      endDate: row.endDate,
      energyBurned: row.energyBurned,
      energyBurnedUnit: row.energyBurnedUnit ?? 'kilocalorie',
      distance: row.distance,
      distanceUnit: row.distanceUnit ?? 'meter',
    } as unknown as HealthActivityOptions
    hk.saveWorkout(options, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveWorkout error', err, { activity: row.activity })
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveBodyTemperature(row: Extract<HealthSampleRow, { type: 'body_temperature' }>): Promise<void> {
  const date = row.date
  if (!date) {
    return Promise.reject(new Error('body_temperature missing date'))
  }
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload = {
      value: row.value,
      date,
      unit: row.unit ?? 'celsius',
    } as unknown as HealthValueOptions
    hk.saveBodyTemperature(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveBodyTemperature error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

function saveHeight(row: Extract<HealthSampleRow, { type: 'height' }>): Promise<void> {
  const startDate = row.startDate
  if (!startDate) {
    return Promise.reject(new Error('height missing startDate'))
  }
  return new Promise((resolve, reject) => {
    const hk = getRnHealthApiCached()
    const payload = {
      value: row.value,
      startDate,
      unit: row.unit ?? 'meter',
    } as HealthValueOptions
    hk.saveHeight(payload, (err: string | null) => {
      if (err != null && err !== '') {
        debugWarn('HealthKit', 'saveHeight error', err, payload)
        reject(new Error(err))
        return
      }
      resolve()
    })
  })
}

async function saveRow(row: HealthSampleRow): Promise<void> {
  switch (row.type) {
    case 'steps':
      return saveSteps(row)
    case 'heart_rate':
      return saveHeartRate(row)
    case 'walking_distance':
      return saveWalkingDistance(row)
    case 'weight':
      return saveWeight(row)
    case 'water':
      return saveWater(row)
    case 'mindful_session':
      return saveMindful(row)
    case 'workout':
      return saveWorkout(row)
    case 'body_temperature':
      return saveBodyTemperature(row)
    case 'height':
      return saveHeight(row)
    default: {
      const _exhaustive: never = row
      return Promise.reject(new Error(`unknown sample type: ${JSON.stringify(_exhaustive)}`))
    }
  }
}

export async function importSamplesToHealthKit(
  data: HealthImportFile,
  onProgress?: ProgressCallback,
  options?: ImportSamplesOptions,
): Promise<{ written: number; failed: number; errors: string[] }> {
  const startSampleIndex = Math.max(0, Math.floor(options?.startSampleIndex ?? 0))

  debugLog('HealthKit', 'importSamplesToHealthKit start', {
    platform: Platform.OS,
    sampleCount: data.samples.length,
    hasNativeModule: !!(NativeModules as { AppleHealthKit?: unknown }).AppleHealthKit,
    skipInit: !!options?.skipHealthKitInit,
    startSampleIndex,
  })

  if (Platform.OS !== 'ios') {
    throw new Error('HealthKit import runs on iOS devices only.')
  }

  const nativeMod = (NativeModules as { AppleHealthKit?: unknown }).AppleHealthKit
  if (!nativeMod) {
    debugError('HealthKit', 'AppleHealthKit native module is missing — rebuild iOS dev client with react-native-health.')
  }

  let jsApi: ReturnType<typeof getRnHealthApiCached>
  try {
    jsApi = getRnHealthApiCached()
  } catch (e) {
    debugError('HealthKit', 'Failed to resolve react-native-health JS API', e)
    throw e
  }

  debugLog('HealthKit', 'HealthKit JS bridge methods', {
    hasInitHealthKit: typeof jsApi.initHealthKit === 'function',
    hasSaveSteps: typeof jsApi.saveSteps === 'function',
    hasSaveHeartRateSample: typeof jsApi.saveHeartRateSample === 'function',
  })

  if (!options?.skipHealthKitInit) {
    await initHealthKit()
    debugLog('HealthKit', 'initHealthKit completed OK')
  }

  const total = data.samples.length
  let written = 0
  let failed = 0
  const errors: string[] = []

  if (startSampleIndex >= total) {
    onProgress?.({ done: total, total, currentLabel: 'done (skipped — start past end)' })
    debugLog('HealthKit', 'importSamplesToHealthKit nothing to do (startSampleIndex >= total)', {
      startSampleIndex,
      total,
    })
    return { written: 0, failed: 0, errors: [] }
  }

  for (let i = startSampleIndex; i < data.samples.length; i += BATCH_SIZE) {
    const chunk = data.samples.slice(i, Math.min(i + BATCH_SIZE, data.samples.length))
    for (let j = 0; j < chunk.length; j++) {
      const idx = i + j
      const row = chunk[j]
      const label = `${row.type} #${idx + 1}/${total}`
      onProgress?.({ done: idx, total, currentLabel: label })

      if (__DEV__ && idx < 3) {
        debugLog('HealthKit', `sample ${label}`, row)
      }

      try {
        await saveRow(row)
        written++
        if (__DEV__ && idx < 3) {
          debugLog('HealthKit', `sample ${label} saved OK`)
        }
      } catch (e) {
        failed++
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${label}: ${msg}`)
        debugError('HealthKit', `sample ${label} failed`, e)
      }
    }
    await delay(0)
  }

  onProgress?.({ done: total, total, currentLabel: 'done' })
  debugLog('HealthKit', 'importSamplesToHealthKit finished', {
    written,
    failed,
    errorCount: errors.length,
    firstErrors: errors.slice(0, 10),
  })
  return { written, failed, errors }
}

/** Import multiple `{ version, samples }` files one after another (lower peak memory than merging in JS). */
export async function importHealthImportChunksSequential(
  chunks: HealthImportFile[],
  onProgress?: ProgressCallback,
  seqOptions?: ImportChunksSequentialOptions,
): Promise<{ written: number; failed: number; errors: string[] }> {
  if (chunks.length === 0) {
    return { written: 0, failed: 0, errors: [] }
  }

  const grandTotal = chunks.reduce((n, c) => n + c.samples.length, 0)
  const startGlobalIndex = Math.max(0, Math.floor(seqOptions?.startGlobalIndex ?? 0))

  if (startGlobalIndex >= grandTotal) {
    debugWarn('HealthKit', 'importHealthImportChunksSequential: startGlobalIndex >= grandTotal, nothing to do', {
      startGlobalIndex,
      grandTotal,
    })
    onProgress?.({ done: grandTotal, total: grandTotal, currentLabel: 'done (nothing to import)' })
    return { written: 0, failed: 0, errors: [] }
  }

  let written = 0
  let failed = 0
  const errors: string[] = []
  let offset = 0

  await initHealthKit()
  debugLog('HealthKit', 'importHealthImportChunksSequential init OK', {
    partCount: chunks.length,
    grandTotal,
    startGlobalIndex,
  })

  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i]
    const partLen = part.samples.length
    const partLabel = `${i + 1}/${chunks.length}`
    const partGlobalStart = offset

    if (startGlobalIndex >= partGlobalStart + partLen) {
      offset += partLen
      continue
    }

    const localStart = Math.max(0, startGlobalIndex - partGlobalStart)

    const res = await importSamplesToHealthKit(
      part,
      (p) => {
        onProgress?.({
          done: partGlobalStart + p.done,
          total: grandTotal,
          currentLabel: `Part ${partLabel} · ${p.currentLabel}`,
        })
      },
      { skipHealthKitInit: true, startSampleIndex: localStart },
    )
    offset += partLen
    written += res.written
    failed += res.failed
    for (const e of res.errors) {
      errors.push(`Part ${partLabel}: ${e}`)
    }
  }

  onProgress?.({ done: grandTotal, total: grandTotal, currentLabel: 'done' })
  debugLog('HealthKit', 'importHealthImportChunksSequential finished', { written, failed })
  return { written, failed, errors }
}
