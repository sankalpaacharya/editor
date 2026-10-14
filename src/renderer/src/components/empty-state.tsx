import { Video01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'

export function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <Button variant="outline" onClick={onOpen}>
        <HugeiconsIcon icon={Video01Icon} strokeWidth={1.75} />
        Open video
      </Button>
      <p className="text-xs text-muted-foreground">Drop a video file here</p>
    </div>
  )
}
