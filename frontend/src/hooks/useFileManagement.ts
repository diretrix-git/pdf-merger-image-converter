import { useState, useCallback } from 'react'
import type { FileEntry } from '../types'

/**
 * Manages the staged file list — add, remove, and reorder.
 */
export function useFileManagement() {
  const [files, setFiles] = useState<FileEntry[]>([])

  const addFiles = useCallback((entries: FileEntry[]) => {
    setFiles((prev) => [...prev, ...entries])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const reorderFiles = useCallback((reordered: FileEntry[]) => {
    setFiles(reordered)
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const combinedSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0)

  return { files, addFiles, removeFile, reorderFiles, clearFiles, combinedSizeBytes }
}
