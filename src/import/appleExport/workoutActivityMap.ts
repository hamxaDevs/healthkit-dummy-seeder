/**
 * Maps HKWorkoutActivityType raw values (from Apple Health `export.xml`) to
 * react-native-health `saveWorkout` activity strings (see RCTAppleHealthKit
 * getStringToWorkoutActivityTypeDictionary). Unknown / newer native-only types
 * fall back to Other.
 */
const HK_WORKOUT_ENUM_TO_RN: Record<number, string> = {
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

const RN_ACTIVITY = new Set(Object.values(HK_WORKOUT_ENUM_TO_RN))

/**
 * `workoutActivityType` in export.xml is usually a number string; older exports may use symbols.
 */
export function workoutActivityStringFromExport(raw: string | undefined): string {
  if (raw == null) return 'Other'
  const s = raw.trim()
  if (!s) return 'Other'

  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    return HK_WORKOUT_ENUM_TO_RN[n] ?? 'Other'
  }

  const stripped = s.replace(/^HKWorkoutActivityType/i, '')
  if (stripped !== s && stripped.length > 0) {
    return RN_ACTIVITY.has(stripped) ? stripped : 'Other'
  }

  if (RN_ACTIVITY.has(s)) return s

  return 'Other'
}
