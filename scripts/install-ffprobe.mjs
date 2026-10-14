// ffmpeg-static 5.2.0 downloads ffmpeg from release b6.0. That package's
// ffprobe-static dependency ships an x86_64 binary in its darwin/arm64 slot,
// so import fails on Apple Silicon. Download the matching ffprobe instead.
import { execFileSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { access, chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { arch, platform } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'

const RELEASE = 'b6.0'
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const executable = platform() === 'win32' ? 'ffprobe.exe' : 'ffprobe'
const binDir = join(root, 'resources', 'bin')
const dest = join(binDir, executable)
const stampPath = join(binDir, 'source')
const source = `${RELEASE}/ffprobe-${platform()}-${arch()}`
const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${source}.gz`

async function alreadyInstalled() {
  try {
    await access(dest)
    return (await readFile(stampPath, 'utf8')) === source
  } catch {
    return false
  }
}

if (await alreadyInstalled()) {
  console.log(`ffprobe ${source} is installed already.`)
} else {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url} (${response.status})`)
  }
  await mkdir(binDir, { recursive: true })
  await pipeline(Readable.fromWeb(response.body), createGunzip(), createWriteStream(dest))
  await chmod(dest, 0o755)
  if (platform() === 'darwin') {
    execFileSync('codesign', ['--force', '--sign', '-', dest], { stdio: 'inherit' })
  }
  await writeFile(stampPath, source)
  console.log(`Installed ffprobe ${source}.`)
}
