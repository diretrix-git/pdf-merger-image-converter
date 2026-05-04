import { motion } from 'framer-motion'

function scrollToTop() {
  const loco = (window as any).__locomotiveScroll
  const target = document.querySelector('#home') as HTMLElement | null
  if (!target) return
  if (loco) {
    loco.scrollTo(target, { offset: 0, duration: 1200, easing: [0.25, 0.0, 0.35, 1.0] })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

export function CTASection() {
  return (
    <section
      data-scroll-section
      className="py-24 px-6 flex flex-col items-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55 }}
        className="relative max-w-3xl w-full rounded-3xl overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-gray-900 to-indigo-950/80" />
        <div className="absolute inset-0 border border-violet-700/30 rounded-3xl" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        {/* Glow blobs */}
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 px-8 py-14 sm:px-16 text-center flex flex-col items-center gap-6">
          <p className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            Ready to start?
          </p>

          <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 leading-tight">
            Merge or convert your PDFs{' '}
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              right now
            </span>
          </h2>

          <p className="text-gray-400 text-sm max-w-md leading-relaxed">
            No account. No upload limits beyond what your machine can handle.
            No files stored. Just drop your PDFs and go.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={scrollToTop}
              className="px-7 py-3 rounded-full bg-violet-600 hover:bg-violet-500
                         text-white text-sm font-semibold transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Start merging →
            </motion.button>

            <a
              href="https://github.com/diretrix-git/pdf-merger-image-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full border border-gray-700 hover:border-gray-500
                         text-gray-400 hover:text-gray-200 text-sm font-medium
                         transition-colors duration-150 text-center
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              View on GitHub
            </a>
          </div>

          <p className="text-xs text-gray-600 mt-2">
            🔒 Files are automatically deleted after processing and never stored permanently.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
