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
  const progress = state.status === 'running' ? state.progress : 0
  return (
    <Dialog open={state.status === 'running'} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false} className="gap-3 rounded-xl p-4 sm:max-w-xs">
        <DialogHeader className="flex-row items-baseline justify-between">
          <DialogTitle className="text-sm">Exporting</DialogTitle>
          <DialogDescription className="text-xs tabular-nums">
            {Math.round(progress * 100)}%
          </DialogDescription>
        </DialogHeader>
        <Progress value={progress * 100} className="h-1 [&>*]:bg-brand" />
        <DialogFooter>
          <Button variant="outline" size="sm" className="rounded-md" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
