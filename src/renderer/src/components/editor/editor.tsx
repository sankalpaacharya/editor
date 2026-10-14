import { useCallback, useMemo, useReducer, useState } from 'react'
import { Image01Icon, TextIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { RailButton } from '@/components/rail'
import { EditorHeader } from '@/components/editor/header'
import { ExportDialog } from '@/components/editor/export-dialog'
import { Inspector } from '@/components/editor/inspector/inspector'
import { MediaPanel } from '@/components/editor/media-panel'
import { TextPanel } from '@/components/editor/text-panel'
import { Preview } from '@/components/editor/preview'
import { PlayerControls } from '@/components/editor/player-controls'
import { Timeline } from '@/components/editor/timeline/timeline'
import { useAutosave } from '@/hooks/use-autosave'
import { useEditorShortcuts } from '@/hooks/use-editor-shortcuts'
import { useExport } from '@/hooks/use-export'
import { useFileDrop } from '@/hooks/use-file-drop'
import { usePlayback } from '@/hooks/use-playback'
import type { OpenProject } from '../../../../shared/api'
import {
  locate,
  type ImageMedia,
  type MediaId,
  type MediaItem,
  type SequenceAction
} from '../../../../shared/sequence'
import { errorMessage } from '@/lib/format'
import { historyReducer, initialHistory } from '@/lib/history'
import { createProgramMeter } from '@/lib/program-meter'
import { newImageOverlay, newTextOverlay, TEXT_PRESETS, type TextPreset } from '@/lib/overlays'
import { nextSelection, onlySelected, type Select, type Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

export type Edit = (action: SequenceAction, coalesce?: string) => void

export function Editor({ project, onClose }: { project: OpenProject; onClose: () => void }) {
  const [history, dispatch] = useReducer(historyReducer, project.sequence, initialHistory)
  const sequence = history.present
  const [name, setName] = useState(project.name)
  const [media, setMedia] = useState<MediaItem[]>(project.media)
  const [missing, setMissing] = useState<ReadonlySet<MediaId>>(new Set(project.missingMedia))
  const [selection, setSelection] = useState<Selection>([])
  const select: Select = (item, additive) =>
    setSelection((current) => nextSelection(current, item, additive))
  const [panel, setPanel] = useState<'media' | 'text'>('media')
  const playback = usePlayback(sequence.clips, sequence.tracks.audio.enabled ? 1 : 0)
  const { playhead, duration, seek } = playback
  const flush = useAutosave(project.id, sequence)
  const exporter = useExport(project.id)
  const meter = useMemo(createProgramMeter, [])
  const { registerVideo } = playback
  const registerMeteredVideo = useCallback(
    (id: MediaId, video: HTMLVideoElement | null) => {
      if (video) meter.attach(video)
      registerVideo(id, video)
    },
    [meter, registerVideo]
  )
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
  const importMedia = () =>
    guard('Could not import media', async () =>
      addImported(await window.editor.importMedia(project.id))
    )
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
      setSelection([])
    })

  function addMedia(item: MediaItem, at: { index?: number; time?: number } = {}) {
    if (item.kind === 'video') {
      const clipId = crypto.randomUUID()
      edit({ type: 'addClip', clipId, media: item, index: at.index })
      setSelection([{ kind: 'clip', id: clipId }])
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
    setSelection([{ kind: 'overlay', id: overlay.id }])
  }

  function addText(preset: TextPreset) {
    const overlay = newTextOverlay(preset, sequence.format, playhead, duration)
    edit({ type: 'addOverlay', overlay })
    setSelection([{ kind: 'overlay', id: overlay.id }])
  }

  const duplicate = () => {
    const only = onlySelected(selection)
    if (only?.kind === 'clip') {
      edit({ type: 'duplicateClip', clipId: only.id, newClipId: crypto.randomUUID() })
    }
  }

  const split = () => edit({ type: 'split', time: playhead, newClipId: crypto.randomUUID() })

  // Q and W: cut the clip under the playhead and drop the part before or after it.
  function trimToPlayhead(side: 'left' | 'right') {
    const position = locate(sequence.clips, playhead)
    if (!position || position.inGap || sequence.tracks.video.locked) return
    const { clip, sourceTime } = position
    const media = mediaById.get(clip.mediaId)
    edit({
      type: 'trim',
      clipId: clip.id,
      in: side === 'left' ? sourceTime : clip.in,
      out: side === 'right' ? sourceTime : clip.out,
      mediaDuration: media?.kind === 'video' ? media.duration : clip.out
    })
  }

  function deleteSelection() {
    const { tracks } = sequence
    const batch = crypto.randomUUID()
    for (const { kind, id } of selection) {
      if (kind === 'overlay' ? tracks.overlays.locked : tracks.video.locked) continue
      if (kind === 'clip') edit({ type: 'removeClip', clipId: id }, batch)
      else if (kind === 'overlay') edit({ type: 'removeOverlay', overlayId: id }, batch)
      else edit({ type: 'closeGap', clipId: id }, batch)
    }
    setSelection([])
  }

  const selectAll = () =>
    setSelection([
      ...sequence.clips.map((clip) => ({ kind: 'clip' as const, id: clip.id })),
      ...sequence.overlays.map((overlay) => ({ kind: 'overlay' as const, id: overlay.id }))
    ])

  const undo = () => dispatch({ type: 'undo' })
  const redo = () => dispatch({ type: 'redo' })

  useEditorShortcuts({
    togglePlay: playback.toggle,
    play: () => playback.playing || playback.toggle(),
    pause: () => playback.playing && playback.toggle(),
    split,
    trimLeft: () => trimToPlayhead('left'),
    trimRight: () => trimToPlayhead('right'),
    duplicate,
    addText: () => duration > 0 && addText(TEXT_PRESETS[0]),
    selectAll,
    clearSelection: () => setSelection([]),
    deleteSelection,
    undo,
    redo,
    step: (amount, unit = 'frame') =>
      seek(playhead + (unit === 'frame' ? amount / sequence.format.fps : amount)),
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
        'flex h-screen flex-col gap-2 p-2 outline-1 -outline-offset-1 outline-transparent',
        dropping && 'outline-brand/60'
      )}
    >
      <EditorHeader
        name={name}
        onBack={close}
        onRename={rename}
        canExport={sequence.clips.length > 0 && exporter.state.status === 'idle'}
        onExport={() => exporter.start(sequence)}
      />
      <div className="flex min-h-0 flex-1 gap-2">
        <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg bg-card py-3">
          <RailButton
            label="Media"
            icon={Image01Icon}
            active={panel === 'media'}
            onSelect={() => setPanel('media')}
          />
          <RailButton
            label="Text"
            icon={TextIcon}
            active={panel === 'text'}
            onSelect={() => setPanel('text')}
          />
        </nav>
        {panel === 'media' ? (
          <MediaPanel
            media={media}
            missing={missing}
            sequence={sequence}
            onImport={() => importMedia()}
            onAdd={(item) => addMedia(item)}
            onRemove={removeMedia}
          />
        ) : (
          <TextPanel canAdd={duration > 0} onAdd={addText} />
        )}
        <Preview
          sequence={sequence}
          mediaById={mediaById}
          playhead={playhead}
          activeMediaId={playback.activeMediaId}
          registerVideo={registerMeteredVideo}
          selection={selection}
          onSelect={select}
          edit={edit}
          onDropImage={(image, position) => addImage(image, playhead, position)}
        >
          <PlayerControls
            playing={playback.playing}
            playhead={playhead}
            duration={duration}
            format={sequence.format}
            onToggle={playback.toggle}
          />
        </Preview>
        <Inspector
          projectId={project.id}
          sequence={sequence}
          mediaById={mediaById}
          selection={selection}
          exportsRevision={exporter.finished}
          edit={edit}
          onDelete={deleteSelection}
        />
      </div>
      <Timeline
        meter={meter.source}
        sequence={sequence}
        mediaById={mediaById}
        playback={playback}
        selection={selection}
        onSelect={select}
        edit={edit}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onSplit={split}
        onTrimLeft={() => trimToPlayhead('left')}
        onTrimRight={() => trimToPlayhead('right')}
        onDuplicate={duplicate}
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelection}
        onDropMedia={addMedia}
      />
      <ExportDialog state={exporter.state} onCancel={exporter.cancel} />
    </div>
  )
}
