import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const steps = [
  {
    step: '01',
    emoji: '📂',
    title: 'Pick your files',
    short: 'Drag, drop, done.',
    desc: 'Drag your PDFs straight onto the page, or tap to browse. You can add up to 8 files at once.',
    color: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-950/30',
    border: 'border-violet-700/40',
    pill: 'bg-violet-900/60 text-violet-300',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    step: '02',
    emoji: '⚡',
    title: 'Choose what to do',
    short: 'Merge or convert.',
    desc: 'Hit "Merge PDFs" to combine them into one file, or "Convert to PNGs" to turn each page into an image.',
    color: 'from-indigo-500 to-indigo-700',
    bg: 'bg-indigo-950/30',
    border: 'border-indigo-700/40',
    pill: 'bg-indigo-900/60 text-indigo-300',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    step: '03',
    emoji: '⬇️',
    title: 'Download your file',
    short: 'Name it, save it.',
    desc: 'Give your file a name and download it instantly. That\'s it — nothing is saved anywhere.',
    color: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-700/40',
    pill: 'bg-emerald-900/60 text-emerald-300',
    glow: 'rgba(16,185,129,0.15)',
  },
]

export function HowItWorksSection() {
  const [active, setActive] = useState(0)

  return (
    <section
      id="how-it-works"
      data-scroll-section
      className="py-20 sm:py-28 px-4 sm:px-6 flex flex-col items-center"
    >
      <div className="max-w-4xl w-full">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-14 text-center sm:text-left"
        >
          <p className="text-xs font-mono text-violet-500 uppercase tracking-widest mb-3">Simple</p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Three steps.<br className="hidden sm:block" /> That's all.
          </h2>
        </motion.div>

        {/* Step selector tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                active === i
                  ? `${s.pill} border border-current/20`
                  : 'text-gray-500 hover:text-gray-300 bg-gray-900/40 border border-gray-800'
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Active step card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl min-h-[220px] sm:min-h-[260px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`relative p-7 sm:p-10 rounded-2xl sm:rounded-3xl border ${steps[active].bg} ${steps[active].border} overflow-hidden`}
            >
              {/* Glow */}
              <div
                className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: steps[active].glow }}
              />

              {/* Top line */}
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${steps[active].color} opacity-50`} />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Big emoji */}
                <div className="text-5xl sm:text-6xl shrink-0">{steps[active].emoji}</div>

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-mono text-gray-500">{steps[active].step}</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${steps[active].pill}`}>
                      {steps[active].short}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {steps[active].title}
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-lg">
                    {steps[active].desc}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-2 mt-5 justify-center">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                active === i ? 'w-8 bg-violet-500' : 'w-2 bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
