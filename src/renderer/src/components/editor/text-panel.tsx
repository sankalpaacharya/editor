import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Panel } from '@/components/editor/panel'
import { TEXT_PRESETS, type TextPreset } from '@/lib/overlays'

interface TextPanelProps {
  canAdd: boolean
  onAdd: (preset: TextPreset) => void
}

export function TextPanel({ canAdd, onAdd }: TextPanelProps) {
  return (
    <Panel title="Text" className="w-[280px] shrink-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => onAdd(TEXT_PRESETS[0])}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-secondary text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          Add text
        </button>
        {!canAdd && (
          <p className="-mt-2 text-xs text-muted-foreground">Add a video first to place text.</p>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Styles
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                disabled={!canAdd}
                onClick={() => onAdd(preset)}
                className="group flex aspect-video flex-col items-center justify-center gap-1 rounded-md bg-muted px-2 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              >
                <span
                  className="truncate text-white"
                  style={{ fontFamily: 'Overlay', fontSize: Math.round(preset.size * 160) }}
                >
                  {preset.sample}
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  )
}
