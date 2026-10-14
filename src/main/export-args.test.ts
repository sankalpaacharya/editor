import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import { describe, expect, it } from 'vitest'
import type { Sequence } from '../shared/sequence'
import { buildExportArgs, parseProgressSeconds, type ResolvedMedia } from './export-args'

const LANDSCAPE = '00000000-0000-4000-8000-000000000001'
const SILENT = '00000000-0000-4000-8000-000000000002'
const LOGO = '00000000-0000-4000-8000-000000000003'

const makeFile = (args: string[]) => execFileSync(ffmpeg, ['-y', ...args], { stdio: 'pipe' })

const probe = (path: string) =>
  JSON.parse(
    execFileSync(ffprobe.path, [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=codec_type,width,height',
      '-of',
      'json',
      path
    ]).toString()
  ) as {
    format: { duration: string }
    streams: { codec_type: string; width?: number; height?: number }[]
  }

describe('buildExportArgs', () => {
  it('fits clips from differently sized sources, with and without audio, under overlays', () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-export-'))
    const landscape = join(dir, 'landscape.mp4')
    const silent = join(dir, 'silent.mp4')
    const logo = join(dir, 'logo.png')
    const output = join(dir, 'out.mp4')
    makeFile([
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=6:size=320x240:rate=30',
      '-f',
      'lavfi',
      '-i',
      'sine=duration=6',
      '-shortest',
      '-pix_fmt',
      'yuv420p',
      landscape
    ])
    makeFile([
      '-f',
      'lavfi',
      '-i',
      'testsrc2=duration=4:size=180x320:rate=25',
      '-pix_fmt',
      'yuv420p',
      silent
    ])
    makeFile(['-f', 'lavfi', '-i', 'color=red:size=64x64', '-frames:v', '1', '-update', '1', logo])

    const media: Record<string, ResolvedMedia> = {
      [LANDSCAPE]: {
        path: landscape,
        media: {
          id: LANDSCAPE,
          kind: 'video',
          name: 'landscape.mp4',
          width: 320,
          height: 240,
          duration: 6,
          fps: 30,
          hasAudio: true
        }
      },
      [SILENT]: {
        path: silent,
        media: {
          id: SILENT,
          kind: 'video',
          name: 'silent.mp4',
          width: 180,
          height: 320,
          duration: 4,
          fps: 25,
          hasAudio: false
        }
      },
      [LOGO]: {
        path: logo,
        media: { id: LOGO, kind: 'image', name: 'logo.png', width: 64, height: 64 }
      }
    }
    const sequence = {
      format: { width: 640, height: 360, fps: 30 },
      clips: [
        { id: 'a', mediaId: LANDSCAPE, in: 2, out: 6, speed: 2, volume: 0.5, gap: 0 },
        { id: 'b', mediaId: SILENT, in: 0, out: 3, speed: 1, volume: 1, gap: 0 },
        { id: 'c', mediaId: LANDSCAPE, in: 0, out: 1.5, speed: 1, volume: 1, gap: 1 }
      ],
      overlays: [
        {
          id: 't',
          kind: 'text',
          text: `It's 50%: a, b; [c] \\ d`,
          fontSize: 24,
          color: '#ffffff',
          x: 0.5,
          y: 0.2,
          start: 0,
          end: 2
        },
        {
          id: 'i',
          kind: 'image',
          mediaId: LOGO,
          widthRatio: 0.25,
          x: 0.8,
          y: 0.8,
          start: 1,
          end: 5
        }
      ],
      tracks: {
        overlays: { enabled: true, locked: false },
        video: { enabled: true, locked: false },
        audio: { enabled: false, locked: false }
      }
    } satisfies Sequence

    makeFile(
      buildExportArgs(sequence, {
        outputPath: output,
        fontPath: resolve('resources/fonts/NotoSans-SemiBold.ttf'),
        resolveMedia: (id) => media[id]
      })
    )

    const { format, streams } = probe(output)
    expect(Number(format.duration)).toBeCloseTo(7.5, 1)
    expect(streams.filter((stream) => stream.codec_type === 'video')).toEqual([
      { codec_type: 'video', width: 640, height: 360 }
    ])
    expect(streams.filter((stream) => stream.codec_type === 'audio')).toHaveLength(1)
  }, 60_000)
})

describe('parseProgressSeconds', () => {
  it('reads the latest out_time_us', () => {
    expect(
      parseProgressSeconds('out_time_us=1000000\nprogress=continue\nout_time_us=2500000\n')
    ).toBe(2.5)
    expect(parseProgressSeconds('progress=continue\n')).toBeNull()
  })
})
