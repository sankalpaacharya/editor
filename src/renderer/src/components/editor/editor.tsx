import { useMemo, useReducer, useState } from 'react'
import { Folder01Icon, Image01Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Rail } from '@/components/rail'
import { EditorHeader } from '@/components/editor/header'
import { ExportDialog } from '@/components/editor/export-dialog'
import { Inspector } from '@/components/editor/inspector/inspector'
import { MediaPanel } from '@/components/editor/media-panel'
import { Preview } from '@/components/editor/preview'
import { InsertBar } from '@/components/editor/insert-bar'
import { PlayerControls } from '@/components/editor/player-controls'
import { Timeline } from '@/components/editor/timeline/timeline'
import { useAutosave } from '@/hooks/use-autosave'
import { useEditorShortcuts } from '@/hooks/use-editor-shortcuts'
import { useExport } from '@/hooks/use-export'
import { useFileDrop } from '@/hooks/use-file-drop'
import { usePlayback } from '@/hooks/use-playback'
import type { OpenProject } from '../../../../shared/api'
import type { ImageMedia, MediaId, MediaItem, SequenceAction } from '../../../../shared/sequence'
import { errorMessage } from '@/lib/format'
import { historyReducer, initialHistory } from '@/lib/history'
import { newImageOverlay, newTextOverlay, type TextPreset } from '@/lib/overlays'
import type { Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

export type Edit = (action: SequenceAction, coalesce?: string) => void

export interface MasterVolume {
  level: number
  muted: boolean
}

export function Editor({ project, onClose }: { project: OpenProject; onClose: () => void }) {
  const [history, dispatch] = useReducer(historyReducer, project.sequence, initialHistory)
  const sequence = history.present
  const [name, setName] = useState(project.name)
  const [media, setMedia] = useState<MediaItem[]>(project.media)
  const [missing, setMissing] = useState<ReadonlySet<MediaId>>(new Set(project.missingMedia))
  const [selection, setSelection] = useState<Selection>(null)
  const [master, setMaster] = useState<MasterVolume>({ level: 1, muted: false })
  const playback = usePlayback(sequence.clips, master.muted ? 0 : master.level)
  const { playhead, duration, seek } = playback
  const flush = useAutosave(project.id, sequence)
  const exporter = useExport(project.id)
  const mediaById = useMemo(() => new Map(media.map((item) => [item.id, item])), [media])

  const edit: Edit = (action, coalesce) => dispatch({ type: 'edit', action, coalesce })

  async function guard(label: string, task: () => Promise<void>) {
    try {
      await task()
    } catch (error) {
      toast.error(label, { description: errorMessage(error) })
    }
  }

  const addImported = (items: MediaItem[]) => {
    setMedia((current) => [
      ...current,
      ...items.filter((item) => !current.some((known) => known.id === item.id))
    ])
    setMissing((current) => new Set([...current].filter((id) => !items.some((i) => i.id === id))))
  }
  const importMedia = (kind?: MediaItem['kind'], insert = false) =>
    guard('Could not import media', async () => {
      const items = await window.editor.importMedia(project.id, kind)
      addImported(items)
      if (insert) items.forEach((item) => addMedia(item))
    })
  const [dropping, dropProps] = useFileDrop((files) =>
    guard('Could not import files', async () =>
      addImported(await window.editor.importMediaFiles(project.id, files))
    )
  )

  const removeMedia = (mediaId: MediaId) =>
    guard('Could not remove media', async () => {
      await window.editor.removeMedia(project.id, mediaId)
      setMedia((current) => current.filter((item) => item.id !== mediaId))
      dispatch({ type: 'forgetMedia', mediaId })
      setSelection(null)
    })

  function addMedia(item: MediaItem, at: { index?: number; time?: number } = {}) {
    if (item.kind === 'video') {
      const clipId = crypto.randomUUID()
      edit({ type: 'addClip', clipId, media: item, index: at.index })
      setSelection({ kind: 'clip', id: clipId })
    } else {
      addImage(item, at.time ?? playhead)
    }
  }

  function addImage(image: ImageMedia, time: number, position?: { x: number; y: number }) {
    if (duration === 0) {
      toast('Add a video first', { description: 'Images sit on top of the video timeline.' })
      return
    }
    const overlay = newImageOverlay(image, time, duration, position)
    edit({ type: 'addOverlay', overlay })
    setSelection({ kind: 'overlay', id: overlay.id })
  }

  function addText(preset: TextPreset) {
    const overlay = newTextOverlay(preset, sequence.format, playhead, duration)
    edit({ type: 'addOverlay', overlay })
    setSelection({ kind: 'overlay', id: overlay.id })
  }

  const duplicate = () => {
    if (selection?.kind === 'clip') {
      edit({ type: 'duplicateClip', clipId: selection.id, newClipId: crypto.randomUUID() })
    }
  }

  const split = () => edit({ type: 'split', time: playhead, newClipId: crypto.randomUUID() })

  function deleteSelection() {
    if (selection?.kind === 'clip') edit({ type: 'removeClip', clipId: selection.id })
    else if (selection?.kind === 'overlay') edit({ type: 'removeOverlay', overlayId: selection.id })
    setSelection(null)
  }

  const undo = () => dispatch({ type: 'undo' })
  const redo = () => dispatch({ type: 'redo' })

  useEditorShortcuts({
    togglePlay: playback.toggle,
    split,
    deleteSelection,
    undo,
    redo,
    step: (frames) => seek(playhead + frames / sequence.format.fps),
    seek
  })

  async function close() {
    await flush()
    onClose()
  }

  const rename = (next: string) =>
    guard('Could not rename project', async () => {
      await window.editor.renameProject(project.id, next)
      setName(next)
    })

  return (
    <div
      {...dropProps}
      className={cn(
        'flex h-screen gap-2 py-2 pr-2 outline-1 -outline-offset-1 outline-transparent',
        dropping && 'outline-brand/60'
      )}
    >
      <Rail
        groups={[
          [{ label: 'Projects', icon: Folder01Icon, active: false, onSelect: close }],
          [
            {
              label: 'Media',
              icon: Image01Icon,
              active: true,
              onSelect() {}
            }
          ]
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <EditorHeader
          name={name}
          onBack={close}
          onRename={rename}
          canExport={sequence.clips.length > 0 && exporter.state.status === 'idle'}
          onExport={() => exporter.start(sequence)}
        >
          <InsertBar
            canOverlay={duration > 0}
            onVideo={() => importMedia('video', true)}
            onImage={() => importMedia('image', true)}
            onText={addText}
          />
        </EditorHeader>
        <div className="flex min-h-0 flex-1 gap-2">
          <MediaPanel
            media={media}
            missing={missing}
            sequence={sequence}
            onImport={() => importMedia()}
            onAdd={(item) => addMedia(item)}
            onRemove={removeMedia}
          />
          <Preview
            sequence={sequence}
            mediaById={mediaById}
            playhead={playhead}
            activeMediaId={playback.activeMediaId}
            registerVideo={playback.registerVideo}
            selection={selection}
            onSelect={setSelection}
            edit={edit}
            onDropImage={(image, position) => addImage(image, playhead, position)}
            master={master}
            onMasterChange={setMaster}
          >
            <PlayerControls
              playing={playback.playing}
              playhead={playhead}
              duration={duration}
              onToggle={playback.toggle}
              onSeek={playback.seek}
              fps={sequence.format.fps}
            />
          </Preview>
          <Inspector
            projectId={project.id}
            sequence={sequence}
            mediaById={mediaById}
            selection={selection}
            duration={duration}
            exportsRevision={exporter.finished}
            edit={edit}
            onDelete={deleteSelection}
          />
        </div>
        <Timeline
          sequence={sequence}
          mediaById={mediaById}
          playback={playback}
          selection={selection}
          onSelect={setSelection}
          edit={edit}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          onSplit={split}
          onDuplicate={duplicate}
          onDelete={deleteSelection}
          onDropMedia={addMedia}
        />
      </div>
      <ExportDialog state={exporter.state} onCancel={exporter.cancel} />
    </div>
  )
}
