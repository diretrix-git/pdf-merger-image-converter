import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    q: 'Are my files stored anywhere?',
    a: 'No. All processing happens in-memory on the server. Files are never written to disk and are gone the moment the HTTP response is sent. There is nothing to delete.',
  },
  {
    q: 'Why does image conversion need Poppler?',
    a: 'pdf2image is a Python wrapper around Poppler\'s pdftoppm binary, which handles the actual PDF rendering. Without Poppler installed and in your system PATH, the /to-images endpoint will return an error. See the README for installation instructions.',
  },
  {
    q: 'What happens to embedded JavaScript in PDFs?',
    a: 'When merging, MergeSnap recursively walks the entire PDF object tree and removes /JavaScript, /AA, /OpenAction, /Launch, /SubmitForm, /ImportData, /RichMedia, and /EmbeddedFiles keys at every nesting level — not just the top-level catalog.',
  },
  {
    q: 'What are the file limits?',
    a: 'Each file can be up to 50 MB. The combined request is also capped at 50 MB. Merge accepts up to 8 files. Convert accepts 1 file with a maximum of 20 pages. Rate limiting is 10 requests/minute and 50 requests/day per IP.',
  },
  {
    q: 'Can I upload a password-protected PDF?',
    a: 'No. Password-protected PDFs are detected and rejected with a clear error message before any processing begins. Remove the password first using your PDF reader, then upload.',
  },
  {
    q: 'Single page vs multi-page conversion — what\'s the difference?',
    a: 'If your PDF has exactly 1 page, the server returns a raw PNG file directly. If it has 2 or more pages, you get a ZIP archive containing page_1.png, page_2.png, and so on. The download modal tells you which format to expect.',
  },
  {
    q: 'Can I use this on mobile?',
    a: 'Yes. The interface is fully responsive. Locomotive Scroll (smooth scrolling) is automatically disabled on touch devices to avoid conflicts with native scroll, and the custom cursor is hidden on touch screens.',
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section
      id="faq"
      data-scroll-section
      className="py-24 px-6 flex flex-col items-center"
    >
      <div className="max-w-3xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <p className="text-xs font-mono text-sky-500 uppercase tracking-widest mb-3">Questions</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-100 leading-tight">FAQ</h2>
          <p className="mt-3 text-gray-500 text-base">Common questions, straight answers.</p>
        </motion.div>

        {/* Accordion */}
        <div className="flex flex-col divide-y divide-gray-800/60">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left group"
                aria-expanded={open === i}
              >
                <span className={`text-sm font-medium transition-colors duration-200 pr-8 ${
                  open === i ? 'text-gray-100' : 'text-gray-300 group-hover:text-gray-100'
                }`}>
                  {faq.q}
                </span>
                <motion.span
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`shrink-0 text-lg leading-none transition-colors duration-200 ${
                    open === i ? 'text-violet-400' : 'text-gray-600 group-hover:text-gray-400'
                  }`}
                >
                  +
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 text-sm text-gray-400 leading-relaxed max-w-2xl">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
