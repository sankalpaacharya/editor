import { useId, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useCoalesceKey } from '@/hooks/use-coalesce-key'
import { cn } from '@/lib/utils'

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {title && <h3 className="text-[13px] font-medium">{title}</h3>}
      {children}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="grid grid-cols-[52px_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children(id)}
    </div>
  )
}

export function ReadOnly({ children }: { children: ReactNode }) {
  return <span className="text-xs tabular-nums">{children}</span>
}

interface NumberFieldProps {
  id?: string
  value: number
  onCommit: (value: number, coalesce: string) => void
  step?: number
  digits?: number
  suffix?: string
}

export function NumberField({
  id,
  value,
  onCommit,
  step = 0.1,
  digits = 2,
  suffix
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const coalesce = useCoalesceKey()
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        step={step}
        value={draft ?? String(Number(value.toFixed(digits)))}
        onChange={(event) => {
          setDraft(event.target.value)
          const parsed = event.target.valueAsNumber
          if (Number.isFinite(parsed)) onCommit(parsed, coalesce.get())
        }}
        onBlur={() => {
          setDraft(null)
          coalesce.end()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="h-9 rounded-xl border-0 bg-muted px-3 text-xs tabular-nums shadow-none md:text-xs focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

interface PercentSliderProps {
  id?: string
  value: number
  min?: number
  max?: number
  onChange: (value: number, coalesce: string) => void
  className?: string
}

export function PercentSlider({
  id,
  value,
  min = 0,
  max = 100,
  onChange,
  className
}: PercentSliderProps) {
  const coalesce = useCoalesceKey()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Slider
        id={id}
        value={[value * 100]}
        min={min}
        max={max}
        step={1}
        onValueChange={([percent]) => onChange(percent / 100, coalesce.get())}
        onValueCommit={coalesce.end}
        className="[&_[data-slot=slider-thumb]]:size-3"
      />
      <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}
