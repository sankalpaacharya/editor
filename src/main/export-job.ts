import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { timelineDuration, type Sequence } from '../shared/sequence'
import { FFMPEG_PATH, FONT_PATH } from './ffmpeg'
import { buildExportArgs, parseProgressSeconds, type ExportInputs } from './export-args'

let cancelCurrent: (() => void) | null = null

export function cancelExport(): void {
  cancelCurrent?.()
}

type JobResult = { status: 'done' } | { status: 'canceled' }

export function runExport(
  sequence: Sequence,
  outputPath: string,
  resolveMedia: ExportInputs['resolveMedia'],
  onProgress: (fraction: number) => void
): Promise<JobResult> {
  if (cancelCurrent) return Promise.reject(new Error('An export is already running'))

  const args = buildExportArgs(sequence, { outputPath, fontPath: FONT_PATH, resolveMedia })
  const total = timelineDuration(sequence.clips)
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

  return new Promise<JobResult>((resolve, reject) => {
    ffmpeg.on('error', reject)
    ffmpeg.on('close', async (code) => {
      cancelCurrent = null
      if (canceled) {
        await rm(outputPath, { force: true })
        resolve({ status: 'canceled' })
      } else if (code === 0) {
        resolve({ status: 'done' })
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`))
      }
    })
  })
}
