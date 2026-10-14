import { Cancel01Icon, FileExportIcon, FileImportIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  fileName: string | undefined
  canExport: boolean
  onImport: () => void
  onExport: () => void
  onClose?: () => void
}

export function TopBar({ fileName, canExport, onImport, onExport, onClose }: TopBarProps) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
      <span className="min-w-0 truncate text-xs text-muted-foreground">{fileName}</span>
      {onClose && (
        <Button variant="ghost" size="xs" onClick={onClose}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.75} />
          Close
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={onImport}>
          <HugeiconsIcon icon={FileImportIcon} strokeWidth={1.75} />
          Import
        </Button>
        <Button size="sm" onClick={onExport} disabled={!canExport}>
          <HugeiconsIcon icon={FileExportIcon} strokeWidth={1.75} />
          Export
        </Button>
      </div>
    </header>
  )
}
