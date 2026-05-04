import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PreLoaderProps {
  onDone: () => void
}

/**
 * Full-screen pre-loader.
 * The page content renders underneath immediately — the preloader just
 * sits on top and slides away. This eliminates the flash that occurs
 * when the page fades in after the preloader exits.
 */
export function PreLoader({ onDone }: PreLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const DURATION = 1200
    const STEPS = 50
    const intervalMs = DURATION / STEPS
    let current = 0

    const timer = setInterval(() => {
      current = Math.min(current + Math.ceil(100 / STEPS), 100)
      setProgress(current)

      if (current >= 100) {
        clearInterval(timer)
        // Brief pause, then slide away
        setTimeout(() => {
          setVisible(false)
          // Call onDone after the exit animation completes
          setTimeout(() => onDoneRef.current(), 580)
        }, 200)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: '#0d0d18' }}
          exit={{
            y: '-100%',
            transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] },
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-10 text-2xl font-black tracking-tighter"
          >
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Merge
            </span>
            <span className="text-white/40 font-light">Snap</span>
          </motion.div>

          {/* Progress bar */}
          <div className="w-40 h-px bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.04 }}
            />
          </div>

          {/* Counter */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-xs font-mono text-white/30 tabular-nums"
          >
            {progress}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
