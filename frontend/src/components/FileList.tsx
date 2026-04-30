import { motion, AnimatePresence } from 'framer-motion'
import type { FileEntry } from '../types'

interface FileListProps {
  files: FileEntry[]
  onRemove: (id: string) => void
  combinedSizeBytes?: number
}

/**
 * Format a byte count into a human-readable string (e.g. "1.4 MB", "320 KB").
 */
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}

/** Framer Motion variants for list item enter/exit */
const itemVariants = {
  initial: { opacity: 0, y: -8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: 20, scale: 0.97 },
}

/**
 * Animated list of staged PDF files.
 *
 * Each item shows the filename and size, and has a remove button.
 * Additions and removals are animated via Framer Motion AnimatePresence.
 */
export function FileList({ files, onRemove, combinedSizeBytes = 0 }: FileListProps) {
  if (files.length === 0) return null

  const MAX_COMBINED = 50 * 1024 * 1024
  const usagePercent = Math.min((combinedSizeBytes / MAX_COMBINED) * 100, 100)
  const isOverLimit = combinedSizeBytes > MAX_COMBINED

  return (
    <div className="w-full">
      {/* Header row: count + storage bar */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </p>
        <p className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : 'text-gray-500'}`}>
          {formatSize(combinedSizeBytes)} / 50 MB
        </p>
      </div>

      {/* Storage usage bar */}
      <div className="w-full h-1 bg-gray-800 rounded-full mb-3 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-violet-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${usagePercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <ul className="flex flex-col gap-2" aria-label="Selected files">
        <AnimatePresence mode="popLayout" initial={false}>
          {files.map((entry, index) => (
            <motion.li
              key={entry.id}
              layout
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="
                flex items-center gap-3 px-4 py-3 rounded-xl
                bg-gray-800/60 border border-gray-700/50
                hover:border-gray-600 transition-colors
              "
            >
              {/* Order indicator */}
              <span
                className="shrink-0 w-6 h-6 rounded-full bg-violet-900/60 text-violet-300
                           text-xs font-bold flex items-center justify-center"
                aria-label={`File ${index + 1}`}
              >
                {index + 1}
              </span>

              {/* File icon */}
              <span className="shrink-0 text-lg" aria-hidden="true">📄</span>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-gray-100 truncate"
                  title={entry.name}
                >
                  {entry.name}
                </p>
                <p className="text-xs text-gray-400">{formatSize(entry.sizeBytes)}</p>
              </div>

              {/* Remove button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRemove(entry.id)}
                className="
                  shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                  text-gray-500 hover:text-red-400 hover:bg-red-950/40
                  transition-colors focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-red-500
                "
                aria-label={`Remove ${entry.name}`}
              >
                ×
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
