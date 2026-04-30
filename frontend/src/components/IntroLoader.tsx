import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IntroLoaderProps {
  onComplete: () => void
}

/**
 * 1.8s intro animation:
 * - Counter ticks from 0 → 100
 * - Logo fades in
 * - Page wipes open (clip-path reveal)
 */
export function IntroLoader({ onComplete }: IntroLoaderProps) {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const duration = 1400  // ms for counter to reach 100
    const steps = 60
    const interval = duration / steps
    let current = 0

    const timer = setInterval(() => {
      current += Math.ceil(100 / steps)
      if (current >= 100) {
        current = 100
        clearInterval(timer)
        // Short pause then exit
        setTimeout(() => {
          setDone(true)
          setTimeout(onComplete, 600)
        }, 200)
      }
      setCount(current)
    }, interval)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-mono text-6xl font-bold text-gray-100 tabular-nums"
          >
            {count}
          </motion.div>

          {/* Progress bar */}
          <div className="mt-6 w-48 h-px bg-gray-800 overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
              style={{ width: `${count}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
