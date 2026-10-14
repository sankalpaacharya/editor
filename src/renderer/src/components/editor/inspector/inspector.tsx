import { Delete02Icon } from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/ui/icon-button'
import type { Edit } from '@/components/editor/editor'
import { Panel } from '@/components/ui/panel'
import { ClipInspector, ClipTabs, type ClipTab } from '@/components/editor/inspector/clip-inspector'
import { ImageInspector, TextInspector } from '@/components/editor/inspector/overlay-inspector'
import { ExportHistory } from '@/components/editor/inspector/export-history'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import type { ProjectId } from '../../../../../shared/api'
import type { MediaId, MediaItem, Overlay, Sequence } from '../../../../../shared/sequence'
import { onlySelected, type Selection } from '@/lib/selection'

interface InspectorProps {
  projectId: ProjectId
  sequence: Sequence
  mediaById: ReadonlyMap<MediaId, MediaItem>
  selection: Selection
  exportsRevision: number
  edit: Edit
  clipTab: ClipTab
  onClipTab: (tab: ClipTab) => void
  onDelete: () => void
}

export function Inspector({
  projectId,
  sequence,
  mediaById,
  selection,
  exportsRevision,
  edit,
  clipTab,
  onClipTab,
  onDelete
}: InspectorProps) {
  const only = onlySelected(selection)
  const clip = only?.kind === 'clip' ? sequence.clips.find((c) => c.id === only.id) : undefined
  const overlay =
    only?.kind === 'overlay' ? sequence.overlays.find((o) => o.id === only.id) : undefined
  const updateOverlay = (next: Overlay, coalesce?: string) =>
    edit({ type: 'updateOverlay', overlay: next }, coalesce)

  const title = clip ? (
    <ClipTabs tab={clipTab} onTab={onClipTab} />
  ) : overlay?.kind === 'text' ? (
    'Text'
  ) : overlay ? (
    'Image'
  ) : (
    'Project'
  )
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
          <ClipInspector key={clip.id} clip={clip} tab={clipTab} edit={edit} />
        ) : overlay?.kind === 'text' ? (
          <TextInspector key={overlay.id} overlay={overlay} onChange={updateOverlay} />
        ) : overlay?.kind === 'image' ? (
          <ImageInspector
            key={overlay.id}
            overlay={overlay}
            image={image?.kind === 'image' ? image : undefined}
            onChange={updateOverlay}
          />
        ) : (
          <ExportHistory projectId={projectId} revision={exportsRevision} />
        )}
      </div>
    </Panel>
  )
}
