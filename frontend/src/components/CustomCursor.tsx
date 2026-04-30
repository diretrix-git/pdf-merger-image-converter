import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * Custom cursor — a crisp 6px dot that tracks exactly on the pointer,
 * and a 36px ring that follows with a tight spring lag.
 *
 * Key fixes for smoothness and cross-section tracking:
 * - No React state updates on mousemove (eliminates re-render lag)
 * - useMotionValue + useSpring drive transforms directly via Framer's
 *   internal RAF loop — no JS re-renders at all during movement
 * - Visibility toggled via direct DOM style mutation (no state)
 * - Listening on `document` so Locomotive Scroll's transformed
 *   container doesn't swallow events
 * - `will-change: transform` on both elements for GPU compositing
 */
export function CustomCursor() {
  const dotX = useMotionValue(-200)
  const dotY = useMotionValue(-200)

  // Tight spring — feels snappy, not floaty
  const ringX = useSpring(dotX, { damping: 28, stiffness: 300, mass: 0.4 })
  const ringY = useSpring(dotY, { damping: 28, stiffness: 300, mass: 0.4 })

  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // Show on first move
    const show = () => {
      dot.style.opacity = '1'
      ring.style.opacity = '1'
    }

    const onMove = (e: MouseEvent) => {
      // clientX/Y are always viewport-relative — unaffected by Locomotive Scroll transforms
      dotX.set(e.clientX)
      dotY.set(e.clientY)
      show()
    }

    const onLeave = () => {
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    const onEnter = () => show()

    // Scale ring on interactive elements
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isInteractive = !!target.closest(
        'button, a, [role="button"], input, textarea, select, label'
      )
      ring.style.transform = isInteractive
        ? 'translate(-50%, -50%) scale(1.7)'
        : 'translate(-50%, -50%) scale(1)'
    }

    // Use document so events fire even inside Locomotive Scroll's container
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    document.addEventListener('mouseover', onOver)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('mouseover', onOver)
    }
  }, [dotX, dotY])

  return (
    <>
      {/* Follower ring — spring-lagged */}
      <motion.div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full border border-white/70"
        style={{
          x: ringX,
          y: ringY,
          width: 36,
          height: 36,
          translateX: '-50%',
          translateY: '-50%',
          opacity: 0,
          mixBlendMode: 'difference',
          willChange: 'transform',
          transition: 'transform 0.15s ease',
        }}
      />

      {/* Dot — exact pointer position, no lag */}
      <motion.div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full bg-white"
        style={{
          x: dotX,
          y: dotY,
          width: 6,
          height: 6,
          translateX: '-50%',
          translateY: '-50%',
          opacity: 0,
          willChange: 'transform',
        }}
      />
    </>
  )
}
