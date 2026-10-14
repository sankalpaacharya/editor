// Fails when a component hand-picks a font size or corner radius instead of using the scale.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'src/renderer/src/components'
const VENDORED =
  /\/ui\/(alert-dialog|button|clip-indicator|db-readout|db-scale|dialog|dropdown-menu|input|label|level-meter|progress|separator|slider|sonner|textarea|tooltip)\.tsx$/
const ARBITRARY = /\b(text|rounded(?:-[trbl]{1,2})?)-\[\d+(?:\.\d+)?px\]/g

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name.startsWith('.') ? [] : files(path)
    return path.endsWith('.tsx') && !VENDORED.test(path) ? [path] : []
  })

const problems = files(ROOT).flatMap((path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .flatMap((line, index) =>
      [...line.matchAll(ARBITRARY)].map((match) => `${path}:${index + 1} ${match[0]}`)
    )
)

if (problems.length > 0) {
  console.error('Use the text and radius scale instead of arbitrary values:')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
