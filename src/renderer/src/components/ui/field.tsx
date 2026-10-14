import { useId, useState, type ReactNode } from 'react'
import { RotateLeft01Icon } from '@hugeicons/core-free-icons'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useCoalesceKey } from '@/hooks/use-coalesce-key'
import { clamp } from '@/lib/format'
import { cn } from '@/lib/utils'

interface SectionProps {
  title?: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0">
      {(title || action) && (
        <header className="-my-1 flex h-6 items-center justify-between">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function ResetButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <IconButton
      icon={RotateLeft01Icon}
      label="Reset"
      size="icon-xs"
      className="-mr-1"
      disabled={disabled}
      onClick={onClick}
    />
  )
}

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
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
  className?: string
}

export function NumberField({
  id,
  value,
  onCommit,
  step = 0.1,
  digits = 2,
  suffix,
  className
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const coalesce = useCoalesceKey()
  return (
    <div className={cn('relative', className)}>
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
        className={cn(
          'h-8 rounded-md border-0 bg-muted px-2 text-xs tabular-nums shadow-none md:text-xs focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-inner-spin-button]:appearance-none',
          suffix && 'pr-6'
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-2xs text-muted-foreground">
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

// A slider with an editable percentage next to it. `value` is a ratio; `min` and `max` are percents.
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
    <div className={cn('flex items-center gap-3', className)}>
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
      <NumberField
        value={Math.round(value * 100)}
        step={1}
        digits={0}
        suffix="%"
        onCommit={(percent, key) => onChange(clamp(percent, min, max) / 100, key)}
        className="w-16 shrink-0"
      />
    </div>
  )
}

interface SliderFieldProps extends Omit<PercentSliderProps, 'id' | 'className'> {
  label: string
}

export function SliderField({ label, ...slider }: SliderFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <PercentSlider id={id} {...slider} />
    </div>
  )
}
