import { useEffect, useState } from 'react'
import { FolderOpenIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ExportRecord } from '../../../shared/api'
import type { AssetId } from '../../../shared/project'
import { errorMessage, fileName, formatDate, formatTime } from '@/lib/editor'

interface ExportHistoryProps {
  sourceAssetId: AssetId
  /** Changes whenever an export finishes, so the list refetches. */
  revision: number
}

export function ExportHistory({ sourceAssetId, revision }: ExportHistoryProps) {
  const [exports, setExports] = useState<ExportRecord[]>([])

  useEffect(() => {
    let active = true
    window.editor
      .listExports(sourceAssetId)
      .then((records) => active && setExports(records))
      .catch((error) => toast.error('Could not load exports', { description: errorMessage(error) }))
    return () => {
      active = false
    }
  }, [sourceAssetId, revision])

  if (exports.length === 0) return null

  return (
    <section className="flex flex-col">
      <h2 className="pb-1 text-xs font-medium">Exports</h2>
      <ul className="border-t">
        {exports.map((record) => (
          <li
            key={record.id}
            className={cn(
              'flex h-10 items-center gap-2 border-b text-xs',
              record.missing && 'text-muted-foreground'
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate" title={record.path}>
                {fileName(record.path)}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {record.missing
                  ? 'File not found'
                  : `${formatTime(record.duration)} · ${formatDate(record.createdAt)}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Show in folder"
              title="Show in folder"
              disabled={record.missing}
              onClick={() => void window.editor.revealExport(record.id)}
              className="text-muted-foreground"
            >
              <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={1.75} />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
