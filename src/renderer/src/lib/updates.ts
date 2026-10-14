import { toast } from 'sonner'
import { errorMessage } from '@/lib/format'

export async function checkForUpdates() {
  try {
    await window.editor.checkForUpdates()
  } catch (error) {
    toast.error('Could not check for updates', { description: errorMessage(error) })
  }
}
