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

export function Rail({ groups, onHome }: { groups: RailItem[][]; onHome?: () => void }) {
  const mark = <img src={logo} alt="" className="size-8 rounded-lg" draggable={false} />
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 py-2">
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          aria-label="Back to projects"
          title="Back to projects"
          className="mb-3 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mark}
        </button>
      ) : (
        <div className="mb-3">{mark}</div>
      )}
      {groups.map((items, index) => (
        <div
          key={index}
          className={cn('flex flex-col items-center gap-1', index > 0 && 'mt-2 border-t pt-3')}
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
        'group flex w-14 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg transition-colors',
          active ? 'bg-secondary' : 'group-hover:bg-secondary/60'
        )}
      >
        <HugeiconsIcon icon={icon} strokeWidth={1.6} className="size-[18px]" />
      </span>
      {label}
    </button>
  )
}
