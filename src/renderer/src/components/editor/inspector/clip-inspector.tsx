import { useRef } from 'react'
import { VolumeHighIcon, VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/icon-button'
import type { Edit } from '@/components/editor/editor'
import {
  Field,
  NumberField,
  PercentSlider,
  ReadOnly,
  Section
} from '@/components/editor/inspector/fields'
import { timelineLength, type Clip, type VideoMedia } from '../../../../../shared/sequence'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4]

interface ClipInspectorProps {
  clip: Clip
  media: VideoMedia | undefined
  edit: Edit
}

export function ClipInspector({ clip, media, edit }: ClipInspectorProps) {
  const unmutedVolume = useRef(clip.volume > 0 ? clip.volume : 1)
  const mediaDuration = media?.duration ?? clip.out

  const trim = (range: { in: number; out: number }, coalesce: string) =>
    edit({ type: 'trim', clipId: clip.id, ...range, mediaDuration }, coalesce)
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
      <Section title="Speed">
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
      </Section>
      <Section title="Volume">
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
      </Section>
      <Section title="Trim">
        <Field label="In">
          {(id) => (
            <NumberField
              id={id}
              value={clip.in}
              suffix="s"
              onCommit={(value, coalesce) => trim({ in: value, out: clip.out }, coalesce)}
            />
          )}
        </Field>
        <Field label="Out">
          {(id) => (
            <NumberField
              id={id}
              value={clip.out}
              suffix="s"
              onCommit={(value, coalesce) => trim({ in: clip.in, out: value }, coalesce)}
            />
          )}
        </Field>
        <Field label="Length">
          {() => <ReadOnly>{formatClock(timelineLength(clip))}</ReadOnly>}
        </Field>
      </Section>
    </>
  )
}
