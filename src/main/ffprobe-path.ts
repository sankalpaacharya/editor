import { join } from 'node:path'
import { platform } from 'node:os'

export const FFPROBE_BINARY = platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe'

export function devFfprobePath(appPath: string): string {
  return join(appPath, 'resources', 'bin', FFPROBE_BINARY)
}
