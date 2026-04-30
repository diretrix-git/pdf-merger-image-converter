import { useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
}

const MAX_TILT = 12  // degrees

/**
 * A card that tilts in 3D toward the cursor on hover.
 * Includes a specular highlight that moves opposite to the tilt,
 * simulating light hitting a physical surface.
 */
export function TiltCard({ children, className = '' }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Spring-driven tilt values
  const rotateX = useSpring(0, { damping: 20, stiffness: 300 })
  const rotateY = useSpring(0, { damping: 20, stiffness: 300 })

  // Specular highlight position (moves opposite to tilt)
  const highlightX = useSpring(50, { damping: 20, stiffness: 300 })
  const highlightY = useSpring(50, { damping: 20, stiffness: 300 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width   // 0–1
    const y = (e.clientY - rect.top) / rect.height    // 0–1

    rotateX.set((0.5 - y) * MAX_TILT * 2)
    rotateY.set((x - 0.5) * MAX_TILT * 2)

    // Highlight moves opposite to tilt
    highlightX.set((1 - x) * 100)
    highlightY.set((1 - y) * 100)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    rotateX.set(0)
    rotateY.set(0)
    highlightX.set(50)
    highlightY.set(50)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        transformPerspective: 800,
      }}
      data-cursor-hover
      className={`relative overflow-hidden ${className}`}
    >
      {children}

      {/* Specular highlight */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${highlightX.get()}% ${highlightY.get()}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
      />

      {/* Border reveal on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: isHovered
            ? 'inset 0 0 0 1px rgba(139, 92, 246, 0.4)'
            : 'inset 0 0 0 1px rgba(255,255,255,0)',
          transition: 'box-shadow 0.25s ease',
        }}
      />
    </motion.div>
  )
}
