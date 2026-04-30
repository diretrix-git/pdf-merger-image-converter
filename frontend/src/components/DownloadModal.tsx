import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DownloadModalProps {
  open: boolean
  defaultName: string
  extension: string
  onConfirm: (filename: string) => void
  onCancel: () => void
}

/**
 * Modal dialog that lets the user name their file before downloading.
 *
 * The extension is fixed (pdf or zip) — only the base name is editable.
 * Pressing Enter confirms; Escape cancels.
 */
export function DownloadModal({
  open,
  defaultName,
  extension,
  onConfirm,
  onCancel,
}: DownloadModalProps) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset name when modal opens with a new default
  useEffect(() => {
    if (open) {
      setName(defaultName)
      // Focus and select the input after the animation starts
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 80)
    }
  }, [open, defaultName])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(`${trimmed}.${extension}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm bg-gray-900 border border-gray-700
                         rounded-2xl shadow-2xl p-6 flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div>
                <h2
                  id="download-modal-title"
                  className="text-lg font-semibold text-gray-100 mb-1"
                >
                  Name your file
                </h2>
                <p className="text-sm text-gray-400">
                  Choose a name before the download starts.
                </p>
              </div>

              {/* Input */}
              <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-gray-700
                              focus-within:border-violet-500 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="filename"
                  aria-label="File name"
                  className="flex-1 bg-gray-800 px-4 py-2.5 text-sm text-gray-100
                             placeholder-gray-600 outline-none"
                />
                <span className="bg-gray-800 px-3 py-2.5 text-sm text-gray-500 border-l border-gray-700 select-none">
                  .{extension}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                             bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700
                             transition-colors focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-gray-500"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={!name.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                             bg-violet-600 text-white hover:bg-violet-500
                             disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
                             transition-colors focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-violet-500"
                >
                  Download
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
