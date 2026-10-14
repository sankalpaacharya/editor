import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
}

type ByteRange = { start: number; end: number }

function parseRange(header: string, size: number): ByteRange | 'unsatisfiable' {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (!match[1] && !match[2])) return 'unsatisfiable'
  const [, first, last] = match
  const range = first
    ? { start: Number(first), end: last ? Math.min(Number(last), size - 1) : size - 1 }
    : { start: Math.max(size - Number(last), 0), end: size - 1 }
  return range.start <= range.end ? range : 'unsatisfiable'
}

const body = (path: string, range?: ByteRange): ReadableStream =>
  Readable.toWeb(createReadStream(path, range)) as ReadableStream

/** Serves a file, answering a Range request with 206 so media elements can seek. */
export async function fileResponse(path: string, rangeHeader: string | null): Promise<Response> {
  const { size } = await stat(path)
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Type':
      CONTENT_TYPES[extname(path).slice(1).toLowerCase()] ?? 'application/octet-stream'
  })
  if (!rangeHeader) {
    headers.set('Content-Length', String(size))
    return new Response(body(path), { status: 200, headers })
  }
  const range = parseRange(rangeHeader, size)
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
  headers.set('Content-Length', String(range.end - range.start + 1))
  return new Response(body(path, range), { status: 206, headers })
}
