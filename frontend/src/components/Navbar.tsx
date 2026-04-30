import { motion } from 'framer-motion'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
]

/**
 * Fixed top navigation bar with a typography logo and anchor links.
 */
export function Navbar() {
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4
                 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/60"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <a
        href="#home"
        onClick={(e) => handleNav(e, '#home')}
        className="flex items-center gap-2 group focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
        aria-label="PDF Merger home"
      >
        <span
          className="text-xl font-black tracking-tighter bg-gradient-to-r from-violet-400 to-indigo-400
                     bg-clip-text text-transparent group-hover:from-violet-300 group-hover:to-indigo-300
                     transition-all duration-200"
        >
          PDF<span className="text-gray-400 font-light">tools</span>
        </span>
      </a>

      {/* Links */}
      <ul className="flex items-center gap-1" role="list">
        {navLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              onClick={(e) => handleNav(e, link.href)}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100
                         hover:bg-gray-800/60 transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </motion.nav>
  )
}
