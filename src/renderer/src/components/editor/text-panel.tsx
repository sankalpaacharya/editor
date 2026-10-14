import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Panel } from '@/components/editor/panel'
import { TEXT_PRESETS, type TextPreset } from '@/lib/overlays'

const SAMPLE_SIZES: Record<string, string> = {
  Title: 'text-lg font-semibold',
  Subtitle: 'text-sm font-medium',
  Caption: 'text-xs'
}

export function TextPanel({
  disabled,
  onAdd
}: {
  disabled: boolean
  onAdd: (preset: TextPreset) => void
}) {
  return (
    <Panel title="Text" className="w-[280px] shrink-0">
      <div className="flex flex-col gap-2 overflow-y-auto p-3">
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(preset)}
            className="group flex h-16 items-center gap-3 rounded-lg border bg-background/40 px-3 text-left transition-colors hover:border-foreground/20 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className={`min-w-0 flex-1 truncate ${SAMPLE_SIZES[preset.name]}`}>
              {preset.sample}
            </span>
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={2}
              className="size-3.5 text-muted-foreground group-hover:text-foreground"
            />
          </button>
        ))}
        <p className="px-0.5 pt-1 text-[11px] leading-4 text-muted-foreground">
          {disabled
            ? 'Add a video to the timeline first.'
            : 'Text is added at the playhead for 3 seconds.'}
        </p>
      </div>
    </Panel>
  )
}
