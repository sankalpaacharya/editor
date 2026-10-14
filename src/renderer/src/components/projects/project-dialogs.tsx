import { useState, type FormEvent } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface ProjectDialogProps {
  open: boolean
  name: string
  onOpenChange: (open: boolean) => void
}

export function RenameProjectDialog({
  open,
  name,
  onOpenChange,
  onRename
}: ProjectDialogProps & { onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name)

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim()
    if (next && next !== name) onRename(next)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(name)
        onOpenChange(next)
      }}
    >
      <DialogContent showCloseButton={false} className="gap-4 rounded-lg p-4 sm:max-w-xs">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle className="text-sm">Rename project</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={draft}
            maxLength={120}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            className="h-8 rounded-md text-xs md:text-xs"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteProjectDialog({
  open,
  name,
  onOpenChange,
  onDelete
}: ProjectDialogProps & { onDelete: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-4 rounded-lg p-4 data-[size=default]:sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            This removes the project and its edit. Your video files and exports stay on disk.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
