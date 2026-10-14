import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { Project } from '../../../shared/project'
import { errorMessage, type OpenProject } from '@/lib/editor'

const DELAY = 500

export function useAutosave(open: OpenProject | null): () => Promise<void> {
  const pending = useRef<Project | null>(null)

  const flush = useCallback(async () => {
    const project = pending.current
    pending.current = null
    if (!project) return
    try {
      await window.editor.saveProject(project)
    } catch (error) {
      toast.error('Could not save edits', { description: errorMessage(error) })
    }
  }, [])

  useEffect(() => {
    if (!open?.edited) return
    pending.current = open.project
    const timer = setTimeout(flush, DELAY)
    return () => clearTimeout(timer)
  }, [open, flush])

  useEffect(() => {
    const onUnload = () => void flush()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [flush])

  return flush
}
