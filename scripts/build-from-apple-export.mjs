/**
 * Reads an unzipped Apple Health export folder (default assets/apple_health_export):
 *   - export.xml      → streams HK Record/Workout rows into HealthImport JSON samples.
 *   - export_cda.xml  → streams for byte size + rough <entry count (HL7 CDA; not mapped to HK samples).
 *
 * Skips electrocardiograms/ and workout-routes/ (not supported by this app’s HealthKit writers).
 *
 * Output: directory (default assets/apple_health_import.chunks/):
 *   - manifest.json       — chunk list + shared meta
 *   - chunk-00001.hkchunk — UTF-8 JSON { "version": 1, "samples": [...] } (same data as .json; extension avoids Metro inlining all chunks into one huge JS bundle string).
 *
 * Run sync-bundled-chunk-assets.mjs after (package.json) — it registers these as asset requires, not JSON modules.
 *
 * Run: npm run import:from-apple-export
 *      npm run import:from-apple-export -- --chunk-samples 5000 --out-dir assets/my_chunks
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, isAbsolute, join, relative } from 'path'
import { fileURLToPath } from 'url'
import sax from 'sax'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const DEFAULT_IN = join(projectRoot, 'assets/apple_health_export')
const DEFAULT_OUT_DIR = join(projectRoot, 'assets/apple_health_import.chunks')
const DEFAULT_CHUNK_SAMPLES = 10_000

const CHUNK_MANIFEST_FORMAT = 'healthkit-dummy-seeder-chunks/v1'

const IMPORT_VERSION = 1

/** @type {Record<number, string>} */
const HK_WORKOUT_ENUM_TO_RN = {
  1: 'AmericanFootball',
  2: 'Archery',
  3: 'AustralianFootball',
  4: 'Badminton',
  5: 'Baseball',
  6: 'Basketball',
  7: 'Bowling',
  8: 'Boxing',
  9: 'Climbing',
  10: 'Cricket',
  11: 'CrossTraining',
  12: 'Curling',
  13: 'Cycling',
  14: 'Dance',
  15: 'DanceInspiredTraining',
  16: 'Elliptical',
  17: 'EquestrianSports',
  18: 'Fencing',
  19: 'Fishing',
  20: 'FunctionalStrengthTraining',
  21: 'Golf',
  22: 'Gymnastics',
  23: 'Handball',
  24: 'Hiking',
  25: 'Hockey',
  26: 'Hunting',
  27: 'Lacrosse',
  28: 'MartialArts',
  29: 'MindAndBody',
  30: 'MixedMetabolicCardioTraining',
  31: 'PaddleSports',
  32: 'Play',
  33: 'PreparationAndRecovery',
  34: 'Racquetball',
  35: 'Rowing',
  36: 'Rugby',
  37: 'Running',
  38: 'Sailing',
  39: 'SkatingSports',
  40: 'SnowSports',
  41: 'Soccer',
  42: 'Softball',
  43: 'Squash',
  44: 'StairClimbing',
  45: 'SurfingSports',
  46: 'Swimming',
  47: 'TableTennis',
  48: 'Tennis',
  49: 'TrackAndField',
  50: 'TraditionalStrengthTraining',
  51: 'Volleyball',
  52: 'Walking',
  53: 'WaterFitness',
  54: 'WaterPolo',
  55: 'WaterSports',
  56: 'Wrestling',
  57: 'Yoga',
  58: 'Barre',
  59: 'CoreTraining',
  60: 'CrossCountrySkiing',
  61: 'DownhillSkiing',
  62: 'Flexibility',
  63: 'HighIntensityIntervalTraining',
  64: 'JumpRope',
  65: 'Kickboxing',
  66: 'Pilates',
  67: 'Snowboarding',
  68: 'Stairs',
  69: 'StepTraining',
  70: 'WheelchairWalkPace',
  71: 'WheelchairRunPace',
  72: 'TaiChi',
  73: 'MixedCardio',
  74: 'HandCycling',
  75: 'DiscSports',
  76: 'FitnessGaming',
  77: 'CardioDance',
  78: 'SocialDance',
  79: 'Pickleball',
  80: 'Cooldown',
  82: 'Other',
  83: 'Other',
  84: 'Other',
  3000: 'Other',
}

const RN_SET = new Set(Object.values(HK_WORKOUT_ENUM_TO_RN))

function workoutActivityStringFromExport(raw) {
  if (raw == null) return 'Other'
  const s = String(raw).trim()
  if (!s) return 'Other'
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    return HK_WORKOUT_ENUM_TO_RN[n] ?? 'Other'
  }
  const stripped = s.replace(/^HKWorkoutActivityType/i, '')
  if (stripped !== s && stripped.length) return RN_SET.has(stripped) ? stripped : 'Other'
  if (RN_SET.has(s)) return s
  return 'Other'
}

function parseDate(raw, ctx) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(`${ctx}: missing date`)
  const d = new Date(raw.trim())
  if (Number.isNaN(d.getTime())) throw new Error(`${ctx}: bad date`)
  return d.toISOString()
}

function num(raw, ctx) {
  if (raw == null || raw === '') throw new Error(`${ctx}: missing number`)
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`${ctx}: NaN`)
  return n
}

function optNum(raw) {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function waterLitersFromRecord(value, unitRaw) {
  const u = (unitRaw ?? 'L').trim().toLowerCase()
  if (u === 'l' || u === 'liter' || u === 'liters') return value
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return value / 1000
  if (u === 'cup' || u === 'cups') return value * 0.236588
  if (u === 'floz' || u === 'fl oz' || u === 'us_fl_oz') return value * 0.0295735
  return value
}

function attrsToObj(node) {
  const a = node.attributes
  if (!a) return {}
  if (typeof a === 'object' && !Array.isArray(a)) return { ...a }
  if (Array.isArray(a)) {
    const o = {}
    for (const x of a) {
      if (x && x.name != null) o[x.name] = x.value
    }
    return o
  }
  return {}
}

/** @type {Record<string, (a: Record<string, string>) => object>} */
const RECORD_HANDLERS = {
  HKQuantityTypeIdentifierStepCount: (a) => ({
    type: 'steps',
    value: num(a.value, 'steps'),
    startDate: parseDate(a.startDate, 'steps'),
    endDate: parseDate(a.endDate, 'steps'),
  }),
  HKQuantityTypeIdentifierHeartRate: (a) => ({
    type: 'heart_rate',
    value: num(a.value, 'hr'),
    date: parseDate(a.startDate ?? a.endDate, 'hr'),
  }),
  HKQuantityTypeIdentifierDistanceWalkingRunning: (a) => ({
    type: 'walking_distance',
    value: num(a.value, 'dist'),
    startDate: parseDate(a.startDate, 'dist'),
    endDate: parseDate(a.endDate, 'dist'),
    unit: (a.unit && String(a.unit).trim()) || 'meter',
  }),
  HKQuantityTypeIdentifierBodyMass: (a) => ({
    type: 'weight',
    value: num(a.value, 'w'),
    startDate: parseDate(a.startDate ?? a.endDate, 'w'),
    unit: (a.unit && String(a.unit).trim()) || 'pound',
  }),
  HKQuantityTypeIdentifierDietaryWater: (a) => {
    const rawVal = num(a.value, 'water')
    return {
      type: 'water',
      value: waterLitersFromRecord(rawVal, a.unit),
      date: parseDate(a.startDate ?? a.endDate, 'water'),
    }
  },
  HKQuantityTypeIdentifierBodyTemperature: (a) => ({
    type: 'body_temperature',
    value: num(a.value, 'bt'),
    date: parseDate(a.startDate ?? a.endDate, 'bt'),
    unit: (a.unit && String(a.unit).trim()) || 'degC',
  }),
  HKQuantityTypeIdentifierHeight: (a) => ({
    type: 'height',
    value: num(a.value, 'h'),
    startDate: parseDate(a.startDate ?? a.endDate, 'h'),
    unit: (a.unit && String(a.unit).trim()) || 'meter',
  }),
  HKCategoryTypeIdentifierMindfulSession: (a) => ({
    type: 'mindful_session',
    startDate: parseDate(a.startDate, 'm'),
    endDate: parseDate(a.endDate, 'm'),
  }),
}

function workoutFromAttrs(a, idx) {
  const startDate = parseDate(a.startDate, `wo[${idx}].s`)
  const endDate = parseDate(a.endDate, `wo[${idx}].e`)
  const activity = workoutActivityStringFromExport(a.workoutActivityType)
  const energy = optNum(a.totalEnergyBurned)
  const distance = optNum(a.totalDistance)
  const row = {
    type: 'workout',
    activity,
    startDate,
    endDate,
  }
  if (energy != null && energy >= 0) {
    row.energyBurned = energy
    row.energyBurnedUnit = (a.totalEnergyBurnedUnit && String(a.totalEnergyBurnedUnit).trim()) || 'kilocalorie'
  }
  if (distance != null && distance >= 0) {
    row.distance = distance
    row.distanceUnit = (a.totalDistanceUnit && String(a.totalDistanceUnit).trim()) || 'meter'
  }
  return row
}

/** Count non-overlapping occurrences of needle (bounded buffer). */
async function streamCountSubstring(filePath, needle) {
  const rs = createReadStream(filePath, { encoding: 'utf8', highWaterMark: 4 * 1024 * 1024 })
  let total = 0
  let buf = ''
  for await (const chunk of rs) {
    buf += chunk
    while (buf.length >= needle.length) {
      const p = buf.indexOf(needle)
      if (p === -1) {
        buf = buf.slice(-(needle.length - 1))
        break
      }
      total++
      buf = buf.slice(p + needle.length)
    }
  }
  while (buf.length >= needle.length) {
    const p = buf.indexOf(needle)
    if (p === -1) break
    total++
    buf = buf.slice(p + needle.length)
  }
  return total
}

function parseArgs() {
  const args = process.argv.slice(2)
  let inDir = DEFAULT_IN
  let outDir = DEFAULT_OUT_DIR
  let chunkMaxSamples = DEFAULT_CHUNK_SAMPLES
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--in' && args[i + 1]) {
      const p = args[++i]
      inDir = isAbsolute(p) ? p : join(projectRoot, p)
    } else if (args[i] === '--out-dir' && args[i + 1]) {
      const p = args[++i]
      outDir = isAbsolute(p) ? p : join(projectRoot, p)
    } else if (args[i] === '--chunk-samples' && args[i + 1]) {
      const n = parseInt(args[++i], 10)
      if (Number.isFinite(n) && n > 0) chunkMaxSamples = n
    }
  }
  return { inDir, outDir, chunkMaxSamples }
}

function prepareChunkOutputDir(dir) {
  mkdirSync(dir, { recursive: true })
  for (const f of readdirSync(dir)) {
    if (f === 'manifest.json' || /^chunk-\d+\.(json|hkchunk)$/.test(f)) {
      unlinkSync(join(dir, f))
    }
  }
}

async function main() {
  const { inDir, outDir, chunkMaxSamples } = parseArgs()
  const exportXmlPath = join(inDir, 'export.xml')
  const exportCdaPath = join(inDir, 'export_cda.xml')

  if (!existsSync(exportXmlPath)) {
    console.error(
      `Missing ${relative(projectRoot, exportXmlPath)} — paste your unzipped Apple export so export.xml exists.`,
    )
    process.exit(1)
  }

  const exportXmlBytes = statSync(exportXmlPath).size

  /** @type {Record<string, number>} */
  const skippedUnsupported = {}
  const parseWarnings = []
  let recordsSeen = 0
  let workoutsSeen = 0
  let samplesWritten = 0
  const progressEvery = 100000

  let exportCdaMeta = null
  if (existsSync(exportCdaPath)) {
    const st = statSync(exportCdaPath)
    console.error('[build-from-apple-export] Scanning export_cda.xml (this can take a while on huge files)…')
    const entryApprox = await streamCountSubstring(exportCdaPath, '<entry')
    exportCdaMeta = {
      relativePath: relative(projectRoot, exportCdaPath),
      bytes: st.size,
      approxEntryTagCount: entryApprox,
      note:
        'HL7 CDA clinical documents. This app imports HealthKit-style quantities from export.xml only; CDA is not converted to import rows.',
    }
    console.error(
      `[build-from-apple-export] export_cda.xml: ${(st.size / 1e9).toFixed(2)} GB, ~${entryApprox} "<entry" occurrences.`,
    )
  } else {
    console.error('[build-from-apple-export] export_cda.xml not found in folder — skipping.')
  }

  prepareChunkOutputDir(outDir)
  console.error(
    `[build-from-apple-export] Writing .hkchunk parts → ${relative(projectRoot, outDir)} (max ${chunkMaxSamples} samples per file)`,
  )

  const chunkFilesWritten = []
  /** @type {unknown[]} */
  let currentChunk = []
  let chunkSeq = 0

  function flushChunk() {
    if (currentChunk.length === 0) return
    chunkSeq++
    const fname = `chunk-${String(chunkSeq).padStart(5, '0')}.hkchunk`
    const payload = { version: IMPORT_VERSION, samples: currentChunk }
    writeFileSync(join(outDir, fname), `${JSON.stringify(payload)}\n`, 'utf8')
    chunkFilesWritten.push(fname)
    currentChunk = []
  }

  function pushSample(obj) {
    currentChunk.push(obj)
    samplesWritten++
    if (currentChunk.length >= chunkMaxSamples) {
      flushChunk()
    }
  }

  const xmlReadStream = createReadStream(exportXmlPath, { encoding: 'utf8', highWaterMark: 1024 * 1024 })
  const parser = sax.createStream(true, { trim: true })

  parser.on('opentag', (node) => {
    const name = node.name
    if (name === 'Record') {
      recordsSeen++
      const a = attrsToObj(node)
      const t = a.type
      if (!t) return
      const fn = RECORD_HANDLERS[t]
      if (!fn) {
        skippedUnsupported[t] = (skippedUnsupported[t] ?? 0) + 1
        return
      }
      try {
        pushSample(fn(a))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (parseWarnings.length < 80) parseWarnings.push(`Record (${t}): ${msg}`)
      }
      if (recordsSeen % progressEvery === 0) {
        console.error(
          `[build-from-apple-export] export.xml … ${recordsSeen} records seen, ${samplesWritten} samples written`,
        )
      }
      return
    }
    if (name === 'Workout') {
      workoutsSeen++
      const a = attrsToObj(node)
      try {
        pushSample(workoutFromAttrs(a, workoutsSeen - 1))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (parseWarnings.length < 80) parseWarnings.push(`Workout: ${msg}`)
      }
    }
  })

  await new Promise((resolve, reject) => {
    parser.on('error', reject)
    parser.on('end', resolve)
    xmlReadStream.on('error', reject)
    xmlReadStream.pipe(parser)
  })

  flushChunk()

  const skippedTotal = Object.values(skippedUnsupported).reduce((a, b) => a + b, 0)
  if (skippedTotal > 0) {
    parseWarnings.push(
      `Skipped ${skippedTotal} Record(s) with HK types not mapped to this app (see types / parser).`,
    )
  }

  const meta = {
    notes: 'Generated by scripts/build-from-apple-export.mjs (chunked JSON)',
    generated: new Date().toISOString(),
    appleExport: {
      inputDir: relative(projectRoot, inDir),
      exportXml: {
        relativePath: relative(projectRoot, exportXmlPath),
        bytes: exportXmlBytes,
        recordsSeen,
        workoutsSeen,
        samplesEmitted: samplesWritten,
        skippedUnsupportedTypes: skippedUnsupported,
        parseWarnings: parseWarnings.slice(0, 40),
      },
      exportCdaXml: exportCdaMeta,
      skippedFolders: {
        electrocardiograms: 'Not imported (no ECG write API in this bridge).',
        workoutRoutes: 'Not imported (no HKWorkoutRoute save API in this bridge).',
      },
    },
  }

  const manifest = {
    format: CHUNK_MANIFEST_FORMAT,
    importVersion: IMPORT_VERSION,
    chunkMaxSamples,
    chunks: chunkFilesWritten,
    totalSamples: samplesWritten,
    meta,
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  let bytesTotal = statSync(join(outDir, 'manifest.json')).size
  for (const f of chunkFilesWritten) {
    bytesTotal += statSync(join(outDir, f)).size
  }
  console.error(
    `[build-from-apple-export] Done: ${chunkFilesWritten.length} chunk file(s) + manifest under ${relative(projectRoot, outDir)} (~${(bytesTotal / 1e6).toFixed(1)} MB total, ${samplesWritten} samples).`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
