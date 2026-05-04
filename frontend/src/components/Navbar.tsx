import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
]

/**
 * Scroll to a section using Locomotive Scroll's API if available,
 * falling back to native scrollIntoView.
 *
 * Locomotive Scroll stores its instance on window.__locomotiveScroll
 * (we expose it from App.tsx). This is necessary because scrollIntoView
 * only moves the native scroll position, which Locomotive locks at 0.
 */
function scrollToSection(href: string) {
  const target = document.querySelector(href) as HTMLElement | null
  if (!target) return

  // Use Locomotive Scroll's scrollTo if available (desktop)
  const loco = (window as any).__locomotiveScroll
  if (loco) {
    // offset: 0 — scroll exactly to the section top so it fills the full viewport
    loco.scrollTo(target, { offset: 0, duration: 1200, easing: [0.25, 0.0, 0.35, 1.0] })
  } else {
    // Mobile / native scroll — account for fixed navbar height (~61px)
    const navHeight = 61
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    scrollToSection(href)
    setMenuOpen(false)
  }

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Desktop — floating centered pill with gap from top                */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-10 left-0 right-0 z-50 hidden sm:flex justify-center px-6"
        style={{ pointerEvents: 'none' }}
      >
        <motion.nav
          whileHover={{
            scale: 1.02,
            boxShadow: '0 0 32px rgba(139, 92, 246, 0.18), 0 8px 32px rgba(0,0,0,0.5)',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex items-center gap-0.5 px-3 py-2 rounded-full
                     bg-gray-900/85 backdrop-blur-md
                     border border-gray-700/60
                     shadow-xl shadow-black/40"
          style={{ pointerEvents: 'auto' }}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => handleLink(e, '#home')}
            className="px-4 py-2 mr-1 rounded-full text-base font-black tracking-tighter
                       hover:opacity-80 transition-opacity duration-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="MergeSnap home"
          >
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Merge
            </span>
            <span className="text-gray-300 font-light">Snap</span>
          </a>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-700/80 mx-1.5" aria-hidden="true" />

          {/* Nav links */}
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleLink(e, link.href)}
              className="relative px-4 py-2 rounded-full text-sm font-medium text-gray-400
                         hover:text-gray-100 hover:bg-white/[0.06]
                         transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {link.label}
            </a>
          ))}
        </motion.nav>
      </motion.div>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile — full-width top bar with hamburger                        */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed top-4 left-0 right-0 z-50 sm:hidden
                   flex items-center justify-between px-5 py-3.5
                   bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60"
      >
        <a
          href="#home"
          onClick={(e) => handleLink(e, '#home')}
          className="text-lg font-black tracking-tighter"
        >
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Merge
          </span>
          <span className="text-gray-300 font-light">Snap</span>
        </a>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-px bg-gray-300 origin-center"
          />
          <motion.span
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="block w-5 h-px bg-gray-300"
          />
          <motion.span
            animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-px bg-gray-300 origin-center"
          />
        </button>
      </motion.div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[73px] left-0 right-0 z-40 sm:hidden
                       bg-gray-950/95 backdrop-blur-md border-b border-gray-800/60 py-2"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleLink(e, link.href)}
                className="block px-6 py-3 text-sm text-gray-300
                           hover:text-white hover:bg-gray-800/50 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
