import { useRef } from 'react'
import { VolumeHighIcon, VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/ui/icon-button'
import type { Edit } from '@/components/editor/editor'
import { Field, NumberField, PercentSlider, Section } from '@/components/ui/field'
import { Tabs } from '@/components/ui/tabs'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { MAX_SCALE, MIN_SCALE, type Clip, type ClipTransform } from '../../../../../shared/sequence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4]

const CLIP_TABS = [
  { id: 'video', label: 'Video' },
  { id: 'speed', label: 'Speed' },
  { id: 'sound', label: 'Sound' }
] as const
export type ClipTab = (typeof CLIP_TABS)[number]['id']

export function ClipTabs({ tab, onTab }: { tab: ClipTab; onTab: (tab: ClipTab) => void }) {
  return <Tabs items={CLIP_TABS} value={tab} onChange={onTab} className="-ml-1" />
}

interface ClipInspectorProps {
  clip: Clip
  tab: ClipTab
  edit: Edit
}

export function ClipInspector({ clip, tab, edit }: ClipInspectorProps) {
  const unmutedVolume = useRef(clip.volume > 0 ? clip.volume : 1)

  const setVolume = (volume: number, coalesce?: string) => {
    if (volume > 0) unmutedVolume.current = volume
    edit({ type: 'setVolume', clipId: clip.id, volume }, coalesce)
  }
  const muted = clip.volume === 0

  const setTransform = (change: Partial<ClipTransform>, coalesce?: string) =>
    edit({ type: 'setTransform', clipId: clip.id, change }, coalesce)

  if (tab === 'video') {
    return (
      <Section title="Transform">
        <Field label="Scale">
          {(id) => (
            <PercentSlider
              id={id}
              value={clip.scale}
              min={MIN_SCALE * 100}
              max={MAX_SCALE * 100}
              onChange={(scale, coalesce) => setTransform({ scale }, coalesce)}
            />
          )}
        </Field>
        <Field label="Opacity">
          {(id) => (
            <PercentSlider
              id={id}
              value={clip.opacity}
              onChange={(opacity, coalesce) => setTransform({ opacity }, coalesce)}
            />
          )}
        </Field>
        <Field label="Rotate">
          {(id) => (
            <NumberField
              id={id}
              value={clip.rotation}
              step={1}
              digits={0}
              suffix="°"
              onCommit={(rotation, coalesce) => setTransform({ rotation }, coalesce)}
            />
          )}
        </Field>
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={clip.scale === 1 && clip.opacity === 1 && clip.rotation === 0}
          onClick={() => setTransform({ scale: 1, opacity: 1, rotation: 0 })}
        >
          Reset
        </Button>
      </Section>
    )
  }

  if (tab === 'speed') {
    return (
      <Section title="Speed">
        <ToggleGroup
          options={SPEEDS.map((speed) => ({ value: speed, label: `${speed}x` }))}
          value={clip.speed}
          onChange={(speed) => edit({ type: 'setSpeed', clipId: clip.id, speed })}
        />
      </Section>
    )
  }
  return (
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
  )
}
