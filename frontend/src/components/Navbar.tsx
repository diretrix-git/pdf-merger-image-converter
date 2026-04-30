import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
]

function scrollTo(href: string) {
  const target = document.querySelector(href)
  if (target) target.scrollIntoView({ behavior: 'smooth' })
}

/**
 * Centered pill navbar — floats at the top center of the page.
 * Collapses to a hamburger menu on mobile.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    scrollTo(href)
    setMenuOpen(false)
  }

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Desktop — centered pill                                           */}
      {/* ---------------------------------------------------------------- */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50
                   hidden sm:flex items-center gap-1
                   px-2 py-1.5 rounded-full
                   bg-gray-900/80 backdrop-blur-md
                   border border-gray-700/60
                   shadow-lg shadow-black/30"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => handleLink(e, '#home')}
          className="px-3 py-1.5 mr-2 rounded-full text-sm font-black tracking-tighter
                     bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent
                     hover:from-violet-300 hover:to-indigo-300 transition-all duration-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label="PDFtools home"
        >
          PDF<span className="font-light text-gray-400">tools</span>
        </a>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-700 mx-1" aria-hidden="true" />

        {/* Links */}
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleLink(e, link.href)}
            className="px-3 py-1.5 rounded-full text-sm text-gray-400
                       hover:text-gray-100 hover:bg-gray-800/70
                       transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {link.label}
          </a>
        ))}
      </motion.nav>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile — top bar with hamburger                                   */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 sm:hidden
                   flex items-center justify-between px-5 py-4
                   bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60"
      >
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => handleLink(e, '#home')}
          className="text-lg font-black tracking-tighter
                     bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
          aria-label="PDFtools home"
        >
          PDF<span className="font-light text-gray-400">tools</span>
        </a>

        {/* Hamburger button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="flex flex-col justify-center items-center w-8 h-8 gap-1.5
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
        >
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-px bg-gray-300 origin-center"
          />
          <motion.span
            animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
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

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[57px] left-0 right-0 z-40 sm:hidden
                       bg-gray-950/95 backdrop-blur-md border-b border-gray-800/60
                       flex flex-col py-2"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleLink(e, link.href)}
                className="px-6 py-3 text-sm text-gray-300 hover:text-white
                           hover:bg-gray-800/50 transition-colors"
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
