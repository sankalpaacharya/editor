import type { ComponentProps } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  icon: IconSvgElement
  label: string
  shortcut?: string
}

export function IconButton({ icon, label, shortcut, className, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className={cn('rounded-md text-muted-foreground hover:text-foreground', className)}
          {...props}
        >
          <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-md px-2 py-1">
        {label}
        {shortcut && <kbd className="font-sans text-background/60">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  )
}
