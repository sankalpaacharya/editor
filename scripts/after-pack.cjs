// Apple Silicon kills unsigned arm64 executables on launch, and the bundled ffmpeg and ffprobe
// binaries ship unsigned. Ad-hoc sign them so import and export can run them.
const { execFileSync } = require('node:child_process')
const { existsSync, readdirSync } = require('node:fs')
const { join } = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = `${context.packager.appInfo.productFilename}.app`
  const modules = join(context.appOutDir, app, 'Contents/Resources/app.asar.unpacked/node_modules')
  const probeDir = join(modules, 'ffprobe-static/bin/darwin')
  const binaries = [
    join(modules, 'ffmpeg-static/ffmpeg'),
    ...(existsSync(probeDir)
      ? readdirSync(probeDir).map((arch) => join(probeDir, arch, 'ffprobe'))
      : [])
  ].filter((path) => existsSync(path))
  if (binaries.length === 0) throw new Error(`No ffmpeg binaries found under ${modules}`)
  for (const binary of binaries) {
    execFileSync('codesign', ['--force', '--sign', '-', binary], { stdio: 'inherit' })
  }
}
