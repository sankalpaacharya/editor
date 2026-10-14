import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import { describe, expect, it } from 'vitest'
import type { Project } from '../shared/project'
import { buildExportArgs, parseProgressSeconds } from './export-args'

const ffmpeg = ffmpegPath as unknown as string

describe('buildExportArgs', () => {
  it('renders trimmed, reordered clips with text and image overlays', () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-export-'))
    const video = join(dir, 'in.mp4')
    const image = join(dir, 'logo.png')
    const output = join(dir, 'out.mp4')
    execFileSync(
      ffmpeg,
      [
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
        video
      ],
      { stdio: 'pipe' }
    )
    execFileSync(
      ffmpeg,
      ['-f', 'lavfi', '-i', 'color=red:size=64x64', '-frames:v', '1', '-update', '1', image],
      { stdio: 'pipe' }
    )

    const assetPaths: Record<string, string> = { video, image }
    const project = {
      source: {
        assetId: 'video',
        name: 'in.mp4',
        duration: 6,
        width: 320,
        height: 240,
        fps: 30,
        hasAudio: true
      },
      clips: [
        { id: 'b', in: 4, out: 6 },
        { id: 'a', in: 0, out: 1.5 }
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
          image: { assetId: 'image', name: 'logo.png', width: 64, height: 64 },
          scale: 0.25,
          x: 0.8,
          y: 0.8,
          start: 1,
          end: 3
        }
      ]
    } satisfies Project

    execFileSync(
      ffmpeg,
      buildExportArgs(project, {
        outputPath: output,
        fontPath: resolve('resources/fonts/NotoSans-SemiBold.ttf'),
        resolveAsset: (id) => assetPaths[id]
      }),
      { stdio: 'pipe' }
    )

    const duration = Number(
      execFileSync(ffprobe.path, [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'csv=p=0',
        output
      ])
        .toString()
        .trim()
    )
    expect(duration).toBeCloseTo(3.5, 1)
  }, 30_000)
})

describe('parseProgressSeconds', () => {
  it('reads the latest out_time_us', () => {
    expect(
      parseProgressSeconds('out_time_us=1000000\nprogress=continue\nout_time_us=2500000\n')
    ).toBe(2.5)
    expect(parseProgressSeconds('progress=continue\n')).toBeNull()
  })
})
