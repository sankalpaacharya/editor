import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import ffmpegPath from 'ffmpeg-static'
import { devFfprobePath, FFPROBE_BINARY } from './ffprobe-path'

export const run = promisify(execFile)

// Packaged builds unpack ffmpeg next to app.asar; the module path still points inside it.
const unpacked = (path: string): string => path.replace(`app.asar`, 'app.asar.unpacked')
export const FFMPEG_PATH = unpacked(ffmpegPath)
export const FFPROBE_PATH = app.isPackaged
  ? join(process.resourcesPath, 'bin', FFPROBE_BINARY)
  : devFfprobePath(app.getAppPath())

export const FONT_PATH = app.isPackaged
  ? `${process.resourcesPath}/fonts/NotoSans-SemiBold.ttf`
  : `${app.getAppPath()}/resources/fonts/NotoSans-SemiBold.ttf`
