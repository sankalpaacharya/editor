import { useRef, useState } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  DashboardSpeed02Icon,
  VolumeHighIcon,
  VolumeMute02Icon
} from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/icon-button'
import type { Edit } from '@/components/editor/editor'
import { PercentSlider, Section } from '@/components/editor/inspector/fields'
import type { Clip, VideoMedia } from '../../../../../shared/sequence'
import { cn } from '@/lib/utils'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4]

type Tool = 'speed' | 'sound'

interface ClipInspectorProps {
  clip: Clip
  media: VideoMedia | undefined
  edit: Edit
}

export function ClipInspector({ clip, media, edit }: ClipInspectorProps) {
  const unmutedVolume = useRef(clip.volume > 0 ? clip.volume : 1)
  const [tool, setTool] = useState<Tool | null>(null)

  const setVolume = (volume: number, coalesce?: string) => {
    if (volume > 0) unmutedVolume.current = volume
    edit({ type: 'setVolume', clipId: clip.id, volume }, coalesce)
  }
  const muted = clip.volume === 0

  return (
    <>
      <Section>
        <p className="truncate text-xs" title={media?.name}>
          {media?.name ?? 'Missing media'}
        </p>
        {media && (
          <p className="-mt-1.5 text-[11px] text-muted-foreground tabular-nums">
            {media.width}×{media.height} · {Number(media.fps.toFixed(2))} fps
            {!media.hasAudio && ' · no audio'}
          </p>
        )}
      </Section>
      {tool === null ? (
        <Section>
          <div className="grid grid-cols-2 gap-1.5">
            <ToolButton
              icon={DashboardSpeed02Icon}
              label="Speed"
              value={`${clip.speed}x`}
              onClick={() => setTool('speed')}
            />
            <ToolButton
              icon={muted ? VolumeMute02Icon : VolumeHighIcon}
              label="Sound"
              value={`${Math.round(clip.volume * 100)}%`}
              onClick={() => setTool('sound')}
            />
          </div>
        </Section>
      ) : (
        <Section>
          <div className="-ml-1 flex items-center gap-1">
            <IconButton
              icon={ArrowLeft01Icon}
              label="Back"
              size="icon-xs"
              onClick={() => setTool(null)}
            />
            <h3 className="text-[13px] font-medium">{tool === 'speed' ? 'Speed' : 'Sound'}</h3>
          </div>
          {tool === 'speed' ? (
            <div className="grid grid-cols-3 gap-1.5">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={speed === clip.speed}
                  onClick={() => edit({ type: 'setSpeed', clipId: clip.id, speed })}
                  className={cn(
                    'h-9 rounded-lg text-xs tabular-nums transition-colors',
                    speed === clip.speed
                      ? 'bg-secondary font-medium text-foreground ring-1 ring-brand/50'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <IconButton
                icon={muted ? VolumeMute02Icon : VolumeHighIcon}
                label={muted ? 'Unmute clip' : 'Mute clip'}
                size="icon-xs"
                aria-pressed={muted}
                className={cn('-ml-1', muted && 'text-foreground')}
                onClick={() => setVolume(muted ? unmutedVolume.current : 0)}
              />
              <PercentSlider value={clip.volume} onChange={setVolume} className="flex-1" />
            </div>
          )}
        </Section>
      )}
    </>
  )
}

interface ToolButtonProps {
  icon: IconSvgElement
  label: string
  value: string
  onClick: () => void
}

function ToolButton({ icon, label, value, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg bg-muted p-2.5 text-left transition-colors hover:bg-accent"
    >
      <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-4 text-muted-foreground" />
      <span className="flex w-full items-baseline justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">{value}</span>
      </span>
    </button>
  )
}
