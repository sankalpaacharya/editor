import { useEffect, useState } from 'react'
import { Cancel01Icon, Video01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RecentVideo } from '../../../shared/api'
import { errorMessage, formatDate, formatTime } from '@/lib/editor'

interface EmptyStateProps {
  onOpen: () => void
  onOpenRecent: (id: number) => void
}

export function EmptyState({ onOpen, onOpenRecent }: EmptyStateProps) {
  const [recent, setRecent] = useState<RecentVideo[]>([])

  useEffect(() => {
    let active = true
    window.editor
      .listRecent()
      .then((videos) => active && setRecent(videos))
      .catch((error) =>
        toast.error('Could not load recent videos', { description: errorMessage(error) })
      )
    return () => {
      active = false
    }
  }, [])

  async function forget(id: number) {
    try {
      await window.editor.forgetRecent(id)
      setRecent((videos) => videos.filter((video) => video.id !== id))
    } catch (error) {
      toast.error('Could not remove video', { description: errorMessage(error) })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6">
      <Button variant="outline" onClick={onOpen}>
        <HugeiconsIcon icon={Video01Icon} strokeWidth={1.75} />
        Open video
      </Button>
      <p className="text-xs text-muted-foreground">Drop a video file here</p>
      {recent.length > 0 && (
        <section className="mt-6 flex max-h-[50vh] w-full max-w-lg flex-col">
          <h2 className="px-2 pb-1 text-xs text-muted-foreground">Recent</h2>
          <ul className="overflow-y-auto border-t">
            {recent.map((video) => (
              <RecentRow
                key={video.id}
                video={video}
                onOpen={() => onOpenRecent(video.id)}
                onForget={() => forget(video.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

interface RecentRowProps {
  video: RecentVideo
  onOpen: () => void
  onForget: () => void
}

function RecentRow({ video, onOpen, onForget }: RecentRowProps) {
  return (
    <li className="flex items-center border-b text-xs">
      <button
        type="button"
        onClick={onOpen}
        disabled={video.missing}
        className={cn(
          'flex h-8 min-w-0 flex-1 items-center gap-3 px-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50 disabled:pointer-events-none',
          video.missing && 'text-muted-foreground'
        )}
      >
        <span className="min-w-0 flex-1 truncate">{video.name}</span>
        {video.missing ? (
          <span>File not found</span>
        ) : (
          video.exportCount > 0 && (
            <span className="text-muted-foreground">
              {video.exportCount} {video.exportCount === 1 ? 'export' : 'exports'}
            </span>
          )
        )}
        <span className="w-12 text-right text-muted-foreground tabular-nums">
          {formatTime(video.duration)}
        </span>
        <span className="w-16 text-right text-muted-foreground tabular-nums">
          {formatDate(video.openedAt)}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${video.name} from recent`}
        onClick={onForget}
        className="mx-1 text-muted-foreground"
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.75} />
      </Button>
    </li>
  )
}
