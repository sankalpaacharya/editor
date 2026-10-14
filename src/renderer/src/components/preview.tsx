import { useRef, type PointerEvent, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { assetUrl } from '../../../shared/api'
import type { Overlay, Project, ProjectAction } from '../../../shared/project'
import { useElementSize } from '@/hooks/use-element-size'
import { clamp } from '@/lib/editor'
import { trackPointer } from '@/lib/pointer'

const MARGIN = 16

interface PreviewProps {
  project: Project
  playhead: number
  videoRef: RefObject<HTMLVideoElement | null>
  selectedOverlayId: string | null
  onSelectOverlay: (id: string) => void
  dispatch: (action: ProjectAction) => void
}

export function Preview({
  project,
  playhead,
  videoRef,
  selectedOverlayId,
  onSelectOverlay,
  dispatch
}: PreviewProps) {
  const [areaRef, area] = useElementSize<HTMLDivElement>()
  const frameRef = useRef<HTMLDivElement>(null)
  const { source } = project
  const fit = Math.max(
    Math.min((area.width - MARGIN * 2) / source.width, (area.height - MARGIN * 2) / source.height),
    0
  )
  const frame = { width: source.width * fit, height: source.height * fit }

  function startDrag(event: PointerEvent<HTMLDivElement>, overlay: Overlay) {
    onSelectOverlay(overlay.id)
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    trackPointer(event, (_event, dx, dy) =>
      dispatch({
        type: 'updateOverlay',
        overlay: {
          ...overlay,
          x: clamp(overlay.x + dx / rect.width, 0, 1),
          y: clamp(overlay.y + dy / rect.height, 0, 1)
        }
      })
    )
  }

  return (
    <div ref={areaRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <div ref={frameRef} className="relative overflow-hidden bg-black" style={frame}>
        <video
          ref={videoRef}
          src={assetUrl(source.assetId)}
          preload="auto"
          className="absolute inset-0 size-full"
        />
        {project.overlays
          .filter((overlay) => overlay.start <= playhead && playhead <= overlay.end)
          .map((overlay) => (
            <div
              key={overlay.id}
              onPointerDown={(event) => startDrag(event, overlay)}
              className={cn(
                'absolute cursor-move touch-none select-none',
                overlay.id === selectedOverlayId && 'outline outline-offset-2 outline-white/60'
              )}
              style={{
                left: `${overlay.x * 100}%`,
                top: `${overlay.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: overlay.kind === 'image' ? `${overlay.widthRatio * 100}%` : undefined
              }}
            >
              {overlay.kind === 'text' ? (
                <div
                  style={{
                    fontFamily: 'Overlay',
                    fontSize: (overlay.fontSize * frame.height) / source.height,
                    lineHeight: 1,
                    whiteSpace: 'pre',
                    color: overlay.color
                  }}
                >
                  {overlay.text}
                </div>
              ) : (
                <img
                  src={assetUrl(overlay.image.assetId)}
                  alt={overlay.image.name}
                  draggable={false}
                  className="block w-full"
                />
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
