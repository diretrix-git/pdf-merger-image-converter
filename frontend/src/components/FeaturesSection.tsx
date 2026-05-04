import { motion } from 'framer-motion'

// Bento grid items — varying sizes for visual interest
const features = [
  {
    id: 'merge',
    size: 'col-span-2 row-span-2',   // large card
    icon: '🔗',
    tag: 'Core',
    title: 'Merge PDFs',
    desc: 'Combine up to 8 PDFs into a single file in the exact order you arrange them. Embedded JavaScript and document metadata are stripped from the output automatically.',
    stat: '8 files max',
    statLabel: 'per request',
    accent: 'border-violet-700/40 hover:border-violet-500/60',
    tagColor: 'bg-violet-900/60 text-violet-300',
  },
  {
    id: 'convert',
    size: 'col-span-1 row-span-2',   // tall card
    icon: '🖼️',
    tag: 'Core',
    title: 'Convert to PNGs',
    desc: 'Export every page of a PDF as a 150 DPI PNG. Single-page PDFs download as a raw PNG. Multi-page PDFs download as a ZIP.',
    stat: '150 DPI',
    statLabel: 'output quality',
    accent: 'border-indigo-700/40 hover:border-indigo-500/60',
    tagColor: 'bg-indigo-900/60 text-indigo-300',
  },
  {
    id: 'privacy',
    size: 'col-span-1 row-span-1',
    icon: '🔒',
    tag: 'Privacy',
    title: 'Nothing stored',
    desc: 'All processing is in-memory. Files are gone the moment the response is sent.',
    stat: '0 bytes',
    statLabel: 'stored on disk',
    accent: 'border-emerald-700/40 hover:border-emerald-500/60',
    tagColor: 'bg-emerald-900/60 text-emerald-300',
  },
  {
    id: 'security',
    size: 'col-span-1 row-span-1',
    icon: '🛡️',
    tag: 'Security',
    title: 'Validated uploads',
    desc: 'Magic bytes, MIME type, encryption, and PDF bomb checks — before any processing.',
    stat: '10 checks',
    statLabel: 'per upload',
    accent: 'border-amber-700/40 hover:border-amber-500/60',
    tagColor: 'bg-amber-900/60 text-amber-300',
  },
  {
    id: 'filename',
    size: 'col-span-1 row-span-1',
    icon: '✏️',
    tag: 'UX',
    title: 'Custom filenames',
    desc: 'Name your output before downloading. No more "merged (1).pdf" clutter.',
    stat: null,
    statLabel: null,
    accent: 'border-sky-700/40 hover:border-sky-500/60',
    tagColor: 'bg-sky-900/60 text-sky-300',
  },
  {
    id: 'ratelimit',
    size: 'col-span-1 row-span-1',
    icon: '⚡',
    tag: 'Limits',
    title: 'Rate limited',
    desc: '10 requests/min, 50/day per IP. Keeps the server responsive for everyone.',
    stat: '50 MB',
    statLabel: 'max file size',
    accent: 'border-rose-700/40 hover:border-rose-500/60',
    tagColor: 'bg-rose-900/60 text-rose-300',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      data-scroll-section
      className="py-24 px-6 flex flex-col items-center"
    >
      <div className="max-w-5xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <p className="text-xs font-mono text-indigo-500 uppercase tracking-widest mb-3">Capabilities</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-100 leading-tight">
            Features
          </h2>
          <p className="mt-3 text-gray-500 text-base max-w-md">
            Everything you need. Nothing you don't.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 auto-rows-[180px] gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`
                relative group rounded-2xl border bg-gray-900/50 p-6
                flex flex-col justify-between overflow-hidden
                transition-all duration-300 ${feat.accent}
                ${feat.size}
              `}
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <span className="text-2xl" aria-hidden="true">{feat.icon}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${feat.tagColor}`}>
                  {feat.tag}
                </span>
              </div>

              {/* Content */}
              <div>
                <h3 className="font-semibold text-gray-100 mb-1.5 text-base">{feat.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>

              {/* Stat badge */}
              {feat.stat && (
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-gray-100">{feat.stat}</span>
                  <span className="text-xs text-gray-500">{feat.statLabel}</span>
                </div>
              )}

              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 70%)' }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
