import { Download04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import logo from '../../../../assets/logo.svg'
import { checkForUpdates } from '@/lib/updates'
import { cn } from '@/lib/utils'

export interface RailItem {
  label: string
  icon: IconSvgElement
  active: boolean
  onSelect: () => void
}

export function Rail({ groups }: { groups: RailItem[][] }) {
  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg bg-card py-3">
      <img src={logo} alt="" className="mb-3 size-8 rounded-lg" draggable={false} />
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

export function RailButton({ label, icon, active, onSelect }: RailItem) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex w-14 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
        active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg transition-colors',
          active ? 'bg-brand/15' : 'group-hover:bg-secondary'
        )}
      >
        <HugeiconsIcon icon={icon} strokeWidth={1.6} className="size-[18px]" />
      </span>
      {label}
    </button>
  )
}
