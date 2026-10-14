import { useRef } from 'react'
import { VolumeHighIcon, VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/ui/icon-button'
import type { Edit } from '@/components/editor/editor'
import { PercentSlider, Section } from '@/components/ui/field'
import type { Clip } from '../../../../../shared/sequence'
import { cn } from '@/lib/utils'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4]

const CLIP_TABS = [
  { id: 'speed', label: 'Speed' },
  { id: 'sound', label: 'Sound' }
] as const
export type ClipTab = (typeof CLIP_TABS)[number]['id']

export function ClipTabs({ tab, onTab }: { tab: ClipTab; onTab: (tab: ClipTab) => void }) {
  return (
    <div role="tablist" className="-ml-1 flex items-center gap-1">
      {CLIP_TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === tab}
          onClick={() => onTab(id)}
          className={cn(
            'h-7 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            id === tab
              ? 'bg-secondary font-medium text-foreground'
              : 'font-normal text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
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

  if (tab === 'speed') {
    return (
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
                  ? 'bg-secondary font-medium text-foreground ring-1 ring-foreground/30'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {speed}x
            </button>
          ))}
        </div>
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
