import { useState } from 'react'
import { Delete02Icon, MoreHorizontalIcon, PencilEdit01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Thumbnail } from '@/components/thumbnail'
import { DeleteProjectDialog, RenameProjectDialog } from '@/components/projects/project-dialogs'
import type { ProjectSummary } from '../../../../shared/api'
import { formatAgo, formatDuration } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

interface ProjectCardProps {
  project: ProjectSummary
  onOpen: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

export function ProjectCard({ project, onOpen, onRename, onDelete }: ProjectCardProps) {
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null)
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg bg-muted p-1.5 transition-colors hover:bg-accent">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Thumbnail
            mediaId={project.coverMediaId}
            className="size-full transition-[filter] group-hover:brightness-110"
          />
          {project.duration > 0 && (
            <Badge className="absolute right-1.5 bottom-1.5">
              {formatDuration(project.duration)}
            </Badge>
          )}
        </div>
        <div className="flex h-8 items-baseline gap-2 pr-8 pl-2.5">
          <span className="min-w-0 truncate text-xs font-medium leading-8">{project.name}</span>
          <span className="ml-auto shrink-0 text-2xs text-muted-foreground">
            {formatAgo(project.updatedAt)}
          </span>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Project options"
          className="absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-secondary"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.75} className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuItem className="h-7 text-xs" onSelect={() => setDialog('rename')}>
            <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={1.75} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="h-7 text-xs"
            variant="destructive"
            onSelect={() => setDialog('delete')}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameProjectDialog
        open={dialog === 'rename'}
        name={project.name}
        onOpenChange={(open) => !open && setDialog(null)}
        onRename={onRename}
      />
      <DeleteProjectDialog
        open={dialog === 'delete'}
        name={project.name}
        onOpenChange={(open) => !open && setDialog(null)}
        onDelete={onDelete}
      />
    </div>
  )
}
