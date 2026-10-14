import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { ColorField } from '@/components/ui/color-field'
import { Field, NumberField, Section, SliderField } from '@/components/ui/field'
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
              className="w-20"
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
        <SliderField
          label="Width"
          value={overlay.widthRatio}
          min={5}
          onChange={(widthRatio, coalesce) => onChange({ ...overlay, widthRatio }, coalesce)}
        />
      </Section>
    </>
  )
}
