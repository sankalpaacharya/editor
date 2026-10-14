import { useState } from 'react'
import { toast } from 'sonner'
import type { Project } from '../../../shared/project'
import { errorMessage } from '@/lib/editor'

/** `progress` stays null while the save dialog is open, before ffmpeg reports anything. */
export type ExportState = { status: 'idle' } | { status: 'running'; progress: number | null }

export function useExport() {
  const [state, setState] = useState<ExportState>({ status: 'idle' })

  async function start(project: Project) {
    setState({ status: 'running', progress: null })
    const unsubscribe = window.editor.onExportProgress((progress) =>
      setState({ status: 'running', progress })
    )
    try {
      const result = await window.editor.exportVideo(project)
      if (result.status === 'done') toast.success('Export finished', { description: result.path })
    } catch (error) {
      toast.error('Export failed', { description: errorMessage(error) })
    } finally {
      unsubscribe()
      setState({ status: 'idle' })
    }
  }

  return { state, start, cancel: () => void window.editor.cancelExport() }
}
