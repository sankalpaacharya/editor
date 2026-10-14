import { existsSync } from 'node:fs'
import { protocol } from 'electron'
import { MEDIA_SCHEME } from '../shared/api'
import { mediaIdSchema } from '../shared/sequence'
import { derivedImage } from './derived'
import { fileResponse } from './file-response'
import { findMedia } from './media'

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        stream: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ])
}

const notFound = (): Response => new Response('Not found', { status: 404 })

async function serve(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const id = mediaIdSchema.safeParse(url.hostname)
  const media = id.success ? findMedia(id.data) : undefined
  if (!media || !existsSync(media.path)) return notFound()
  const name = url.pathname.slice(1)
  const range = request.headers.get('Range')
  if (name === 'source') return fileResponse(media.path, range)
  const image = derivedImage(media, name)
  return image ? fileResponse(await image, range) : notFound()
}

// The renderer's origin (file:// or the dev server) differs from media://, so fetch()
// and canvas reads need an explicit grant. The id in the URL is the access check.
function allowAnyOrigin(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
  return new Response(response.body, { status: response.status, headers })
}

export function handleMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      return allowAnyOrigin(await serve(request))
    } catch (error) {
      console.error(`Failed to serve ${request.url}`, error)
      return new Response('Could not read media', { status: 500 })
    }
  })
}
