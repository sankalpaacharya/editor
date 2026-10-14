import { useState } from 'react'
import { toast } from 'sonner'
import type { ProjectId } from '../../../shared/api'
import type { Sequence } from '../../../shared/sequence'
import { errorMessage, fileName } from '@/lib/format'

export type ExportState = { status: 'idle' } | { status: 'running'; progress: number }

async function reveal(exportId: number) {
  try {
    await window.editor.revealExport(exportId)
  } catch (error) {
    toast.error('Could not show the file', { description: errorMessage(error) })
  }
}

export function useExport(projectId: ProjectId) {
  const [state, setState] = useState<ExportState>({ status: 'idle' })
  const [finished, setFinished] = useState(0)

  async function start(sequence: Sequence) {
    setState({ status: 'running', progress: 0 })
    const unsubscribe = window.editor.onExportProgress((progress) =>
      setState({ status: 'running', progress })
    )
    try {
      const result = await window.editor.exportProject(projectId, sequence)
      if (result.status === 'done') {
        setFinished((count) => count + 1)
        toast.success('Export finished', {
          description: fileName(result.path),
          action: { label: 'Reveal', onClick: () => void reveal(result.exportId) }
        })
      }
    } catch (error) {
      toast.error('Export failed', { description: errorMessage(error) })
    } finally {
      unsubscribe()
      setState({ status: 'idle' })
    }
  }

  return { state, finished, start, cancel: () => void window.editor.cancelExport() }
}
