import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Is this free to use?',
    a: 'Yes, completely free. No account, no subscription, no hidden fees. Just open the app and start using it.',
  },
  {
    q: 'Are my files safe? Will anyone see them?',
    a: 'Your files are processed privately and deleted immediately after your download starts. Nothing is saved to any server or database. Nobody can access your files.',
  },
  {
    q: 'How many PDFs can I merge at once?',
    a: 'You can merge up to 8 PDF files at a time. Each file can be up to 50 MB. If you need to merge more, just do it in batches — merge the first set, then merge the result with the next batch.',
  },
  {
    q: 'What does "Convert to PNGs" actually do?',
    a: 'It turns each page of your PDF into a separate image file. If your PDF has 1 page, you get a single PNG image. If it has multiple pages, you get a ZIP file containing one image per page.',
  },
  {
    q: 'My PDF has a password. Can I still use it?',
    a: "Not directly. Password-protected PDFs can't be processed. You'll need to remove the password first — most PDF readers (like Adobe Acrobat or Preview on Mac) let you do this from the File menu.",
  },
  {
    q: 'Does it work on my phone?',
    a: 'Yes. The app works on phones and tablets. You can upload files from your device, merge or convert them, and download the result — all from your mobile browser.',
  },
  {
    q: 'Why is my download a ZIP file instead of a PNG?',
    a: "When you convert a multi-page PDF, each page becomes a separate image. Since you can't put multiple images into a single PNG file, they're bundled into a ZIP for easy download. Just unzip it to get all your images.",
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section
      id="faq"
      data-scroll-section
      className="py-20 sm:py-28 px-4 sm:px-6 flex flex-col items-center"
    >
      <div className="max-w-2xl w-full">

        {/* Header — single animation, no per-item whileInView */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-14 text-center sm:text-left"
        >
          <p className="text-xs font-mono text-sky-400 uppercase tracking-widest mb-3">Help</p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">Questions?</h2>
          <p className="mt-3 text-white/60 text-sm sm:text-base">
            Everything you might want to know.
          </p>
        </motion.div>

        {/* Accordion — clean dividers, no box borders */}
        <div className="flex flex-col divide-y divide-white/[0.08]">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                  aria-expanded={isOpen}
                >
                  <span className={`text-sm sm:text-base font-medium pr-6 transition-colors duration-150 ${
                    isOpen ? 'text-white' : 'text-white/80 group-hover:text-white'
                  }`}>
                    {faq.q}
                  </span>

                  {/* Rotating + icon — no box */}
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`shrink-0 text-xl leading-none font-light transition-colors duration-150 ${
                      isOpen ? 'text-violet-400' : 'text-white/30 group-hover:text-white/60'
                    }`}
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm sm:text-base text-white/60 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
