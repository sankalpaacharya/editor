import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Editor } from '@/components/editor/editor'
import { ProjectsPage } from '@/components/projects/projects-page'
import type { OpenProject } from '../../shared/api'

export function App() {
  const [open, setOpen] = useState<OpenProject | null>(null)
  return (
    // next-themes renders an inline theme script that can never run here (client render, CSP);
    // a data type keeps React 19 from warning about it.
    <ThemeProvider attribute="class" forcedTheme="dark" scriptProps={{ type: 'application/json' }}>
      <TooltipProvider delayDuration={500}>
        {open ? (
          <Editor key={open.id} project={open} onClose={() => setOpen(null)} />
        ) : (
          <ProjectsPage onOpen={setOpen} />
        )}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
