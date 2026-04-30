import { useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  'aria-label'?: string
  'aria-busy'?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const MAGNETIC_RADIUS = 80  // px — how far the cursor needs to be to attract
const MAGNETIC_STRENGTH = 0.35  // how far the button drifts (fraction of distance)

/**
 * A button that drifts toward the cursor when it enters a radius around it,
 * then springs back elastically when the cursor leaves.
 */
export function MagneticButton({
  children,
  className = '',
  onClick,
  disabled = false,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [isNear, setIsNear] = useState(false)

  const rawX = useSpring(0, { damping: 15, stiffness: 200, mass: 0.5 })
  const rawY = useSpring(0, { damping: 15, stiffness: 200, mass: 0.5 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < MAGNETIC_RADIUS) {
      setIsNear(true)
      rawX.set(dx * MAGNETIC_STRENGTH)
      rawY.set(dy * MAGNETIC_STRENGTH)
    } else {
      setIsNear(false)
      rawX.set(0)
      rawY.set(0)
    }
  }

  const handleMouseLeave = () => {
    setIsNear(false)
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <motion.button
      ref={ref}
      style={{ x: rawX, y: rawY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={disabled ? {} : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      data-cursor-hover
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
