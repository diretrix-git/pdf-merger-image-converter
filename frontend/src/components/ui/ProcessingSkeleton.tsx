import { motion } from 'framer-motion'
import { Skeleton } from './Skeleton'

/**
 * Full-panel skeleton shown while a PDF is being processed.
 * Replaces the file list + action buttons area during loading.
 */
export function ProcessingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4 w-full"
      aria-label="Processing your files…"
      aria-busy="true"
    >
      {/* Fake file rows */}
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/40 border border-gray-700/30">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-2.5 w-1/3 rounded" />
          </div>
          <Skeleton className="w-6 h-6 rounded-full shrink-0" />
        </div>
      ))}

      {/* Fake progress bar */}
      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '50%' }}
        />
      </div>

      {/* Status text */}
      <p className="text-center text-xs text-gray-500 mt-1">
        Processing your files — this usually takes a few seconds…
      </p>

      {/* Fake buttons */}
      <div className="flex gap-3 mt-1">
        <Skeleton className="flex-1 h-11 rounded-xl" />
        <Skeleton className="flex-1 h-11 rounded-xl" />
      </div>
    </motion.div>
  )
}
