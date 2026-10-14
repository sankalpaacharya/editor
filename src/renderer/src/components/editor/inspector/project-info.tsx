import { useEffect, useState } from 'react'
import { FolderOpenIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { IconButton } from '@/components/icon-button'
import { Field, ReadOnly, Section } from '@/components/editor/inspector/fields'
import type { ExportRecord, ProjectId } from '../../../../../shared/api'
import type { Sequence } from '../../../../../shared/sequence'
import { errorMessage, fileName, formatAgo, formatClock, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ProjectInfoProps {
  projectId: ProjectId
  sequence: Sequence
  duration: number
  exportsRevision: number
}

export function ProjectInfo({ projectId, sequence, duration, exportsRevision }: ProjectInfoProps) {
  const { format } = sequence
  return (
    <>
      <Section title="Format">
        <Field label="Size">
          {() => (
            <ReadOnly>
              {format.width}×{format.height}
            </ReadOnly>
          )}
        </Field>
        <Field label="Rate">{() => <ReadOnly>{Number(format.fps.toFixed(2))} fps</ReadOnly>}</Field>
        <Field label="Length">{() => <ReadOnly>{formatClock(duration)}</ReadOnly>}</Field>
        <Field label="Clips">
          {() => (
            <ReadOnly>
              {sequence.clips.length} clips · {sequence.overlays.length} overlays
            </ReadOnly>
          )}
        </Field>
      </Section>
      <ExportHistory projectId={projectId} revision={exportsRevision} />
    </>
  )
}

function ExportHistory({ projectId, revision }: { projectId: ProjectId; revision: number }) {
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
