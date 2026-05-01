/** Filter Metro / Xcode console with: HealthSeeder */
const TAG = '[HealthSeeder]'

export function debugLog(area: string, message: string, ...optional: unknown[]): void {
  if (optional.length > 0) {
    console.log(TAG, `[${area}]`, message, ...optional)
  } else {
    console.log(TAG, `[${area}]`, message)
  }
}

export function debugWarn(area: string, message: string, ...optional: unknown[]): void {
  if (optional.length > 0) {
    console.warn(TAG, `[${area}]`, message, ...optional)
  } else {
    console.warn(TAG, `[${area}]`, message)
  }
}

export function debugError(area: string, message: string, err?: unknown): void {
  if (err !== undefined) {
    console.error(TAG, `[${area}]`, message, err)
    if (err instanceof Error && err.stack) {
      console.error(TAG, `[${area}]`, 'stack:', err.stack)
    }
  } else {
    console.error(TAG, `[${area}]`, message)
  }
}
