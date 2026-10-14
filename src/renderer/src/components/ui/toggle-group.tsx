import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToggleGroupProps<T> {
  options: readonly { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  columns?: number
}

export function ToggleGroup<T>({ options, value, onChange, columns = 3 }: ToggleGroupProps<T>) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-9 rounded-md text-xs tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            option.value === value
              ? 'bg-secondary font-medium text-foreground ring-1 ring-foreground/30'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
