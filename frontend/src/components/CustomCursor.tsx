import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion'

/**
 * Custom cursor — a crisp 6px dot that sits exactly on the pointer,
 * and a 40px circle that follows with spring lag (magnetic lag effect).
 *
 * On hover over interactive elements, the circle scales up and uses
 * mix-blend-mode: difference to invert against the background.
 */
export function CustomCursor() {
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(false)

  // Raw mouse position (dot follows this exactly)
  const dotX = useMotionValue(-100)
  const dotY = useMotionValue(-100)

  // Spring-lagged position for the follower circle
  const springConfig = { damping: 22, stiffness: 180, mass: 0.6 }
  const circleX = useSpring(dotX, springConfig)
  const circleY = useSpring(dotY, springConfig)

  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!visible) setVisible(true)
      dotX.set(e.clientX)
      dotY.set(e.clientY)
    }

    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    // Detect hover over interactive elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const interactive = target.closest(
        'button, a, [role="button"], input, textarea, select, label, [data-cursor-hover]'
      )
      setHovering(!!interactive)
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    window.addEventListener('mouseover', onMouseOver)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      window.removeEventListener('mouseover', onMouseOver)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [dotX, dotY, visible])

  if (typeof window === 'undefined') return null

  return (
    <>
      {/* Follower circle — spring-lagged, mix-blend-mode: difference */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: circleX,
          y: circleY,
          translateX: '-50%',
          translateY: '-50%',
          mixBlendMode: 'difference',
        }}
        animate={{
          opacity: visible ? 1 : 0,
          scale: hovering ? 1.8 : 1,
          width: hovering ? 48 : 40,
          height: hovering ? 48 : 40,
        }}
        transition={{ scale: { type: 'spring', damping: 18, stiffness: 200 } }}
      >
        <div
          className="w-full h-full rounded-full bg-white"
          style={{ width: 40, height: 40 }}
        />
      </motion.div>

      {/* Dot — sits exactly on the pointer */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{ opacity: visible ? 1 : 0 }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </motion.div>
    </>
  )
}
