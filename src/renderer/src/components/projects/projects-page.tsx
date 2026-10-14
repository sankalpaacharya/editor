import { useCallback, useEffect, useState } from 'react'
import { Add01Icon, Folder01Icon, Upload04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Rail } from '@/components/rail'
import { ProjectCard } from '@/components/projects/project-card'
import { useFileDrop } from '@/hooks/use-file-drop'
import type { OpenProject, ProjectSummary } from '../../../../shared/api'
import { editSequence } from '../../../../shared/sequence'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'

function untitledName(projects: readonly ProjectSummary[]): string {
  const used = new Set(projects.map((project) => project.name))
  let n = 1
  while (used.has(`Untitled project ${n}`)) n++
  return `Untitled project ${n}`
}

async function createFromFiles(name: string, files: File[]): Promise<OpenProject> {
  const project = await window.editor.createProject(name)
  const imported = await window.editor.importMediaFiles(project.id, files)
  const sequence = imported.reduce(
    (sequence, media) =>
      media.kind === 'video'
        ? editSequence(sequence, { type: 'addClip', clipId: crypto.randomUUID(), media })
        : sequence,
    project.sequence
  )
  await window.editor.saveSequence(project.id, sequence)
  return { ...project, media: [...project.media, ...imported], sequence }
}

export function ProjectsPage({ onOpen }: { onOpen: (project: OpenProject) => void }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setProjects(await window.editor.listProjects())
    } catch (error) {
      toast.error('Could not load projects', { description: errorMessage(error) })
      setProjects((current) => current ?? [])
    }
  }, [])

  useEffect(() => {
    window.editor.listProjects().then(setProjects, (error) => {
      toast.error('Could not load projects', { description: errorMessage(error) })
      setProjects([])
    })
  }, [])

  async function run(label: string, task: () => Promise<unknown>) {
    setBusy(true)
    try {
      await task()
    } catch (error) {
      toast.error(label, { description: errorMessage(error) })
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  const name = () => untitledName(projects ?? [])
  const create = () =>
    run('Could not create project', async () => onOpen(await window.editor.createProject(name())))
  const [dropping, dropProps] = useFileDrop((files) =>
    run('Could not import files', async () => onOpen(await createFromFiles(name(), files)))
  )

  return (
    <div className="flex h-screen gap-2 py-2 pr-2">
      <Rail groups={[[{ label: 'Projects', icon: Folder01Icon, active: true, onSelect() {} }]]} />
      <main
        {...dropProps}
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-card',
          dropping && 'ring-2 ring-brand/60'
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 px-5">
          <h1 className="text-[15px] font-medium">Projects</h1>
          {projects && projects.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground tabular-nums">{projects.length}</span>
              <Button
                variant="brand"
                size="sm"
                className="ml-auto h-8 px-4"
                onClick={create}
                disabled={busy}
              >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                New project
              </Button>
            </>
          )}
        </header>
        {projects?.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1 text-center">
              <HugeiconsIcon
                icon={Upload04Icon}
                strokeWidth={1.5}
                className="mb-1 size-5 text-muted-foreground"
              />
              <p className="text-xs font-medium">No projects yet</p>
              <p className="text-xs text-muted-foreground">Drop videos here to start one.</p>
            </div>
            <Button variant="brand" size="sm" className="h-8 px-4" onClick={create} disabled={busy}>
              New project
            </Button>
          </div>
        ) : (
          <div className="grid min-h-0 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] content-start gap-4 overflow-y-auto px-5 pb-5">
            {projects?.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() =>
                  run('Could not open project', async () =>
                    onOpen(await window.editor.openProject(project.id))
                  )
                }
                onRename={(next) =>
                  run('Could not rename project', async () => {
                    await window.editor.renameProject(project.id, next)
                    await refresh()
                  })
                }
                onDelete={() =>
                  run('Could not delete project', async () => {
                    await window.editor.deleteProject(project.id)
                    await refresh()
                  })
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
