import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { timelineDuration, type Project } from '../shared/project'
import type { ExportResult } from '../shared/api'
import { FFMPEG_PATH, FONT_PATH, resolveAsset } from './assets'
import { buildExportArgs, parseProgressSeconds } from './export-args'

let cancelCurrent: (() => void) | null = null

export function cancelExport(): void {
  cancelCurrent?.()
}

export function runExport(
  project: Project,
  outputPath: string,
  onProgress: (fraction: number) => void
): Promise<ExportResult> {
  if (cancelCurrent) return Promise.reject(new Error('An export is already running'))

  const args = buildExportArgs(project, { outputPath, fontPath: FONT_PATH, resolveAsset })
  const total = timelineDuration(project.clips)
  const ffmpeg = spawn(FFMPEG_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let canceled = false
  let stderr = ''
  cancelCurrent = () => {
    canceled = true
    ffmpeg.kill()
  }

  ffmpeg.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    const seconds = parseProgressSeconds(chunk)
    if (seconds !== null) onProgress(Math.min(seconds / total, 1))
  })
  ffmpeg.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-4000)
  })

  return new Promise<ExportResult>((resolve, reject) => {
    ffmpeg.on('error', reject)
    ffmpeg.on('close', async (code) => {
      cancelCurrent = null
      if (canceled) {
        await rm(outputPath, { force: true })
        resolve({ status: 'canceled' })
      } else if (code === 0) {
        resolve({ status: 'done', path: outputPath })
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`))
      }
    })
  })
}
