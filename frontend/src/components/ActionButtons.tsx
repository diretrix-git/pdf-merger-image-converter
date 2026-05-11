import { motion, AnimatePresence } from 'framer-motion'

const MAX_COMBINED_SIZE_BYTES = 50 * 1024 * 1024
const MAX_FILES_PER_MERGE = 8

export interface ActionButtonsProps {
  fileCount: number
  combinedSizeBytes: number
  isLoading: boolean
  imageFormat: 'png' | 'jpg'
  onFormatChange: (fmt: 'png' | 'jpg') => void
  onMerge: () => void
  onConvert: () => void
}

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

export function ActionButtons({
  fileCount,
  combinedSizeBytes,
  isLoading,
  imageFormat,
  onFormatChange,
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
            className="text-xs text-white/40 text-center"
          >
            Add at least one more file to merge
          </motion.p>
        )}
      </AnimatePresence>

      {/* File count limit hint */}
      <AnimatePresence>
        {fileCount >= MAX_FILES_PER_MERGE && !isOverLimit && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-amber-400 text-center"
            role="status"
          >
            Maximum {MAX_FILES_PER_MERGE} files reached.
          </motion.p>
        )}
      </AnimatePresence>

      {/* PNG / JPG format toggle — only shown when a single file is staged */}
      <AnimatePresence>
        {fileCount === 1 && !isOverLimit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            <span className="text-xs text-white/40">Format:</span>
            <div className="flex rounded-lg overflow-hidden border border-white/[0.10] text-xs font-medium">
              {(['png', 'jpg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onFormatChange(fmt)}
                  className={`px-3 py-1.5 transition-colors duration-150 ${
                    imageFormat === fmt
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="text-xs text-white/25">
              {imageFormat === 'jpg' ? 'smaller file' : 'lossless'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        {/* Merge button */}
        <motion.button
          whileHover={mergeDisabled ? {} : { scale: 1.02 }}
          whileTap={mergeDisabled ? {} : { scale: 0.98 }}
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
        </motion.button>

        {/* Convert button */}
        <motion.button
          whileHover={convertDisabled ? {} : { scale: 1.02 }}
          whileTap={convertDisabled ? {} : { scale: 0.98 }}
          onClick={onConvert}
          disabled={convertDisabled}
          aria-label={`Convert to ${imageFormat.toUpperCase()}`}
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
          <span>Convert to {imageFormat.toUpperCase()}</span>
        </motion.button>
      </div>

      {/* Convert hint */}
      <AnimatePresence>
        {fileCount > 1 && !isOverLimit && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-white/40 text-center"
          >
            Select a single file to convert to images
          </motion.p>
        )}
      </AnimatePresence>

    </div>
  )
}
