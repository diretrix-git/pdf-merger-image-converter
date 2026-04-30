import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IntroLoaderProps {
  onComplete: () => void
}

/**
 * ~1.8s intro animation:
 * - Logo fades in
 * - Counter ticks 0 → 100
 * - Screen wipes open with a clip-path reveal
 *
 * onComplete is stored in a ref so it never causes the effect to re-run.
 */
export function IntroLoader({ onComplete }: IntroLoaderProps) {
  const [count, setCount] = useState(0)
  const [exiting, setExiting] = useState(false)
  const onCompleteRef = useRef(onComplete)

  // Keep ref current without re-running the effect
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    const DURATION_MS = 1400
    const STEPS = 60
    const intervalMs = DURATION_MS / STEPS
    let current = 0

    const timer = setInterval(() => {
      current = Math.min(current + Math.ceil(100 / STEPS), 100)
      setCount(current)

      if (current >= 100) {
        clearInterval(timer)
        // Brief pause, then trigger exit animation
        setTimeout(() => {
          setExiting(true)
          // Wait for exit animation to finish before revealing the page
          setTimeout(() => onCompleteRef.current(), 600)
        }, 250)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, []) // intentionally empty — runs once on mount

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="intro-loader"
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-gray-950"
          exit={{
            clipPath: 'inset(0 0 100% 0)',
            transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] },
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <span className="text-3xl font-black tracking-tighter bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              PDF<span className="text-gray-500 font-light">tools</span>
            </span>
          </motion.div>

          {/* Counter */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-mono text-6xl font-bold text-gray-100 tabular-nums"
            aria-live="polite"
            aria-label={`Loading ${count} percent`}
          >
            {count}
          </motion.p>

          {/* Progress bar */}
          <div className="mt-6 w-48 h-px bg-gray-800 overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
              animate={{ width: `${count}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
