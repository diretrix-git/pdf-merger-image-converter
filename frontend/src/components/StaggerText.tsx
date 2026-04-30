import { motion } from 'framer-motion'

interface StaggerTextProps {
  text: string
  className?: string
  delay?: number
  /** 'words' splits by word, 'chars' splits by character */
  splitBy?: 'words' | 'chars'
  once?: boolean
}

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
    },
  }),
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

/**
 * Splits text into words or characters and staggers them in on scroll.
 */
export function StaggerText({
  text,
  className = '',
  delay = 0,
  splitBy = 'words',
  once = true,
}: StaggerTextProps) {
  const parts = splitBy === 'words' ? text.split(' ') : text.split('')
  const stagger = splitBy === 'words' ? 0.07 : 0.03

  return (
    <motion.span
      className={`inline-flex flex-wrap gap-x-[0.25em] ${className}`}
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-40px' }}
      style={{ transitionDelay: `${delay}s` }}
      aria-label={text}
    >
      {parts.map((part, i) => (
        <motion.span
          key={i}
          variants={itemVariants}
          className="inline-block"
          aria-hidden="true"
        >
          {part}
          {splitBy === 'words' && i < parts.length - 1 ? '' : ''}
        </motion.span>
      ))}
    </motion.span>
  )
}
