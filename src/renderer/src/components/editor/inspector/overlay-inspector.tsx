import { useState } from 'react'
import Colorful from '@uiw/react-color-colorful'
import { Textarea } from '@/components/ui/textarea'
import { Field, NumberField, PercentSlider, Section } from '@/components/ui/field'
import { useCoalesceKey } from '@/hooks/use-coalesce-key'
import type { ImageMedia, ImageOverlay, Overlay, TextOverlay } from '../../../../../shared/sequence'
import { clamp } from '@/lib/format'

interface OverlayInspectorProps<T extends Overlay> {
  overlay: T
  onChange: (overlay: T, coalesce?: string) => void
}

export function TextInspector({ overlay, onChange }: OverlayInspectorProps<TextOverlay>) {
  const [draft, setDraft] = useState<string | null>(null)
  const typing = useCoalesceKey()
  return (
    <>
      <Section>
        <Textarea
          value={draft ?? overlay.text}
          maxLength={500}
          aria-label="Text"
          onChange={(event) => {
            const text = event.target.value
            setDraft(text)
            if (text.length > 0) onChange({ ...overlay, text }, typing.get())
          }}
          onBlur={() => {
            setDraft(null)
            typing.end()
          }}
          className="min-h-20 rounded-lg border-0 bg-muted px-3 py-2 text-xs shadow-none md:text-xs focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Field label="Size">
          {(id) => (
            <NumberField
              id={id}
              value={overlay.fontSize}
              step={1}
              digits={0}
              suffix="px"
              onCommit={(value, coalesce) =>
                onChange({ ...overlay, fontSize: clamp(value, 4, 1000) }, coalesce)
              }
            />
          )}
        </Field>
        <ColorField
          value={overlay.color}
          onChange={(color) => onChange({ ...overlay, color }, `color:${overlay.id}`)}
        />
      </Section>
    </>
  )
}

export function ImageInspector({
  overlay,
  image,
  onChange
}: OverlayInspectorProps<ImageOverlay> & { image: ImageMedia | undefined }) {
  return (
    <>
      <Section>
        <p className="truncate text-xs">{image?.name ?? 'Missing image'}</p>
        <Field label="Width">
          {(id) => (
            <PercentSlider
              id={id}
              value={overlay.widthRatio}
              min={5}
              onChange={(widthRatio, coalesce) => onChange({ ...overlay, widthRatio }, coalesce)}
            />
          )}
        </Field>
      </Section>
    </>
  )
}

const SWATCHES = ['#ffffff', '#000000', '#ffd400', '#ff4d4f', '#4dabff', '#52c41a', '#b37feb']

function ColorField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[52px_1fr] items-center gap-2">
        <span className="text-xs text-muted-foreground">Color</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-7 items-center gap-2 rounded-md bg-input/50 px-1.5 text-left outline-none hover:bg-input focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span
            className="size-4 rounded-[3px] ring-1 ring-white/20"
            style={{ background: value }}
          />
          <span className="text-xs text-muted-foreground uppercase tabular-nums">{value}</span>
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <Colorful
            color={value}
            disableAlpha
            onChange={(color) => onChange(color.hex)}
            style={{ width: '100%' }}
          />
          <div className="flex gap-1.5">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                onClick={() => onChange(swatch)}
                className="size-5 rounded-[3px] ring-1 ring-white/20 outline-none hover:ring-white/60 focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
