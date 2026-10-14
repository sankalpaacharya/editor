import { Download04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { toast } from 'sonner'
import logo from '../../../../assets/logo.svg'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface RailItem {
  label: string
  icon: IconSvgElement
  active: boolean
  onSelect: () => void
}

async function checkForUpdates() {
  try {
    await window.editor.checkForUpdates()
  } catch (error) {
    toast.error('Could not check for updates', { description: errorMessage(error) })
  }
}

export function Rail({ groups }: { groups: RailItem[][] }) {
  return (
    <nav className="flex w-[68px] shrink-0 flex-col items-center gap-1 py-2">
      <img src={logo} alt="Editor" className="mb-2 size-9 rounded-[9px]" draggable={false} />
      {groups.map((items, index) => (
        <div
          key={index}
          className={cn('flex flex-col items-center gap-1', index > 0 && 'mt-1 border-t pt-2')}
        >
          {items.map((item) => (
            <RailButton key={item.label} {...item} />
          ))}
        </div>
      ))}
      <div className="mt-auto">
        <RailButton
          label="Updates"
          icon={Download04Icon}
          active={false}
          onSelect={() => void checkForUpdates()}
        />
      </div>
    </nav>
  )
}

function RailButton({ label, icon, active, onSelect }: RailItem) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
      )}
    >
      <HugeiconsIcon icon={icon} strokeWidth={1.6} className="size-[18px]" />
      {label}
    </button>
  )
}
