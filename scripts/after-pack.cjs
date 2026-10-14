// Apple Silicon kills unsigned arm64 executables on launch, and the bundled ffmpeg and ffprobe
// binaries ship unsigned. Ad-hoc sign them so import and export can run them.
const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = `${context.packager.appInfo.productFilename}.app`
  const resources = join(context.appOutDir, app, 'Contents/Resources')
  const binaries = [
    join(resources, 'app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg'),
    join(resources, 'bin/ffprobe')
  ]
  for (const binary of binaries) {
    if (!existsSync(binary)) throw new Error(`Missing binary to sign: ${binary}`)
    execFileSync('codesign', ['--force', '--sign', '-', binary], { stdio: 'inherit' })
  }
}
