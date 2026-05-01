/**
 * Generates assets/sample-health-import.json — ONE calendar year, high volume for stress tests.
 *
 * Set YEAR, then tune density knobs (same year, more rows = bigger HealthKit load).
 * Run: node scripts/generate-year-sample.mjs
 */
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outFile = join(__dirname, '../assets/sample-health-import.json')

// --- Year (only value you must change for a new calendar year) ---
const YEAR = 2024

// --- Density (single year). Raise these to stress-test sync / imports / other apps. ---
/** Step count split into N time windows per day (N step + N walking_distance samples). */
const STEP_INTERVALS_PER_DAY = 32
/** Heart rate samples per day (spread across 24h). e.g. 96 ≈ every 15 min. */
const HEART_RATE_PER_DAY = 96
/** Water entries per day (liters split across entries). */
const WATER_PER_DAY = 12
/** Extra workouts: one every N days (smaller N = more workouts). */
const WORKOUT_EVERY_N_DAYS = 2

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

const START = new Date(`${YEAR}-01-01T00:00:00.000Z`)
const DAYS = isLeapYear(YEAR) ? 366 : 365
const DAY_MS = 86400000

/** Deterministic pseudo-random in [a,b) */
function rnd(a, b, seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return a + (x - Math.floor(x)) * (b - a)
}

/** Split positive integer `total` across `parts` buckets (sum === total). */
function splitIntegerAcrossParts(total, parts, seed) {
  if (parts <= 0) return []
  if (parts === 1) return [total]
  const weights = Array.from({ length: parts }, (_, i) => 0.15 + rnd(0, 1.35, seed * 19 + i * 3.17))
  const wsum = weights.reduce((a, b) => a + b, 0)
  const out = weights.map((w) => Math.floor((total * w) / wsum))
  let drift = total - out.reduce((a, b) => a + b, 0)
  let i = 0
  while (drift !== 0 && i < parts * 20) {
    const idx = i % parts
    if (drift > 0) {
      out[idx]++
      drift--
    } else if (drift < 0 && out[idx] > 0) {
      out[idx]--
      drift++
    }
    i++
  }
  return out
}

/** Split positive float `total` across `parts` (sum ≈ total). */
function splitFloatTotal(total, parts, seed) {
  const weights = Array.from({ length: parts }, (_, i) => 0.1 + rnd(0, 1, seed + i * 2.71))
  const wsum = weights.reduce((a, b) => a + b, 0)
  const raw = weights.map((w) => (total * w) / wsum)
  const rounded = raw.map((x) => Math.round(x * 1000) / 1000)
  let drift = Math.round((total - rounded.reduce((a, b) => a + b, 0)) * 1000) / 1000
  let i = 0
  while (Math.abs(drift) > 1e-6 && i < parts * 10) {
    const idx = i % parts
    const step = drift > 0 ? 0.001 : -0.001
    if (rounded[idx] + step >= 0.001) {
      rounded[idx] = Math.round((rounded[idx] + step) * 1000) / 1000
      drift = Math.round((total - rounded.reduce((a, b) => a + b, 0)) * 1000) / 1000
    }
    i++
  }
  return rounded
}

function iso(d) {
  return new Date(d).toISOString()
}

const samples = []

for (let d = 0; d < DAYS; d++) {
  const day = new Date(START.getTime() + d * DAY_MS)
  const s = d * 131 + 7

  const dayTotalSteps = Math.round(4500 + rnd(0, 9500, s))
  const stepParts = splitIntegerAcrossParts(dayTotalSteps, STEP_INTERVALS_PER_DAY, s + 1)
  const slotMs = DAY_MS / STEP_INTERVALS_PER_DAY

  for (let i = 0; i < STEP_INTERVALS_PER_DAY; i++) {
    const segStart = new Date(day.getTime() + i * slotMs)
    const segEnd = new Date(day.getTime() + (i + 1) * slotMs - 1)
    const v = stepParts[i] ?? 0
    if (v <= 0) continue
    samples.push({
      type: 'steps',
      value: v,
      startDate: iso(segStart),
      endDate: iso(segEnd),
    })
    const meters = Math.max(1, Math.round(v * 0.78))
    samples.push({
      type: 'walking_distance',
      value: meters,
      startDate: iso(segStart),
      endDate: iso(segEnd),
    })
  }

  const totalWaterLiters = Math.round((1.7 + rnd(0, 1.8, s + 0.2)) * 100) / 100
  const waterParts = splitFloatTotal(totalWaterLiters, WATER_PER_DAY, s + 3)
  for (let w = 0; w < WATER_PER_DAY; w++) {
    const amt = waterParts[w]
    if (amt < 0.01) continue
    const frac = (w + 0.3 + rnd(0, 0.4, s + w)) / WATER_PER_DAY
    const t = new Date(day.getTime() + frac * DAY_MS)
    samples.push({
      type: 'water',
      value: Math.round(amt * 1000) / 1000,
      date: iso(t),
    })
  }

  for (let h = 0; h < HEART_RATE_PER_DAY; h++) {
    const base = day.getTime() + ((h + 0.5) / HEART_RATE_PER_DAY) * DAY_MS
    const jitter = rnd(-120000, 120000, s + h * 1.91)
    const t = new Date(base + jitter)
    const bpm = Math.round(52 + rnd(0, 48, s + h * 2.2) + rnd(-5, 8, s + h))
    samples.push({
      type: 'heart_rate',
      value: Math.max(40, Math.min(200, bpm)),
      date: iso(t),
    })
  }

  if (d % 7 === 2) {
    samples.push({
      type: 'body_temperature',
      value: Math.round((36.3 + rnd(0, 0.9, s + 4)) * 10) / 10,
      date: iso(new Date(day.getTime() + 10 * 3600000)),
      unit: 'celsius',
    })
  }

  if (d % 7 === 5) {
    const st = new Date(day.getTime() + 7.5 * 3600000)
    const en = new Date(st.getTime() + (10 + rnd(0, 8, s)) * 60000)
    samples.push({
      type: 'mindful_session',
      startDate: iso(st),
      endDate: iso(en),
    })
  }

  if (d % 7 === 0) {
    const lb = 168 + rnd(0, 18, s)
    samples.push({
      type: 'weight',
      value: Math.round(lb * 10) / 10,
      startDate: iso(new Date(day.getTime() + 8 * 3600000)),
      unit: 'pound',
    })
  }

  if (d % WORKOUT_EVERY_N_DAYS === 0) {
    const types = [
      {
        activity: 'Walking',
        energyBurned: 140 + rnd(0, 80, s),
        distance: 2000 + rnd(0, 2500, s + 1),
      },
      {
        activity: 'Running',
        energyBurned: 280 + rnd(0, 120, s),
        distance: 4000 + rnd(0, 6000, s + 1),
      },
      {
        activity: 'Cycling',
        energyBurned: 320 + rnd(0, 150, s),
        distance: 12000 + rnd(0, 8000, s + 1),
      },
      {
        activity: 'Yoga',
        energyBurned: 120 + rnd(0, 60, s),
        distance: 50 + rnd(0, 100, s),
      },
    ]
    const pick = types[d % types.length]
    const wstart = new Date(day.getTime() + 17 * 3600000)
    const wend = new Date(wstart.getTime() + (25 + rnd(0, 40, s)) * 60000)
    samples.push({
      type: 'workout',
      activity: pick.activity,
      startDate: iso(wstart),
      endDate: iso(wend),
      energyBurned: Math.round(pick.energyBurned),
      energyBurnedUnit: 'kilocalorie',
      distance: Math.round(pick.distance),
      distanceUnit: 'meter',
    })
  }
}

samples.push({
  type: 'height',
  value: 1.78,
  startDate: iso(new Date(START.getTime() + 10 * 3600000)),
  unit: 'meter',
})

const rangeLabel = `${YEAR}-01-01 — ${YEAR}-12-31 (${DAYS} days${isLeapYear(YEAR) ? ', leap year' : ''})`

const doc = {
  version: 1,
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    rangeUtc: rangeLabel,
    density: {
      STEP_INTERVALS_PER_DAY,
      HEART_RATE_PER_DAY,
      WATER_PER_DAY,
      WORKOUT_EVERY_N_DAYS,
    },
    notes:
      'High-volume dummy data for stress testing. Sleep analysis is not included (no write API in react-native-health). Tune density constants at top of generate-year-sample.mjs.',
  },
  samples,
}

writeFileSync(outFile, JSON.stringify(doc, null, 2), 'utf8')
console.log(`Wrote ${samples.length} samples to ${outFile}`)
console.log(
  `Approx per day: ~${STEP_INTERVALS_PER_DAY * 2 + HEART_RATE_PER_DAY + WATER_PER_DAY} core samples + weekly extras + workouts every ${WORKOUT_EVERY_N_DAYS}d`,
)
