import { useMemo } from 'react'
import { Upload04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { MediaCard } from '@/components/editor/media-card'
import { Panel } from '@/components/editor/panel'
import type { MediaId, MediaItem, Sequence } from '../../../../shared/sequence'

interface MediaPanelProps {
  media: MediaItem[]
  missing: ReadonlySet<MediaId>
  sequence: Sequence
  onImport: () => void
  onAdd: (item: MediaItem) => void
  onRemove: (mediaId: MediaId) => void
}

export function MediaPanel({
  media,
  missing,
  sequence,
  onImport,
  onAdd,
  onRemove
}: MediaPanelProps) {
  const used = useMemo(
    () =>
      new Set<MediaId>([
        ...sequence.clips.map((clip) => clip.mediaId),
        ...sequence.overlays.flatMap((overlay) =>
          overlay.kind === 'image' ? [overlay.mediaId] : []
        )
      ]),
    [sequence]
  )

  return (
    <Panel
      title={
        <>
          Media
          {media.length > 0 && (
            <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
              {media.length}
            </span>
          )}
        </>
      }
      actions={
        <Button variant="secondary" size="xs" className="rounded-md" onClick={onImport}>
          <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.75} />
          Import
        </Button>
      }
      className="w-[280px] shrink-0"
    >
      {media.length === 0 ? (
        <button
          type="button"
          onClick={onImport}
          className="m-3 flex h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.5} className="mb-1 size-4" />
          Import or drop videos and images
        </button>
      ) : (
        <div className="grid grid-cols-2 content-start gap-x-2 gap-y-2.5 overflow-y-auto p-3">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              used={used.has(item.id)}
              missing={missing.has(item.id)}
              onAdd={() => onAdd(item)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
