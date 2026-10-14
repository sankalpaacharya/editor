import type { ComponentProps } from 'react'
import { ArrowDown01Icon, Image01Icon, TextIcon, Video01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { TEXT_PRESETS, type TextPreset } from '@/lib/overlays'
import { cn } from '@/lib/utils'

interface InsertBarProps {
  canOverlay: boolean
  onVideo: () => void
  onImage: () => void
  onText: (preset: TextPreset) => void
}

function InsertButton({
  icon,
  children,
  className,
  ...props
}: ComponentProps<'button'> & { icon: HugeiconsIconProps['icon'] }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={icon} strokeWidth={1.75} className="size-4" />
      {children}
    </button>
  )
}

export function InsertBar({ canOverlay, onVideo, onImage, onText }: InsertBarProps) {
  const overlayHint = canOverlay ? undefined : 'Add a video first'
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-card p-1">
      <InsertButton icon={Video01Icon} onClick={onVideo}>
        Video
      </InsertButton>
      <InsertButton icon={Image01Icon} onClick={onImage} disabled={!canOverlay} title={overlayHint}>
        Image
      </InsertButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!canOverlay}>
          <InsertButton icon={TextIcon} title={overlayHint}>
            Text
            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="-mr-1 size-3" />
          </InsertButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-40">
          {TEXT_PRESETS.map((preset) => (
            <DropdownMenuItem key={preset.name} onSelect={() => onText(preset)}>
              {preset.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
