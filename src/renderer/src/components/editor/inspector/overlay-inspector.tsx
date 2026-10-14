import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Field, NumberField, PercentSlider, Section } from '@/components/editor/inspector/fields'
import { useCoalesceKey } from '@/hooks/use-coalesce-key'
import type { ImageMedia, ImageOverlay, Overlay, TextOverlay } from '../../../../../shared/sequence'
import { clamp } from '@/lib/format'

interface OverlayInspectorProps<T extends Overlay> {
  overlay: T
  duration: number
  onChange: (overlay: T, coalesce?: string) => void
}

export function TextInspector({ overlay, duration, onChange }: OverlayInspectorProps<TextOverlay>) {
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
        <Field label="Color">
          {(id) => (
            <label className="flex h-7 items-center gap-2 rounded-md border bg-background/50 px-1.5">
              <input
                id={id}
                type="color"
                value={overlay.color}
                onChange={(event) =>
                  onChange({ ...overlay, color: event.target.value }, `color:${overlay.id}`)
                }
                className="size-4 cursor-pointer rounded-[3px] border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
              />
              <span className="text-xs text-muted-foreground uppercase tabular-nums">
                {overlay.color}
              </span>
            </label>
          )}
        </Field>
      </Section>
      <Placement overlay={overlay} duration={duration} onChange={onChange} />
    </>
  )
}

export function ImageInspector({
  overlay,
  image,
  duration,
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
      <Placement overlay={overlay} duration={duration} onChange={onChange} />
    </>
  )
}

function Placement<T extends Overlay>({ overlay, duration, onChange }: OverlayInspectorProps<T>) {
  return (
    <>
      <Section title="Position">
        <Field label="X">
          {(id) => (
            <PercentSlider
              id={id}
              value={overlay.x}
              onChange={(x, coalesce) => onChange({ ...overlay, x }, coalesce)}
            />
          )}
        </Field>
        <Field label="Y">
          {(id) => (
            <PercentSlider
              id={id}
              value={overlay.y}
              onChange={(y, coalesce) => onChange({ ...overlay, y }, coalesce)}
            />
          )}
        </Field>
      </Section>
      <Section title="Timing">
        <Field label="Start">
          {(id) => (
            <NumberField
              id={id}
              value={overlay.start}
              suffix="s"
              onCommit={(value, coalesce) =>
                onChange({ ...overlay, start: clamp(value, 0, overlay.end) }, coalesce)
              }
            />
          )}
        </Field>
        <Field label="End">
          {(id) => (
            <NumberField
              id={id}
              value={overlay.end}
              suffix="s"
              onCommit={(value, coalesce) =>
                onChange({ ...overlay, end: clamp(value, overlay.start, duration) }, coalesce)
              }
            />
          )}
        </Field>
      </Section>
    </>
  )
}
