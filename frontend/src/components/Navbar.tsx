import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
]

function scrollToSection(href: string) {
  const target = document.querySelector(href) as HTMLElement | null
  if (!target) return
  const loco = (window as any).__locomotiveScroll
  if (loco) {
    loco.scrollTo(target, { offset: 0, duration: 1200, easing: [0.25, 0.0, 0.35, 1.0] })
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY - 72
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
      {/* Desktop — floating glass pill, centered, 40px from top            */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-10 left-0 right-0 z-50 hidden sm:flex justify-center px-6"
        style={{ pointerEvents: 'none' }}
      >
        <nav
          className="flex items-center gap-0.5 px-3 py-2 rounded-full
                     bg-white/[0.07] backdrop-blur-xl
                     border border-white/[0.12]
                     shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{ pointerEvents: 'auto' }}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => handleLink(e, '#home')}
            className="px-4 py-2 mr-1 rounded-full text-base font-black tracking-tighter
                       hover:bg-white/[0.06] transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="MergeSnap home"
          >
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Merge
            </span>
            <span className="text-white/50 font-light">Snap</span>
          </a>

          <div className="w-px h-4 bg-white/10 mx-1.5" aria-hidden="true" />

          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleLink(e, link.href)}
              className="px-4 py-2 rounded-full text-sm font-medium text-white/60
                         hover:text-white hover:bg-white/[0.07]
                         transition-all duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </motion.div>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile — floating glass pill with gap from top, like desktop      */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed top-4 left-3 right-3 z-50 sm:hidden"
      >
        {/* Main bar — acrylic glass */}
        <div
          className="flex items-center justify-between px-5 py-3.5 rounded-2xl
                     bg-white/[0.06] backdrop-blur-2xl
                     border border-white/[0.12]
                     shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => handleLink(e, '#home')}
            className="text-base font-black tracking-tighter"
          >
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Merge
            </span>
            <span className="text-white/50 font-light">Snap</span>
          </a>

          {/* Hamburger — 3 lines → X */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="relative w-8 h-5 flex-shrink-0
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
          >
            {/* Top line: rests at top (y=0), rotates to +45° and moves to center (y=8px) */}
            <motion.span
              className="absolute left-0 right-0 h-[1.5px] bg-white rounded-full"
              style={{ top: 0 }}
              animate={menuOpen
                ? { top: '50%', rotate: 45, translateY: '-50%' }
                : { top: 0, rotate: 0, translateY: '0%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Middle line: fades out */}
            <motion.span
              className="absolute left-0 right-0 h-[1.5px] bg-white rounded-full"
              style={{ top: '50%', translateY: '-50%' }}
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            {/* Bottom line: rests at bottom, rotates to -45° and moves to center */}
            <motion.span
              className="absolute left-0 right-0 h-[1.5px] bg-white rounded-full"
              style={{ bottom: 0 }}
              animate={menuOpen
                ? { bottom: '50%', rotate: -45, translateY: '50%' }
                : { bottom: 0, rotate: 0, translateY: '0%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            />
          </button>
        </div>

        {/* Dropdown — appears below the bar */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 rounded-2xl overflow-hidden
                         bg-white/[0.06] backdrop-blur-2xl
                         border border-white/[0.12]
                         shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleLink(e, link.href)}
                  className="block px-5 py-3.5 text-sm text-white/70
                             hover:text-white hover:bg-white/[0.05] transition-colors
                             border-b border-white/[0.05] last:border-0"
                >
                  {link.label}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
