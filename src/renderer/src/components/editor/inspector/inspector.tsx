import { Delete02Icon } from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/icon-button'
import type { Edit } from '@/components/editor/editor'
import { Panel } from '@/components/editor/panel'
import { ClipInspector } from '@/components/editor/inspector/clip-inspector'
import { ImageInspector, TextInspector } from '@/components/editor/inspector/overlay-inspector'
import { ExportHistory } from '@/components/editor/inspector/export-history'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import type { ProjectId } from '../../../../../shared/api'
import type { MediaId, MediaItem, Overlay, Sequence } from '../../../../../shared/sequence'
import type { Selection } from '@/lib/selection'

interface InspectorProps {
  projectId: ProjectId
  sequence: Sequence
  mediaById: ReadonlyMap<MediaId, MediaItem>
  selection: Selection
  duration: number
  exportsRevision: number
  edit: Edit
  onDelete: () => void
}

export function Inspector({
  projectId,
  sequence,
  mediaById,
  selection,
  duration,
  exportsRevision,
  edit,
  onDelete
}: InspectorProps) {
  const clip =
    selection?.kind === 'clip' ? sequence.clips.find((c) => c.id === selection.id) : undefined
  const overlay =
    selection?.kind === 'overlay' ? sequence.overlays.find((o) => o.id === selection.id) : undefined
  const updateOverlay = (next: Overlay, coalesce?: string) =>
    edit({ type: 'updateOverlay', overlay: next }, coalesce)

  const title = clip ? 'Clip' : overlay?.kind === 'text' ? 'Text' : overlay ? 'Image' : 'Project'
  const image = overlay?.kind === 'image' ? mediaById.get(overlay.mediaId) : undefined

  return (
    <Panel
      title={title}
      actions={
        (clip || overlay) && (
          <IconButton
            icon={Delete02Icon}
            label="Delete"
            shortcut={SHORTCUTS.delete}
            size="icon-xs"
            onClick={onDelete}
          />
        )
      }
      className="w-[300px] shrink-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {clip ? (
          <ClipInspector key={clip.id} clip={clip} edit={edit} />
        ) : overlay?.kind === 'text' ? (
          <TextInspector
            key={overlay.id}
            overlay={overlay}
            duration={duration}
            onChange={updateOverlay}
          />
        ) : overlay?.kind === 'image' ? (
          <ImageInspector
            key={overlay.id}
            overlay={overlay}
            image={image?.kind === 'image' ? image : undefined}
            duration={duration}
            onChange={updateOverlay}
          />
        ) : (
          <ExportHistory projectId={projectId} revision={exportsRevision} />
        )}
      </div>
    </Panel>
  )
}
