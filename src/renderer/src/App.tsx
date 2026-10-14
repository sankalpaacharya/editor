import { useReducer, useState, type DragEvent } from 'react'
import { ThemeProvider } from 'next-themes'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Editor } from '@/components/editor'
import { EmptyState } from '@/components/empty-state'
import { ExportDialog } from '@/components/export-dialog'
import { TopBar } from '@/components/top-bar'
import { useExport } from '@/hooks/use-export'
import { editorReducer, errorMessage } from '@/lib/editor'
import { cn } from '@/lib/utils'
import type { MediaInfo } from '../../shared/project'

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files')

export function App() {
  const [project, dispatch] = useReducer(editorReducer, null)
  const [dropping, setDropping] = useState(false)
  const exporter = useExport()

  async function load(request: () => Promise<MediaInfo | null>) {
    try {
      const source = await request()
      if (source) dispatch({ type: 'load', source, clipId: crypto.randomUUID() })
    } catch (error) {
      toast.error('Could not open video', { description: errorMessage(error) })
    }
  }

  const openVideo = () => load(() => window.editor.openVideo())

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDropping(false)
    const file = event.dataTransfer.files[0]
    if (file) void load(() => window.editor.importVideo(file))
  }

  return (
    // next-themes renders an inline theme script that can never run here (client render, CSP);
    // a data type keeps React 19 from warning about it.
    <ThemeProvider attribute="class" forcedTheme="dark" scriptProps={{ type: 'application/json' }}>
      <div
        className={cn(
          'flex h-screen flex-col outline-1 -outline-offset-4 outline-transparent',
          dropping && 'outline-dashed outline-ring'
        )}
        onDragOver={(event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          setDropping(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false)
        }}
        onDrop={drop}
      >
        <TopBar
          fileName={project?.source.name}
          canExport={project !== null && exporter.state.status === 'idle'}
          onImport={openVideo}
          onExport={() => project && exporter.start(project)}
        />
        {project ? (
          <Editor key={project.source.assetId} project={project} dispatch={dispatch} />
        ) : (
          <EmptyState onOpen={openVideo} />
        )}
      </div>
      <ExportDialog state={exporter.state} onCancel={exporter.cancel} />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  )
}
