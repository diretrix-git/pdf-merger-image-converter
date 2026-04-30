import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { FileEntry, Toast } from '../types'

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

interface UploadZoneProps {
  onFilesAdded: (entries: FileEntry[]) => void
  onToast: (toast: Omit<Toast, 'id'>) => void
  disabled?: boolean
}

/**
 * Drag-and-drop upload zone for PDF files.
 *
 * Validates each dropped/selected file client-side before calling onFilesAdded:
 * - Rejects non-PDF MIME types
 * - Rejects files exceeding 20 MB
 *
 * Uses the HTML5 Drag and Drop API directly (no external library).
 */
export function UploadZone({ onFilesAdded, onToast, disabled = false }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const files = Array.from(rawFiles)
      const valid: FileEntry[] = []

      for (const file of files) {
        if (file.type !== 'application/pdf') {
          onToast({
            type: 'error',
            message: `"${file.name}" is not a PDF file.`,
          })
          continue
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          onToast({
            type: 'error',
            message: `"${file.name}" exceeds the 20 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
          })
          continue
        }

        valid.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          sizeBytes: file.size,
        })
      }

      if (valid.length > 0) {
        onFilesAdded(valid)
      }
    },
    [onFilesAdded, onToast]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    processFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
      // Reset input so the same file can be re-added after removal
      e.target.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload PDF files. Click or drag and drop."
      aria-disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center gap-3
        rounded-2xl border-2 border-dashed p-10 cursor-pointer
        transition-colors duration-200 select-none outline-none
        focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-gray-950
        ${disabled
          ? 'border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-50'
          : isDragOver
            ? 'border-violet-400 bg-violet-950/40'
            : 'border-gray-600 bg-gray-900/20 hover:border-violet-500 hover:bg-violet-950/20'
        }
      `}
    >
      {/* Upload icon */}
      <div
        className={`
          text-4xl transition-transform duration-200
          ${isDragOver ? 'scale-110' : ''}
        `}
        aria-hidden="true"
      >
        📄
      </div>

      {/* Primary label */}
      <p className="text-base font-medium text-gray-200">
        {isDragOver ? 'Drop your PDFs here' : 'Drag & drop PDFs here'}
      </p>

      {/* Secondary label */}
      <p className="text-sm text-gray-400">
        or <span className="text-violet-400 underline underline-offset-2">click to browse</span>
      </p>

      {/* Constraints */}
      <p className="text-xs text-gray-500">PDF only · 20 MB per file · 50 MB total</p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </motion.div>
  )
}
