import { useEffect, useEffectEvent, useState } from 'react'
import { toast } from 'sonner'
import type { Project, ProjectAction } from '../../../shared/project'
import { Inspector } from '@/components/inspector'
import { Preview } from '@/components/preview'
import { Timeline } from '@/components/timeline'
import { Transport } from '@/components/transport'
import { usePlayback } from '@/hooks/use-playback'
import { errorMessage, newImageOverlay, newTextOverlay, type Selection } from '@/lib/editor'

interface EditorProps {
  project: Project
  exportsRevision: number
  dispatch: (action: ProjectAction) => void
}

export function Editor({ project, exportsRevision, dispatch }: EditorProps) {
  const [selection, setSelection] = useState<Selection>(null)
  const { videoRef, playhead, playing, duration, seek, toggle } = usePlayback(project.clips)

  const split = () => dispatch({ type: 'split', time: playhead, newClipId: crypto.randomUUID() })

  function addText() {
    const overlay = newTextOverlay(project, playhead, duration)
    dispatch({ type: 'addOverlay', overlay })
    setSelection({ kind: 'overlay', id: overlay.id })
  }

  async function addImage() {
    try {
      const image = await window.editor.openImage()
      if (!image) return
      const overlay = newImageOverlay(image, playhead, duration)
      dispatch({ type: 'addOverlay', overlay })
      setSelection({ kind: 'overlay', id: overlay.id })
    } catch (error) {
      toast.error('Could not add image', { description: errorMessage(error) })
    }
  }

  function deleteSelection() {
    if (selection?.kind === 'clip' && project.clips.length > 1) {
      dispatch({ type: 'removeClip', clipId: selection.id })
      setSelection(null)
    } else if (selection?.kind === 'overlay') {
      dispatch({ type: 'removeOverlay', overlayId: selection.id })
      setSelection(null)
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target
    if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) {
      return
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === ' ') toggle()
    else if (event.key === 's' || event.key === 'S') split()
    else if (event.key === 'Delete' || event.key === 'Backspace') deleteSelection()
    else return
    event.preventDefault()
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <Preview
            project={project}
            playhead={playhead}
            videoRef={videoRef}
            selectedOverlayId={selection?.kind === 'overlay' ? selection.id : null}
            onSelectOverlay={(id) => setSelection({ kind: 'overlay', id })}
            dispatch={dispatch}
          />
          <Transport
            playing={playing}
            playhead={playhead}
            duration={duration}
            onToggle={toggle}
            onSplit={split}
          />
        </div>
        <Inspector
          project={project}
          selection={selection}
          duration={duration}
          exportsRevision={exportsRevision}
          dispatch={dispatch}
          onDelete={deleteSelection}
        />
      </div>
      <Timeline
        project={project}
        playhead={playhead}
        duration={duration}
        selection={selection}
        onSelect={setSelection}
        onSeek={seek}
        dispatch={dispatch}
        onSplit={split}
        onAddText={addText}
        onAddImage={addImage}
        onDelete={deleteSelection}
      />
    </div>
  )
}
