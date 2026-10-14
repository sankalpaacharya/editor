import { cn } from '@/lib/utils'

interface TabsProps<T extends string> {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1', className)}>
      {items.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === value}
          onClick={() => onChange(id)}
          className={cn(
            'h-7 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            id === value
              ? 'bg-secondary font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
