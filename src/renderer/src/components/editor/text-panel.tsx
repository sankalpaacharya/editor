import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Panel } from '@/components/ui/panel'
import { TEXT_PRESETS, type TextPreset } from '@/lib/overlays'
import { Button } from '@/components/ui/button'
import { Tile } from '@/components/ui/tile'

interface TextPanelProps {
  canAdd: boolean
  onAdd: (preset: TextPreset) => void
}

export function TextPanel({ canAdd, onAdd }: TextPanelProps) {
  return (
    <Panel title="Text" className="w-[280px] shrink-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        <Button variant="secondary" disabled={!canAdd} onClick={() => onAdd(TEXT_PRESETS[0])}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add text
        </Button>
        {!canAdd && (
          <p className="-mt-2 text-xs text-muted-foreground">Add a video first to place text.</p>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
            Styles
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_PRESETS.map((preset) => (
              <Tile
                key={preset.name}
                disabled={!canAdd}
                onClick={() => onAdd(preset)}
                className="aspect-video px-2"
              >
                <span
                  className="truncate text-white"
                  style={{ fontFamily: 'Overlay', fontSize: Math.round(preset.size * 160) }}
                >
                  {preset.sample}
                </span>
                <span className="text-2xs text-muted-foreground group-hover:text-foreground">
                  {preset.name}
                </span>
              </Tile>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  )
}
