import type { LoadAppleExportResult } from '../../types'
import { AppleExportParseError, parseAppleExportXml } from './parseAppleExportXml'

export { AppleExportParseError } from './parseAppleExportXml'
export type { AppleExportParseResult, LoadAppleExportResult } from '../../types'

/**
 * Parses raw `export.xml` text (from Apple’s Health export bundle).
 * Optional `archiveNotes` can describe sibling files (ECG CSV / GPX) when you load from disk yourself.
 */
export function loadAppleHealthExportFromXmlText(
  xml: string,
  sourceLabel: string,
  archiveNotes: string[] = [],
): LoadAppleExportResult {
  const parsed = parseAppleExportXml(xml)
  return {
    ...parsed,
    archiveNotes,
    sourceLabel,
  }
}
