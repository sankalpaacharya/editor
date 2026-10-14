import {
  timelineLength,
  type Clip,
  type Format,
  type ImageOverlay,
  type MediaId,
  type MediaItem,
  type Sequence,
  type TextOverlay,
  type VideoMedia
} from '../shared/sequence'

export interface ResolvedMedia {
  path: string
  media: MediaItem
}

export interface ExportInputs {
  outputPath: string
  fontPath: string
  resolveMedia: (mediaId: MediaId) => ResolvedMedia
}

// Filter option values are unescaped twice: once by the filtergraph parser,
// once by the filter's own option parser.
const escapeOptionValue = (value: string): string => value.replace(/[\\':]/g, '\\$&')
const escapeGraphValue = (value: string): string => value.replace(/[\\'[\],;]/g, '\\$&')
const filterValue = (value: string): string => escapeGraphValue(escapeOptionValue(value))

const ATEMPO_MIN = 0.5
const AUDIO_FORMAT = 'aformat=sample_rates=48000:channel_layouts=stereo'

function atempoChain(speed: number): string {
  if (speed === 1) return ''
  if (speed >= ATEMPO_MIN) return `,atempo=${speed}`
  return `,atempo=${ATEMPO_MIN},atempo=${speed / ATEMPO_MIN}`
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

const isIdentity = (clip: Clip): boolean =>
  clip.scale === 1 && clip.opacity === 1 && clip.rotation === 0

// Fits the clip inside the frame like `object-fit: contain`, then scales, rotates and fades it
// over a black frame around the centre, matching the preview.
function transformedPicture(clip: Clip, source: string, label: string, format: Format): string {
  const { width, height, fps } = format
  const angle = ((clip.rotation * Math.PI) / 180).toFixed(5)
  const picture = [
    `${source}scale=${Math.round(width * clip.scale)}:${Math.round(height * clip.scale)}:force_original_aspect_ratio=decrease`,
    'format=rgba',
    clip.rotation !== 0 && `rotate=${angle}:c=none:ow=rotw(${angle}):oh=roth(${angle})`,
    clip.opacity !== 1 && `colorchannelmixer=aa=${clip.opacity.toFixed(3)}`
  ].filter(Boolean)
  return [
    `${blackChain(timelineLength(clip), format)}[${label}bg]`,
    `${picture.join(',')}[${label}fg]`,
    `[${label}bg][${label}fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p,fps=${fps}`
  ].join(';')
}

function videoChain(
  clip: Clip,
  input: number,
  format: Format,
  enabled: boolean,
  label: string
): string {
  const { width, height, fps } = format
  if (!enabled) return blackChain(timelineLength(clip), format)
  const timed = `[${input}:v:0]trim=start=${clip.in.toFixed(3)}:end=${clip.out.toFixed(3)},setpts=(PTS-STARTPTS)/${clip.speed},`
  const picture = isIdentity(clip)
    ? [
        `${timed}scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        `fps=${fps}`
      ].join(',')
    : transformedPicture(clip, timed, label, format)
  // When clips share an input, fps pads a segment up to the input's end-of-stream time
  // (ffmpeg 6.0), which concat then plays as frozen frames. Cut it back to the clip.
  return `${picture},setsar=1,trim=duration=${timelineLength(clip).toFixed(3)}`
}

function audioChain(clip: Clip, input: number, media: VideoMedia, enabled: boolean): string {
  if (!enabled || !media.hasAudio || clip.volume === 0) {
    return `anullsrc=r=48000:cl=stereo,atrim=duration=${timelineLength(clip).toFixed(3)}`
  }
  const volume = clip.volume === 1 ? '' : `,volume=${clip.volume}`
  return (
    `[${input}:a:0]atrim=start=${clip.in.toFixed(3)}:end=${clip.out.toFixed(3)},` +
    `asetpts=PTS-STARTPTS${atempoChain(clip.speed)}${volume},${AUDIO_FORMAT}`
  )
}

const blackChain = (duration: number, { width, height, fps }: Format): string =>
  `color=c=black:s=${width}x${height}:r=${fps}:d=${duration.toFixed(3)},setsar=1`

function gapChains(gap: number, format: Format): [string, string] {
  return [blackChain(gap, format), `anullsrc=r=48000:cl=stereo,atrim=duration=${gap.toFixed(3)}`]
}

function videoMedia(inputs: ExportInputs, mediaId: MediaId): VideoMedia {
  const { media } = inputs.resolveMedia(mediaId)
  if (media.kind !== 'video') throw new Error(`Clip media ${mediaId} is not a video`)
  return media
}

export function buildExportArgs(sequence: Sequence, inputs: ExportInputs): string[] {
  const { format, clips, tracks } = sequence
  const overlays = tracks.overlays.enabled ? sequence.overlays : []
  if (clips.length === 0) throw new Error('The sequence has no clips to export')

  const videos = [...new Set(clips.map((clip) => clip.mediaId))]
  const images = [
    ...new Set(overlays.flatMap((overlay) => (overlay.kind === 'image' ? [overlay.mediaId] : [])))
  ]
  const graph: string[] = []

  const segments = clips.flatMap((clip, i) => {
    const input = videos.indexOf(clip.mediaId)
    const media = videoMedia(inputs, clip.mediaId)
    graph.push(`${videoChain(clip, input, format, tracks.video.enabled, `t${i}`)}[v${i}]`)
    graph.push(`${audioChain(clip, input, media, tracks.audio.enabled)}[a${i}]`)
    if (clip.gap === 0) return [`[v${i}][a${i}]`]
    const [video, audio] = gapChains(clip.gap, format)
    graph.push(`${video}[gv${i}]`, `${audio}[ga${i}]`)
    return [`[gv${i}][ga${i}]`, `[v${i}][a${i}]`]
  })
  graph.push(`${segments.join('')}concat=n=${segments.length}:v=1:a=1[base][aout]`)

  let current = 'base'
  overlays.forEach((overlay, i) => {
    const next = `o${i}`
    if (overlay.kind === 'text') {
      graph.push(`[${current}]${textFilter(overlay, inputs.fontPath)}[${next}]`)
    } else {
      const input = videos.length + images.indexOf(overlay.mediaId)
      const width = Math.max(2, Math.round((format.width * overlay.widthRatio) / 2) * 2)
      graph.push(`[${input}:v:0]scale=${width}:-2[img${i}]`)
      graph.push(`[${current}][img${i}]${imageFilter(overlay)}[${next}]`)
    }
    current = next
  })

  return [
    '-hide_banner',
    '-y',
    ...[...videos, ...images].flatMap((id) => ['-i', inputs.resolveMedia(id).path]),
    '-filter_complex',
    graph.join(';'),
    '-map',
    `[${current}]`,
    '-map',
    '[aout]',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
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

export function parseProgressSeconds(chunk: string): number | null {
  const matches = [...chunk.matchAll(/^out_time_us=(\d+)$/gm)]
  const last = matches.at(-1)
  return last ? Number(last[1]) / 1_000_000 : null
}
