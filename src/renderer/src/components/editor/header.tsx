import { useState } from 'react'
import { ArrowLeft01Icon, Upload04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/icon-button'

interface EditorHeaderProps {
  name: string
  onBack: () => void
  onRename: (name: string) => void
  canExport: boolean
  onExport: () => void
}

export function EditorHeader({ name, onBack, onRename, canExport, onExport }: EditorHeaderProps) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    const next = draft?.trim()
    setDraft(null)
    if (next && next !== name) onRename(next)
  }

  return (
    <header className="flex h-10 shrink-0 items-center gap-1">
      <IconButton icon={ArrowLeft01Icon} label="Back to projects" onClick={onBack} />
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
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
      <Button
        variant="brand"
        size="sm"
        onClick={onExport}
        disabled={!canExport}
        className="ml-auto h-8 px-4"
      >
        <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.75} />
        Export
      </Button>
    </header>
  )
}
