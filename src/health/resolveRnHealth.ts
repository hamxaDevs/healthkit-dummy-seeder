import { NativeModules } from 'react-native'
import type { AppleHealthKit } from 'react-native-health'

import { debugLog } from '../lib/debugLog'

/**
 * react-native-health/index.js does Object.assign({}, NativeModules.AppleHealthKit, { Constants })
 * at load time; if the bridge wasn't ready, the cached export is only `{ Constants }`.
 *
 * Additionally, native module methods are often **non-enumerable**, so
 * `Object.assign({}, NativeModules.AppleHealthKit, stub)` copies **nothing** from native
 * into a new object — you end up with only `Constants` and no `initHealthKit`.
 *
 * Fix: merge the stub **onto** the live native module object (same as the library,
 * but without the empty `{}` that drops non-enumerable methods).
 */
let cached: AppleHealthKit | null = null

export function getRnHealthApi(): AppleHealthKit {
  if (cached) {
    return cached
  }

  const native = (NativeModules as { AppleHealthKit?: AppleHealthKit }).AppleHealthKit
  if (!native) {
    throw new Error(
      'NativeModules.AppleHealthKit is undefined. Rebuild the iOS app with react-native-health linked.',
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stub = require('react-native-health') as {
    Constants: AppleHealthKit['Constants']
  }

  Object.assign(native, stub)

  if (__DEV__) {
    const names = Object.getOwnPropertyNames(native as object)
    debugLog('HealthKit', 'resolved API (stub merged onto native module)', {
      ownPropertyNamesSample: names.slice(0, 12),
      ownPropertyCount: names.length,
      enumerableKeyCount: Object.keys(native as object).length,
      hasInitHealthKit: typeof native.initHealthKit === 'function',
      hasConstants: !!native.Constants?.Permissions,
    })
  }

  if (typeof native.initHealthKit !== 'function') {
    throw new Error(
      `react-native-health: initHealthKit is not a function (got ${typeof native.initHealthKit}). Native module may not be RNAppleHealthKit.`,
    )
  }

  cached = native
  return native
}

/** @deprecated alias */
export const getRnHealthApiCached = getRnHealthApi
