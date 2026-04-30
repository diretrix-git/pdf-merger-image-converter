import { useEffect, useRef } from 'react'

/**
 * Custom cursor — pure DOM/RAF, zero React state, zero Framer Motion.
 *
 * - Dot: follows mouse exactly via direct style.transform
 * - Ring: lerps toward mouse position each frame for smooth lag
 * - Scales ring on interactive element hover
 * - Listens on document so it works through Locomotive Scroll's container
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Don't run on touch devices — no cursor needed
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mouseX = -200
    let mouseY = -200
    let ringX = -200
    let ringY = -200
    let rafId = 0
    let visible = false
    let hovering = false

    // Lerp factor — higher = snappier, lower = more lag
    const LERP = 0.18

    const show = () => {
      if (!visible) {
        visible = true
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }
    }

    const hide = () => {
      visible = false
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      show()
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      hovering = !!target.closest(
        'button, a, [role="button"], input, textarea, select, label'
      )
      ring.style.width = hovering ? '52px' : '36px'
      ring.style.height = hovering ? '52px' : '36px'
    }

    const tick = () => {
      // Lerp ring toward mouse
      ringX += (mouseX - ringX) * LERP
      ringY += (mouseY - ringY) * LERP

      // Dot — exact position
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`

      // Ring — lerped position
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`

      rafId = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', hide)
    document.addEventListener('mouseenter', show)
    document.addEventListener('mouseover', onOver)

    rafId = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', hide)
      document.removeEventListener('mouseenter', show)
      document.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      {/* Follower ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.75)',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0,
          mixBlendMode: 'difference',
          willChange: 'transform',
          transition: 'width 0.15s ease, height 0.15s ease, opacity 0.2s ease',
        }}
      />

      {/* Dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'white',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0,
          willChange: 'transform',
          transition: 'opacity 0.2s ease',
        }}
      />
    </>
  )
}
