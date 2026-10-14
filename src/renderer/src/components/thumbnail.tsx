import { Film01Icon, Image01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { mediaUrl } from '../../../shared/api'
import type { MediaId } from '../../../shared/sequence'
import { useImageStatus } from '@/hooks/use-image-status'
import { cn } from '@/lib/utils'

interface ThumbnailProps {
  mediaId: MediaId | null
  kind?: 'video' | 'image'
  className?: string
}

export function Thumbnail({ mediaId, kind = 'video', className }: ThumbnailProps) {
  const url = mediaId ? mediaUrl.thumbnail(mediaId) : null
  const status = useImageStatus(url)
  const shown = url !== null && status === 'loaded'
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {shown ? (
        <img src={url ?? undefined} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground/50">
          <HugeiconsIcon
            icon={kind === 'image' ? Image01Icon : Film01Icon}
            strokeWidth={1.5}
            className="size-5"
          />
        </div>
      )}
    </div>
  )
}
