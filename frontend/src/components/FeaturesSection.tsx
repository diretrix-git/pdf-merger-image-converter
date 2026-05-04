import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

/**
 * 5-card bento grid:
 *
 * Desktop (3 cols, auto rows):
 * ┌─────────────────┬──────────┐
 * │  Merge PDFs     │ Convert  │
 * │  (col-2, row-2) │ (row-2)  │
 * ├──────────┬──────┴──────────┤
 * │ Privacy  │ Filename │ Free │  ← these 3 share the bottom row
 * └──────────┴──────────┴──────┘
 *
 * Mobile: single column, natural height.
 */
const features = [
  {
    id: 'merge',
    col: 'sm:col-span-2',
    row: 'sm:row-span-2',
    icon: '🔗',
    tag: 'Core',
    title: 'Merge PDFs',
    desc: 'Combine up to 8 PDFs into one file, in the exact order you choose.',
    stat: '8',
    statLabel: 'files per merge',
    border: 'border-violet-700/40 hover:border-violet-500/50',
    tag_bg: 'bg-violet-900/50 text-violet-200',
    glow: 'rgba(139,92,246,0.1)',
  },
  {
    id: 'convert',
    col: 'sm:col-span-1',
    row: 'sm:row-span-2',
    icon: '🖼️',
    tag: 'Core',
    title: 'Convert to PNGs',
    desc: 'Turn every page of a PDF into a high-quality image. One page = PNG. Multiple pages = ZIP.',
    stat: '150',
    statLabel: 'DPI output',
    border: 'border-indigo-700/40 hover:border-indigo-500/50',
    tag_bg: 'bg-indigo-900/50 text-indigo-200',
    glow: 'rgba(99,102,241,0.1)',
  },
  {
    id: 'privacy',
    col: 'sm:col-span-1',
    row: '',
    icon: '🔒',
    tag: 'Privacy',
    title: 'Nothing stored',
    desc: 'Files are deleted the moment your download starts.',
    stat: null,
    statLabel: null,
    border: 'border-emerald-700/40 hover:border-emerald-500/50',
    tag_bg: 'bg-emerald-900/50 text-emerald-200',
    glow: 'rgba(16,185,129,0.1)',
  },
  {
    id: 'filename',
    col: 'sm:col-span-1',
    row: '',
    icon: '✏️',
    tag: 'UX',
    title: 'Custom filenames',
    desc: 'Name your output before downloading. No clutter.',
    stat: null,
    statLabel: null,
    border: 'border-sky-700/40 hover:border-sky-500/50',
    tag_bg: 'bg-sky-900/50 text-sky-200',
    glow: 'rgba(14,165,233,0.1)',
  },
  {
    id: 'free',
    col: 'sm:col-span-1',
    row: '',
    icon: '🎉',
    tag: 'Free',
    title: 'Completely free',
    desc: 'No account. No subscription. Just open and use.',
    stat: null,
    statLabel: null,
    border: 'border-rose-700/40 hover:border-rose-500/50',
    tag_bg: 'bg-rose-900/50 text-rose-200',
    glow: 'rgba(244,63,94,0.1)',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      data-scroll-section
      className="py-20 sm:py-28 px-4 sm:px-6 flex flex-col items-center"
      style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(79,70,229,0.05) 50%, transparent 100%)' }}
    >
      <div className="max-w-5xl w-full">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-14 text-center sm:text-left"
        >
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">What you get</p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">Features</h2>
          <p className="mt-3 text-white/60 text-sm sm:text-base max-w-md">
            Everything you need. Nothing you don't.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:auto-rows-[170px] gap-3 sm:gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className={cn(
                'relative group rounded-2xl border bg-white/[0.03]',
                'flex flex-col justify-between overflow-hidden',
                'transition-colors duration-300',
                'p-5 sm:p-7',           // generous padding — fixes text-near-border
                'min-h-[150px] sm:min-h-0',
                feat.border,
                feat.col,
                feat.row,
              )}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(circle at 30% 20%, ${feat.glow} 0%, transparent 65%)` }}
              />

              {/* Top row: icon + tag */}
              <div className="flex items-start justify-between relative z-10">
                <span className="text-2xl sm:text-3xl leading-none" aria-hidden="true">{feat.icon}</span>
                <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', feat.tag_bg)}>
                  {feat.tag}
                </span>
              </div>

              {/* Text */}
              <div className="relative z-10 mt-4">
                <h3 className="font-semibold text-white mb-1.5 text-sm sm:text-base leading-snug">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{feat.desc}</p>
              </div>

              {/* Stat */}
              {feat.stat && (
                <div className="relative z-10 mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-white">{feat.stat}</span>
                  <span className="text-xs text-white/40">{feat.statLabel}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
