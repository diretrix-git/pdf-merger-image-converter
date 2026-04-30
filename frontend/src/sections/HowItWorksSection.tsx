import { motion } from 'framer-motion'
import { TiltCard } from '../components/TiltCard'
import { StaggerText } from '../components/StaggerText'

const steps = [
  {
    step: '01',
    icon: '📂',
    title: 'Upload',
    desc: 'Drag & drop your PDF files into the upload zone, or click to browse.',
  },
  {
    step: '02',
    icon: '⚙️',
    title: 'Process',
    desc: 'Choose Merge to combine files in order, or Convert to extract pages as PNGs.',
  },
  {
    step: '03',
    icon: '⬇️',
    title: 'Download',
    desc: 'Name your file and download it instantly. Nothing is stored on any server.',
  },
]

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      data-scroll-section
      className="py-24 px-6 flex flex-col items-center"
    >
      <div className="max-w-3xl w-full">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">
          <StaggerText text="How it works" splitBy="words" />
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-gray-500 mb-12 text-sm"
        >
          Three steps, no sign-up required.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((item, i) => (
            <TiltCard
              key={item.step}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <span className="text-xs font-mono text-violet-500 mb-3 block">
                  {item.step}
                </span>
                <span className="text-3xl mb-3 block" aria-hidden="true">
                  {item.icon}
                </span>
                <h3 className="font-semibold text-gray-100 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}
