import { useState } from 'react'
import { motion } from 'framer-motion'

const steps = [
  {
    step: '01',
    title: 'Upload',
    label: 'Drop your files',
    desc: 'Drag & drop up to 8 PDF files into the upload zone, or click to browse. Files are validated client-side before anything is sent.',
    detail: 'Supports up to 50 MB per file. MIME type and magic bytes are checked — not just the extension.',
    color: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-950/40',
    border: 'border-violet-700/40',
    accent: 'text-violet-400',
  },
  {
    step: '02',
    title: 'Choose',
    label: 'Pick your action',
    desc: 'Hit Merge to combine files in the order you arranged them, or Convert to extract every page as a PNG image.',
    detail: 'Merge strips embedded JavaScript and metadata. Convert returns a raw PNG for single-page PDFs, a ZIP for multi-page.',
    color: 'from-indigo-500 to-indigo-700',
    bg: 'bg-indigo-950/40',
    border: 'border-indigo-700/40',
    accent: 'text-indigo-400',
  },
  {
    step: '03',
    title: 'Process',
    label: 'In-memory only',
    desc: 'Your files are processed entirely in memory on the server. Nothing is written to disk at any point during processing.',
    detail: 'A 60-second timeout protects against complex PDFs. PDF bombs are caught before full processing begins.',
    color: 'from-sky-500 to-sky-700',
    bg: 'bg-sky-950/40',
    border: 'border-sky-700/40',
    accent: 'text-sky-400',
  },
  {
    step: '04',
    title: 'Download',
    label: 'Name & save',
    desc: 'Name your output file before downloading. The file is sent directly to your browser — no storage, no links, no expiry.',
    detail: 'Files are gone the moment the HTTP response is sent. There is nothing to delete.',
    color: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700/40',
    accent: 'text-emerald-400',
  },
]

export function HowItWorksSection() {
  const [active, setActive] = useState(0)

  return (
    <section
      id="how-it-works"
      data-scroll-section
      className="min-h-screen py-24 px-6 flex flex-col items-center justify-center"
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
          <p className="text-xs font-mono text-violet-500 uppercase tracking-widest mb-3">Process</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-100 leading-tight">
            How it works
          </h2>
          <p className="mt-3 text-gray-500 text-base max-w-md">
            Four steps. No account. No waiting.
          </p>
        </motion.div>

        {/* Accordion panels — horizontal on desktop, vertical on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-2 h-auto sm:h-80"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              onClick={() => setActive(i)}
              layout
              animate={{
                flex: active === i ? 4 : 1,
              }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`
                relative overflow-hidden rounded-2xl border cursor-pointer
                ${step.bg} ${step.border}
                flex flex-col justify-end p-6
                min-h-[80px] sm:min-h-0
              `}
              style={{ minWidth: 0 }}
            >
              {/* Step number — always visible */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-mono font-bold ${step.accent} shrink-0`}>
                  {step.step}
                </span>
                {/* Title — rotated when collapsed on desktop */}
                <motion.span
                  animate={{
                    opacity: active === i ? 0 : 1,
                    x: active === i ? -8 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className="hidden sm:block text-sm font-semibold text-gray-300 whitespace-nowrap"
                >
                  {step.title}
                </motion.span>
              </div>

              {/* Expanded content */}
              <motion.div
                animate={{
                  opacity: active === i ? 1 : 0,
                  y: active === i ? 0 : 12,
                }}
                transition={{ duration: 0.3, delay: active === i ? 0.15 : 0 }}
                className="flex flex-col gap-2"
              >
                <h3 className="text-xl font-bold text-gray-100">{step.label}</h3>
                <p className="text-sm text-gray-300 leading-relaxed max-w-xs">{step.desc}</p>
                <p className={`text-xs ${step.accent} leading-relaxed max-w-xs mt-1`}>
                  {step.detail}
                </p>
              </motion.div>

              {/* Gradient accent line at top */}
              <div
                className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${step.color} opacity-60`}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Step dots indicator */}
        <div className="flex gap-2 mt-6 justify-center sm:justify-start">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-300 ${
                active === i ? 'w-6 bg-violet-500' : 'w-2 bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
