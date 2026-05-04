import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

const features = [
  {
    id: 'merge',
    colSpan: 'sm:col-span-2',
    rowSpan: 'sm:row-span-2',
    icon: '🔗',
    tag: 'Core feature',
    title: 'Merge PDFs',
    desc: 'Combine up to 8 PDFs into one file, in the exact order you choose. Drag to reorder before merging.',
    stat: '8',
    statLabel: 'files per merge',
    accent: 'border-violet-700/40 hover:border-violet-500/50',
    tagColor: 'bg-violet-900/50 text-violet-300',
    glow: 'rgba(139,92,246,0.08)',
  },
  {
    id: 'convert',
    colSpan: 'sm:col-span-1',
    rowSpan: 'sm:row-span-2',
    icon: '🖼️',
    tag: 'Core feature',
    title: 'Convert to PNGs',
    desc: 'Turn every page of a PDF into a high-quality image. One page = one PNG. Multiple pages = ZIP download.',
    stat: '150',
    statLabel: 'DPI output',
    accent: 'border-indigo-700/40 hover:border-indigo-500/50',
    tagColor: 'bg-indigo-900/50 text-indigo-300',
    glow: 'rgba(99,102,241,0.08)',
  },
  {
    id: 'privacy',
    colSpan: 'sm:col-span-1',
    rowSpan: '',
    icon: '🔒',
    tag: 'Privacy',
    title: 'Nothing stored',
    desc: 'Files are deleted the moment your download starts. Zero storage, zero risk.',
    stat: null,
    statLabel: null,
    accent: 'border-emerald-700/40 hover:border-emerald-500/50',
    tagColor: 'bg-emerald-900/50 text-emerald-300',
    glow: 'rgba(16,185,129,0.08)',
  },
  {
    id: 'filename',
    colSpan: 'sm:col-span-1',
    rowSpan: '',
    icon: '✏️',
    tag: 'UX',
    title: 'Custom filenames',
    desc: 'Name your output file before downloading. No more "merged (1).pdf" clutter.',
    stat: null,
    statLabel: null,
    accent: 'border-sky-700/40 hover:border-sky-500/50',
    tagColor: 'bg-sky-900/50 text-sky-300',
    glow: 'rgba(14,165,233,0.08)',
  },
  {
    id: 'security',
    colSpan: 'sm:col-span-1',
    rowSpan: '',
    icon: '🛡️',
    tag: 'Security',
    title: 'Safe uploads',
    desc: 'Every file is checked before processing. Corrupted or suspicious files are rejected with a clear message.',
    stat: null,
    statLabel: null,
    accent: 'border-amber-700/40 hover:border-amber-500/50',
    tagColor: 'bg-amber-900/50 text-amber-300',
    glow: 'rgba(245,158,11,0.08)',
  },
  {
    id: 'free',
    colSpan: 'sm:col-span-1',
    rowSpan: '',
    icon: '🎉',
    tag: 'Free',
    title: 'Completely free',
    desc: 'No account. No subscription. No limits beyond file size. Just open and use.',
    stat: null,
    statLabel: null,
    accent: 'border-rose-700/40 hover:border-rose-500/50',
    tagColor: 'bg-rose-900/50 text-rose-300',
    glow: 'rgba(244,63,94,0.08)',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      data-scroll-section
      className="py-20 sm:py-28 px-4 sm:px-6 flex flex-col items-center"
    >
      <div className="max-w-5xl w-full">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-14 text-center sm:text-left"
        >
          <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-3">What you get</p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Features
          </h2>
          <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-md">
            Everything you need. Nothing you don't.
          </p>
        </motion.div>

        {/* Bento grid — 3 cols on desktop, 1 col on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:auto-rows-[160px] gap-3 sm:gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className={cn(
                'relative group rounded-2xl border bg-gray-900/40 p-5 sm:p-6',
                'flex flex-col justify-between overflow-hidden',
                'transition-all duration-300',
                feat.accent,
                feat.colSpan,
                feat.rowSpan,
                // On mobile, all cards are the same height
                'min-h-[140px] sm:min-h-0',
              )}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(circle at 30% 20%, ${feat.glow} 0%, transparent 65%)` }}
              />

              {/* Top row */}
              <div className="flex items-start justify-between relative z-10">
                <span className="text-2xl sm:text-3xl" aria-hidden="true">{feat.icon}</span>
                <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', feat.tagColor)}>
                  {feat.tag}
                </span>
              </div>

              {/* Content */}
              <div className="relative z-10 mt-3">
                <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>

              {/* Stat */}
              {feat.stat && (
                <div className="relative z-10 mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold text-white">{feat.stat}</span>
                  <span className="text-xs text-gray-500">{feat.statLabel}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
