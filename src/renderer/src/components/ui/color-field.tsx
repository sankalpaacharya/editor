import { useState } from 'react'
import Colorful from '@uiw/react-color-colorful'

const SWATCHES = ['#ffffff', '#000000', '#ffd400', '#ff4d4f', '#4dabff', '#52c41a', '#b37feb']

interface ColorFieldProps {
  label?: string
  value: string
  onChange: (color: string) => void
}

export function ColorField({ label = 'Color', value, onChange }: ColorFieldProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[64px_1fr] items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-7 items-center gap-2 rounded-md bg-input/50 px-1.5 text-left outline-none hover:bg-input focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span
            className="size-4 rounded-sm ring-1 ring-white/20"
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
                className="size-5 rounded-sm ring-1 ring-white/20 outline-none hover:ring-white/60 focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
