import { PauseIcon, PlayIcon, ScissorIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/editor'

interface TransportProps {
  playing: boolean
  playhead: number
  duration: number
  onToggle: () => void
  onSplit: () => void
}

export function Transport({ playing, playhead, duration, onToggle, onSplit }: TransportProps) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-t px-3">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
      >
        <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} strokeWidth={1.75} />
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        <span className="text-foreground">{formatTime(playhead)}</span> / {formatTime(duration)}
      </span>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onSplit} title="Split (S)">
        <HugeiconsIcon icon={ScissorIcon} strokeWidth={1.75} />
        Split
      </Button>
    </div>
  )
}
