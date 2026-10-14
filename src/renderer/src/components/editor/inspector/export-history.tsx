import { useEffect, useState } from 'react'
import { FolderOpenIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { IconButton } from '@/components/icon-button'
import { Section } from '@/components/editor/inspector/fields'
import type { ExportRecord, ProjectId } from '../../../../../shared/api'
import { errorMessage, fileName, formatAgo, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

export function ExportHistory({ projectId, revision }: { projectId: ProjectId; revision: number }) {
  const [exports, setExports] = useState<ExportRecord[] | null>(null)

  useEffect(() => {
    let active = true
    window.editor
      .listExports(projectId)
      .then((records) => active && setExports(records))
      .catch((error) => toast.error('Could not load exports', { description: errorMessage(error) }))
    return () => {
      active = false
    }
  }, [projectId, revision])

  return (
    <Section title="Exports">
      {exports?.length === 0 && (
        <p className="text-xs text-muted-foreground">Nothing exported yet.</p>
      )}
      {exports && exports.length > 0 && (
        <ul className="-mx-1 flex flex-col">
          {exports.map((record) => (
            <li
              key={record.id}
              className={cn(
                'flex items-center gap-2 rounded-md px-1 py-1 hover:bg-secondary/50',
                record.missing && 'text-muted-foreground'
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs" title={record.path}>
                  {fileName(record.path)}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {record.missing
                    ? 'File not found'
                    : `${formatDuration(record.duration)} · ${formatAgo(record.createdAt)}`}
                </span>
              </div>
              <IconButton
                icon={FolderOpenIcon}
                label="Show in folder"
                size="icon-xs"
                disabled={record.missing}
                onClick={() =>
                  window.editor
                    .revealExport(record.id)
                    .catch((error) =>
                      toast.error('Could not show the file', { description: errorMessage(error) })
                    )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
