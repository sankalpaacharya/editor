import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import type { ExportState } from '@/hooks/use-export'

export function ExportDialog({ state, onCancel }: { state: ExportState; onCancel: () => void }) {
  const progress = state.status === 'running' ? state.progress : null
  return (
    <Dialog open={progress !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false} className="gap-4 rounded-lg p-5 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Exporting</DialogTitle>
          <DialogDescription className="text-xs tabular-nums">
            {Math.round((progress ?? 0) * 100)}%
          </DialogDescription>
        </DialogHeader>
        <Progress value={(progress ?? 0) * 100} className="h-1.5" />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
