import { Add01Icon, Delete02Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Thumbnail } from '@/components/thumbnail'
import type { MediaItem } from '../../../../shared/sequence'
import { formatDuration } from '@/lib/format'
import { startMediaDrag } from '@/lib/media-drag'
import { cn } from '@/lib/utils'

interface MediaCardProps {
  item: MediaItem
  used: boolean
  missing: boolean
  onAdd: () => void
  onRemove: () => void
}

const overlayButton =
  'flex size-5 items-center justify-center rounded-[5px] bg-black/65 text-white/90 outline-none hover:bg-black/85 focus-visible:ring-2 focus-visible:ring-ring'

export function MediaCard({ item, used, missing, onAdd, onRemove }: MediaCardProps) {
  return (
    <div
      draggable={!missing}
      onDragStart={(event) => startMediaDrag(event, item)}
      onDoubleClick={missing ? undefined : onAdd}
      className="group flex min-w-0 flex-col gap-1"
      title={item.name}
    >
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-md ring-1 ring-border transition-shadow group-hover:ring-foreground/25',
          missing && 'opacity-45'
        )}
      >
        <Thumbnail mediaId={item.id} kind={item.kind} className="size-full" />
        {used && (
          <span className="absolute top-1 left-1 rounded-[4px] bg-black/65 px-1 text-[10px] leading-4 text-white/90">
            Added
          </span>
        )}
        {item.kind === 'video' && (
          <span className="absolute bottom-1 left-1 rounded-[4px] bg-black/65 px-1 text-[10px] leading-4 text-white/90 tabular-nums">
            {formatDuration(item.duration)}
          </span>
        )}
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100">
          {!missing && (
            <button
              type="button"
              aria-label="Add to timeline"
              onClick={onAdd}
              className={overlayButton}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Media options" className={overlayButton}>
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem className="h-7 text-xs" variant="destructive" onSelect={onRemove}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
                Remove from project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <span
        className={cn(
          'truncate text-[11px] leading-4',
          missing ? 'text-destructive/80' : 'text-muted-foreground'
        )}
      >
        {missing ? 'File not found' : item.name}
      </span>
    </div>
  )
}
