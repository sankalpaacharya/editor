import type { AssetId, ImageOverlay, Project, TextOverlay } from '../shared/project'

export interface ExportInputs {
  outputPath: string
  fontPath: string
  resolveAsset: (assetId: AssetId) => string
}

// Filter option values are unescaped twice: once by the filtergraph parser,
// once by the filter's own option parser.
const escapeOptionValue = (value: string): string => value.replace(/[\\':]/g, '\\$&')
const escapeGraphValue = (value: string): string => value.replace(/[\\'[\],;]/g, '\\$&')
const filterValue = (value: string): string => escapeGraphValue(escapeOptionValue(value))

// atempo only accepts factors between 0.5 and 2, so larger changes are chained.
function atempoChain(speed: number): string {
  const factors: number[] = []
  let rest = speed
  while (rest > 2) {
    factors.push(2)
    rest /= 2
  }
  while (rest < 0.5) {
    factors.push(0.5)
    rest /= 0.5
  }
  if (rest !== 1) factors.push(rest)
  return factors.map((factor) => `,atempo=${factor.toFixed(4)}`).join('')
}

const enableBetween = (start: number, end: number): string =>
  `enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'`

function textFilter(overlay: TextOverlay, fontPath: string): string {
  return [
    `drawtext=fontfile=${filterValue(fontPath)}`,
    `text=${filterValue(overlay.text)}`,
    'expansion=none',
    `fontsize=${Math.round(overlay.fontSize)}`,
    `fontcolor=0x${overlay.color.slice(1)}`,
    `x=w*${overlay.x.toFixed(4)}-tw/2`,
    `y=h*${overlay.y.toFixed(4)}-th/2`,
    enableBetween(overlay.start, overlay.end)
  ].join(':')
}

function imageFilter(overlay: ImageOverlay): string {
  return [
    `overlay=x=main_w*${overlay.x.toFixed(4)}-overlay_w/2`,
    `y=main_h*${overlay.y.toFixed(4)}-overlay_h/2`,
    enableBetween(overlay.start, overlay.end)
  ].join(':')
}

/** Builds the ffmpeg argument list that renders `project` to an H.264/AAC MP4. */
export function buildExportArgs(project: Project, inputs: ExportInputs): string[] {
  const { source, clips, overlays } = project
  const imageOverlays = overlays.filter((overlay) => overlay.kind === 'image')
  const graph: string[] = []

  const concatInputs = clips.map((clip, i) => {
    const range = `start=${clip.in.toFixed(3)}:end=${clip.out.toFixed(3)}`
    const retime = clip.speed === 1 ? '' : `,fps=${source.fps}`
    graph.push(`[0:v]trim=${range},setpts=(PTS-STARTPTS)/${clip.speed}${retime}[v${i}]`)
    if (!source.hasAudio) return `[v${i}]`
    graph.push(`[0:a]atrim=${range},asetpts=PTS-STARTPTS${atempoChain(clip.speed)}[a${i}]`)
    return `[v${i}][a${i}]`
  })
  const audio = source.hasAudio ? 1 : 0
  graph.push(
    `${concatInputs.join('')}concat=n=${clips.length}:v=1:a=${audio}[base]${audio ? '[aout]' : ''}`
  )

  let current = 'base'
  overlays.forEach((overlay, i) => {
    const next = `o${i}`
    if (overlay.kind === 'text') {
      graph.push(`[${current}]${textFilter(overlay, inputs.fontPath)}[${next}]`)
    } else {
      const input = imageOverlays.indexOf(overlay) + 1
      const width = Math.max(2, Math.round((source.width * overlay.scale) / 2) * 2)
      graph.push(`[${input}:v]scale=${width}:-2[img${i}]`)
      graph.push(`[${current}][img${i}]${imageFilter(overlay)}[${next}]`)
    }
    current = next
  })

  return [
    '-hide_banner',
    '-y',
    '-i',
    inputs.resolveAsset(source.assetId),
    ...imageOverlays.flatMap((overlay) => ['-i', inputs.resolveAsset(overlay.image.assetId)]),
    '-filter_complex',
    graph.join(';'),
    '-map',
    `[${current}]`,
    ...(source.hasAudio ? ['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'] : []),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-progress',
    'pipe:1',
    '-nostats',
    inputs.outputPath
  ]
}

/** Reads the latest `out_time_us` from a chunk of ffmpeg `-progress` output. */
export function parseProgressSeconds(chunk: string): number | null {
  const matches = [...chunk.matchAll(/^out_time_us=(\d+)$/gm)]
  const last = matches.at(-1)
  return last ? Number(last[1]) / 1_000_000 : null
}
