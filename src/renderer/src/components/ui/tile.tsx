import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// A pressable surface for pickers: presets, templates, media.
export function Tile({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'group flex flex-col items-center justify-center gap-1 rounded-md bg-muted transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
}
