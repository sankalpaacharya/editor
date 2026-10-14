import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface NumberFieldProps {
  id?: string
  value: number
  onCommit: (value: number) => void
  step?: number
  digits?: number
}

export function NumberField({ id, value, onCommit, step = 0.1, digits = 2 }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      id={id}
      type="number"
      step={step}
      value={draft ?? String(Number(value.toFixed(digits)))}
      onChange={(event) => {
        setDraft(event.target.value)
        const parsed = event.target.valueAsNumber
        if (Number.isFinite(parsed)) onCommit(parsed)
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      className="h-7 rounded-md px-2 text-xs tabular-nums md:text-xs"
    />
  )
}
