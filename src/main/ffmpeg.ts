import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { app } from 'electron'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

export const run = promisify(execFile)

// Packaged builds unpack the binaries next to app.asar; the module paths still point inside it.
const unpacked = (path: string): string => path.replace(`app.asar`, 'app.asar.unpacked')
export const FFMPEG_PATH = unpacked(ffmpegPath)
export const FFPROBE_PATH = unpacked(ffprobe.path)

export const FONT_PATH = app.isPackaged
  ? `${process.resourcesPath}/fonts/NotoSans-SemiBold.ttf`
  : `${app.getAppPath()}/resources/fonts/NotoSans-SemiBold.ttf`
