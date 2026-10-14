import { useState, type ReactNode } from 'react'
import { Download04Icon, Upload04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/icon-button'
import { checkForUpdates } from '@/lib/updates'
import logo from '../../../../../assets/logo.svg'

interface EditorHeaderProps {
  name: string
  onBack: () => void
  onRename: (name: string) => void
  canExport: boolean
  onExport: () => void
  children?: ReactNode
}

export function EditorHeader({
  name,
  onBack,
  onRename,
  canExport,
  onExport,
  children
}: EditorHeaderProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== name) onRename(next)
  }

  return (
    <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to projects"
          title="Back to projects"
          className="mr-1 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={logo} alt="" className="size-7 rounded-md" draggable={false} />
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Projects
        </button>
        <span className="text-muted-foreground/50">/</span>
        {draft === null ? (
          <button
            type="button"
            title="Rename"
            onClick={() => setDraft(name)}
            className="min-w-0 truncate rounded-md px-1 py-0.5 font-medium hover:bg-secondary"
          >
            {name}
          </button>
        ) : (
          <input
            autoFocus
            value={draft}
            maxLength={120}
            aria-label="Project name"
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setDraft(null)
            }}
            className="h-7 w-64 rounded-md border border-ring bg-input/40 px-1 font-medium outline-none"
          />
        )}
      </nav>
      {children ?? <span />}
      <div className="flex items-center gap-1 justify-self-end">
        <IconButton
          icon={Download04Icon}
          label="Check for updates"
          onClick={() => void checkForUpdates()}
        />
        <Button
          variant="brand"
          size="sm"
          onClick={onExport}
          disabled={!canExport}
          className="h-8 px-4"
        >
          <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.75} />
          Export
        </Button>
      </div>
    </header>
  )
}
