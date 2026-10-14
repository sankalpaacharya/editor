import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-sm px-1 text-2xs font-medium tabular-nums',
  {
    variants: {
      variant: {
        // Sits on top of video frames and thumbnails.
        overlay: 'bg-black/60 text-white/90 backdrop-blur-sm',
        outline: 'border border-muted-foreground/40 text-muted-foreground'
      }
    },
    defaultVariants: { variant: 'overlay' }
  }
)

export function Badge({
  variant,
  className,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
