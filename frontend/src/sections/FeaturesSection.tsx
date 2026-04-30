import { motion } from 'framer-motion'
import { TiltCard } from '../components/TiltCard'
import { StaggerText } from '../components/StaggerText'

const features = [
  {
    icon: '🔗',
    title: 'Merge PDFs',
    desc: 'Combine any number of PDFs into a single file, preserving page order.',
  },
  {
    icon: '🖼️',
    title: 'Convert to Images',
    desc: 'Export every page of a PDF as a high-quality PNG at 150 DPI, zipped for easy download.',
  },
  {
    icon: '🔒',
    title: 'Privacy first',
    desc: 'All processing happens in-memory on the server. No files are written to disk or stored.',
  },
  {
    icon: '⚡',
    title: 'Fast & local',
    desc: 'Runs entirely on your machine. No cloud, no latency, no data leaving your network.',
  },
  {
    icon: '✏️',
    title: 'Custom filenames',
    desc: 'Name your output file before downloading — no more "merged (1).pdf" clutter.',
  },
  {
    icon: '🛡️',
    title: 'Validated uploads',
    desc: 'MIME type checked by content (not extension), size limits enforced, page count capped.',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      data-scroll-section
      className="py-24 px-6 flex flex-col items-center"
    >
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">
          <StaggerText text="Features" splitBy="words" />
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-gray-500 mb-12 text-sm"
        >
          Everything you need, nothing you don't.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <TiltCard
              key={feat.title}
              className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <span className="text-2xl mb-3 block" aria-hidden="true">
                  {feat.icon}
                </span>
                <h3 className="font-semibold text-gray-100 mb-1">{feat.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}
