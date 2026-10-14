import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { ProjectId } from '../../../shared/api'
import type { Sequence } from '../../../shared/sequence'
import { errorMessage } from '@/lib/format'

const DELAY_MS = 500

/** Saves `sequence` shortly after it changes. The returned flush saves any pending change now. */
export function useAutosave(projectId: ProjectId, sequence: Sequence): () => Promise<void> {
  const saved = useRef(sequence)
  const pending = useRef<Sequence | null>(null)

  const flush = useCallback(async () => {
    const next = pending.current
    pending.current = null
    if (!next) return
    try {
      await window.editor.saveSequence(projectId, next)
      saved.current = next
    } catch (error) {
      toast.error('Could not save edits', { description: errorMessage(error) })
    }
  }, [projectId])

  useEffect(() => {
    if (sequence === saved.current) return
    pending.current = sequence
    const timer = setTimeout(flush, DELAY_MS)
    return () => clearTimeout(timer)
  }, [sequence, flush])

  useEffect(() => {
    const onUnload = () => void flush()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [flush])

  return flush
}
