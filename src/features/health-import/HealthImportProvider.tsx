import { readAsStringAsync } from 'expo-file-system/legacy'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Alert, Platform } from 'react-native'

import bundledSample from '../../../assets/sample-health-import.json'
import { debugError, debugLog } from '../../lib/debugLog'
import {
  importHealthImportChunksSequential,
  importSamplesToHealthKit,
} from '../../health/importToHealthKit'
import { loadBundledHealthImportChunks } from '../../import/loadBundledHealthChunks'
import { parseImportJsonText, parseImportJsonValue } from '../../import/parseImportJson'
import type { DocumentPickerOptions, DocumentPickerResult } from 'expo-document-picker'

import { ImportBusyModal } from '../../components/import/ImportBusyModal'
import type { HealthImportContextValue, HealthImportFile, ImportStats } from '../../types'

async function openDocumentPicker(options?: DocumentPickerOptions): Promise<DocumentPickerResult> {
  const DocumentPicker = await import('expo-document-picker')
  return DocumentPicker.getDocumentAsync(options)
}

const HealthImportContext = createContext<HealthImportContextValue | undefined>(undefined)

export function useHealthImport(): HealthImportContextValue {
  const v = useContext(HealthImportContext)
  if (!v) {
    throw new Error('useHealthImport must be used within HealthImportProvider')
  }
  return v
}

export function HealthImportProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<HealthImportFile | null>(null)
  const [loadedChunks, setLoadedChunks] = useState<HealthImportFile[] | null>(null)
  const [sourceLabel, setSourceLabel] = useState<string>('none')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [lastLog, setLastLog] = useState<string>('')
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [appleExportNotes, setAppleExportNotes] = useState<string[]>([])
  const [resumeFromGlobalText, setResumeFromGlobalText] = useState<string>('0')

  useEffect(() => {
    debugLog('App', 'mount', { platform: Platform.OS })
  }, [])

  useEffect(() => {
    if (!busy) {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
      setElapsedSec(0)
      return
    }
    setElapsedSec(0)
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSec((s) => s + 1)
    }, 1000)
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
  }, [busy])

  const loadBundled = useCallback(() => {
    debugLog('App', 'loadBundled pressed')
    try {
      const parsed = parseImportJsonValue(bundledSample as unknown)
      setLoadedChunks(null)
      setLoaded(parsed)
      setSourceLabel('bundled sample-health-import.json')
      setAppleExportNotes([])
      setLastLog(`Loaded ${parsed.samples.length} samples`)
      debugLog('App', 'loadBundled success', { samples: parsed.samples.length })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      debugError('App', 'loadBundled parse failed', e)
      Alert.alert('Parse error', msg)
    }
  }, [])

  const loadBundledAppleChunks = useCallback(async () => {
    debugLog('App', 'loadBundledAppleChunks pressed')
    setBusy(true)
    try {
      const { files, manifestSamplesExpected } = await loadBundledHealthImportChunks()
      const total = files.reduce((n, f) => n + f.samples.length, 0)
      setLoaded(null)
      setLoadedChunks(files)
      setSourceLabel(`bundled apple_health_import.chunks (${files.length} parts, UTF-8 JSON in .hkchunk)`)
      const meta0 = files[0]?.meta?.appleExport
      const lines: string[] = [
        `Samples: ${total}` +
          (manifestSamplesExpected ? ` (manifest ${manifestSamplesExpected})` : ''),
      ]
      if (meta0?.exportXml && typeof meta0.exportXml === 'object' && 'recordsSeen' in meta0.exportXml) {
        const wx = meta0.exportXml as { recordsSeen?: unknown; workoutsSeen?: unknown }
        lines.push(`export.xml: ${String(wx.recordsSeen)} records, ${String(wx.workoutsSeen)} workouts`)
      }
      setAppleExportNotes(lines)
      setLastLog(`Loaded ${total} samples from ${files.length} chunk file(s) (.hkchunk, JSON inside).`)
      debugLog('App', 'loadBundledAppleChunks OK', { parts: files.length, samples: total })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      debugError('App', 'loadBundledAppleChunks failed', e)
      Alert.alert('Bundled chunks', msg)
    } finally {
      setBusy(false)
    }
  }, [])

  const pickFile = useCallback(async () => {
    debugLog('App', 'pickFile pressed')
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS only', 'Pick a JSON file on an iPhone with this dev build.')
      return
    }
    let result: DocumentPickerResult
    try {
      result = await openDocumentPicker({
        type: ['application/json', 'text/plain', 'public.data', 'public.item'],
        copyToCacheDirectory: true,
      })
    } catch (e) {
      debugError('App', 'expo-document-picker failed', e)
      Alert.alert(
        'Document picker',
        'Native module missing. Rebuild the iOS app: `npx expo prebuild` then `npx expo run:ios`.',
      )
      return
    }
    if (result.canceled || !result.assets?.[0]) return
    const uri = result.assets[0].uri
    try {
      const text = await readAsStringAsync(uri)
      const parsed = parseImportJsonText(text)
      setLoadedChunks(null)
      setLoaded(parsed)
      setSourceLabel(result.assets[0].name ?? uri)
      setAppleExportNotes([])
      setLastLog(`Loaded ${parsed.samples.length} samples`)
      debugLog('App', 'pickFile success', { samples: parsed.samples.length })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      debugError('App', 'pickFile read/parse failed', e)
      Alert.alert('Parse error', msg)
    }
  }, [])

  const runImport = useCallback(async () => {
    const chunkCount = loadedChunks?.length ?? 0
    const totalPlanned =
      chunkCount > 0 ? loadedChunks!.reduce((n, f) => n + f.samples.length, 0) : (loaded?.samples.length ?? 0)
    debugLog('App', 'runImport pressed', {
      hasLoaded: !!loaded,
      chunkParts: chunkCount,
      sampleCount: totalPlanned,
    })
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS device required', 'Install the dev build on a physical iPhone.')
      return
    }
    if (!loaded && chunkCount === 0) {
      Alert.alert('Nothing to import', 'Load sample JSON, pick a JSON file, or load bundled chunks first.')
      return
    }
    const resumeParsed = Number.parseInt(resumeFromGlobalText.trim(), 10)
    const resumeFromGlobal = Number.isFinite(resumeParsed) && resumeParsed >= 0 ? resumeParsed : 0

    setBusy(true)
    setProgress('Starting…')
    setImportStats({
      done: Math.min(resumeFromGlobal, totalPlanned),
      total: Math.max(1, totalPlanned),
      label: resumeFromGlobal > 0 ? `resume @ ${resumeFromGlobal}` : 'starting',
    })
    setLastLog(
      resumeFromGlobal > 0
        ? `Import started (resuming at global index ${resumeFromGlobal}) — please wait.`
        : 'Import started — please wait. Large imports can take several minutes.',
    )
    const onProgress = (p: { done: number; total: number; currentLabel: string }) => {
      const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
      setImportStats({ done: p.done, total: p.total, label: p.currentLabel })
      setProgress(`${pct}% — ${p.currentLabel}`)
      const milestone =
        p.done === 0 ||
        p.done === p.total ||
        (p.total > 20 && p.done > 0 && p.done % 25 === 0)
      if (milestone) {
        debugLog('App', 'import progress', { pct, done: p.done, total: p.total, label: p.currentLabel })
      }
    }
    try {
      const { written, failed, errors } =
        chunkCount > 0 && loadedChunks
          ? await importHealthImportChunksSequential(loadedChunks, onProgress, {
              startGlobalIndex: resumeFromGlobal,
            })
          : await importSamplesToHealthKit(loaded!, onProgress, {
              startSampleIndex: resumeFromGlobal,
            })
      const summary = `Done. Written: ${written}, failed: ${failed}.`
      debugLog('App', 'runImport completed', { written, failed, errorsPreview: errors.slice(0, 5) })
      setLastLog(
        errors.length ? `${summary}\nFirst errors:\n${errors.slice(0, 5).join('\n')}` : summary,
      )
      if (failed > 0) {
        Alert.alert('Import finished with errors', summary)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      debugError('App', 'runImport threw', e)
      setLastLog(`Error: ${msg}`)
      Alert.alert('Import failed', msg)
    } finally {
      setBusy(false)
      setProgress('')
      setImportStats(null)
      debugLog('App', 'runImport finally — UI unlocked')
    }
  }, [loaded, loadedChunks, resumeFromGlobalText])

  const iosOnly = Platform.OS !== 'ios'
  const totalSamplesReady =
    loadedChunks && loadedChunks.length > 0
      ? loadedChunks.reduce((n, f) => n + f.samples.length, 0)
      : (loaded?.samples.length ?? 0)
  const canImport =
    (!!loaded && loaded.samples.length > 0) || (loadedChunks != null && loadedChunks.length > 0)
  const pct =
    importStats && importStats.total > 0
      ? Math.min(100, Math.round((importStats.done / importStats.total) * 100))
      : 0

  const value = useMemo(
    () => ({
      loaded,
      loadedChunks,
      sourceLabel,
      busy,
      progress,
      lastLog,
      importStats,
      appleExportNotes,
      resumeFromGlobalText,
      setResumeFromGlobalText,
      loadBundled,
      loadBundledAppleChunks,
      pickFile,
      runImport,
      iosOnly,
      totalSamplesReady,
      canImport,
      elapsedSec,
      pct,
    }),
    [
      loaded,
      loadedChunks,
      sourceLabel,
      busy,
      progress,
      lastLog,
      importStats,
      appleExportNotes,
      resumeFromGlobalText,
      loadBundled,
      loadBundledAppleChunks,
      pickFile,
      runImport,
      iosOnly,
      totalSamplesReady,
      canImport,
      elapsedSec,
      pct,
    ],
  )

  return (
    <HealthImportContext.Provider value={value}>
      {children}
      <ImportBusyModal
        visible={busy}
        pct={pct}
        importStats={importStats}
        elapsedSec={elapsedSec}
      />
    </HealthImportContext.Provider>
  )
}
