import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Panel({ title, actions, className, children }: PanelProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-[13px] border bg-card',
        className
      )}
    >
      {title !== undefined && (
        <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
          <h2 className="min-w-0 truncate text-xs font-medium">{title}</h2>
          <div className="ml-auto flex items-center gap-1">{actions}</div>
        </header>
      )}
      {children}
    </section>
  )
}
