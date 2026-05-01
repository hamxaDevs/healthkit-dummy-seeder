import { Asset } from 'expo-asset'
import { readAsStringAsync } from 'expo-file-system/legacy'

import { BUNDLED_CHUNK_ASSET_MODULES, BUNDLED_CHUNK_TOTAL_SAMPLES } from '../generated/bundledChunkAssets'
import { parseImportJsonText } from './parseImportJson'
import type { HealthImportFile } from '../types'

/**
 * Loads chunk files bundled as `.hkchunk` assets (UTF-8 JSON). Same `{ version, samples }` as `.json` on disk;
 * the extension keeps Metro from inlining millions of samples into one bundle string.
 */
export async function loadBundledHealthImportChunks(): Promise<{
  files: HealthImportFile[]
  manifestSamplesExpected: number
}> {
  if (BUNDLED_CHUNK_ASSET_MODULES.length === 0) {
    throw new Error(
      'No bundled chunks. Run npm run import:from-apple-export, then npx expo start -c.',
    )
  }

  const files: HealthImportFile[] = []
  for (let i = 0; i < BUNDLED_CHUNK_ASSET_MODULES.length; i++) {
    const mod = BUNDLED_CHUNK_ASSET_MODULES[i]
    const asset = Asset.fromModule(mod)
    await asset.downloadAsync()
    const uri = asset.localUri ?? asset.uri
    if (!uri) {
      throw new Error(`Chunk ${i + 1}/${BUNDLED_CHUNK_ASSET_MODULES.length} could not be resolved`)
    }
    const text = await readAsStringAsync(uri)
    try {
      files.push(parseImportJsonText(text))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`Chunk ${i + 1}/${BUNDLED_CHUNK_ASSET_MODULES.length}: ${msg}`)
    }
  }

  const parsedTotal = files.reduce((n, f) => n + f.samples.length, 0)
  if (BUNDLED_CHUNK_TOTAL_SAMPLES > 0 && parsedTotal !== BUNDLED_CHUNK_TOTAL_SAMPLES) {
    throw new Error(
      `Sample count mismatch: parsed ${parsedTotal}, manifest ${BUNDLED_CHUNK_TOTAL_SAMPLES}. Re-run import:from-apple-export.`,
    )
  }

  return { files, manifestSamplesExpected: BUNDLED_CHUNK_TOTAL_SAMPLES }
}
