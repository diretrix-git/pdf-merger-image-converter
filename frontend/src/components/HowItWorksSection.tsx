import { useState } from 'react'

const steps = [
  {
    tag: 'Step 01',
    label: 'Pick files',
    title: 'Pick your files',
    desc: 'Drag your PDFs straight onto the page, or tap to browse. You can add up to 8 files at once — reorder them however you like before processing.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    tag: 'Step 02',
    label: 'Choose action',
    title: 'Choose what to do',
    desc: 'Hit "Merge PDFs" to stitch everything into a single file, or "Convert to PNG/JPG" to turn every page into a crisp image — choose your format before converting.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    tag: 'Step 03',
    label: 'Download',
    title: 'Download your file',
    desc: 'Give your output a custom name and download it straight to your device. Nothing is uploaded or saved anywhere — everything runs locally in your browser.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export function HowItWorksSection() {
  const [active, setActive] = useState(0)

  return (
    <section
      id="how-it-works"
      data-scroll-section
      className="py-20 sm:py-28 px-4 sm:px-6 flex flex-col items-center"
      style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(109,40,217,0.04) 50%, transparent 100%)' }}
    >
      <div className="max-w-4xl w-full">

        {/* Header */}
        <div className="mb-10 sm:mb-14">
          <p className="text-xs font-mono text-violet-400 uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-3">
            Three steps. That's all.
          </h2>
          <p className="text-white/50 text-sm sm:text-base">
            No sign-up, no uploads to a server, no fuss.
          </p>
        </div>

        {/* Step cards grid — hover to activate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div
              key={i}
              onMouseEnter={() => setActive(i)}
              className={`relative text-left rounded-2xl p-6 border transition-all duration-200 overflow-hidden cursor-default
                ${active === i
                  ? 'border-violet-600 bg-violet-950/40'
                  : 'border-violet-800/30 bg-violet-950/10 hover:border-violet-700/50'
                }`}
            >
              {/* Top accent line */}
              <div
                className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-all duration-200
                  ${active === i ? 'bg-gradient-to-r from-violet-600 to-violet-400' : 'bg-transparent'}`}
              />

              {/* Step number badge */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-violet-900/60 border border-violet-700/40 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-violet-400 font-medium">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-xs font-mono text-violet-500 tracking-wide">{s.label}</span>
              </div>

              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-violet-900/40 border border-violet-700/30 flex items-center justify-center text-violet-400 mb-4">
                {s.icon}
              </div>

              <p className="text-white font-medium text-sm sm:text-base mb-1">{s.title}</p>
              <p className="text-white/60 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}