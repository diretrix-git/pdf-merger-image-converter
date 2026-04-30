import { motion, AnimatePresence } from 'framer-motion'
import { MagneticButton } from './MagneticButton'

const MAX_COMBINED_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

interface ActionButtonsProps {
  fileCount: number
  combinedSizeBytes: number
  isLoading: boolean
  onMerge: () => void
  onConvert: () => void
}

/**
 * Spinning loader indicator (Framer Motion).
 */
function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
      aria-hidden="true"
    />
  )
}

/**
 * Merge and Convert action buttons.
 *
 * Disabled when:
 * - No files are staged (fileCount === 0)
 * - Combined size exceeds 50 MB
 * - A request is in progress (isLoading)
 */
export function ActionButtons({
  fileCount,
  combinedSizeBytes,
  isLoading,
  onMerge,
  onConvert,
}: ActionButtonsProps) {
  const isOverLimit = combinedSizeBytes > MAX_COMBINED_SIZE_BYTES
  const isDisabled = fileCount === 0 || isOverLimit || isLoading

  const mergeDisabled = isDisabled || fileCount < 2
  const convertDisabled = isDisabled || fileCount !== 1

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Over-limit warning */}
      <AnimatePresence>
        {isOverLimit && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-amber-400 text-center"
            role="alert"
          >
            Combined size exceeds 50 MB. Remove some files to continue.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Merge hint */}
      <AnimatePresence>
        {fileCount === 1 && !isOverLimit && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-gray-500 text-center"
          >
            Add at least one more file to merge
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        {/* Merge button */}
        <MagneticButton
          onClick={onMerge}
          disabled={mergeDisabled}
          aria-label="Merge PDFs"
          aria-busy={isLoading}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-5 py-3 rounded-xl font-semibold text-sm
            transition-colors duration-150 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
            focus-visible:ring-offset-gray-950
            ${mergeDisabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer'
            }
          `}
        >
          {isLoading ? <Spinner /> : <span aria-hidden="true">🔗</span>}
          <span>Merge PDFs</span>
        </MagneticButton>

        {/* Convert button */}
        <MagneticButton
          onClick={onConvert}
          disabled={convertDisabled}
          aria-label="Convert to Images"
          aria-busy={isLoading}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-5 py-3 rounded-xl font-semibold text-sm
            transition-colors duration-150 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
            focus-visible:ring-offset-gray-950
            ${convertDisabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
            }
          `}
        >
          {isLoading ? <Spinner /> : <span aria-hidden="true">🖼️</span>}
          <span>Convert to Images</span>
        </MagneticButton>
      </div>

      {/* Convert hint */}
      <AnimatePresence>
        {fileCount > 1 && !isOverLimit && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-gray-500 text-center"
          >
            Select a single file to convert to images
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
